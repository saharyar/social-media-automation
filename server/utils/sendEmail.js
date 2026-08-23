// Uses Brevo's HTTP Email API instead of SMTP.
// Render's free tier blocks outbound SMTP entirely, so any nodemailer-based
// approach will always fail here. This sends over plain HTTPS (port 443),
// which is never blocked.

const sendEmail = async ({ to, subject, html }) => {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "api-key": process.env.BREVO_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            sender: {
                name: "Scheduler",
                email: process.env.BREVO_SENDER_EMAIL, // must be the verified sender email
            },
            to: [{ email: to }],
            subject,
            htmlContent: html,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Brevo email failed (${response.status}): ${errorBody}`);
    }

    return response.json();
};

module.exports = sendEmail;