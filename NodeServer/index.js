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
import dashboardRouter from './routes/admin.route.js'
import reportRouter from './routes/report.route.js'
import userRouter from './routes/user.route.js';
import verificationsRouter from './routes/verifications.route.js';
import postRouter from './routes/post.router.js';
import { Notification } from './models/notification.model.js';
import notificationRoutes from './routes/notification.route.js'
import { UserStatus } from './models/userStatus.model.js';
import { PeerOnline } from './models/PeerOnline.model.js';
import axios from 'axios';
import setupWebRTC from './utils/webrtcMatching.js'; 
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
    origin: [
// Main domain
"https://warble.chat",
"http://warble.chat",
"https://www.warble.chat",
"http://www.warble.chat",

// ID subdomain
"https://id.warble.chat",
"http://id.warble.chat",
"https://www.id.warble.chat",
"http://www.id.warble.chat",

// Dashboard subdomain
"https://dashboard.warble.chat",
"http://dashboard.warble.chat",
"https://www.dashboard.warble.chat",
"http://www.dashboard.warble.chat",

// Support subdomain
"https://support.warble.chat",
"http://support.warble.chat",
"https://www.support.warble.chat",
"http://www.support.warble.chat",

// App subdomain
"https://app.warble.chat",
"http://app.warble.chat",
"https://www.app.warble.chat",
"http://www.app.warble.chat",

// Demo subdomain
"https://demo9alawat.warble.chat",
"http://demo9alawat.warble.chat",
"https://www.demo9alawat.warble.chat",
"http://www.demo9alawat.warble.chat",

// Development
"http://localhost:5173",
"http://127.0.0.1:5173"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});
setupWebRTC(io);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: [
// Main domain
"https://warble.chat",
"http://warble.chat",
"https://www.warble.chat",
"http://www.warble.chat",

// ID subdomain
"https://id.warble.chat",
"http://id.warble.chat",
"https://www.id.warble.chat",
"http://www.id.warble.chat",

// Dashboard subdomain
"https://dashboard.warble.chat",
"http://dashboard.warble.chat",
"https://www.dashboard.warble.chat",
"http://www.dashboard.warble.chat",

// Support subdomain
"https://support.warble.chat",
"http://support.warble.chat",
"https://www.support.warble.chat",
"http://www.support.warble.chat",

// App subdomain
"https://app.warble.chat",
"http://app.warble.chat",
"https://www.app.warble.chat",
"http://www.app.warble.chat",

// Demo subdomain
"https://demo9alawat.warble.chat",
"http://demo9alawat.warble.chat",
"https://www.demo9alawat.warble.chat",
"http://www.demo9alawat.warble.chat",

// Development
"http://localhost:5173",
"http://127.0.0.1:5173"
  ],
  credentials: true,
}));

app.use('/api', protectedRoutes);
app.use('/api/auth', authRouter);
app.use('/api/guest', guestRouter);
app.use('/api/user', userRouter);
app.use('/api/sessions', sessionRouter);
app.use('/api/verifications', verificationsRouter);
app.use('/api/post', postRouter);
app.use('/api/dash', dashboardRouter);
app.use('/api/report', reportRouter);
app.use("/api/notifications", notificationRoutes);
app.use(express.static(path.join(__dirname, '/client/dist')));
app.get('/api/health', async (req, res) => {
  try {
    // Simulate internal service checks if needed
    // Example: await db.ping(), await someService.status()

    res.status(200).json({
      status: 'OK',
      message: 'WARBLE API STATUS : 200 (OK)',
      timestamp: new Date(),
    })
  } catch (err) {
    console.error("Health check failed:", err)
    res.status(503).json({
      status: 'DOWN',
      message: 'WARBLE API is currently unreachable.',
      timestamp: new Date(),
    })
  }
})
app.get('/', (req, res) => {
  res.send('🌐 WARBLE API is Running.');
});
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return res.status(statusCode).json({ success: false, statusCode, message });
});
let onlineUsers = {};
let waitingUsers = [];
let activePairs = new Map();
const roomUsers = {}; 
io.on("connection", async (socket) => {
  const userId = socket.handshake.query.userId;
  socket.on('JoinPeeringVideo', ({ roomId, user }) => {
    socket.join(roomId);
    if (!roomUsers[roomId]) roomUsers[roomId] = [];

    roomUsers[roomId].push({ ...user, socketId: socket.id });

    io.to(roomId).emit('RoomUpdate', {
      users: roomUsers[roomId],
      count: roomUsers[roomId].length,
    });
  });

  // User leaves a room
  socket.on('LeavePeeringVideo', ({ roomId, userId }) => {
    if (roomUsers[roomId]) {
      roomUsers[roomId] = roomUsers[roomId].filter((u) => u._id !== userId);
      socket.leave(roomId);
      io.to(roomId).emit('RoomUpdate', {
        users: roomUsers[roomId],
        count: roomUsers[roomId].length,
      });
    }
  });

  // Start matching process


  // Handle WebRTC signaling data exchange


  socket.on("joinPostRoom", (postId) => {

    socket.join(postId); // ✅ Joins a dynamic room based on postId
  });

  // ✅ Leave post room when user navigates away
  socket.on("leavePostRoom", (postId) => {

    socket.leave(postId);
  });
  // ✅ Broadcast new comments only to users in the same post room
  socket.on("newComment", ({ postId, comment }) => {


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
  socket.on("postLiked", ({ postId, likes }) => {

    io.to(postId).emit("postLiked", { postId, likes });
  });

  // ✅ Listen for post unlikes and update clients
  socket.on("postUnliked", ({ postId, likes }) => {

    io.to(postId).emit("postUnliked", { postId, likes });
  });
  // ✅ Broadcast **new reply** & censor it if needed
  socket.on("newReply", ({ postId, commentId, reply }) => {


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

    io.to(postId).emit("commentDeleted", { postId, commentId });
  });
  

  // 🚀 Broadcast reply deletion to post room
  socket.on("replyDeleted", ({ postId, commentId, replyId }) => {

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



      // ✅ Broadcast updated online users list
      const users = await UserStatus.find({});
      io.emit("onlineUsers", users);

      // ✅ Fetch and send unread notifications to the user
      const unreadNotifications = await Notification.find({ userId, read: false });

      if (unreadNotifications.length > 0) {

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

      const users = await UserStatus.find({});
      io.emit("onlineUsers", users);
    }
  });

  socket.on("back", async () => {
    if (userId) {
      await UserStatus.findOneAndUpdate({ userId }, { status: "online" });

      onlineUsers[userId].status = "online";


      const users = await UserStatus.find({});
      io.emit("onlineUsers", users);
    }
  });

  socket.on("disconnect", async () => {
     waitingUsers = waitingUsers.filter((id) => id !== socket.id);
    const partner = activePairs.get(socket.id);
    if (partner) {
      io.to(partner).emit("partnerDisconnected");
      activePairs.delete(partner);
    }
    for (const roomId in roomUsers) {
      roomUsers[roomId] = roomUsers[roomId].filter((u) => u.socketId !== socket.id);
      io.to(roomId).emit('RoomUpdate', {
        users: roomUsers[roomId],
        count: roomUsers[roomId].length,
      });
    }
    if (userId) {


      await UserStatus.findOneAndUpdate({ userId }, { status: "offline" });

      onlineUsers[userId].status = "offline";

      const users = await UserStatus.find({});
      io.emit("onlineUsers", users);
    }
    try {
      const user = await PeerOnline.findOne({ socketId: socket.id });

      if (user) {
          await PeerOnline.findOneAndUpdate({ socketId: socket.id }, { status: 'offline' });

          console.log(`👤 User ${user.username} is now offline.`);
      }

      // Remove from active pairs and waiting list
      const partner = activePairs.get(socket.id);
      if (partner) {
          io.to(partner).emit("partnerDisconnected");
          activePairs.delete(partner);
      }

      waitingUsers = waitingUsers.filter((id) => id !== socket.id);

      // Emit updated peer list
      const allPeers = await PeerOnline.find({ status: 'online' });
      io.emit('updatePeerList', allPeers);
  } catch (error) {
      console.error("❌ Error handling user disconnect:", error);
  }
  });
});


export { io };
// Start the server
server.listen(3000, () => {
  console.log("🚀 Server Started on Port 3000");
});