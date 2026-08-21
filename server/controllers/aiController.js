const { GoogleGenAI } = require("@google/genai");
const { generateImage: generatePollinationsImage } = require("../services/pollinations");
const cloudinary = require("../config/cloudinary");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });



// Text generation via Gemini (free tier)
const TEXT_MODEL = "gemini-3.5-flash";

// --- Retry helper ---------------------------------------------------------
// Gemini occasionally returns transient errors ("currently experiencing high
// demand", 503s, etc.) that usually clear up within a few seconds. Quota
// errors ("too_many_requests") are different — retrying instantly won't
// help, but the API does tell us how long to wait via a "Please retry in Xs"
// message, so we respect that instead of guessing.
const RETRYABLE_CODES = new Set(["api_error", "unavailable"]);
const RATE_LIMIT_CODE = "too_many_requests";

function isRetryable(err) {
    const code = err?.error?.code || err?.code;
    return RETRYABLE_CODES.has(code) || /high demand|overloaded|try again later/i.test(err?.message || "");
}

function isRateLimited(err) {
    const code = err?.error?.code || err?.code;
    return code === RATE_LIMIT_CODE || /too_many_requests|exceeded your current quota/i.test(err?.message || "");
}

// Pulls a suggested wait time out of Gemini's own error message, e.g.
// "Please retry in 10.84348788s." Falls back to a fixed delay if not found.
function extractRetryDelayMs(err, fallbackMs) {
    const match = /retry in ([\d.]+)s/i.exec(err?.message || "");
    if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 250; // small buffer
    return fallbackMs;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Wraps a Gemini call with a few retry attempts for transient failures.
// Rate-limit errors get exactly one retry, waiting as long as Gemini asked.
// Other transient errors get up to 2 retries with a short fixed backoff.
// Anything else (bad request, auth failure, etc.) is thrown immediately —
// retrying those would just fail the same way every time.
async function withRetry(fn) {
    const maxTransientRetries = 2;
    let attempt = 0;
    let rateLimitRetryUsed = false;

    while (true) {
        try {
            return await fn();
        } catch (err) {
            if (isRateLimited(err) && !rateLimitRetryUsed) {
                rateLimitRetryUsed = true;
                await sleep(extractRetryDelayMs(err, 5000));
                continue;
            }

            if (isRetryable(err) && attempt < maxTransientRetries) {
                attempt += 1;
                await sleep(1000 * attempt); // 1s, then 2s
                continue;
            }

            throw err;
        }
    }
}

// Turns a raw Gemini error into a short, user-facing message instead of the
// raw SDK error object/stack.
function friendlyAiError(err) {
    if (isRateLimited(err)) {
        return "AI generation limit reached for now — please try again in a little while.";
    }
    if (isRetryable(err)) {
        return "The AI service is temporarily busy. Please try again in a moment.";
    }
    return "Something went wrong generating content. Please try again.";
}

// @desc Generate caption options only
// @route POST /api/ai/generate-caption
const generateCaption = async (req, res) => {
    const { topic, platform, tone } = req.body;

    if (!topic || !platform) {
        return res.status(400).json({ message: "topic and platform are required" });
    }

    const charLimit = platform === "twitter" ? "under 280 characters" : "2-4 sentences, professional tone";

    try {
        const interaction = await withRetry(() =>
            ai.interactions.create({
                model: TEXT_MODEL,
                input: `Write 3 distinct ${tone || "engaging"} caption options for ${platform} about: "${topic}". ${charLimit}. Return each caption on its own line, numbered 1-3, no extra commentary.`,
            })
        );

        res.json({ captions: interaction.output_text });
    } catch (err) {
        console.error("generateCaption error:", err);
        res.status(500).json({ message: friendlyAiError(err), error: err.message });
    }
};

// @desc Generate a full post draft AND 3 short caption options (text-only)
// @route POST /api/ai/generate-post
const generatePost = async (req, res) => {
    const { topic, platform, tone } = req.body;

    if (!topic || !platform) {
        return res.status(400).json({ message: "topic and platform are required" });
    }

    const charLimit = platform === "twitter" ? "under 280 characters total" : "roughly 4-8 sentences, well-formatted with line breaks";

    try {
        const interaction = await withRetry(() =>
            ai.interactions.create({
                model: TEXT_MODEL,
                input: `You're helping draft a ${platform} post about: "${topic}".

Return your answer in exactly this format, with no extra commentary:

POST:
<a complete, ready-to-publish ${tone || "engaging"} post, ${charLimit}>

CAPTIONS:
1. <short caption option 1>
2. <short caption option 2>
3. <short caption option 3>`,
            })
        );

        const raw = interaction.output_text || "";

        // Split the model's structured response into the two sections
        const postMatch = raw.match(/POST:\s*([\s\S]*?)\s*CAPTIONS:/i);
        const captionsMatch = raw.match(/CAPTIONS:\s*([\s\S]*)/i);

        const post = postMatch ? postMatch[1].trim() : raw.trim();
        const captions = captionsMatch ? captionsMatch[1].trim() : "";

        res.json({ post, captions });
    } catch (err) {
        console.error("generatePost error:", err);
        res.status(500).json({ message: friendlyAiError(err), error: err.message });
    }
};

// @desc Generate image using Pollinations, then rehost it on Cloudinary for a
// stable public HTTPS URL (needed since Instagram/LinkedIn require a real
// URL they can fetch).
// @route POST /api/ai/generate-image
const generateImage = async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({
            message: "Prompt is required",
        });
    }

    try {
        console.log("Step 1: Calling Pollinations...");

        const imageBuffer = await generatePollinationsImage(prompt);

        console.log("Step 2: Pollinations Success");

        console.log("Step 3: Uploading to Cloudinary...");

        // Upload the raw buffer via a stream instead of converting to a
        // base64 data URI. The base64 approach sends the whole image as one
        // giant POST field, which was triggering broken/truncated responses
        // on this network (visible as TLS renegotiation in curl -v), and the
        // Cloudinary SDK surfaced that as a generic 403 "UnexpectedResponse"
        // instead of a real error. Streaming the buffer avoids that.
        const uploaded = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "social-scheduler" },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
            uploadStream.end(imageBuffer);
        });

        console.log("Step 4: Cloudinary Success");

        return res.json({
            success: true,
            imageUrl: uploaded.secure_url,
        });

    } catch (err) {
        console.log("=========== ERROR ===========");
        console.log(err);
        console.dir(err, { depth: null });

        if (err.response) {
            console.log("Status:", err.response.status);
            console.log("Data:", err.response.data);
        }

        console.log("=============================");

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

module.exports = { generateCaption, generatePost, generateImage };