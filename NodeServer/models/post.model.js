import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    postOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    images: {
      type: Array,
      required: false,
    },
    videos: {
        type: Array,
        required: false,
      },
    content: {
        type: String,
        required: false,
      },
      postUID: {
        type: String,
        required: true,
   },
    isImageAttached: {
        type: Boolean,
        default : false,
      },
    locationCity: {
        type: String,
        required: false,
      },
      likes: {
        type: Number,
        default : 0,
      },
      commentCount: {
        type: Number,
        default : 0,
      },
      shares: {
        type: Number,
        default : 0,
      },
      comments: {
        type: Array,
        required: false,
      },
      locationCountry: {
        type: String,
        required: false,
      },
    },

  { timestamps: true }
);

const Post = mongoose.model('Post', postSchema);

export default Post;
