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
import { PeerOnline } from './models/PeerOnline.model.js';
import User from './models/user.model.js';
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
let waitingUsers = [];
let activePairs = new Map();
let previousMatches = new Map();
let PeerOnlineUsers = {};

io.on("connection", async (socket) => {
  const userId = socket.handshake.query.userId;

  socket.emit("socketId", socket.id);

  socket.on(
    "initiateCall",
    ({ targetId, signalData, senderId, senderName }) => {
      io.to(targetId).emit("incomingCall", {
        signal: signalData,
        from: senderId,
        name: senderName,
      });
    }
  );

  socket.on("changeMediaStatus", ({ mediaType, isActive }) => {
    socket.broadcast.emit("mediaStatusChanged", {
      mediaType,
      isActive,
    });
  });

  socket.on("sendMessage", ({ targetId, message, senderName }) => {
    io.to(targetId).emit("receiveMessage", { message, senderName });
  });

  socket.on("answerCall", (data) => {
    socket.broadcast.emit("mediaStatusChanged", {
      mediaType: data.mediaType,
      isActive: data.mediaStatus,
    });
    io.to(data.to).emit("callAnswered", data);
  });

  socket.on("terminateCall", ({ targetId }) => {
    io.to(targetId).emit("callTerminated");
  });


  socket.on("joinPeerPage", async ({ userId, username, profilePic }) => {
    if (!userId || !username) {
        console.error("❌ Missing user data on joinPeerPage:", { userId, username, profilePic });
        return;
    }

    try {
        const existingUser = await PeerOnline.findOne({ userId });

        if (!existingUser) {
            // ✅ If the user is new, create an entry
            await PeerOnline.create({
                userId,
                socketId: socket.id,
                username,
                profilePic,
                status: "online"
            });
        } else {
            // ✅ If the user already exists, update the socket ID & status
            await PeerOnline.updateOne(
                { userId },
                { socketId: socket.id, status: "online" }
            );
        }

        console.log(`✅ User added to PeerOnline DB: ${userId} (${username})`);
    } catch (error) {
        console.error("❌ Error saving user to PeerOnline:", error);
    }

    // Emit updated peer list
    const allPeers = await PeerOnline.find({ status: "online" });
    io.emit("updatePeerList", allPeers);
});




  socket.on("cameraStateChange", (state) => {
    const partner = activePairs.get(socket.id);
    if (partner) {
      io.to(partner).emit("partnerCameraStateChange", state);
    }
  });

  socket.on("micStateChange", (state) => {
    const partner = activePairs.get(socket.id);
    if (partner) {
      io.to(partner).emit("partnerMicStateChange", state);
    }
  });
  socket.on("offer", (offer, partnerId) => {
    console.log(`📨 Sending offer from ${socket.id} to ${partnerId}`);
    io.to(partnerId).emit("offer", offer, socket.id);
});

socket.on("answer", (answer, partnerId) => {
    console.log(`📨 Sending answer from ${socket.id} to ${partnerId}`);
    io.to(partnerId).emit("answer", answer);
});

socket.on("iceCandidate", (candidate, partnerId) => {
    console.log(`📨 Sending ICE candidate from ${socket.id} to ${partnerId}`);
    io.to(partnerId).emit("iceCandidate", candidate);
});


  socket.on("newStream", ({ userId, stream }) => {
    const partner = activePairs.get(socket.id);
    if (partner) {
        io.to(partner).emit("partnerStream", { stream });
    }
});

  socket.on('leavePeerPage', async () => {
    if (PeerOnlineUsers[socket.id]) {
      await PeerOnline.findOneAndUpdate(
        { userId: PeerOnlineUsers[socket.id].userId },
        { status: 'offline' }
      );
      delete PeerOnlineUsers[socket.id];
      io.emit('updatePeerList', Object.values(PeerOnlineUsers));
    }
  });
  socket.on("startChat", async () => {
    console.log("🔎 Waiting users before matching:", waitingUsers);

    if (waitingUsers.length > 0) {
        let partner = waitingUsers.find((user) => user !== socket.id);
        if (!partner) {
            waitingUsers.push(socket.id);
            return;
        }

        // ✅ Ensure both users exist in PeerOnline before proceeding
        const userOnline = await PeerOnline.findOne({ socketId: socket.id });
        const partnerOnline = await PeerOnline.findOne({ socketId: partner });

        if (!userOnline || !partnerOnline) {
            console.error("❌ Online user records missing in PeerOnline.");
            return;
        }

        // Remove matched users from waiting list
        waitingUsers = waitingUsers.filter((user) => user !== partner);
        activePairs.set(socket.id, partner);
        activePairs.set(partner, socket.id);

        try {
            // ✅ Fetch user details from the User collection
            const userUser = await User.findOne({ _id: userOnline.userId }).select("username avatar");
            const partnerUser = await User.findOne({ _id: partnerOnline.userId }).select("username avatar");

            if (userUser && partnerUser) {
                const userDetails = {
                    userId: userOnline.userId,
                    socketId: userOnline.socketId,
                    username: userUser.username,
                    profilePic: userUser.avatar,
                    status: userOnline.status
                };

                const partnerDetails = {
                    userId: partnerOnline.userId,
                    socketId: partnerOnline.socketId,
                    username: partnerUser.username,
                    profilePic: partnerUser.avatar,
                    status: partnerOnline.status
                };

                console.log(`✅ Match found: ${userDetails.username} ⇄ ${partnerDetails.username}`);

                io.to(socket.id).emit("matchFound", { partnerId: partner, partnerDetails });
                io.to(partner).emit("matchFound", { partnerId: socket.id, partnerDetails: userDetails });
            } else {
                console.error("❌ User details missing in the database.");
            }
        } catch (error) {
            console.error("❌ Database error while fetching partner details:", error);
        }
    } else {
        waitingUsers.push(socket.id);
    }
});






  socket.on("skipChat", () => {
    const partner = activePairs.get(socket.id);
    if (partner) {
      io.to(partner).emit("partnerDisconnected");
      activePairs.delete(partner);
      activePairs.delete(socket.id);
    }
    waitingUsers.push(socket.id);
    socket.emit("skipSuccess");
    socket.emit("startChat");
  });

  socket.on("endChat", () => {
    const partner = activePairs.get(socket.id);
    if (partner) {
      io.to(partner).emit("partnerDisconnected");
      activePairs.delete(partner);
    }
    waitingUsers = waitingUsers.filter((id) => id !== socket.id);
  });



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