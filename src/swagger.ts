import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Wake-on-LAN API',
      version: '1.0.0',
      description: 'A REST API for managing and waking devices using Wake-on-LAN protocol',
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Devices',
        description: 'Device management endpoints',
      },
      {
        name: 'Wake',
        description: 'Wake-on-LAN operations',
      },
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
    ],
    components: {
      schemas: {
        Device: {
          type: 'object',
          required: ['name', 'mac'],
          properties: {
            name: {
              type: 'string',
              description: 'Device name',
              example: 'my-computer',
            },
            mac: {
              type: 'string',
              description: 'MAC address (format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX)',
              example: '00:11:22:33:44:55',
            },
            ip: {
              type: 'string',
              description: 'IP address (optional)',
              example: '192.168.1.100',
            },
            broadcast: {
              type: 'string',
              description: 'Broadcast address (optional)',
              example: '192.168.1.255',
            },
          },
        },
        WakeResult: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the wake operation was successful',
            },
            device: {
              type: 'string',
              description: 'Device name',
            },
            mac: {
              type: 'string',
              description: 'MAC address',
            },
            message: {
              type: 'string',
              description: 'Result message',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
    },
  },
  apis: ['./src/api.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
