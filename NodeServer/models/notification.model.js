import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Receiver
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Who performed the action
    type: { type: String, enum: ["CommentLike", "CommentReply", "CommentPost", "PostLike","ReplyToReply","System",
        "MentionReply","commentDeleted"
    ], required: true },
    title: { type: String, required: true }, // Notification title
    description: { type: String, required: false }, // Short message
    userAvatar: { type: String }, // Avatar of the sender
    read: { type: Boolean, default: false }, // Has the notification been read?
    createdAt: { type: Date, default: Date.now },


    commentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", required: false },
    replyId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", required: false }, // Pass the comment ID
    postUID: { type: String, required: false },
    forceOpen: { type: Boolean, default: false },
    AdminAnnouncement : {type : String, required:false},
    likerId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", required: false },

},
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);