import nodemailer from 'nodemailer'
import { config } from 'dotenv'; config();

const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    secure: false,
    pool: true,
    auth: {
        user: process.env.SMTP_EMAIL || '369d1afccc70ab',
        pass: process.env.SMTP_PASS || 'e9ce84e6d09021',
    },
});


export default transporter


// Looking to send emails in production? Check out our Email API/SMTP product!
// var transport = nodemailer.createTransport({
//   host: "sandbox.smtp.mailtrap.io",
//   port: 2525,
//   auth: {
//     user: "369d1afccc70ab",
//     pass: "e9ce84e6d09021"
//   }
// });
