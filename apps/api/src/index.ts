// ============================================================================
// MASASIA API - Entry Point
// ============================================================================

import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { initializeSocket } from './socket/index.js';
import { prisma } from './config/database.js';
import { redis } from './config/redis.js';

const PORT = process.env.PORT || 3000;

async function main() {
  // Create HTTP server
  const server = http.createServer(app);

  // Initialize Socket.IO
  initializeSocket(server);

  // Test database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Test Redis connection
  try {
    await redis.ping();
    console.log('✅ Redis connected');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    process.exit(1);
  }

  // Start server
  server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 MASASIA API Server                                   ║
║                                                           ║
║   Environment: ${process.env.NODE_ENV?.padEnd(40)}║
║   Port: ${PORT.toString().padEnd(48)}║
║   API: http://localhost:${PORT}/api/v1                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');
    
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    await prisma.$disconnect();
    console.log('✅ Database disconnected');

    redis.disconnect();
    console.log('✅ Redis disconnected');

    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
