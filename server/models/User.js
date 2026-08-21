const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, minlength: 6, select: false },

        isVerified: { type: Boolean, default: false },
        otp: { type: String, select: false },
        otpExpires: { type: Date, select: false },

        resetPasswordToken: { type: String, select: false },
        resetPasswordExpires: { type: Date, select: false },

        connectedAccounts: {
            twitter: {
                accessToken: String,
                refreshToken: String,
                expiresAt: Date, // access tokens expire ~2hrs; needed to know when to refresh
                userId: String,
                username: String, // X handle, e.g. "Arsh112_5" — handy for display in the UI
                connectedAt: Date,
            },
            linkedin: { accessToken: String, userId: String, connectedAt: Date },
            // Instagram publishing goes through a linked Facebook Page, not the
            // Instagram account directly — pageId is the Page's own id, igUserId
            // is the Instagram Business Account id that the media/media_publish
            // calls actually target.
            instagram: {
                accessToken: String, // long-lived Page access token
                pageId: String,
                igUserId: String,
                username: String,
                connectedAt: Date,
            },
        },
    },
    { timestamps: true }
);

// Hash password before save — async style, no `next` param
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// Compare password — guards against undefined input crashing bcrypt
userSchema.methods.matchPassword = async function (enteredPassword) {
    if (!enteredPassword || !this.password) return false;
    return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema, "Users");