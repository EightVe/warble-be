import express from 'express';
import {createPost, deletePost, editPost,getUserPosts,getAllPosts,getPostsOfYourFollowList,getSinglePost,likePost,removeLikePost,checkLikeStatus,addComment,getPostComments,deleteComment,
    likeComment,unlikeComment,checkCommentLikeStatus,addReply,getReplies,deleteReply,fetchRelatedLikes,getSinglePostComments
} from '../controllers/posts.controller.js';
import { authenticateToken } from '../utils/verifyUser.js';
const router = express.Router();


router.post('/create',authenticateToken, createPost);
router.post('/edit',authenticateToken, editPost);
router.post('/delete',authenticateToken, deletePost);
router.get('/get-user-posts/:id',authenticateToken, getUserPosts);
router.get('/get-single-post/:postUID',authenticateToken, getSinglePost);
router.get('/get-all-posts',authenticateToken, getAllPosts);
router.get('/get-posts-of-your-following',authenticateToken, getPostsOfYourFollowList);


router.post('/like/:postId', authenticateToken, likePost);
router.post('/remove-like/:postId', authenticateToken, removeLikePost);
router.get('/check-like/:postId', authenticateToken, checkLikeStatus);


router.post("/add-comment/:postId", authenticateToken, addComment);
router.get("/get-comments/:postId", getPostComments);
router.get("/get-single-comments/:postId", getSinglePostComments);
router.delete("/delete-comment/:commentId", authenticateToken, deleteComment);


router.post("/comment-like/:commentId", authenticateToken, likeComment);
router.post("/comment-unlike/:commentId", authenticateToken, unlikeComment);
router.get("/comment-like-status/:commentId", authenticateToken, checkCommentLikeStatus);
router.get("/get-related-likes/:relatedPostId", authenticateToken, fetchRelatedLikes);

router.post("/reply/:commentId", authenticateToken, addReply);
router.get("/get-replies/:commentId", authenticateToken, getReplies);
router.delete("/delete-reply/:commentId/:replyId", authenticateToken, deleteReply);
export default router;