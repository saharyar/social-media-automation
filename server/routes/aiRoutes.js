const express = require("express");
const { generateCaption, generatePost, generateImage } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/generate-caption", protect, generateCaption);
router.post("/generate-post", protect, generatePost);
router.post("/generate-image", protect, generateImage);

module.exports = router;