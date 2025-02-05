import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    likerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      relatedPost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
      },
      status: {
        type: Boolean, // true = liked, false = unliked
        default: true,
      },
    },

  { timestamps: true }
);

const Like = mongoose.model('Like', likeSchema);

export default Like;
