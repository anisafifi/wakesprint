#!/usr/bin/env node

import { Command } from 'commander';
import { DeviceManager } from './device-manager.js';
import { WakeOnLanService } from './wol-service.js';
import type { Device } from './types.js';

const program = new Command();
const deviceManager = new DeviceManager();
const wolService = new WakeOnLanService();

await deviceManager.loadDevices();

program
  .name('wol')
  .description('Wake-on-LAN CLI tool')
  .version('1.0.0');

// Wake command
program
  .command('wake <device>')
  .description('Wake a device by name or MAC address')
  .option('-b, --broadcast <address>', 'Broadcast address')
  .action(async (deviceInput: string, options: { broadcast?: string }) => {
    try {
      // Check if input is a MAC address or device name
      if (wolService.isValidMac(deviceInput)) {
        const result = await wolService.wake(deviceInput, options.broadcast);
        if (result.success) {
          console.log(`✓ ${result.message}`);
        } else {
          console.error(`✗ ${result.message}`);
          process.exit(1);
        }
      } else {
        const device = deviceManager.getDevice(deviceInput);
        if (!device) {
          console.error(`Device '${deviceInput}' not found`);
          process.exit(1);
        }
        const result = await wolService.wakeDevice(device);
        if (result.success) {
          console.log(`✓ ${result.message}`);
        } else {
          console.error(`✗ ${result.message}`);
          process.exit(1);
        }
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Wake all command
program
  .command('wake-all')
  .description('Wake all configured devices')
  .action(async () => {
    try {
      const devices = deviceManager.getDevices();
      if (devices.length === 0) {
        console.log('No devices configured');
        return;
      }

      console.log(`Waking ${devices.length} device(s)...`);
      const results = await wolService.wakeMultiple(devices);
      
      results.forEach(result => {
        if (result.success) {
          console.log(`✓ ${result.message}`);
        } else {
          console.error(`✗ ${result.message}`);
        }
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// List devices command
program
  .command('list')
  .description('List all configured devices')
  .action(() => {
    const devices = deviceManager.getDevices();
    if (devices.length === 0) {
      console.log('No devices configured');
      return;
    }

    console.log('\nConfigured Devices:');
    console.log('─'.repeat(80));
    devices.forEach(device => {
      console.log(`Name:      ${device.name}`);
      console.log(`MAC:       ${device.mac}`);
      if (device.ip) console.log(`IP:        ${device.ip}`);
      if (device.broadcast) console.log(`Broadcast: ${device.broadcast}`);
      console.log('─'.repeat(80));
    });
  });

// Add device command
program
  .command('add <name> <mac>')
  .description('Add a new device')
  .option('-i, --ip <address>', 'Device IP address')
  .option('-b, --broadcast <address>', 'Broadcast address')
  .action(async (name: string, mac: string, options: { ip?: string; broadcast?: string }) => {
    try {
      if (!wolService.isValidMac(mac)) {
        console.error('Invalid MAC address format. Use format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX');
        process.exit(1);
      }

      const device: Device = {
        name,
        mac,
        ip: options.ip,
        broadcast: options.broadcast
      };

      await deviceManager.addDevice(device);
      console.log(`✓ Device '${name}' added successfully`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Remove device command
program
  .command('remove <name>')
  .description('Remove a device')
  .action(async (name: string) => {
    try {
      const removed = await deviceManager.removeDevice(name);
      if (removed) {
        console.log(`✓ Device '${name}' removed successfully`);
      } else {
        console.error(`Device '${name}' not found`);
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Update device command
program
  .command('update <name>')
  .description('Update a device')
  .option('-m, --mac <address>', 'New MAC address')
  .option('-i, --ip <address>', 'New IP address')
  .option('-b, --broadcast <address>', 'New broadcast address')
  .action(async (name: string, options: { mac?: string; ip?: string; broadcast?: string }) => {
    try {
      if (options.mac && !wolService.isValidMac(options.mac)) {
        console.error('Invalid MAC address format');
        process.exit(1);
      }

      const updates: Partial<Device> = {};
      if (options.mac) updates.mac = options.mac;
      if (options.ip) updates.ip = options.ip;
      if (options.broadcast) updates.broadcast = options.broadcast;

      const updated = await deviceManager.updateDevice(name, updates);
      if (updated) {
        console.log(`✓ Device '${name}' updated successfully`);
      } else {
        console.error(`Device '${name}' not found`);
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
