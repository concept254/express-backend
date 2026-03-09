const nodemailer = require('nodemailer')
require('dotenv').config()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
})

// ── Email templates ───────────────────────────────────

const sendTicketCreated = async (clientEmail, clientName, ticketTitle) => {
  await transporter.sendMail({
    from: `"concept254" <${process.env.EMAIL_FROM}>`,
    to: clientEmail,
    subject: `🎫 Ticket Submitted: ${ticketTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">concept254</h2>
        <p>Hi ${clientName},</p>
        <p>Your ticket has been successfully submitted and is now visible to our developers.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold;">🎫 ${ticketTitle}</p>
          <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">Status: Open</p>
        </div>
        <p>We will notify you as soon as a developer picks up your ticket.</p>
        <a href="http://localhost:5173/client/dashboard"
          style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          View Dashboard
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">concept254.net — Software Development Services</p>
      </div>
    `
  })
}

const sendTicketAssigned = async (clientEmail, clientName, ticketTitle, developerName) => {
  await transporter.sendMail({
    from: `"concept254" <${process.env.EMAIL_FROM}>`,
    to: clientEmail,
    subject: `👨‍💻 Developer Assigned: ${ticketTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">concept254</h2>
        <p>Hi ${clientName},</p>
        <p>Great news! A developer has picked up your ticket and is now working on it.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold;">🎫 ${ticketTitle}</p>
          <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">Developer: ${developerName}</p>
          <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">Status: In Progress</p>
        </div>
        <p>You can message your developer directly through the ticket thread.</p>
        <a href="http://localhost:5173/client/dashboard"
          style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          View Ticket
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">concept254.net — Software Development Services</p>
      </div>
    `
  })
}

const sendTicketResolved = async (clientEmail, clientName, ticketTitle) => {
  await transporter.sendMail({
    from: `"concept254" <${process.env.EMAIL_FROM}>`,
    to: clientEmail,
    subject: `✅ Ticket Resolved: ${ticketTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">concept254</h2>
        <p>Hi ${clientName},</p>
        <p>Your ticket has been marked as resolved by the developer.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold;">🎫 ${ticketTitle}</p>
          <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">Status: Resolved</p>
        </div>
        <p>Please review the work and close the ticket if you are satisfied. You will also be able to leave a review for the developer.</p>
        <a href="http://localhost:5173/client/dashboard"
          style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          Review & Close Ticket
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">concept254.net — Software Development Services</p>
      </div>
    `
  })
}

const sendTicketClosed = async (developerEmail, developerName, ticketTitle, budget) => {
  await transporter.sendMail({
    from: `"concept254" <${process.env.EMAIL_FROM}>`,
    to: developerEmail,
    subject: `🎉 Ticket Closed: ${ticketTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">concept254</h2>
        <p>Hi ${developerName},</p>
        <p>The client has approved your work and closed the ticket. Great job!</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold;">🎫 ${ticketTitle}</p>
          <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">Status: Closed</p>
          <p style="margin: 4px 0 0; color: #16a34a; font-size: 14px; font-weight: bold;">
            💰 Budget: R${budget || '0.00'}
          </p>
        </div>
        <p>Thank you for your great work on concept254!</p>
        <a href="http://localhost:5173/developer/dashboard"
          style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          View Dashboard
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">concept254.net — Software Development Services</p>
      </div>
    `
  })
}

const sendNewMessage = async (recipientEmail, recipientName, ticketTitle, senderName) => {
  await transporter.sendMail({
    from: `"concept254" <${process.env.EMAIL_FROM}>`,
    to: recipientEmail,
    subject: `💬 New Message on: ${ticketTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">concept254</h2>
        <p>Hi ${recipientName},</p>
        <p><strong>${senderName}</strong> has sent you a new message on your ticket.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold;">🎫 ${ticketTitle}</p>
        </div>
        <a href="http://localhost:5173"
          style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          View Message
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">concept254.net — Software Development Services</p>
      </div>
    `
  })
}

module.exports = {
  sendTicketCreated,
  sendTicketAssigned,
  sendTicketResolved,
  sendTicketClosed,
  sendNewMessage
}