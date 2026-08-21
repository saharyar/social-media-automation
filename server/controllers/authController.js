const crypto = require("crypto");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const generateOTP = require("../utils/otp");
const sendEmail = require("../utils/sendEmail");

// @desc Register new user, send OTP to email
// @route POST /api/auth/register
const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are all required" });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
        return res.status(400).json({ message: "Email already registered" });
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    const user = await User.create({
        name,
        email,
        password,
        otp,
        otpExpires,
        isVerified: false,
    });

    try {
        await sendEmail({
            to: email,
            subject: "Verify your email — Scheduler",
            html: `
                <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
                    <h2 style="color:#111">Verify your email</h2>
                    <p>Your verification code is:</p>
                    <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color:#ef4444;">${otp}</div>
                    <p style="color:#666; font-size:14px;">This code expires in 10 minutes.</p>
                </div>
            `,
        });
    } catch (err) {
        // User is already created in DB — don't fail the whole request,
        // but let the client know the email didn't go out so they can use Resend OTP
        return res.status(201).json({
            message: "Registered, but the verification email failed to send. Please use Resend OTP.",
            email: user.email,
        });
    }

    res.status(201).json({
        message: "Registered successfully. OTP sent to email.",
        email: user.email,
    });
};

// @desc Verify OTP and activate account
// @route POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email }).select("+otp +otpExpires");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified) {
        return res.status(400).json({ message: "Account already verified" });
    }

    if (!user.otp || user.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP" });
    }

    if (!user.otpExpires || user.otpExpires < Date.now()) {
        return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user._id);

    res.json({
        message: "Email verified successfully",
        token,
        user: { id: user._id, name: user.name, email: user.email },
    });
};

// @desc Resend OTP
// @route POST /api/auth/resend-otp
const resendOTP = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "Account already verified" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
        to: email,
        subject: "Your new verification code — Scheduler",
        html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
                <h2 style="color:#111">New verification code</h2>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color:#ef4444;">${otp}</div>
                <p style="color:#666; font-size:14px;">This code expires in 10 minutes.</p>
            </div>
        `,
    });

    res.json({ message: "OTP resent successfully" });
};

// @desc Login
// @route POST /api/auth/login
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
        return res.status(403).json({ message: "Please verify your email first", needsVerification: true });
    }

    const token = generateToken(user._id);

    res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email },
    });
};

// @desc Get logged-in user
// @route GET /api/auth/me
const getMe = async (req, res) => {
    res.json({ user: req.user });
};

// @desc Forgot password — send reset link
// @route POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "No account with that email" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    await sendEmail({
        to: email,
        subject: "Reset your password — Scheduler",
        html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
                <h2 style="color:#111">Reset your password</h2>
                <p>Click the button below to reset your password. This link expires in 15 minutes.</p>
                <a href="${resetUrl}" style="display:inline-block;background:#ef4444;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;">Reset Password</a>
            </div>
        `,
    });

    res.json({ message: "Reset link sent to email" });
};

// @desc Reset password
// @route POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful. Please log in." });
};

module.exports = {
    register,
    verifyOTP,
    resendOTP,
    login,
    getMe,
    forgotPassword,
    resetPassword,
};