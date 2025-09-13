import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'

import authRoutes from './routes/auth'
import feedRoutes from './routes/feeds'
import sharingRoutes from './routes/sharing'
import subscriptionRoutes from './routes/subscriptions'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())

// CORS configuration
const corsOptions = {
  origin: true, // Allow all origins for development
  credentials: true,
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions))

// Rate limiting
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
//   message: {
//     error: 'Too many requests from this IP, please try again later.'
//   }
// })
// app.use(limiter)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Enhanced request logging with debug info
app.use((req, res, next) => {
  console.log(`\n🔍 [${new Date().toISOString()}] ${req.method} ${req.url}`)
  console.log(`📍 Origin: ${req.headers.origin || 'none'}`)
  console.log(`🔑 Authorization: ${req.headers.authorization ? 'Present' : 'Missing'}`)
  console.log(`📦 Content-Type: ${req.headers['content-type'] || 'none'}`)
  
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`📄 Body:`, JSON.stringify(req.body, null, 2))
  }
  
  // Log response
  const originalSend = res.send
  res.send = function(data) {
    console.log(`✅ Response ${res.statusCode}:`, typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200))
    return originalSend.call(this, data)
  }
  
  next()
})

// Original request logger
app.use(requestLogger)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// API routes
app.use('/auth', authRoutes)
app.use('/feeds', feedRoutes)
app.use('/sharing', sharingRoutes)
app.use('/subscriptions', subscriptionRoutes)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  })
})

// Error handling middleware (must be last)
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Stoc API server running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/health`)
})

export default app
