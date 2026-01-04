import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, requestId, ...metadata }) => {
  let msg = `${timestamp} [${level}]`;
  
  if (requestId) {
    msg += ` [${requestId}]`;
  }
  
  msg += `: ${message}`;
  
  // Add metadata if present
  const metaStr = Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : '';
  if (metaStr) {
    msg += ` ${metaStr}`;
  }
  
  return msg;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: combine(
        colorize(),
        logFormat
      ),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(
        timestamp(),
        winston.format.json()
      ),
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: combine(
        timestamp(),
        winston.format.json()
      ),
    }),
  ],
});

// Add stream for morgan-like middleware
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
