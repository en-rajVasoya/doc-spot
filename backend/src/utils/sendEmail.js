import nodemailer from "nodemailer"

//  this fucntion is used for to sending email for forgot password
export const sendEmail = async ({ to, subject, html }) => {
    const smtpPort = process.env.SMTP_PORT || "465";
    const smtpUser = process.env.SMTP_USERNAME || process.env.SMTP_USER || process.env.SMTP_EMAIL;
    const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

    // create transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(smtpPort),
        secure: String(smtpPort) === "465",
        auth: {
            user: smtpUser,
            pass: smtpPass
        }
    })

    // define the mail option here
    const mailOptions = {
        from: `"DocSpot" <${smtpUser}>`,
        to: to,
        subject: subject,
        html: html
    }

    //  send mail
    await transporter.sendMail(mailOptions)
}