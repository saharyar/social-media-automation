const Post = require("../models/Post");
const User = require("../models/User");
const { publishPost } = require("../services/socialPublishers");

// @desc Create a post (draft)
// @route POST /api/posts
const createPost = async (req, res) => {
    const { caption, aiPrompt, imageUrl, imagePrompt, platforms, scheduledFor } = req.body;

    if (!caption || !platforms?.length) {
        return res.status(400).json({ message: "caption and platforms are required" });
    }

    const post = await Post.create({
        user: req.user._id,
        caption,
        aiPrompt,
        imageUrl,
        imagePrompt,
        platforms,
        scheduledFor,
        status: scheduledFor ? "scheduled" : "draft",
    });

    res.status(201).json({ post });
};

// @desc Get all posts for logged-in user
// @route GET /api/posts
const getPosts = async (req, res) => {
    const { status } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const posts = await Post.find(filter).sort({ createdAt: -1 });
    res.json({ posts });
};

// @desc Get single post
// @route GET /api/posts/:id
const getPost = async (req, res) => {
    const post = await Post.findOne({ _id: req.params.id, user: req.user._id });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ post });
};

// @desc Update post
// @route PUT /api/posts/:id
const updatePost = async (req, res) => {
    const post = await Post.findOne({ _id: req.params.id, user: req.user._id });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const allowedFields = ["caption", "imageUrl", "platforms", "scheduledFor", "status"];
    allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) post[field] = req.body[field];
    });

    await post.save();
    res.json({ post });
};

// @desc Delete post
// @route DELETE /api/posts/:id
const deletePost = async (req, res) => {
    const post = await Post.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ message: "Post deleted" });
};

// @desc Publish a post immediately, regardless of its scheduledFor time.
//       Useful for testing the publish pipeline without waiting for the
//       background scheduler's next run.
// @route POST /api/posts/:id/publish-now
const publishPostNow = async (req, res) => {
    const post = await Post.findOne({ _id: req.params.id, user: req.user._id });
    if (!post) return res.status(404).json({ message: "Post not found" });

    try {
        const updated = await publishPost(post, req.user);
        res.json({ post: updated });
    } catch (err) {
        console.error("publishPostNow error:", err);
        res.status(500).json({ message: "Failed to publish post", error: err.message });
    }
};

module.exports = { createPost, getPosts, getPost, updatePost, deletePost, publishPostNow };