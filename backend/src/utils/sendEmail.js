import nodemailer from "nodemailer"



//  this fucntion is used for to sending email for forgot password
export const sendEmail = async ({ to, subject, html }) => {
    // create transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_PORT === "465",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })

    // define the mail option here
    const mailOptions = {
        from: '"DocSpot" <noreply@docspot.app>',
        to: to,
        subject: subject,
        html: html
    }


    //  send mail
    await transporter.sendMail(mailOptions)
}