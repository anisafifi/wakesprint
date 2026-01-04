import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Device } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_PATH = join(__dirname, '..', 'devices.json');

export class DeviceManager {
  private devices: Device[] = [];

  async loadDevices(): Promise<void> {
    if (existsSync(CONFIG_PATH)) {
      try {
        const data = await readFile(CONFIG_PATH, 'utf-8');
        this.devices = JSON.parse(data);
      } catch (error) {
        console.warn('Failed to load devices config:', error);
        this.devices = [];
      }
    } else {
      // Create default config
      this.devices = [
        {
          name: 'example-device',
          mac: '00:11:22:33:44:55',
          ip: '192.168.1.100',
          broadcast: '192.168.1.255'
        }
      ];
      await this.saveDevices();
    }
  }

  async saveDevices(): Promise<void> {
    await writeFile(CONFIG_PATH, JSON.stringify(this.devices, null, 2), 'utf-8');
  }

  getDevices(): Device[] {
    return this.devices;
  }

  getDevice(name: string): Device | undefined {
    return this.devices.find(d => d.name.toLowerCase() === name.toLowerCase());
  }

  async addDevice(device: Device): Promise<void> {
    const existing = this.getDevice(device.name);
    if (existing) {
      throw new Error(`Device '${device.name}' already exists`);
    }
    this.devices.push(device);
    await this.saveDevices();
  }

  async removeDevice(name: string): Promise<boolean> {
    const index = this.devices.findIndex(d => d.name.toLowerCase() === name.toLowerCase());
    if (index === -1) {
      return false;
    }
    this.devices.splice(index, 1);
    await this.saveDevices();
    return true;
  }

  async updateDevice(name: string, updates: Partial<Device>): Promise<boolean> {
    const device = this.getDevice(name);
    if (!device) {
      return false;
    }
    Object.assign(device, updates);
    await this.saveDevices();
    return true;
  }
}
