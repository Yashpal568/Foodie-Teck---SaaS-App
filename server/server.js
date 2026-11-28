require('dotenv').config()
const express = require('express')
const http = require('http')
const cors = require('cors')
const helmet = require('helmet')
const emailRoutes = require('./routes/email.routes')
const billingRoutes = require('./routes/billing.routes')
const printRoutes = require('./routes/print.routes')
const { initExpiryCron } = require('./jobs/expiryCron')
const {
  requestContext,
  createRateLimiter,
  requireAuth,
  requireAdmin,
} = require('./middleware/security')

const app = express()
const server = http.createServer(app)

/* ===============================
   CORS Allowlist & Security Middleware
================================ */
const allowedOrigins = new Set(
  [
    'https://servora.quantumesh.in',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    process.env.FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : []),
  ].filter(Boolean)
)

app.use(helmet())
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser / same-origin server calls with no Origin header, or explicitly allowlisted origins
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true)
      }
      return callback(new Error('Origin not allowed by Servora CORS policy'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'X-Request-Id'],
  })
)
app.use(express.json({ limit: '256kb' }))
app.use(requestContext)
app.use('/api', createRateLimiter({ windowMs: 60_000, max: 180, keyPrefix: 'api-global' }))

/* ===============================
   Routes
================================ */
app.use('/api/email', emailRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/print', printRoutes)

/* Verified Server-Side Admin Session Check */
app.get('/api/admin/session', requireAuth, requireAdmin, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: String(req.user.app_metadata?.role || 'ADMIN').toUpperCase(),
    },
    requestId: req.requestId,
  })
})

/* ===============================
   Root Health Check (Minimal non-sensitive output)
================================ */
app.get('/', (req, res) => {
  res.json({
    name: 'Servora Platform Engine API',
    status: 'Healthy',
    time: new Date().toISOString(),
  })
})

/* ===============================
   Centralized Safe Error Handler
================================ */
app.use((err, req, res, _next) => {
  const status = err?.message?.includes('CORS policy') ? 403 : err?.status || 500
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${req.requestId}] Unhandled error:`, err?.message || err)
  }
  res.status(status).json({
    success: false,
    error: status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : (err?.message || 'Request failed'),
    requestId: req.requestId,
  })
})

/* ===============================
   Start Server & Cron Workers
================================ */
const PORT = process.env.PORT || 5000

if (require.main === module) {
  const startServer = server.listen(PORT, () => {
    console.log(`🚀 Servora Backend Running on port ${PORT}`)
    initExpiryCron()
  })

  const shutdown = () => {
    console.log('Shutting down server...')
    startServer.close(() => {
      console.log('Server closed cleanly')
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

module.exports = { app, server, allowedOrigins }
