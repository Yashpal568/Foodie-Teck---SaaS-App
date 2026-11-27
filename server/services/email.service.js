const nodemailer = require('nodemailer')
const { generatePurchaseInvoicePDF } = require('./pdf.service')

// Initialize Nodemailer Transporter
const getTransporter = () => {
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD

  if (!gmailUser || !gmailPass || gmailUser.includes('your-email')) {
    return null
  }

  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailPass
    }
  })
}

const getSenderAddress = () => {
  return process.env.EMAIL_FROM || `"Servora Platform" <${process.env.GMAIL_USER || 'no-reply@servora.app'}>`
}

/* ==========================================================================
   HTML EMAIL TEMPLATES
   ========================================================================== */

/**
 * 0. Welcome / Signup Email Template
 */
function getWelcomeEmailHTML({ merchantName, loginUrl = 'https://servora.quantumesh.in/login' }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Servora</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 20px;">
      <tr>
        <td align="center">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            
            <!-- Header -->
            <tr>
              <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                <div style="font-size: 24px; font-weight: 800; letter-spacing: 1px; color: #2563eb;">SERVORA</div>
              </td>
            </tr>

            <!-- Content Area -->
            <tr>
              <td style="padding: 32px;">
                <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 16px 0; line-height: 1.3;">
                  Welcome to Servora, ${merchantName || 'Partner'}! 🎉
                </h1>

                <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 24px 0;">
                  We are thrilled to have you on board. Servora is the all-in-one platform designed to help you manage your restaurant operations effortlessly.
                </p>
                
                <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 24px 0;">
                  To get the most out of your account, your next step is to set up your digital menu and customize your storefront. It only takes a few minutes!
                </p>

                <!-- CTA Button -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                  <tr>
                    <td align="center">
                      <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                        Go to Dashboard
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 0;">
                  If you have any questions or need a hand getting set up, our support team is just a reply away.
                </p>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px 0;">
                  Need help? Contact <a href="mailto:support@servora.app" style="color: #2563eb; text-decoration: none;">support@servora.app</a>
                </p>
                <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                  © ${new Date().getFullYear()} Servora Technologies Inc.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `
}

/**
 * 1. Password Reset / Recovery Link Email Template
 */
function getForgotPasswordEmailHTML({ merchantName, resetUrl, supportEmail = 'support@servora.app' }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Servora Password</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 20px;">
      <tr>
        <td align="center">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            
            <!-- Header -->
            <tr>
              <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                <div style="font-size: 24px; font-weight: 800; letter-spacing: 1px; color: #2563eb;">SERVORA</div>
              </td>
            </tr>

            <!-- Content Area -->
            <tr>
              <td style="padding: 32px;">
                <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 16px 0; line-height: 1.3;">
                  Reset your password
                </h1>

                <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 24px 0;">
                  Hi ${merchantName || 'Partner'},<br><br>
                  We received a request to reset the password for your Servora Merchant Account. Click the button below to set a new password.
                </p>

                <!-- CTA Button -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                  <tr>
                    <td align="center">
                      <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 0;">
                  This link will expire in 1 hour. If you did not request this change, you can safely ignore this email.
                </p>

                <p style="font-size: 13px; color: #9ca3af; line-height: 1.5; margin: 24px 0 0 0; word-break: break-all;">
                  Button not working? Paste this link into your browser:<br>
                  <a href="${resetUrl}" style="color: #2563eb; text-decoration: underline;">${resetUrl}</a>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px 0;">
                  Need help? Contact <a href="mailto:${supportEmail}" style="color: #2563eb; text-decoration: none;">${supportEmail}</a>
                </p>
                <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                  © ${new Date().getFullYear()} Servora Technologies Inc.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `
}

/**
 * 2. Purchase Summary & Tax Invoice Email Template
 */
function getPurchaseSummaryEmailHTML({
  merchantName,
  planName = 'PRO',
  amount = 2499,
  utrNumber = 'N/A',
  invoiceNumber,
  startDate,
  endDate,
  consoleUrl = 'https://servora.quantumesh.in/login'
}) {
  const formattedStart = startDate ? new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN')
  const formattedEnd = endDate ? new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Servora Subscription Receipt</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 20px;">
      <tr>
        <td align="center">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <tr>
              <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                <div style="font-size: 24px; font-weight: 800; letter-spacing: 1px; color: #2563eb;">SERVORA</div>
                <div style="font-size: 13px; font-weight: 500; color: #6b7280; margin-top: 8px;">Payment Receipt & Invoice</div>
              </td>
            </tr>

            <!-- Content Area -->
            <tr>
              <td style="padding: 32px;">
                <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 16px 0;">
                  Thank you, ${merchantName || 'Merchant'}!
                </h1>

                <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 24px 0;">
                  Your payment has been successfully processed. Your Servora dashboard is fully active and your subscription details are below.
                </p>

                <!-- Summary Card -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="font-size: 13px; color: #6b7280;">Amount Paid</td>
                          <td align="right" style="font-size: 16px; font-weight: 700; color: #111827;">₹${Number(amount).toLocaleString('en-IN')}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="font-size: 13px; color: #6b7280;">Plan Tier</td>
                          <td align="right" style="font-size: 14px; font-weight: 600; color: #374151;">${planName.toUpperCase()} PLAN</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="font-size: 13px; color: #6b7280;">Validity</td>
                          <td align="right" style="font-size: 13px; font-weight: 500; color: #374151;">${formattedStart} &mdash; ${formattedEnd}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 20px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="font-size: 13px; color: #6b7280;">Reference (UTR)</td>
                          <td align="right" style="font-size: 13px; font-family: monospace; color: #4b5563;">${utrNumber}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                  <p style="font-size: 14px; color: #1e3a8a; margin: 0; line-height: 1.5;">
                    📄 <strong>Tax Invoice Attached:</strong> A PDF copy of your invoice (<code>${invoiceNumber || 'Invoice.pdf'}</code>) is attached for your records.
                  </p>
                </div>

                <!-- CTA Button -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <a href="${consoleUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px;">
                        Open Dashboard
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px 0;">
                  Servora Billing &bull; billing@servora.app
                </p>
                <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                  © ${new Date().getFullYear()} Servora Technologies Inc.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `
}

/**
 * 3. Subscription Expiry Warning & Expiration Email Template
 */
function getSubscriptionExpiryEmailHTML({
  merchantName,
  planName = 'PRO',
  daysRemaining = 0,
  isExpired = false,
  expiryDate,
  renewUrl = 'https://servora.quantumesh.in/login'
}) {
  const formattedExpiry = expiryDate ? new Date(expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Soon'

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Servora Subscription Notice</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 20px;">
      <tr>
        <td align="center">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <!-- Header Banner -->
            <tr>
              <td style="background-color: ${isExpired ? '#fef2f2' : '#fffbeb'}; padding: 24px 32px; text-align: center; border-bottom: 1px solid ${isExpired ? '#fca5a5' : '#fde68a'};">
                <div style="font-size: 14px; font-weight: 600; color: ${isExpired ? '#dc2626' : '#d97706'}; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${isExpired ? 'Subscription Expired' : 'Subscription Expiring Soon'}
                </div>
              </td>
            </tr>

            <!-- Content Area -->
            <tr>
              <td style="padding: 32px;">
                <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 16px 0;">
                  ${isExpired ? `Your plan has expired` : `Action Required, ${merchantName || 'Partner'}`}
                </h1>

                <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 24px 0;">
                  ${isExpired 
                    ? `Your Servora <strong>${planName}</strong> plan expired on <strong>${formattedExpiry}</strong>. Service operations are currently paused.` 
                    : `Your Servora <strong>${planName}</strong> plan will expire on <strong>${formattedExpiry}</strong> (${daysRemaining} day${daysRemaining > 1 ? 's' : ''} remaining). Please renew to prevent service interruptions.`}
                </p>

                <!-- Summary Card -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="font-size: 13px; color: #6b7280;">Restaurant</td>
                          <td align="right" style="font-size: 14px; font-weight: 600; color: #111827;">${merchantName || 'Merchant'}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="font-size: 13px; color: #6b7280;">Plan Tier</td>
                          <td align="right" style="font-size: 14px; font-weight: 600; color: #374151;">${planName.toUpperCase()}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 20px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="font-size: 13px; color: #6b7280;">Expiry Date</td>
                          <td align="right" style="font-size: 14px; font-weight: 600; color: ${isExpired ? '#dc2626' : '#d97706'};">${formattedExpiry}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- CTA Button -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <a href="${renewUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px;">
                        Renew Subscription
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px 0;">
                  Servora Billing &bull; billing@servora.app
                </p>
                <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                  © ${new Date().getFullYear()} Servora Technologies Inc.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `
}

/**
 * 4. Test Diagnostic Email Template
 */
function getTestEmailHTML({ recipient, serverTime }) {
  return `
  <!DOCTYPE html>
  <html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; padding: 40px 20px;">
    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <h2 style="color: #111827; font-size: 20px; margin-top: 0;">⚡ SMTP Connected</h2>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">This is a live test email confirming your Gmail configuration is fully operational.</p>
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 13px; color: #4b5563; margin-top: 24px;">
        <strong>Recipient:</strong> ${recipient}<br><br>
        <strong>Timestamp:</strong> ${serverTime || new Date().toISOString()}
      </div>
    </div>
  </body>
  </html>
  `
}

/* ==========================================================================
   DISPATCH METHODS
   ========================================================================== */

/**
 * Dispatches Welcome / Signup Email
 */
async function sendWelcomeEmail({ email, merchantName, loginUrl }) {
  const transporter = getTransporter()
  const html = getWelcomeEmailHTML({ merchantName, loginUrl })
  const cleanEmail = email.trim().toLowerCase()

  if (!transporter) {
    console.log(`[SIMULATED EMAIL] Welcome Email dispatched to: ${cleanEmail}`)
    return {
      success: true,
      mode: 'simulation',
      message: 'Email simulated in development mode (Configure GMAIL_USER and GMAIL_APP_PASSWORD in server/.env for live delivery).'
    }
  }

  const mailOptions = {
    from: getSenderAddress(),
    to: cleanEmail,
    subject: "🎉 Welcome to Servora! Let's get started.",
    html
  }

  const info = await transporter.sendMail(mailOptions)
  return { success: true, mode: 'live', messageId: info.messageId }
}

/**
 * Dispatches Password Reset Recovery Email
 */
async function sendForgotPasswordEmail({ email, merchantName, resetUrl }) {
  const transporter = getTransporter()
  const html = getForgotPasswordEmailHTML({ merchantName, resetUrl })
  const cleanEmail = email.trim().toLowerCase()

  if (!transporter) {
    console.log(`[SIMULATED EMAIL] Password Reset Email dispatched to: ${cleanEmail}`)
    console.log(`[SIMULATED EMAIL] Reset Link: ${resetUrl}`)
    return {
      success: true,
      mode: 'simulation',
      message: 'Email simulated in development mode (Configure GMAIL_USER and GMAIL_APP_PASSWORD in server/.env for live delivery).'
    }
  }

  const mailOptions = {
    from: getSenderAddress(),
    to: cleanEmail,
    subject: '🔑 Reset Your Servora Merchant Password',
    html
  }

  const info = await transporter.sendMail(mailOptions)
  return { success: true, mode: 'live', messageId: info.messageId }
}

/**
 * Dispatches Purchase Summary Email with Generated PDF Tax Invoice
 */
async function sendPurchaseSummaryEmail(purchaseData) {
  const transporter = getTransporter()
  const cleanEmail = (purchaseData.email || purchaseData.merchantEmail || '').trim().toLowerCase()
  const invoiceNumber = `SRV-INV-${Date.now().toString().slice(-6)}`

  // Generate the PDF Invoice Buffer
  const pdfBuffer = await generatePurchaseInvoicePDF({
    ...purchaseData,
    invoiceNumber,
    merchantEmail: cleanEmail
  })

  const html = getPurchaseSummaryEmailHTML({
    merchantName: purchaseData.merchantName || purchaseData.businessName,
    planName: purchaseData.planName || purchaseData.plan,
    amount: purchaseData.amount || purchaseData.price,
    utrNumber: purchaseData.utrNumber || purchaseData.utr,
    invoiceNumber,
    startDate: purchaseData.startDate || new Date().toISOString(),
    endDate: purchaseData.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    consoleUrl: purchaseData.consoleUrl || `${process.env.FRONTEND_URL || 'https://servora.quantumesh.in'}/console/${purchaseData.restaurantId || ''}`
  })

  if (!transporter) {
    console.log(`[SIMULATED EMAIL] Purchase Summary & PDF Invoice generated for: ${cleanEmail}`)
    console.log(`[SIMULATED EMAIL] Plan: ${purchaseData.planName} (₹${purchaseData.amount}) - UTR: ${purchaseData.utrNumber}`)
    return {
      success: true,
      mode: 'simulation',
      invoiceNumber,
      message: 'Purchase summary & PDF invoice simulated (Configure GMAIL_USER and GMAIL_APP_PASSWORD in server/.env for live delivery).'
    }
  }

  const mailOptions = {
    from: getSenderAddress(),
    to: cleanEmail,
    subject: `🎉 Payment Verified: Servora ${purchaseData.planName || 'PRO'} Plan Activated + Tax Invoice`,
    html,
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  }

  const info = await transporter.sendMail(mailOptions)
  return { success: true, mode: 'live', messageId: info.messageId, invoiceNumber }
}

/**
 * Dispatches Subscription Expiry Warning / Expired Email
 */
async function sendSubscriptionExpiryEmail(expiryData) {
  const transporter = getTransporter()
  const cleanEmail = (expiryData.email || expiryData.merchantEmail || '').trim().toLowerCase()

  const html = getSubscriptionExpiryEmailHTML({
    merchantName: expiryData.merchantName || expiryData.businessName,
    planName: expiryData.planName || expiryData.plan,
    daysRemaining: expiryData.daysRemaining || 0,
    isExpired: expiryData.isExpired || false,
    expiryDate: expiryData.expiryDate,
    renewUrl: expiryData.renewUrl || `${process.env.FRONTEND_URL || 'https://servora.quantumesh.in'}/console/${expiryData.restaurantId || ''}`
  })

  const subject = expiryData.isExpired
    ? `⚠️ Action Required: Your Servora Subscription has Expired`
    : `⏳ Reminder: Your Servora Subscription Expires in ${expiryData.daysRemaining} Days`

  if (!transporter) {
    console.log(`[SIMULATED EMAIL] Expiry Notification (${expiryData.daysRemaining} days remaining) for: ${cleanEmail}`)
    return {
      success: true,
      mode: 'simulation',
      message: 'Expiry email simulated in development mode.'
    }
  }

  const mailOptions = {
    from: getSenderAddress(),
    to: cleanEmail,
    subject,
    html
  }

  const info = await transporter.sendMail(mailOptions)
  return { success: true, mode: 'live', messageId: info.messageId }
}

/**
 * Dispatches Test Diagnostic Email
 */
async function sendTestEmail({ email }) {
  const transporter = getTransporter()
  const cleanEmail = email.trim().toLowerCase()
  const html = getTestEmailHTML({ recipient: cleanEmail, serverTime: new Date().toISOString() })

  if (!transporter) {
    return {
      success: false,
      mode: 'simulation',
      error: 'Gmail credentials not configured in server/.env (GMAIL_USER / GMAIL_APP_PASSWORD missing).'
    }
  }

  const mailOptions = {
    from: getSenderAddress(),
    to: cleanEmail,
    subject: '⚡ Servora Gmail Service Diagnostics Test',
    html
  }

  const info = await transporter.sendMail(mailOptions)
  return { success: true, mode: 'live', messageId: info.messageId }
}

/**
 * Verifies SMTP Connection
 */
async function verifySMTPConnection() {
  const transporter = getTransporter()
  if (!transporter) {
    return { configured: false, status: 'Not Configured (Simulation Mode Active)' }
  }

  try {
    await transporter.verify()
    return { configured: true, status: 'Connected to Gmail SMTP' }
  } catch (err) {
    return { configured: false, status: 'Connection Failed', error: err.message }
  }
}

module.exports = {
  sendWelcomeEmail,
  sendForgotPasswordEmail,
  sendPurchaseSummaryEmail,
  sendSubscriptionExpiryEmail,
  sendTestEmail,
  verifySMTPConnection
}
