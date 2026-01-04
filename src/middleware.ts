import { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

let requestCounter = 0;

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate timestamp in format: YYYYMMDDHHMMSS
  const now = new Date();
  const datetime = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');

  // Generate sequential part (6 digits, wraps at 999999)
  requestCounter = (requestCounter + 1) % 1000000;
  const sequential = String(requestCounter).padStart(6, '0');

  // Format: hixbe-datetime-sequential
  const requestId = `hixbe-${datetime}-${sequential}`;

  // Set request ID in response header
  res.setHeader('X-Request-Id', requestId);

  // Store request ID in request object for logging
  (req as any).requestId = requestId;

  next();
}

export function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = (req as any).requestId;

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;
    
    // Log response
    logger.info('Outgoing response', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });

    return originalSend.call(this, data);
  };

  next();
}
