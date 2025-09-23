const sgMail = require('@sendgrid/mail');
require('dotenv').config(); // Ensure .env is loaded

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (options) => {
  const msg = {
    to: options.to,
    from: {
      name: 'ServiceHub',
      email: process.env.FROM_EMAIL,
    },
    subject: options.subject || 'Your OTP for Verification',
    text: options.text || 'Your OTP code is provided in the email.', // Fallback for non-HTML clients
    html: options.html,
  };

  try {
    await sgMail.send(msg);
    console.log('Email sent successfully to:', options.to);
    return true; // Confirm success
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw new Error('Email could not be sent');
  }
};

module.exports = sendEmail;