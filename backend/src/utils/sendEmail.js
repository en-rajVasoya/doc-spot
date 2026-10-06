import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// Generic function to send emails (supports raw HTML string OR template file with data)
export const sendEmail = async ({ to, subject, html, template, data = {} }) => {
    const smtpPort = process.env.SMTP_PORT || "465";
    const smtpUser = process.env.SMTP_USERNAME || process.env.SMTP_USER || process.env.SMTP_EMAIL;
    const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

    let finalHtml = html;

    // If a template name is passed (e.g. "resetPassword"), read and populate the HTML file
    if (template) {
        const templatePath = path.join(process.cwd(), "src", "templates", `${template}.html`);
        finalHtml = fs.readFileSync(templatePath, "utf-8");

        // Automatically replace all {{key}} placeholders with data[key] values
        Object.keys(data).forEach((key) => {
            const regex = new RegExp(`{{${key}}}`, "g");
            finalHtml = finalHtml.replace(regex, data[key] ?? "");
        });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(smtpPort),
        secure: String(smtpPort) === "465",
        auth: {
            user: smtpUser,
            pass: smtpPass
        }
    });

    // Define mail options
    const mailOptions = {
        from: `"DocSpot" <${smtpUser}>`,
        to: to,
        subject: subject,
        html: finalHtml
    };

    // Send mail
    await transporter.sendMail(mailOptions);
};
