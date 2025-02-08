import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { Server } from "socket.io";
import http from "http";

import authRouter from './routes/auth.route.js';
import guestRouter from './routes/guest.route.js';
import sessionRouter from './routes/session.route.js';
import protectedRoutes from './routes/protected.route.js';
import userRouter from './routes/user.route.js';
import verificationsRouter from './routes/verifications.route.js';
import postRouter from './routes/post.router.js';
import { Notification } from './models/notification.model.js';
import notificationRoutes from './routes/notification.route.js'
import { UserStatus } from './models/userStatus.model.js';
dotenv.config();

mongoose
  .connect(process.env.MONGODB)
  .then(() => console.log('Connected to Database!'))
  .catch((err) => console.error(err));

const __dirname = path.resolve();
const app = express();
const server = http.createServer(app); // Ensure Express and WebSocket share the same server

const io = new Server(server, {
  cors: {
    origin: process.env.APP_ORIGIN, // Ensure this matches your frontend origin
    methods: ["GET", "POST","PUT","DELETE"],
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: process.env.APP_ORIGIN, credentials: true }));

app.use('/api', protectedRoutes);
app.use('/api/auth', authRouter);
app.use('/api/guest', guestRouter);
app.use('/api/user', userRouter);
app.use('/api/sessions', sessionRouter);
app.use('/api/verifications', verificationsRouter);
app.use('/api/post', postRouter);
app.use("/api/notifications", notificationRoutes);
app.use(express.static(path.join(__dirname, '/client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return res.status(statusCode).json({ success: false, statusCode, message });
});

// ✅ Store online users in memory
let onlineUsers = {};

// ✅ Handle WebSocket Connections
io.on("connection", async (socket) => {
  const userId = socket.handshake.query.userId;

  socket.on("joinPostRoom", (postId) => {
    console.log(`👥 User ${socket.id} joined post room: ${postId}`);
    socket.join(postId); // ✅ Joins a dynamic room based on postId
  });

  // ✅ Leave post room when user navigates away
  socket.on("leavePostRoom", (postId) => {
    console.log(`👤 User ${socket.id} left post room: ${postId}`);
    socket.leave(postId);
  });

  // ✅ Broadcast new comments only to users in the same post room
  socket.on("newComment", ({ postId, comment }) => {
    console.log(`📢 Broadcasting new comment to room: ${postId}`);

    if (comment.includesBadWords) {
      // 🚀 Emit censored version for non-admins
      io.to(postId).emit("CommentReplyBadWord", {
        postId,
        comment: { ...comment, content: "****" },
      });
    } else {
      io.to(postId).emit("newComment", { postId, comment });
    }
  });

  // ✅ Broadcast **new reply** & censor it if needed
  socket.on("newReply", ({ postId, commentId, reply }) => {
    console.log(`📢 Broadcasting new reply to room: ${postId}`);

    if (reply.includesBadWords) {
      // 🚀 Emit censored version for non-admins
      io.to(postId).emit("CommentReplyBadWord", {
        postId,
        commentId,
        reply: { ...reply, content: "****" },
      });
    } else {
      io.to(postId).emit("newReply", { postId, commentId, reply });
    }
  });
  socket.on("commentDeleted", ({ postId, commentId }) => {
    console.log(`📢 Broadcasting comment deletion to room: ${postId}`);
    io.to(postId).emit("commentDeleted", { postId, commentId });
  });
  

  // 🚀 Broadcast reply deletion to post room
  socket.on("replyDeleted", ({ postId, commentId, replyId }) => {
    console.log(`📢 Broadcasting reply deletion to room: ${postId}`);
    io.emit("replyDeleted", { postId, commentId, replyId });
  });
  if (userId) {
    try {
      // ✅ Update or create user status in the database
      await UserStatus.findOneAndUpdate(
        { userId },
        { socketId: socket.id, status: "online" },
        { upsert: true, new: true }
      );
      // ✅ Update local memory
      onlineUsers[userId] = { socketId: socket.id, status: "online" };

      console.log(`🟢 User ${userId} is ONLINE`);

      // ✅ Broadcast updated online users list
      const users = await UserStatus.find({});
      io.emit("onlineUsers", users);

      // ✅ Fetch and send unread notifications to the user
      const unreadNotifications = await Notification.find({ userId, read: false });

      if (unreadNotifications.length > 0) {
        console.log(`📬 Sending stored notifications to user: ${userId}`);
        io.to(socket.id).emit("newNotification", unreadNotifications);
      }
    } catch (error) {
      console.error("❌ Error handling user connection:", error);
    }
  }

  socket.on("away", async () => {
    if (userId) {
      await UserStatus.findOneAndUpdate({ userId }, { status: "away" });

      onlineUsers[userId].status = "away";
      console.log(`🟡 User ${userId} is AWAY`);

      const users = await UserStatus.find({});
      io.emit("onlineUsers", users);
    }
  });

  socket.on("back", async () => {
    if (userId) {
      await UserStatus.findOneAndUpdate({ userId }, { status: "online" });

      onlineUsers[userId].status = "online";
      console.log(`🟢 User ${userId} is BACK ONLINE`);

      const users = await UserStatus.find({});
      io.emit("onlineUsers", users);
    }
  });

  socket.on("disconnect", async () => {
    if (userId) {
      console.log(`🔴 User ${userId} is OFFLINE`);

      await UserStatus.findOneAndUpdate({ userId }, { status: "offline" });

      onlineUsers[userId].status = "offline";

      const users = await UserStatus.find({});
      io.emit("onlineUsers", users);
    }
  });
});


export { io };
// Start the server
server.listen(3000, () => {
  console.log("🚀 Server Started on Port 3000");
});