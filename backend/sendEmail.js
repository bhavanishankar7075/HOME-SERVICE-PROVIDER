const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // your Gmail address
    pass: process.env.EMAIL_PASS, // your app password
  },
});

const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"ServiceHub" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
  } catch (error) {
    console.error('Error sending email via Nodemailer:', error);
    throw new Error('Email could not be sent');
  }
};

module.exports = sendEmail;
