import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { checkDatabaseConnection } from './config/database.js';
import { autoInitializeDatabase } from './config/autoMigrate.js';

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('join_centre', (centreId: string) => {
      socket.join(`centre_${centreId}`);
      console.log(`[Socket.IO] Socket ${socket.id} joined centre_${centreId}`);
    });

    socket.on('join_user', (userId: string) => {
      socket.join(`user_${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  // Automatically check, create aavin_milkflow database and run migrations if empty
  await autoInitializeDatabase();

  // Check database connectivity
  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    console.warn('⚠️ WARNING: MySQL database connection failed. Ensure XAMPP MySQL is running on 127.0.0.1:3306 and aavin_milkflow database is imported.');
  } else {
    console.log('✅ MySQL Database connected successfully to database `aavin_milkflow`');
  }

  server.listen(env.PORT, env.HOST, () => {
    console.log(`
========================================================================
  🐄 AAVIN SMART CATTLE PASSPORT — MILK SAFETY TWIN BACKEND
========================================================================
  🚀 Server Running:     http://${env.HOST}:${env.PORT}
  📡 REST API Base:      http://${env.HOST}:${env.PORT}/api/v1
  🔍 Health Endpoint:    http://${env.HOST}:${env.PORT}/health
  📊 Environment:        ${env.NODE_ENV}
  🤖 AI Active Provider: ${env.AI_PROVIDER} (Fallback: ${env.AI_FALLBACK_ENABLED ? env.AI_FALLBACK_PROVIDER : 'DISABLED'})
========================================================================
    `);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal Server Bootstrap Error:', err);
  process.exit(1);
});
