const express = require("express");
const {
    createPost,
    getPosts,
    getPost,
    updatePost,
    deletePost,
    publishPostNow,
} = require("../controllers/postController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect); // every route below requires login

router.route("/")
    .post(createPost)
    .get(getPosts);

router.route("/:id")
    .get(getPost)
    .put(updatePost)
    .delete(deletePost);

router.post("/:id/publish-now", publishPostNow);

module.exports = router;