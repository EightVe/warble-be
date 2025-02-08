import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import crypto from 'crypto';
import Like from "../models/like.model.js";
import Comment from "../models/comment.model.js";
import { BAD_WORDS } from "../utils/badwords.js";
import { sendNotification } from "./notification.controller.js";
import { Notification } from "../models/notification.model.js";
import { io } from "../index.js";
// Create a new post
// Function to generate a 30-character string
  const generatePostUID = () => {
    return crypto.randomBytes(60).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 60);
  };

  // Create a new post
  export const createPost = async (req, res) => {
    try {
      const { postOwner, images, videos, shares, likes, comments, locationCity, locationCountry, isImageAttached, content } = req.body;
      // Check if required fields are present
      if (!postOwner || !content) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      const postUID = generatePostUID();

      const post = new Post({
        postOwner,
        images,
        locationCity,
        locationCountry,
        isImageAttached: isImageAttached ?? false,  // Set default if not provided
        content,
        videos,
        shares,
        comments,
        likes,
        postUID,
      });

      await post.save();
      res.status(201).json({ success: true, post });
    } catch (error) {
      console.error('Error creating post:', error); // Log the error
      res.status(500).json({ success: false, message: 'Failed to create post', error });
    }
  };

// Edit a post
export const editPost = async (req, res) => {
  try {
    const { postId, updatedFields } = req.body;

    const post = await Post.findByIdAndUpdate(postId, updatedFields, { new: true });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    res.status(200).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to edit post', error });
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.body;

    const post = await Post.findByIdAndDelete(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    res.status(200).json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete post', error });
  }
};

// Get posts of a specific user
export const getUserPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const { skip } = req.query;
    const limit = 5;
    const skipValue = /^\d+$/.test(skip) ? Number(skip) : 0;

    let posts = await Post.find({ postOwner: id })
      .populate("postOwner", "firstName lastName avatar username city country")
      .sort({ createdAt: -1 })
      .skip(skipValue)
      .limit(limit);

    let totalPosts = await Post.countDocuments({ postOwner: id });

    // Correctly determine if there are more posts to fetch
    const morePostsExist = skipValue + posts.length < totalPosts;

    return res.status(200).json({ success: true, posts, hasMore: morePostsExist });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ success: false, message: "Failed to fetch posts", error });
  }
};
export const getAllPosts = async (req, res) => {
  try {
    const { city, country, skip } = req.query;
    const limit = 5;
    const skipValue = /^\d+$/.test(skip) ? Number(skip) : 0;

    let filter = {};
    if (city) filter.locationCity = city;
    if (country) filter.locationCountry = country;


    let posts = await Post.find(filter)
      .populate("postOwner", "firstName lastName avatar username city country")
      .sort({ createdAt: -1 })
      .skip(skipValue)
      .limit(limit);

    let totalPosts = await Post.countDocuments(filter);

    // **🛠 Fix: If no posts found, fetch global posts & reset pagination**
    if (posts.length === 0 && (city || country)) {

      filter = {}; // Reset filter to fetch all posts
      posts = await Post.find({})
        .populate("postOwner", "firstName lastName avatar username city country")
        .sort({ createdAt: -1 })
        .skip(skipValue)
        .limit(limit);
      
      totalPosts = await Post.countDocuments(); // Update total count to all posts
    }

    // **🛠 Fix: Correctly determine if there are more posts to fetch**
    const morePostsExist = skipValue + posts.length < totalPosts;

    return res.status(200).json({ success: true, posts, hasMore: morePostsExist });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ success: false, message: "Failed to fetch posts", error });
  }
};

  

// Get posts of people the user follows
export const getPostsOfYourFollowList = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('following', '_id');

    const followingIds = user.following.map((f) => f._id);

    const posts = await Post.find({ postOwner: { $in: followingIds } }).populate('postOwner', 'name avatar');
    res.status(200).json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch following posts', error });
  }
};



export const getSinglePost = async (req, res) => {
  try {
    const { postUID } = req.params;

    // Find post using postUID to get the actual _id
    const postWithID = await Post.findOne({ postUID }).select("_id");

    if (!postWithID) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    // Fetch the full post using the _id
    const post = await Post.findById(postWithID._id)
      .populate("postOwner", "firstName lastName avatar username city country");

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    return res.status(200).json({ success: true, post });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ success: false, message: "Failed to fetch post", error });
  }
};



/**
 * @desc Like a post
 * @route POST /post/like/:postId
 * @access Private
 */
export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    console.log(`📩 Like request for Post ID: ${postId} by User ID: ${userId}`);

    // 🚀 Fetch the post and its postUID
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    
    const postUID = post.postUID; // ✅ Extract postUID from post

    // 🚀 Check if user already liked this post
    let like = await Like.findOne({ likerId: userId, relatedPost: postId });

    if (like) {
      if (like.status) {
        return res.status(400).json({ success: false, message: "You have already liked this post" });
      }
      // ✅ If user previously unliked, just set status to true
      like.status = true;
      await like.save();

      // ✅ Update existing notification instead of resending
      const existingNotification = await Notification.findOne({
        userId: post.postOwner, 
        senderId: userId, 
        type: "PostLike",
        postUID, 
      });

      if (existingNotification) {
        await Notification.updateOne({ _id: existingNotification._id }, { read: false });
        console.log(`🔄 Marked notification as unread for post ${postId}`);
      }

      return res.status(200).json({ success: true, liked: true, likes: post.likes });
    }

    // ✅ If user never liked before, create a new like
    like = await Like.create({ ownerId: post.postOwner, likerId: userId, relatedPost: postId, status: true });

    // ✅ Increment like count in post
    post.likes += 1;
    await post.save();

    // ✅ Prevent sending notifications for self-likes
    if (post.postOwner.toString() === userId) {
      return res.status(200).json({ success: true, liked: true, likes: post.likes, message: "Self-like, no notification sent" });
    }

    // ✅ Check if notification exists
    const existingNotification = await Notification.findOne({
      userId: post.postOwner, 
      senderId: userId, 
      type: "PostLike",
      postUID,
    });

    if (existingNotification) {
      console.log(`🔕 Notification already exists for post ${postId}, marking as unread if necessary.`);
      await Notification.updateOne({ _id: existingNotification._id }, { read: false });

      return res.status(200).json({
        success: true,
        liked: true,
        likes: post.likes,
        message: "Existing notification updated (marked as unread).",
      });
    }

    // ✅ Send new notification
    await sendNotification(
      post.postOwner,
      userId,
      "PostLike",
      `${await User.findById(userId).then(user => user.firstName)} liked your post.`,
      "",
      await User.findById(userId).then(user => user.avatar),
      null, // No comment ID needed
      postUID
    );

    console.log(`📩 Sent new notification for post ${postId}`);

    return res.status(200).json({ success: true, liked: true, likes: post.likes, message: "Post liked and notification sent" });

  } catch (error) {
    console.error("❌ Error liking post:", error);
    res.status(500).json({ success: false, message: "Failed to like post" });
  }
};




export const removeLikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Find the like entry
    const like = await Like.findOne({ likerId: userId, relatedPost: postId });

    if (!like || !like.status) {
      return res.status(400).json({ success: false, message: "You have not liked this post" });
    }

    // Remove like entry completely from the database
    await Like.deleteOne({ _id: like._id });

    // Decrease like count but ensure it doesn't go below 0
    const post = await Post.findById(postId);
    if (post) {
      post.likes = Math.max(post.likes - 1, 0);
      await post.save();
    }

    return res.status(200).json({ success: true, liked: false, likes: post.likes });
  } catch (error) {
    console.error("Error removing like:", error);
    res.status(500).json({ success: false, message: "Failed to remove like" });
  }
};

/**
 * @desc Check if user liked a post
 * @route GET /post/check-like/:postId
 * @access Private
 */
export const checkLikeStatus = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Check if there's an active like (status: true)
    const like = await Like.findOne({ likerId: userId, relatedPost: postId, status: true });

    return res.status(200).json({ success: true, liked: !!like });
  } catch (error) {
    console.error("Error checking like status:", error);
    res.status(500).json({ success: false, message: "Failed to check like status" });
  }
};



/**
 * @desc Add a comment to a post
 * @route POST /post/add-comment/:postId
 * @access Private
 */






export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, replyTo, image, video } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user?.isAdmin;
    // ✅ Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    // ✅ Check for bad words
    const includesBadWords = BAD_WORDS.some((word) =>
      new RegExp(`\\b${word}\\b`, "i").test(content)
    );
    const censorText = (text) => {
      return BAD_WORDS.reduce((acc, word) => {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        return acc.replace(regex, "****");
      }, text);
    };
    const censoredContent = includesBadWords ? censorText(content) : content;
    // ✅ Extract mentioned usernames from the content (e.g., "@username")
    const mentionedUsernames = content.match(/@(\w+)/g)?.map((m) => m.slice(1)) || [];

    if (replyTo) {
      console.log(`🔄 Fetching parent comment for ReplyTo: ${replyTo}`);

      // 🚀 Find the parent comment
      const parentComment = await Comment.findById(replyTo)
        .populate("commenterId", "firstName lastName avatar username");

      if (!parentComment) {
        return res.status(404).json({ success: false, message: "Parent comment not found" });
      }

      console.log(`✅ Found Parent Comment - ID: ${parentComment._id}, Owner: ${parentComment.commenterId.username}`);

      // ✅ Create a new `_id` manually for the reply
      const replyId = new mongoose.Types.ObjectId();

      // 🚀 Reply object
      const reply = {
        _id: replyId,
        commenterId: userId,
        content,
        includesBadWords,
        createdAt: new Date(),
      };

      parentComment.replies.push(reply);
      await parentComment.save();

      // ✅ Increment total comment count in the post
      post.comments.push(replyId);
      await post.save();

      // 🚀 Prevent duplicate notifications
      let repliedNotificationSent = false;

      // ✅ Notify **original comment owner** if they are not the sender
      if (parentComment.commenterId._id.toString() !== userId) {
        console.log(`📩 Sending "Replied to your comment" notification to: ${parentComment.commenterId.username}`);

        await sendNotification(
          parentComment.commenterId._id.toString(),
          userId,
          "CommentReply",
          `${(await User.findById(userId)).firstName} replied to your comment.`,
          "",
          (await User.findById(userId)).avatar,
          parentComment._id,
          post.postUID,
          replyId
        );

        repliedNotificationSent = true;
      }

      // ✅ Notify **mentioned users** in replies
      if (mentionedUsernames.length > 0) {
        const mentionedUsers = await User.find({ username: { $in: mentionedUsernames } });

        for (const mentionedUser of mentionedUsers) {
          if (mentionedUser._id.toString() !== userId && mentionedUser._id.toString() !== parentComment.commenterId._id.toString()) {
            console.log(`📩 Sending "Mentioned you in a reply" notification to: ${mentionedUser.username}`);

            await sendNotification(
              mentionedUser._id.toString(),
              userId,
              "MentionReply",
              `${(await User.findById(userId)).firstName} mentioned you in a reply.`,
              "",
              (await User.findById(userId)).avatar,
              parentComment._id,
              post.postUID,
              replyId
            );
          }
        }
      }

      // ✅ **Return populated reply**
      const populatedReply = await Comment.findById(replyTo).populate("replies.commenterId", "firstName lastName avatar username");
      const replyToEmit = {
        ...populatedReply.replies[populatedReply.replies.length - 1].toObject(),
        content: isAdmin ? content : censoredContent, // ✅ Censor for non-admins
      };
      
      // ✅ Always include `commentId` and `reply`
      io.to(postId).emit(includesBadWords ? "CommentReplyBadWord" : "newReply", {
        postId,
        commentId: replyTo, // ✅ Ensure the comment ID is sent
        reply: replyToEmit,
      });
      
      return res.status(201).json({ success: true, reply: replyToEmit });
    } else {
      // 🚀 Normal comment
      let comment = await Comment.create({
        postId,
        commenterId: userId,
        content,
        image,
        video,
        includesBadWords,
      });

      // 🚀 Populate `commenterId`
      comment = await comment.populate("commenterId", "firstName lastName avatar username");

      // ✅ Increment total comment count in the post
      post.comments.push(comment._id);
      await post.save();

      // ✅ Send notification to **post owner**
      if (post.postOwner.toString() !== userId) {
        console.log(`📩 Sending "Commented on your post" notification to: ${post.postOwner}`);

        await sendNotification(
          post.postOwner.toString(),
          userId,
          "CommentPost",
          `${(await User.findById(userId)).firstName} commented on your post.`,
          "",
          (await User.findById(userId)).avatar,
          comment._id,
          post.postUID,
          null
        );
      }

      // ✅ Notify **mentioned users** in comments
      if (mentionedUsernames.length > 0) {
        const mentionedUsers = await User.find({ username: { $in: mentionedUsernames } });

        for (const mentionedUser of mentionedUsers) {
          if (mentionedUser._id.toString() !== userId) {
            console.log(`📩 Sending "Mentioned you in a comment" notification to: ${mentionedUser.username}`);

            await sendNotification(
              mentionedUser._id.toString(),
              userId,
              "MentionComment",
              `${(await User.findById(userId)).firstName} mentioned you in a comment.`,
              "",
              (await User.findById(userId)).avatar,
              comment._id,
              post.postUID,
              null
            );
          }
        }
      }
      const commentToEmit = {
        ...comment.toObject(),
        content: isAdmin ? content : censoredContent, // ✅ Censor for non-admins
      };
      io.to(postId).emit(includesBadWords ? "CommentReplyBadWord" : "newComment", {
        postId,
        comment: commentToEmit,
        commentsCount: post.comments.length
      });

      return res.status(201).json({ success: true, comment: commentToEmit });
    }
  } catch (error) {
    console.error("❌ Error adding comment:", error);
    res.status(500).json({ success: false, message: "Failed to add comment" });
  }
};





















export const getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.query;
    const user = await User.findById(userId);
    const isAdmin = user?.isAdmin;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    console.log(`Fetching comments for Post ID: ${postId}, Page: ${page}, Limit: ${limit}, Skip: ${skip}`);

    const comments = await Comment.find({ postId, isDeleted: false })
      .populate("commenterId", "firstName lastName avatar username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalComments = await Comment.countDocuments({ postId, isDeleted: false });

    // ✅ Fix bad word filtering
    const censorText = (text) => {
      let censoredText = text;
      BAD_WORDS.forEach((word) => {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        censoredText = censoredText.replace(regex, "****");
      });
      return censoredText;
    };

    // ✅ Apply filtering for non-admins
    const commentsWithFilteredText = comments.map((comment) => ({
      ...comment.toObject(),
      content: isAdmin ? comment.content : comment.includesBadWords ? censorText(comment.content) : comment.content,
    }));
    return res.status(200).json({
      success: true,
      comments: commentsWithFilteredText,
      hasMore: totalComments > skip + comments.length,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ success: false, message: "Failed to fetch comments" });
  }
};



export const getSinglePostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    let { userId, commentId, replyId } = req.query; // Now includes replyId

    const user = await User.findById(userId);
    const isAdmin = user?.isAdmin;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    console.log(`Fetching comments for Post ID: ${postId}, Page: ${page}, Limit: ${limit}, Skip: ${skip}`);

    let requestedComment = null;
    let requestedReply = null;

    // ✅ Validate and fetch the comment if commentId is provided
    if (commentId && mongoose.Types.ObjectId.isValid(commentId)) {
      requestedComment = await Comment.findOne({ _id: commentId, postId }).populate(
        "commenterId",
        "firstName lastName avatar username"
      );

      // ✅ If a replyId exists, find the reply within this comment
      if (replyId && mongoose.Types.ObjectId.isValid(replyId) && requestedComment) {
        requestedReply = requestedComment.replies.find((reply) => reply._id.toString() === replyId);
      }
    } else {
      console.log("⚠️ Invalid comment ID, switching to normal comment fetching...");
      commentId = null;
    }

    // ✅ Fetch normal comments (excluding the requested one if found)
    const commentsQuery = Comment.find({ postId });
    if (requestedComment) {
      commentsQuery.where("_id").ne(commentId); // Exclude the requested comment
    }

    const comments = await commentsQuery
      .populate("commenterId", "firstName lastName avatar username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalComments = await Comment.countDocuments({ postId });

    const censorText = (text) => {
      let censoredText = text;
      BAD_WORDS.forEach((word) => {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        censoredText = censoredText.replace(regex, "****");
      });
      return censoredText;
    };

    // ✅ Apply filtering for non-admins
    const commentsWithFilteredText = comments.map((comment) => ({
      ...comment.toObject(),
      content: isAdmin ? comment.content : comment.includesBadWords ? censorText(comment.content) : comment.content,
    }));

    // ✅ If requested comment exists, place it at the top
    if (requestedComment) {
      let modifiedComment = {
        ...requestedComment.toObject(),
        content: isAdmin
          ? requestedComment.content
          : requestedComment.includesBadWords
          ? censorText(requestedComment.content)
          : requestedComment.content,
      };

      // ✅ If a replyId exists, move that reply to the top inside replies
      if (requestedReply) {
        modifiedComment.replies = [
          requestedReply,
          ...modifiedComment.replies.filter((reply) => reply._id.toString() !== replyId),
        ];
      }

      commentsWithFilteredText.unshift(modifiedComment);
    }

    return res.status(200).json({
      success: true,
      comments: commentsWithFilteredText,
      hasMore: totalComments > skip + comments.length,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ success: false, message: "Failed to fetch comments" });
  }
};







export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const post = await Post.findById(comment.postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const isAdmin = req.user.isAdmin;
    const isCommentOwner = comment.commenterId.toString() === userId;
    const isPostOwner = post.postOwner.toString() === userId;

    if (!isAdmin && !isCommentOwner && !isPostOwner) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    comment.isDeleted = true;
    await comment.save();
    post.commentsCount = await Comment.countDocuments({ postId: comment.postId, isDeleted: false });
    await post.save();
    // 🚀 Emit real-time deletion event
    io.to(comment.postId.toString()).emit("commentDeleted", { postId: comment.postId.toString(), commentId });


    // 🚀 Send notification if deleted by an admin
    if (isAdmin) {
      await sendNotification(
        comment.commenterId.toString(),
        userId,
        "commentDeleted",
        `Deleted by Admin: ${req.user.firstName} ${req.user.lastName}`,
        "Your comment has been removed by an admin.",
        req.user.avatar, 
        commentId,
        comment.postId.toString(),
        true, // Force modal to open
        `Deleted by Admin: ${req.user.firstName} ${req.user.lastName}`
      );
    }

    return res.status(200).json({ success: true, message: "Comment soft deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting comment:", error);
    res.status(500).json({ success: false, message: "Failed to delete comment" });
  }
};




export const likeComment = async (req, res) => {
  try {
const { postUID } = req.body;
    const { commentId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, message: "Invalid comment ID" });
    }

    let comment = await Comment.findById(commentId).populate("commenterId", "firstName avatar");

    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const commenterId = comment.commenterId._id.toString();
    const isAlreadyLiked = comment.likedBy.some((id) => id.toString() === userId);

    // ✅ Check if ANY notification exists (read or unread)
    const existingNotification = await Notification.findOne({
      userId: commenterId, 
      senderId: userId, 
      type: "CommentLike",
      commentId,
      postUID,
    });

    // ✅ Unlike functionality (MARK notification as unread instead of deleting)
    if (isAlreadyLiked) {
      comment.likesCount -= 1;
      comment.likedBy = comment.likedBy.filter((id) => id.toString() !== userId);
      await comment.save();

      if (existingNotification) {
        await Notification.updateOne({ _id: existingNotification._id }, { read: false });
        console.log(`🔄 Marked notification as unread for comment ${commentId}`);
      }

      return res.status(200).json({ success: true, likesCount: comment.likesCount, message: "Comment unliked" });
    }

    // ✅ Like the comment
    comment.likesCount += 1;
    comment.likedBy.push(new mongoose.Types.ObjectId(userId));
    await comment.save();

    // ✅ Prevent sending notifications for self-likes
    if (commenterId === userId) {
      return res.status(200).json({ success: true, likesCount: comment.likesCount, message: "Self-like, no notification sent" });
    }

    // 🚨 **NEW FIX:** If a notification exists (read OR unread), update it instead of sending a new one
    if (existingNotification) {
      console.log(`🔕 Notification already exists for comment ${commentId}, marking as unread if necessary.`);
      
      await Notification.updateOne(
        { _id: existingNotification._id },
        { read: false }
      );

      return res.status(200).json({
        success: true,
        likesCount: comment.likesCount,
        message: "Existing notification updated (marked as unread).",
      });
    }

    // ✅ Send a new notification only if none exists
    await sendNotification(
      commenterId,
      userId,
      "CommentLike",
      `${await User.findById(userId).then(user => user.firstName)}, liked your comment.`,
      "",
      await User.findById(userId).then(user => user.avatar),
      commentId,
      postUID
    );

    console.log(`📩 Sent new notification for comment ${commentId}`);

    return res.status(200).json({ success: true, likesCount: comment.likesCount, message: "Comment liked and notification sent" });

  } catch (error) {
    console.error("❌ Error liking comment:", error);
    return res.status(500).json({ success: false, message: "Failed to like/unlike comment" });
  }
};









export const unlikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    let comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    // Check if user has liked the comment
    if (!comment.likedBy.includes(userId)) {
      return res.status(400).json({ success: false, message: "Not liked yet" });
    }

    // Decrement likes count and remove user from likedBy array
    comment.likesCount -= 1;
    comment.likedBy = comment.likedBy.filter((id) => id.toString() !== userId);
    await comment.save();

    return res.status(200).json({ success: true, likesCount: comment.likesCount });
  } catch (error) {
    console.error("Error unliking comment:", error);
    res.status(500).json({ success: false, message: "Failed to unlike comment" });
  }
};


export const checkCommentLikeStatus = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const isLiked = comment.likedBy.includes(userId);
    const likesCount = comment.likesCount;

    return res.status(200).json({ success: true, isLiked, likesCount });
  } catch (error) {
    console.error("Error checking like status:", error);
    res.status(500).json({ success: false, message: "Failed to check like status" });
  }
};


export const addReply = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    // Create reply object
    const reply = {
      commenterId: userId,
      content,
      createdAt: new Date(),
    };

    // Push reply to the comment's replies array
    comment.replies.push(reply);
    await comment.save();

    // Populate the newly added reply
    await comment.populate({
      path: "replies.commenterId",
      select: "firstName lastName avatar",
    });

    // Return only the newly added reply
    const newReply = comment.replies[comment.replies.length - 1];

    return res.status(201).json({ success: true, reply: newReply });
  } catch (error) {
    console.error("Error adding reply:", error);
    res.status(500).json({ success: false, message: "Failed to add reply" });
  }
};

export const getReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId, page = 1, limit = 5 } = req.query;

    console.log(`🔵 Fetching replies for Comment ID: ${commentId}, Page: ${page}, Limit: ${limit}`);

    const user = await User.findById(userId);
const isAdmin = req.user?.isAdmin;

    console.log(isAdmin)
    const comment = await Comment.findById(commentId).populate({
      path: "replies.commenterId",
      select: "firstName lastName avatar username",
    });

    if (!comment) {
      console.log(`❌ Comment not found: ${commentId}`);
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    // ✅ Filter out deleted replies
    const filteredReplies = comment.replies.filter((reply) => !reply.isDeleted);

    const totalReplies = filteredReplies.length;
    const skip = (page - 1) * limit;

    const censorText = (text) => {
      return BAD_WORDS.reduce((acc, word) => {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        return acc.replace(regex, "****");
      }, text);
    };

    // ✅ Apply censorship only for non-admin users
    let replies = filteredReplies.slice(skip, skip + limit).map((reply) => ({
      ...reply.toObject(),
      content: isAdmin ? reply.content : (reply.includesBadWords ? censorText(reply.content) : reply.content),
    }));

    console.log(`🟢 Sending ${replies.length} replies back to client.`);

    return res.status(200).json({
      success: true,
      replies,
      hasMore: skip + replies.length < totalReplies,
    });
  } catch (error) {
    console.error("❌ Error fetching replies:", error);
    res.status(500).json({ success: false, message: "Failed to fetch replies" });
  }
};



export const deleteReply = async (req, res) => {
  try {
    const { commentId, replyId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const post = await Post.findById(comment.postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const replyIndex = comment.replies.findIndex(reply => reply._id.toString() === replyId);
    if (replyIndex === -1) {
      return res.status(404).json({ success: false, message: "Reply not found" });
    }

    const isAdmin = req.user.isAdmin;
    const isReplyOwner = comment.replies[replyIndex].commenterId.toString() === userId;
    const isPostOwner = post.postOwner.toString() === userId;

    if (!isAdmin && !isReplyOwner && !isPostOwner) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // ✅ Soft delete the reply (similar to comments)
    comment.replies[replyIndex].isDeleted = true;
    await comment.save();

    // ✅ Emit real-time reply deletion to **post room**
    io.to(comment.postId.toString()).emit("replyDeleted", {
      postId: comment.postId.toString(),
      commentId,
      replyId
    });

    // ✅ Notify user if an admin deleted the reply
    if (isAdmin) {
      await sendNotification(
        comment.replies[replyIndex].commenterId.toString(),
        userId,
        "replyDeleted",
        `Deleted by Admin: ${req.user.firstName} ${req.user.lastName}`,
        "Your reply has been removed by an admin.",
        req.user.avatar, 
        replyId,
        comment.postId.toString(),
        true
      );
    }

    return res.status(200).json({ success: true, message: "Reply soft deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting reply:", error);
    res.status(500).json({ success: false, message: "Failed to delete reply" });
  }
};






export const fetchRelatedLikes = async (req, res) => {
  try {
    const { relatedPostId } = req.params;
    
    // Fetch all likes for the given post
    const likes = await Like.find({ relatedPost: relatedPostId, status: true }).populate('likerId', 'username emailAddress firstName lastName avatar');
    
    return res.status(200).json({ success: true, likes });
  } catch (error) {
    console.error("Error fetching likes:", error);
    res.status(500).json({ success: false, message: "Failed to fetch likes" });
  }
};