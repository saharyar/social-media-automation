const cron = require("node-cron");
const Post = require("../models/Post");
const User = require("../models/User");
const { publishPost } = require("./socialPublishers");

// Runs every minute: finds posts whose scheduled time has arrived and
// publishes them. Keeps going even if one post fails, so a bad post never
// blocks the rest of the queue.
async function processDuePosts() {
    const duePosts = await Post.find({
        status: "scheduled",
        scheduledFor: { $lte: new Date() },
    });

    for (const post of duePosts) {
        try {
            const user = await User.findById(post.user);
            if (!user) {
                post.status = "failed";
                post.platformResults = { ...post.platformResults, _error: "Owning user not found" };
                await post.save();
                continue;
            }
            await publishPost(post, user);
        } catch (err) {
            console.error(`Scheduler: failed to publish post ${post._id}:`, err);
            post.status = "failed";
            await post.save().catch(() => {});
        }
    }
}

function startScheduler() {
    // Every minute — fine-grained enough that "scheduled for 1:46 PM" actually
    // fires close to 1:46 PM, without hammering the DB constantly.
    cron.schedule("* * * * *", () => {
        processDuePosts().catch((err) => console.error("Scheduler run failed:", err));
    });
    console.log("Post scheduler started (checking every minute for due posts)");
}

module.exports = { startScheduler, processDuePosts };