const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  }
})

const sendVerificationEmail = async (name, email, token) => {
  const verifyUrl = `https://me.concept254.net/verify?token=${token}`

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify your email — Klaus Portfolio',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #030712; color: #ffffff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #ffffff; font-size: 24px; margin-bottom: 8px;">
          Klaus<span style="color: #818cf8;">.</span>
        </h1>
        <hr style="border: 1px solid #1f2937; margin-bottom: 32px;" />
        <h2 style="color: #ffffff; font-size: 20px;">Hi ${name},</h2>
        <p style="color: #9ca3af; line-height: 1.6;">
          Thanks for signing up! Please verify your email address to unlock full access to my portfolio including my PDF resume and references.
        </p>
        <a href="${verifyUrl}"
          style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 15px;">
          Verify My Email
        </a>
        <p style="color: #6b7280; font-size: 13px;">
          Or copy and paste this link into your browser:<br/>
          <a href="${verifyUrl}" style="color: #818cf8;">${verifyUrl}</a>
        </p>
        <p style="color: #6b7280; font-size: 13px;">
          This link expires in 24 hours. If you did not sign up, you can safely ignore this email.
        </p>
        <hr style="border: 1px solid #1f2937; margin-top: 32px;" />
        <p style="color: #4b5563; font-size: 12px;">
          © ${new Date().getFullYear()} Klaus — me.concept254.net
        </p>
      </div>
    `
  })
}

const sendWelcomeEmail = async (name, email) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome — You now have full access',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #030712; color: #ffffff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #ffffff; font-size: 24px; margin-bottom: 8px;">
          Klaus<span style="color: #818cf8;">.</span>
        </h1>
        <hr style="border: 1px solid #1f2937; margin-bottom: 32px;" />
        <h2 style="color: #ffffff; font-size: 20px;">Welcome, ${name}!</h2>
        <p style="color: #9ca3af; line-height: 1.6;">
          Your email has been verified. You now have full access to:
        </p>
        <ul style="color: #9ca3af; line-height: 2;">
          <li>📄 Download my PDF Resume</li>
          <li>📞 View my references and contact numbers</li>
          <li>📱 View my personal phone number</li>
        </ul>
        <a href="https://me.concept254.net"
          style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 15px;">
          Visit My Portfolio
        </a>
        <hr style="border: 1px solid #1f2937; margin-top: 32px;" />
        <p style="color: #4b5563; font-size: 12px;">
          © ${new Date().getFullYear()} Klaus — me.concept254.net
        </p>
      </div>
    `
  })
}

module.exports = { sendVerificationEmail, sendWelcomeEmail }