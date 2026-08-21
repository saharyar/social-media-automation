const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const TWITTER_REDIRECT_URI = process.env.TWITTER_REDIRECT_URI;

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI;
const GRAPH_API_VERSION = "v21.0";

// @desc Get connection status of all platforms
// @route GET /api/accounts
const getConnectedAccounts = async (req, res) => {
    const user = await User.findById(req.user._id);
    const accounts = user.connectedAccounts || {};

    res.json({
        twitter: !!accounts.twitter?.accessToken,
        linkedin: !!accounts.linkedin?.accessToken,
        instagram: !!accounts.instagram?.accessToken,
    });
};

// @desc Disconnect a platform
// @route DELETE /api/accounts/:platform
const disconnectAccount = async (req, res) => {
    const { platform } = req.params;
    if (!["twitter", "linkedin", "instagram"].includes(platform)) {
        return res.status(400).json({ message: "Invalid platform" });
    }

    const user = await User.findById(req.user._id);
    user.connectedAccounts[platform] = undefined;
    await user.save();

    res.json({ message: `${platform} disconnected` });
};

// @desc Get the LinkedIn OAuth URL to send the browser to.
// @route GET /api/accounts/linkedin/connect
const getLinkedInAuthUrl = async (req, res) => {
    const state = jwt.sign({ id: req.user._id.toString() }, process.env.JWT_SECRET, {
        expiresIn: "10m",
    });

    const params = new URLSearchParams({
        response_type: "code",
        client_id: LINKEDIN_CLIENT_ID,
        redirect_uri: LINKEDIN_REDIRECT_URI,
        state,
        scope: "openid profile w_member_social",
    });

    res.json({ url: `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}` });
};

// @desc Handle LinkedIn's OAuth redirect.
// @route GET /api/accounts/linkedin/callback
const linkedinCallback = async (req, res) => {
    const { code, state, error } = req.query;
    const frontendUrl = process.env.CLIENT_URL;

    if (error || !code || !state) {
        return res.redirect(`${frontendUrl}/accounts?linkedin=error`);
    }

    let userId;
    try {
        const decoded = jwt.verify(state, process.env.JWT_SECRET);
        userId = decoded.id;
    } catch (err) {
        return res.redirect(`${frontendUrl}/accounts?linkedin=error`);
    }

    try {
        const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: LINKEDIN_REDIRECT_URI,
                client_id: LINKEDIN_CLIENT_ID,
                client_secret: LINKEDIN_CLIENT_SECRET,
            }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.access_token) {
            console.error("LinkedIn token exchange failed:", tokenData);
            return res.redirect(`${frontendUrl}/accounts?linkedin=error`);
        }

        const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileRes.json();

        const user = await User.findById(userId);
        if (!user) {
            return res.redirect(`${frontendUrl}/accounts?linkedin=error`);
        }

        user.connectedAccounts.linkedin = {
            accessToken: tokenData.access_token,
            userId: profile.sub,
            connectedAt: new Date(),
        };
        await user.save();

        return res.redirect(`${frontendUrl}/accounts?linkedin=connected`);
    } catch (err) {
        console.error("linkedinCallback error:", err);
        return res.redirect(`${frontendUrl}/accounts?linkedin=error`);
    }
};

// --- Twitter / X helpers -----------------------------------------------
const base64url = (buffer) =>
    buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// @desc Get the X (Twitter) OAuth URL to send the browser to.
// @route GET /api/accounts/twitter/connect
const getTwitterAuthUrl = async (req, res) => {
    const codeVerifier = base64url(crypto.randomBytes(32));
    const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());

    const state = jwt.sign(
        { id: req.user._id.toString(), codeVerifier },
        process.env.JWT_SECRET,
        { expiresIn: "10m" }
    );

    const params = new URLSearchParams({
        response_type: "code",
        client_id: TWITTER_CLIENT_ID,
        redirect_uri: TWITTER_REDIRECT_URI,
        state,
        scope: "tweet.read tweet.write users.read offline.access",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
    });

    res.json({ url: `https://twitter.com/i/oauth2/authorize?${params.toString()}` });
};

// @desc Handle X's OAuth redirect.
// @route GET /api/accounts/twitter/callback
const twitterCallback = async (req, res) => {
    const { code, state, error } = req.query;
    const frontendUrl = process.env.CLIENT_URL;

    if (error || !code || !state) {
        return res.redirect(`${frontendUrl}/accounts?twitter=error`);
    }

    let userId, codeVerifier;
    try {
        const decoded = jwt.verify(state, process.env.JWT_SECRET);
        userId = decoded.id;
        codeVerifier = decoded.codeVerifier;
        if (!codeVerifier) throw new Error("Missing code_verifier in state");
    } catch (err) {
        return res.redirect(`${frontendUrl}/accounts?twitter=error`);
    }

    try {
        const basicAuth = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString(
            "base64"
        );

        const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${basicAuth}`,
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: TWITTER_REDIRECT_URI,
                client_id: TWITTER_CLIENT_ID,
                code_verifier: codeVerifier,
            }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.access_token) {
            console.error("Twitter token exchange failed:", tokenData);
            return res.redirect(`${frontendUrl}/accounts?twitter=error`);
        }

        const profileRes = await fetch("https://api.twitter.com/2/users/me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profileData = await profileRes.json();

        const user = await User.findById(userId);
        if (!user) {
            return res.redirect(`${frontendUrl}/accounts?twitter=error`);
        }

        user.connectedAccounts.twitter = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
            userId: profileData?.data?.id,
            username: profileData?.data?.username,
            connectedAt: new Date(),
        };
        await user.save();

        return res.redirect(`${frontendUrl}/accounts?twitter=connected`);
    } catch (err) {
        console.error("twitterCallback error:", err);
        return res.redirect(`${frontendUrl}/accounts?twitter=error`);
    }
};

// --- Instagram (via Facebook Login) -----------------------------------------
// Instagram content publishing goes through the Instagram Graph API, which is
// authenticated via a regular Facebook Login OAuth flow, then a couple of
// extra Graph API calls to find the Page and Instagram Business Account
// connected to that Page. There's no separate "Instagram OAuth" — it's all
// Facebook's Graph API underneath.

// @desc Get the Facebook Login OAuth URL (for Instagram access) to send the
//       browser to.
// @route GET /api/accounts/instagram/connect
const getInstagramAuthUrl = async (req, res) => {
    const state = jwt.sign({ id: req.user._id.toString() }, process.env.JWT_SECRET, {
        expiresIn: "10m",
    });

    const params = new URLSearchParams({
        client_id: FACEBOOK_APP_ID,
        redirect_uri: FACEBOOK_REDIRECT_URI,
        state,
        response_type: "code",
        scope: [
            "instagram_basic",
            "instagram_content_publish",
            "pages_show_list",
            "pages_read_engagement",
            "business_management",
        ].join(","),
    });

    res.json({
        url: `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`,
    });
};

// @desc Handle Facebook's OAuth redirect: exchange code for a user token,
//       upgrade it to a long-lived token, find the user's Facebook Page,
//       find that Page's linked Instagram Business Account, and save it all.
//       PUBLIC route (no `protect`) — Facebook redirects the browser here
//       directly with no auth header.
// @route GET /api/accounts/instagram/callback
const instagramCallback = async (req, res) => {
    const { code, state, error } = req.query;
    const frontendUrl = process.env.CLIENT_URL;

    if (error || !code || !state) {
        return res.redirect(`${frontendUrl}/accounts?instagram=error`);
    }

    let userId;
    try {
        const decoded = jwt.verify(state, process.env.JWT_SECRET);
        userId = decoded.id;
    } catch (err) {
        return res.redirect(`${frontendUrl}/accounts?instagram=error`);
    }

    try {
        // Step 1: exchange the code for a short-lived user access token
        const shortLivedParams = new URLSearchParams({
            client_id: FACEBOOK_APP_ID,
            redirect_uri: FACEBOOK_REDIRECT_URI,
            client_secret: FACEBOOK_APP_SECRET,
            code,
        });
        const shortLivedRes = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?${shortLivedParams.toString()}`
        );
        const shortLivedData = await shortLivedRes.json();
        if (!shortLivedRes.ok || !shortLivedData.access_token) {
            console.error("Facebook token exchange failed:", shortLivedData);
            return res.redirect(`${frontendUrl}/accounts?instagram=error`);
        }

        // Step 2: upgrade to a long-lived user access token (~60 days)
        const longLivedParams = new URLSearchParams({
            grant_type: "fb_exchange_token",
            client_id: FACEBOOK_APP_ID,
            client_secret: FACEBOOK_APP_SECRET,
            fb_exchange_token: shortLivedData.access_token,
        });
        const longLivedRes = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?${longLivedParams.toString()}`
        );
        const longLivedData = await longLivedRes.json();
        if (!longLivedRes.ok || !longLivedData.access_token) {
            console.error("Facebook long-lived token exchange failed:", longLivedData);
            return res.redirect(`${frontendUrl}/accounts?instagram=error`);
        }
        const userAccessToken = longLivedData.access_token;

        // Step 3: find the Facebook Page(s) this user manages
        const pagesRes = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts?access_token=${userAccessToken}`
        );
        const pagesData = await pagesRes.json();
        const page = pagesData?.data?.[0];
        if (!page) {
            console.error("No Facebook Page found for this user:", pagesData);
            return res.redirect(`${frontendUrl}/accounts?instagram=error`);
        }

        // Step 4: find the Instagram Business Account linked to that Page
        const igLinkRes = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        const igLinkData = await igLinkRes.json();
        const igUserId = igLinkData?.instagram_business_account?.id;
        if (!igUserId) {
            console.error("No Instagram Business Account linked to this Page:", igLinkData);
            return res.redirect(`${frontendUrl}/accounts?instagram=error`);
        }

        // Step 5: grab the Instagram username, just for display in the UI
        const igProfileRes = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}?fields=username&access_token=${page.access_token}`
        );
        const igProfileData = await igProfileRes.json();

        const user = await User.findById(userId);
        if (!user) {
            return res.redirect(`${frontendUrl}/accounts?instagram=error`);
        }

        user.connectedAccounts.instagram = {
            accessToken: page.access_token,
            pageId: page.id,
            igUserId,
            username: igProfileData?.username,
            connectedAt: new Date(),
        };
        await user.save();

        return res.redirect(`${frontendUrl}/accounts?instagram=connected`);
    } catch (err) {
        console.error("instagramCallback error:", err);
        return res.redirect(`${frontendUrl}/accounts?instagram=error`);
    }
};

module.exports = {
    getConnectedAccounts,
    disconnectAccount,
    getLinkedInAuthUrl,
    linkedinCallback,
    getTwitterAuthUrl,
    twitterCallback,
    getInstagramAuthUrl,
    instagramCallback,
};