import mongoose from 'mongoose';

/**
 * Utility to safely sanitize the MongoDB URI for logging.
 * Strips password and user credentials to avoid credential leakage.
 * @param {string} uri 
 * @returns {string} Sanitized connection string
 */
export const sanitizeMongoUri = (uri) => {
  if (!uri) return '[UNDEFINED_URI]';
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  } catch {
    return '[PROTECTED_URI]';
  }
};

/**
 * Establishes an asynchronous connection to MongoDB Atlas using Mongoose.
 * Validates environment variables and configures production-grade pool & timeout settings.
 * @returns {Promise<typeof mongoose>}
 */
const connectDB = async () => {
  // In a Vite project, env vars are accessed via import.meta.env (not process.env).
  // Variables must be prefixed with VITE_ in your .env file to be exposed to the browser.
  // IMPORTANT: Never put real DB credentials in a frontend .env — this is for the
  // backend server.js only. This file should NOT run in the browser bundle.
  const uri = import.meta.env.VITE_MONGODB_URI;

  if (!uri || uri.trim() === '') {
    const errorMsg = 'CRITICAL: MONGODB_URI environment variable is not defined or is empty.';
    console.error(`[Database Config] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  if (uri.includes('<DB_PASSWORD>') || uri.includes('<DATABASE_NAME>')) {
    const errorMsg = 'CONFIGURATION ERROR: MONGODB_URI still contains placeholder values (<DB_PASSWORD> or <DATABASE_NAME>). Please update your .env file with actual credentials.';
    console.error(`[Database Config] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // Connection options optimized for MongoDB Atlas
  const mongooseOptions = {
    serverSelectionTimeoutMS: 8000, // Timeout after 8s instead of hanging 30s
    socketTimeoutMS: 45000,         // Close sockets after 45s of inactivity
    maxPoolSize: 10,                // Maintain up to 10 socket connections
    minPoolSize: 2,                 // Minimum connections to keep warm
    autoIndex: import.meta.env.MODE !== 'production', // Build indexes automatically only in dev
  };

  try {
    const conn = await mongoose.connect(uri, mongooseOptions);

    console.log(`[MongoDB Atlas] Successfully connected.`);
    console.log(`[MongoDB Atlas] Host: ${conn.connection.host}`);
    console.log(`[MongoDB Atlas] Database: ${conn.connection.name}`);
    console.log(`[MongoDB Atlas] Cluster State: Ready (Connection State: ${conn.connection.readyState})`);

    return conn;
  } catch (error) {
    // Log error message securely without exposing URI / credentials
    console.error(`[MongoDB Atlas] Connection failed: ${error.name} - ${error.message}`);
    throw error;
  }
};

// Mongoose Connection Event Listeners
mongoose.connection.on('connected', () => {
  console.log('[MongoDB Atlas] Event: Connection established.');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB Atlas] Event Error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB Atlas] Event: Connection disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB Atlas] Event: Connection re-established.');
});

/**
 * Gracefully terminates the MongoDB Mongoose connection.
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close(false);
    console.log('[MongoDB Atlas] Connection closed cleanly.');
  } catch (err) {
    console.error('[MongoDB Atlas] Error during disconnect:', err.message);
  }
};

export default connectDB;
