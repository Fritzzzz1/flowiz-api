/**
 * WebSocket service
 *
 * Manages Socket.io connections for real-time pipeline updates.
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '@/utils/logger';

let io: SocketIOServer | null = null;

/**
 * Initialize WebSocket server
 *
 * @param server - HTTP server instance
 * @returns Socket.io server instance
 */
export function initializeWebSocket(server: HTTPServer): SocketIOServer {
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:5173'];

  io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    logger.info('WebSocket client connected', { socketId: socket.id });

    // Handle pipeline subscription
    socket.on('subscribe-pipeline', (pipelineId: string) => {
      if (!pipelineId || typeof pipelineId !== 'string') {
        logger.warn('Invalid pipeline ID for subscription', { socketId: socket.id });
        socket.emit('error', { message: 'Invalid pipeline ID' });
        return;
      }

      const room = `pipeline:${pipelineId}`;
      socket.join(room);
      logger.info('Client subscribed to pipeline', {
        socketId: socket.id,
        pipelineId,
        room,
      });

      socket.emit('subscribed', { pipelineId });
    });

    // Handle pipeline unsubscription
    socket.on('unsubscribe-pipeline', (pipelineId: string) => {
      if (!pipelineId || typeof pipelineId !== 'string') {
        logger.warn('Invalid pipeline ID for unsubscription', { socketId: socket.id });
        return;
      }

      const room = `pipeline:${pipelineId}`;
      socket.leave(room);
      logger.info('Client unsubscribed from pipeline', {
        socketId: socket.id,
        pipelineId,
        room,
      });

      socket.emit('unsubscribed', { pipelineId });
    });

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      logger.info('WebSocket client disconnected', {
        socketId: socket.id,
        reason,
      });
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      logger.error('WebSocket error', {
        socketId: socket.id,
        error: error.message,
      });
    });
  });

  logger.info('WebSocket server initialized');

  return io;
}

/**
 * Emit pipeline update to subscribed clients
 *
 * @param pipelineId - Pipeline identifier
 * @param data - Update data
 */
export function emitPipelineUpdate(pipelineId: string, data: Record<string, unknown>): void {
  if (!io) {
    logger.warn('Cannot emit pipeline update: WebSocket not initialized');
    return;
  }

  const room = `pipeline:${pipelineId}`;
  io.to(room).emit('pipeline-update', {
    pipelineId,
    ...data,
    timestamp: new Date().toISOString(),
  });

  logger.debug('Pipeline update emitted', { pipelineId, room });
}

/**
 * Emit job update to subscribed clients
 *
 * @param pipelineId - Pipeline identifier
 * @param jobId - Job identifier
 * @param data - Update data
 */
export function emitJobUpdate(
  pipelineId: string,
  jobId: string,
  data: Record<string, unknown>
): void {
  if (!io) {
    logger.warn('Cannot emit job update: WebSocket not initialized');
    return;
  }

  const room = `pipeline:${pipelineId}`;
  io.to(room).emit('job-update', {
    pipelineId,
    jobId,
    ...data,
    timestamp: new Date().toISOString(),
  });

  logger.debug('Job update emitted', { pipelineId, jobId, room });
}

/**
 * Get Socket.io server instance
 *
 * @returns Socket.io server instance or null if not initialized
 */
export function getSocketIO(): SocketIOServer | null {
  return io;
}

/**
 * Close WebSocket server
 */
export function closeWebSocket(): void {
  if (io) {
    io.close();
    io = null;
    logger.info('WebSocket server closed');
  }
}
