const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const nodemailer = require('nodemailer')

const {
  sendWelcomeEmail,
  sendForgotPasswordEmail,
  sendPurchaseSummaryEmail,
  sendSubscriptionExpiryEmail,
  verifySMTPConnection,
} = require('../services/email.service')

describe('Nodemailer v10 Compatibility & Email Service Tests', () => {
  it('verifies installed Nodemailer v10 transport creation and stream sendMail cleanly', async () => {
    const pkg = require('nodemailer/package.json')
    assert.ok(Number(pkg.version.split('.')[0]) >= 10, `Expected nodemailer >=10, got ${pkg.version}`)

    const transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    })

    const info = await transporter.sendMail({
      from: '"Servora Platform" <no-reply@servora.app>',
      to: 'merchant@servora.test',
      subject: 'Servora Nodemailer 10 SMTP Compatibility Check',
      text: 'Verified RFC MIME serialization with streamTransport.',
    })

    assert.ok(info.envelope)
    assert.deepEqual(info.envelope.to, ['merchant@servora.test'])
    assert.ok(Buffer.isBuffer(info.message))
    assert.ok(info.message.toString('utf8').includes('Servora Nodemailer 10 SMTP Compatibility Check'))
  })

  it('exercises email.service.js templates, PDF attachment flow, and SMTP verify guard', async () => {
    const prevUser = process.env.GMAIL_USER
    const prevPass = process.env.GMAIL_APP_PASSWORD
    try {
      delete process.env.GMAIL_USER
      delete process.env.GMAIL_APP_PASSWORD

      const status = await verifySMTPConnection()
      assert.equal(status.configured, false)

      const welcome = await sendWelcomeEmail({
        email: 'merchant@servora.test',
        merchantName: 'Test Bistro',
        loginUrl: 'https://servora.quantumesh.in/login',
      })
      assert.equal(welcome.success, true)
      assert.equal(welcome.mode, 'simulation')

      const forgot = await sendForgotPasswordEmail({
        email: 'merchant@servora.test',
        merchantName: 'Test Bistro',
        resetUrl: 'https://servora.quantumesh.in/reset-password',
      })
      assert.equal(forgot.success, true)

      const purchase = await sendPurchaseSummaryEmail({
        email: 'merchant@servora.test',
        merchantName: 'Test Bistro',
        planName: 'All-in-One Unlimited',
        amount: 2100,
        utrNumber: 'QA2026112701',
        restaurantId: '3a10e567-9e10-4c27-aadd-64e84cd8694c',
      })
      assert.equal(purchase.success, true)
      assert.ok(purchase.invoiceNumber.startsWith('SRV-INV-'))

      const expiry = await sendSubscriptionExpiryEmail({
        email: 'merchant@servora.test',
        merchantName: 'Test Bistro',
        daysRemaining: 3,
        isExpired: false,
      })
      assert.equal(expiry.success, true)
    } finally {
      if (prevUser !== undefined) process.env.GMAIL_USER = prevUser
      if (prevPass !== undefined) process.env.GMAIL_APP_PASSWORD = prevPass
    }
  })
})
