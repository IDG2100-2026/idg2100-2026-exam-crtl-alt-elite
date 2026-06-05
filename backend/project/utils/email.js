import nodemailer from "nodemailer";

const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS,
    FRONTEND_URL
} = process.env;

const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
        port: EMAIL_PORT,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
});

export async function sendVerificationEmail(email, token) {
    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

    await transporter.sendMail({
        from: `"Spanish Poker Dice" <${EMAIL_USER}>`,
        to: email,
        subject: "Verify your email address",
        text: `Please verify your email by visiting: ${verificationUrl}\n\nThis link expires in 15 minutes.`,
        html: `
            <h2>Welcome to Spanish Poker Dice!</h2>
            <p>Please verify your email address by clicking the link below:</p>
            <a href="${verificationUrl}">Verify my email</a>
            <p>This link expires in 15 minutes.</p>
            <p>If you did not register, you can ignore this email.</p>
        `
    });
}

export default {
    sendVerificationEmail
};
