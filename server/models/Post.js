const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        caption: { type: String, required: true },
        aiPrompt: { type: String },
        imageUrl: { type: String },
        imagePrompt: { type: String },
        platforms: [{ type: String, enum: ["twitter", "linkedin", "instagram"] }],
        status: {
            type: String,
            enum: ["draft", "scheduled", "published", "failed"],
            default: "draft",
        },
        scheduledFor: { type: Date },
        publishedAt: { type: Date },
        // Mixed on purpose: only the platforms actually attempted end up as keys
        // here (e.g. a twitter-only post never gets a `linkedin` key at all).
        // A strict nested sub-schema per platform forces every key to always be
        // present with a full {success, postId, error} shape, which breaks the
        // moment code spreads/reassigns a partially-filled result object.
        platformResults: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);