const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mind-club', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 50, // Maximum number of connections in the pool
            minPoolSize: 10, // Minimum number of connections in the pool
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
            serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
            heartbeatFrequencyMS: 10000, // Check the server's status every 10 seconds
            retryWrites: true,
            retryReads: true,
            w: 'majority', // Write concern
            wtimeoutMS: 2500 // Changed from wtimeout to wtimeoutMS
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Set global mongoose options
        mongoose.set('bufferCommands', false); // Disable command buffering
        mongoose.set('debug', process.env.NODE_ENV === 'development'); // Enable debug mode only in development

        // Handle connection events
        mongoose.connection.on('error', err => {
            console.error(`MongoDB connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        // Handle application termination
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB; 