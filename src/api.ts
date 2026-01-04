import express, { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import rateLimit from 'express-rate-limit';
import { DeviceManager } from './device-manager.js';
import { WakeOnLanService } from './wol-service.js';
import { swaggerSpec } from './swagger.js';
import { requestIdMiddleware, loggingMiddleware } from './middleware.js';
import { logger } from './logger.js';
import type { Device } from './types.js';

const app = express();
const deviceManager = new DeviceManager();
const wolService = new WakeOnLanService();

// Rate limiter configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' },
});

// Middleware
app.disable('x-powered-by');
app.use(requestIdMiddleware);
app.use(loggingMiddleware);
app.use(limiter);
app.use(express.json());

// Initialize device manager
await deviceManager.loadDevices();

logger.info('Device manager initialized', { 
  deviceCount: deviceManager.getDevices().length 
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * @swagger
 * /api/devices:
 *   get:
 *     summary: Get all devices
 *     tags: [Devices]
 *     responses:
 *       200:
 *         description: List of all configured devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 devices:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Device'
 *                 count:
 *                   type: integer
 */
app.get('/api/devices', (_req: Request, res: Response) => {
  const devices = deviceManager.getDevices();
  res.json({ devices, count: devices.length });
});

/**
 * @swagger
 * /api/devices/{name}:
 *   get:
 *     summary: Get device by name
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Device name
 *     responses:
 *       200:
 *         description: Device details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Device'
 *       404:
 *         description: Device not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/devices/:name', (req: Request, res: Response) => {
  const device = deviceManager.getDevice(req.params.name);
  if (!device) {
    res.status(404).json({ error: 'Device not found' });
    return;
  }
  res.json(device);
});

/**
 * @swagger
 * /api/devices:
 *   post:
 *     summary: Add a new device
 *     tags: [Devices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Device'
 *     responses:
 *       201:
 *         description: Device added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 device:
 *                   $ref: '#/components/schemas/Device'
 *       400:
 *         description: Invalid request or device already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/devices', async (req: Request, res: Response) => {
  try {
    const { name, mac, ip, broadcast } = req.body;

    if (!name || !mac) {
      res.status(400).json({ error: 'Name and MAC address are required' });
      return;
    }

    if (!wolService.isValidMac(mac)) {
      res.status(400).json({ error: 'Invalid MAC address format' });
      return;
    }

    const device: Device = { name, mac, ip, broadcast };
    await deviceManager.addDevice(device);
    res.status(201).json({ message: 'Device added successfully', device });
  } catch (error) {
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Failed to add device' 
    });
  }
});

/**
 * @swagger
 * /api/devices/{name}:
 *   put:
 *     summary: Update a device
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Device name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mac:
 *                 type: string
 *               ip:
 *                 type: string
 *               broadcast:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device updated successfully
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Device not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.put('/api/devices/:name', async (req: Request, res: Response) => {
  try {
    const { mac, ip, broadcast } = req.body;
    const updates: Partial<Device> = {};

    if (mac) {
      if (!wolService.isValidMac(mac)) {
        res.status(400).json({ error: 'Invalid MAC address format' });
        return;
      }
      updates.mac = mac;
    }
    if (ip !== undefined) updates.ip = ip;
    if (broadcast !== undefined) updates.broadcast = broadcast;

    const updated = await deviceManager.updateDevice(req.params.name, updates);
    if (!updated) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    res.json({ message: 'Device updated successfully' });
  } catch (error) {
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Failed to update device' 
    });
  }
});

/**
 * @swagger
 * /api/devices/{name}:
 *   delete:
 *     summary: Remove a device
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Device name
 *     responses:
 *       200:
 *         description: Device removed successfully
 *       404:
 *         description: Device not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.delete('/api/devices/:name', async (req: Request, res: Response) => {
  try {
    const removed = await deviceManager.removeDevice(req.params.name);
    if (!removed) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }
    res.json({ message: 'Device removed successfully' });
  } catch (error) {
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Failed to remove device' 
    });
  }
});

/**
 * @swagger
 * /api/wake:
 *   get:
 *     summary: Wake a device using query parameters
 *     tags: [Wake]
 *     parameters:
 *       - in: query
 *         name: device
 *         schema:
 *           type: string
 *         description: Device name to wake
 *       - in: query
 *         name: mac
 *         schema:
 *           type: string
 *         description: MAC address to wake
 *       - in: query
 *         name: broadcast
 *         schema:
 *           type: string
 *         description: Broadcast address (optional, used with mac)
 *     responses:
 *       200:
 *         description: Device woken successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WakeResult'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Device not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to wake device
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WakeResult'
 */
app.get('/api/wake', async (req: Request, res: Response) => {
  try {
    const { mac, device, broadcast } = req.query;

    // Wake by device name
    if (device && typeof device === 'string') {
      const deviceConfig = deviceManager.getDevice(device);
      if (!deviceConfig) {
        res.status(404).json({ error: 'Device not found' });
        return;
      }

      const result = await wolService.wakeDevice(deviceConfig);
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
      return;
    }

    // Wake by MAC address
    if (mac && typeof mac === 'string') {
      if (!wolService.isValidMac(mac)) {
        res.status(400).json({ error: 'Invalid MAC address format' });
        return;
      }

      const broadcastAddr = typeof broadcast === 'string' ? broadcast : undefined;
      const result = await wolService.wake(mac, broadcastAddr);
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
      return;
    }

    res.status(400).json({ error: 'Either "device" or "mac" query parameter is required' });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to wake device' 
    });
  }
});

/**
 * @swagger
 * /api/wake/{name}:
 *   post:
 *     summary: Wake a device by name (POST)
 *     tags: [Wake]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Device name
 *     responses:
 *       200:
 *         description: Device woken successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WakeResult'
 *       404:
 *         description: Device not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to wake device
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WakeResult'
 */
app.post('/api/wake/:name', async (req: Request, res: Response) => {
  try {
    const device = deviceManager.getDevice(req.params.name);
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    const result = await wolService.wakeDevice(device);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to wake device' 
    });
  }
});

/**
 * @swagger
 * /api/wake:
 *   post:
 *     summary: Wake a device by MAC address (POST)
 *     tags: [Wake]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mac
 *             properties:
 *               mac:
 *                 type: string
 *                 description: MAC address
 *                 example: "00:11:22:33:44:55"
 *               broadcast:
 *                 type: string
 *                 description: Broadcast address (optional)
 *                 example: "192.168.1.255"
 *     responses:
 *       200:
 *         description: Device woken successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WakeResult'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to wake device
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WakeResult'
 */
app.post('/api/wake', async (req: Request, res: Response) => {
  try {
    const { mac, broadcast } = req.body;

    if (!mac) {
      res.status(400).json({ error: 'MAC address is required' });
      return;
    }

    if (!wolService.isValidMac(mac)) {
      res.status(400).json({ error: 'Invalid MAC address format' });
      return;
    }

    const result = await wolService.wake(mac, broadcast);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to wake device' 
    });
  }
});

/**
 * @swagger
 * /api/wake-all:
 *   post:
 *     summary: Wake all configured devices
 *     tags: [Wake]
 *     responses:
 *       200:
 *         description: All devices woken
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WakeResult'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     successful:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *       404:
 *         description: No devices configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/wake-all', async (_req: Request, res: Response) => {
  try {
    const devices = deviceManager.getDevices();
    if (devices.length === 0) {
      res.status(404).json({ error: 'No devices configured' });
      return;
    }

    const results = await wolService.wakeMultiple(devices);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      results,
      summary: {
        total: results.length,
        successful,
        failed
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to wake devices' 
    });
  }
});

/**
 * @swagger
 * /api/wake-multiple:
 *   post:
 *     summary: Wake multiple specific devices
 *     tags: [Wake]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - devices
 *             properties:
 *               devices:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of device names to wake
 *                 example: ["device1", "device2", "device3"]
 *     responses:
 *       200:
 *         description: Wake operation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WakeResult'
 *                 notFound:
 *                   type: array
 *                   items:
 *                     type: string
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     successful:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     notFound:
 *                       type: integer
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: None of the specified devices were found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 notFound:
 *                   type: array
 *                   items:
 *                     type: string
 */
app.post('/api/wake-multiple', async (req: Request, res: Response) => {
  try {
    const { devices: deviceNames } = req.body;

    if (!Array.isArray(deviceNames) || deviceNames.length === 0) {
      res.status(400).json({ error: 'Device names array is required' });
      return;
    }

    const devices: Device[] = [];
    const notFound: string[] = [];

    for (const name of deviceNames) {
      const device = deviceManager.getDevice(name);
      if (device) {
        devices.push(device);
      } else {
        notFound.push(name);
      }
    }

    if (devices.length === 0) {
      res.status(404).json({ error: 'None of the specified devices were found', notFound });
      return;
    }

    const results = await wolService.wakeMultiple(devices);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      results,
      notFound,
      summary: {
        total: results.length,
        successful,
        failed,
        notFound: notFound.length
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to wake devices' 
    });
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

export { app, deviceManager, wolService };
