const express = require("express");
const {
    getConnectedAccounts,
    disconnectAccount,
    getLinkedInAuthUrl,
    linkedinCallback,
    getTwitterAuthUrl,
    twitterCallback,
    getInstagramAuthUrl,
    instagramCallback,
} = require("../controllers/accountController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes — LinkedIn/X/Facebook redirect the user's browser here
// directly, with no Authorization header, so these must sit BEFORE
// router.use(protect).
router.get("/linkedin/callback", linkedinCallback);
router.get("/twitter/callback", twitterCallback);
router.get("/instagram/callback", instagramCallback);

router.use(protect);

router.get("/", getConnectedAccounts);
router.get("/linkedin/connect", getLinkedInAuthUrl);
router.get("/twitter/connect", getTwitterAuthUrl);
router.get("/instagram/connect", getInstagramAuthUrl);
router.delete("/:platform", disconnectAccount);

module.exports = router;