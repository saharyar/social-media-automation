// Per-platform "publish this post" functions. Each returns { success: true, postId }
// on success, or { success: false, error } on failure — never throws, so the
// caller can always continue trying the other platforms for a multi-platform post.

// LinkedIn's current Posts API (replaced the old UGC/Shares API in 2024).
// Docs: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
const LINKEDIN_API_VERSION = "202601"; // YYYYMM format LinkedIn requires in the Linkedin-Version header

// LinkedIn requires images to be registered + uploaded as raw bytes *before*
// they can be referenced in a post — you can't just hand it a public URL like
// Instagram lets you. This does that 2-step dance:
//   1. initializeUpload -> get a one-time upload URL + an image URN
//   2. PUT the raw image bytes to that upload URL
// Returns the image URN to use in the post body, or null if anything failed
// (callers should fall back to a text-only post rather than hard-failing).
async function uploadImageToLinkedIn(linkedin, imageUrl) {
    try {
        // Step 1: register the upload
        const initRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${linkedin.accessToken}`,
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
                "Linkedin-Version": LINKEDIN_API_VERSION,
            },
            body: JSON.stringify({
                initializeUploadRequest: {
                    owner: `urn:li:person:${linkedin.userId}`,
                },
            }),
        });

        const initData = await initRes.json();
        if (!initRes.ok || !initData?.value?.uploadUrl || !initData?.value?.image) {
            console.error("LinkedIn image upload init failed:", initRes.status, initData);
            return null;
        }

        const { uploadUrl, image: imageUrn } = initData.value;

        // Step 2: fetch the image bytes from Cloudinary, then PUT them to
        // LinkedIn's upload URL
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) {
            console.error("Failed to fetch image for LinkedIn upload:", imageRes.status);
            return null;
        }
        const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

        const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${linkedin.accessToken}`,
            },
            body: imageBuffer,
        });

        if (!uploadRes.ok) {
            console.error("LinkedIn image binary upload failed:", uploadRes.status);
            return null;
        }

        return imageUrn;
    } catch (err) {
        console.error("uploadImageToLinkedIn error:", err);
        return null;
    }
}

async function publishToLinkedIn(user, post) {
    const linkedin = user.connectedAccounts?.linkedin;
    if (!linkedin?.accessToken || !linkedin?.userId) {
        return { success: false, error: "LinkedIn account not connected" };
    }

    const body = {
        author: `urn:li:person:${linkedin.userId}`,
        commentary: post.caption,
        visibility: "PUBLIC",
        distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
    };

    // If this post has an image, register + upload it to LinkedIn first and
    // attach it to the post. If the image upload fails for any reason, we
    // still publish the post as text-only rather than failing the whole
    // thing — losing the image is better than losing the post.
    if (post.imageUrl) {
        const imageUrn = await uploadImageToLinkedIn(linkedin, post.imageUrl);
        if (imageUrn) {
            body.content = {
                media: {
                    id: imageUrn,
                },
            };
        } else {
            console.warn("LinkedIn image upload failed — publishing text-only instead.");
        }
    }

    try {
        const response = await fetch("https://api.linkedin.com/rest/posts", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${linkedin.accessToken}`,
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
                "Linkedin-Version": LINKEDIN_API_VERSION,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("LinkedIn publish failed:", response.status, errorBody);
            return { success: false, error: `LinkedIn API error (${response.status})` };
        }

        const postId = response.headers.get("x-restli-id") || null;
        return { success: true, postId };
    } catch (err) {
        console.error("publishToLinkedIn error:", err);
        return { success: false, error: "Network error contacting LinkedIn" };
    }
}

// --- X / Twitter ---------------------------------------------------------
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;

// Dev/testing switch: when true, publishToTwitter never calls the real X API
// (which now costs real money per post — X removed its free tier in Feb 2026).
// Flip MOCK_TWITTER_PUBLISH=false (or remove it) in .env to go live.
const MOCK_TWITTER_PUBLISH = process.env.MOCK_TWITTER_PUBLISH === "true";

async function refreshTwitterToken(user) {
    const twitter = user.connectedAccounts.twitter;
    const basicAuth = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString(
        "base64"
    );

    const response = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: twitter.refreshToken,
            client_id: TWITTER_CLIENT_ID,
        }),
    });

    const data = await response.json();
    if (!response.ok || !data.access_token) {
        console.error("Twitter token refresh failed:", data);
        return null;
    }

    user.connectedAccounts.twitter.accessToken = data.access_token;
    if (data.refresh_token) {
        user.connectedAccounts.twitter.refreshToken = data.refresh_token;
    }
    user.connectedAccounts.twitter.expiresAt = new Date(Date.now() + data.expires_in * 1000);
    await user.save();

    return data.access_token;
}

async function publishToTwitter(user, post) {
    const twitter = user.connectedAccounts?.twitter;
    if (!twitter?.accessToken) {
        return { success: false, error: "X / Twitter account not connected" };
    }

    if (MOCK_TWITTER_PUBLISH) {
        console.log(`[MOCK] Would publish to X for @${twitter.username || "unknown"}: "${post.caption}"`);
        await new Promise((resolve) => setTimeout(resolve, 400));
        return { success: true, postId: `mock-${Date.now()}` };
    }

    let accessToken = twitter.accessToken;
    const isExpired =
        !twitter.expiresAt || new Date(twitter.expiresAt).getTime() - Date.now() < 60_000;

    if (isExpired) {
        if (!twitter.refreshToken) {
            return { success: false, error: "X session expired — please reconnect your account" };
        }
        const refreshed = await refreshTwitterToken(user);
        if (!refreshed) {
            return { success: false, error: "X session expired — please reconnect your account" };
        }
        accessToken = refreshed;
    }

    try {
        const response = await fetch("https://api.twitter.com/2/tweets", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: post.caption }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Twitter publish failed:", response.status, data);
            if (response.status === 401) {
                return { success: false, error: "X session expired — please reconnect your account" };
            }
            if (response.status === 402) {
                return {
                    success: false,
                    error: "X account has no credits left — add credits or enable MOCK_TWITTER_PUBLISH for testing",
                };
            }
            return { success: false, error: `X API error (${response.status})` };
        }

        return { success: true, postId: data?.data?.id || null };
    } catch (err) {
        console.error("publishToTwitter error:", err);
        return { success: false, error: "Network error contacting X" };
    }
}

// --- Instagram -------------------------------------------------------------
// Instagram's Content Publishing API is a two-step process against the
// Instagram Business Account id (via the linked Facebook Page's access
// token): first create a "media container" referencing the image + caption,
// then publish that container. Unlike X/LinkedIn, Instagram has no text-only
// post type — every feed post requires an image (or video), so a post with
// no imageUrl can't be published here at all.
const GRAPH_API_VERSION = "v21.0";

async function publishToInstagram(user, post) {
    const instagram = user.connectedAccounts?.instagram;
    if (!instagram?.accessToken || !instagram?.igUserId) {
        return { success: false, error: "Instagram account not connected" };
    }

    if (!post.imageUrl) {
        return { success: false, error: "Instagram posts require an image — add one to this post" };
    }

    try {
        // Step 1: create the media container
        const containerParams = new URLSearchParams({
            image_url: post.imageUrl,
            caption: post.caption || "",
            access_token: instagram.accessToken,
        });
        const containerRes = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagram.igUserId}/media?${containerParams.toString()}`,
            { method: "POST" }
        );
        const containerData = await containerRes.json();

        if (!containerRes.ok || !containerData.id) {
            console.error("Instagram media container failed:", containerData);
            const errMsg = containerData?.error?.message || `Instagram API error (${containerRes.status})`;
            return { success: false, error: errMsg };
        }

        // Step 2: publish the container
        const publishParams = new URLSearchParams({
            creation_id: containerData.id,
            access_token: instagram.accessToken,
        });
        const publishRes = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagram.igUserId}/media_publish?${publishParams.toString()}`,
            { method: "POST" }
        );
        const publishData = await publishRes.json();

        if (!publishRes.ok || !publishData.id) {
            console.error("Instagram media publish failed:", publishData);
            const errMsg = publishData?.error?.message || `Instagram API error (${publishRes.status})`;
            return { success: false, error: errMsg };
        }

        return { success: true, postId: publishData.id };
    } catch (err) {
        console.error("publishToInstagram error:", err);
        return { success: false, error: "Network error contacting Instagram" };
    }
}

const PUBLISHERS = {
    linkedin: publishToLinkedIn,
    twitter: publishToTwitter,
    instagram: publishToInstagram,
};

// Publishes a single post to every platform listed on it, saves per-platform
// results, and sets the overall status: "published" if at least one platform
// succeeded, "failed" if all of them failed.
async function publishPost(post, user) {
    const existing =
        post.platformResults && typeof post.platformResults.toObject === "function"
            ? post.platformResults.toObject()
            : post.platformResults || {};
    const platformResults = { ...existing };

    let anySuccess = false;

    for (const platform of post.platforms || []) {
        const publisher = PUBLISHERS[platform];
        if (!publisher) {
            platformResults[platform] = { success: false, error: "Unsupported platform" };
            continue;
        }

        const result = await publisher(user, post);
        platformResults[platform] = result;
        if (result.success) anySuccess = true;
    }

    post.platformResults = platformResults;
    post.markModified("platformResults");
    post.status = anySuccess ? "published" : "failed";
    if (anySuccess) post.publishedAt = new Date();

    await post.save();
    return post;
}

module.exports = { publishPost };