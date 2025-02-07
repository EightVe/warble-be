import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    commenterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: false,
    },
    likesCount: {
        type: Number,
        default: 0,
      },
      likedBy: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      replies: [
        {
          commenterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          content: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
          includesBadWords: {
            type: Boolean, // Store image URL
            required: true,
          },
          isDeleted: { type: Boolean, default: false },
        }
      ],
    image: {
      type: String, // Store image URL
      required: false,
    },
    includesBadWords: {
        type: Boolean, // Store image URL
        required: true,
      },
      isDeleted: { type: Boolean, default: false },
    video: {
      type: String, // Store video URL
      required: false,
    },
  },
  { timestamps: true }
);

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;