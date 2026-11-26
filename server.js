import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import connectDB, { disconnectDB } from './config/db.js';
import ConnectionTest from './models/ConnectionTest.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(cors());
app.use(express.json());

// Application Health Check Endpoint
app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'healthy' : 'degraded',
    service: 'Backend API Service',
    timestamp: new Date().toISOString(),
    database: {
      connected: isConnected,
      status: states[mongoose.connection.readyState] || 'unknown',
      host: isConnected ? mongoose.connection.host : null,
      name: isConnected ? mongoose.connection.name : null,
    },
  });
});

// Database Operations Test - Create Document (Write test)
app.post('/api/test/document', async (req, res) => {
  try {
    const { testName, metadata } = req.body;
    const newDoc = await ConnectionTest.create({
      testName: testName || 'Manual Express Write Test',
      metadata: metadata || { client: 'API Route Test', timestamp: Date.now() },
    });

    res.status(201).json({
      success: true,
      message: 'Document successfully written to MongoDB Atlas.',
      data: newDoc,
    });
  } catch (error) {
    console.error('[API Error] Write operation failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to write document to MongoDB Atlas.',
      error: error.message,
    });
  }
});

// Database Operations Test - Retrieve Documents (Read test)
app.get('/api/test/document', async (req, res) => {
  try {
    const documents = await ConnectionTest.find().sort({ createdAt: -1 }).limit(10);
    const count = await ConnectionTest.countDocuments();

    res.status(200).json({
      success: true,
      totalCount: count,
      returnedCount: documents.length,
      data: documents,
    });
  } catch (error) {
    console.error('[API Error] Read operation failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to read documents from MongoDB Atlas.',
      error: error.message,
    });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
  });
});

// Server Initialization
let server;

const startServer = async () => {
  try {
    console.log('[Server] Connecting to MongoDB Atlas...');
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`[Server] Express server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('[Server] Fatal: Express server startup aborted due to database connection failure.');
    console.error(`[Server] Root cause: ${error.message}`);
    process.exit(1);
  }
};

// Graceful Shutdown Handler
const handleGracefulShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server stopped accepting connections.');
      await disconnectDB();
      console.log('[Server] Process exiting gracefully.');
      process.exit(0);
    });

    // Force exit after 10 seconds if shutdown hangs
    setTimeout(() => {
      console.error('[Server] Forcing shutdown after timeout.');
      process.exit(1);
    }, 10000);
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();

export default app;
