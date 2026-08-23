const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 465,
    secure: true, // true for port 465 (implicit TLS) — more reliable than 587 on some hosts
    family: 4, // force IPv4 — Render's outbound network doesn't reliably support IPv6
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 15000, // 15s — fail faster instead of hanging near the request timeout
});

const sendEmail = async ({ to, subject, html }) => {
    await transporter.sendMail({
        from: `"Scheduler" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
    });
};

module.exports = sendEmail;