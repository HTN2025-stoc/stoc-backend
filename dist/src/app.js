"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const feeds_1 = __importDefault(require("./routes/feeds"));
const sharing_1 = __importDefault(require("./routes/sharing"));
const subscriptions_1 = __importDefault(require("./routes/subscriptions"));
const discovery_1 = __importDefault(require("./routes/discovery"));
const errorHandler_1 = require("./middleware/errorHandler");
const requestLogger_1 = require("./middleware/requestLogger");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Security middleware
app.use((0, helmet_1.default)());
// CORS configuration
const corsOptions = {
    origin: true, // Allow all origins for development
    credentials: true,
    optionsSuccessStatus: 200
};
app.use((0, cors_1.default)(corsOptions));
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
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Enhanced request logging with debug info
app.use((req, res, next) => {
    console.log(`\n🔍 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log(`📍 Origin: ${req.headers.origin || 'none'}`);
    console.log(`🔑 Authorization: ${req.headers.authorization ? 'Present' : 'Missing'}`);
    console.log(`📦 Content-Type: ${req.headers['content-type'] || 'none'}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`📄 Body:`, JSON.stringify(req.body, null, 2));
    }
    // Log response
    const originalSend = res.send;
    res.send = function (data) {
        console.log(`✅ Response ${res.statusCode}:`, typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200));
        return originalSend.call(this, data);
    };
    next();
});
// Original request logger
app.use(requestLogger_1.requestLogger);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
// API routes
app.use('/auth', auth_1.default);
app.use('/feeds', feeds_1.default);
app.use('/sharing', sharing_1.default);
app.use('/subscriptions', subscriptions_1.default);
app.use('/discovery', discovery_1.default);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
    });
});
// Error handling middleware (must be last)
app.use(errorHandler_1.errorHandler);
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Stoc API server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
exports.default = app;
//# sourceMappingURL=app.js.map