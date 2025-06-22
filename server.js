const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cluster = require('cluster');
const os = require('os');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    // Fork workers
    for (let i = 0; i < os.cpus().length; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        // Replace the dead worker
        cluster.fork();
    });
} else {
    // Connect to database
    connectDB()
        .then(() => {
            console.log('Connected to MongoDB successfully');
        })
        .catch((err) => {
            console.error('MongoDB connection error:', err.message);
            process.exit(1);
        });

    // Create Express app
    const app = express();

    // Security middleware
    app.use(helmet());

    // Rate limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later'
    });
    app.use(limiter);

    // Compression middleware
    app.use(compression());

    // CORS and body parsing middleware
    app.use(cors({
        origin: (origin, callback) => {
            callback(null, origin); // Reflects the request origin
        },
        credentials: true
    }));
    app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Set timeout for all requests
    app.use((req, res, next) => {
        req.setTimeout(30000, () => { // Increased timeout to 30 seconds
            res.status(408).send('Request timeout');
        });
        next();
    });

    // Routes
    app.use('/api/admin', require('./routes/admin.routes'));
    app.use('/api/workshops', require('./routes/workshop.routes'));
    app.use('/api/upload', require('./routes/upload.routes'));

    // Error handling middleware
    app.use((err, req, res, next) => {
        console.error('Error details:', {
            message: err.message,
            stack: err.stack,
            name: err.name
        });

        // Handle specific error types
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                details: err.message
            });
        }

        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }

        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired'
            });
        }

        // Default error response
        res.status(500).json({
            success: false,
            error: err.message || 'Something went wrong!',
            details: isProduction ? undefined : err.stack
        });
    });

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        if (!isProduction) {
            console.log(`Server running in development mode on port ${PORT}`);
        } else {
            console.log(`Worker ${process.pid} started on port ${PORT}`);
        }
    });
} 