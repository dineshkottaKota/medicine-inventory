// 1. If you haven't already, install the 'dotenv' package to manage environment variables
// In your terminal, run: npm install dotenv

// 2. Make sure you have a file named '.env' in your 'backend' directory with your credentials:
/*
  --- .env file ---
  EMAIL_USER=your_email@gmail.com
  EMAIL_PASS=your_16_character_gmail_app_password 
  -----------------
*/
// NOTE: For Gmail, you must generate an "App Password". Your regular password will not work.
// How to get an App Password:
// a. Go to your Google Account settings -> "Security".
// b. Make sure 2-Step Verification is ON.
// c. Click on "App passwords" and generate a new password.
// d. Use that 16-character password in the .env file.


// 3. Use this code for your 'email.js' file.

const nodemailer = require('nodemailer');
// THIS LINE IS CRUCIAL - It loads the variables from your .env file
require('dotenv').config(); 

// Create a reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail', // Or your email provider
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    // These credentials are now correctly read from your .env file
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

/**
 * Sends an email using the pre-configured transporter.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} text - The plain text body of the email.
 */
async function sendEmail(to, subject, text,html = null) {
  // Check if credentials are loaded
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email credentials not found in .env file. Skipping email send.');
    // You might want to throw an error or handle this case differently
    return;
  }

  try {
    // Define the email options
    const mailOptions = {
      from: `"Medicine Inventory" <${process.env.EMAIL_USER}>`, // sender address with a friendly name
      to: to, // list of receivers
      subject: subject, // Subject line
      text: text, // plain text body
      ...(html && { html }),
    };

    // Send mail with defined transport object
    const info = await transporter.sendMail(mailOptions);

    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    // This will help you see detailed errors if authentication fails again
    throw error; 
  }
}

module.exports = { sendEmail };
