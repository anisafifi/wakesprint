import { readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import type { Device } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_DB_PATH = join(__dirname, '..', 'data', 'database.db');
const LEGACY_CONFIG_PATH = join(__dirname, '..', 'devices.json');

export class DeviceManager {
  private db: Database | null = null;

  async loadDevices(): Promise<void> {
    if (this.db) {
      return;
    }

    const dbPath = process.env.DEVICES_DB_PATH || DEFAULT_DB_PATH;
    await mkdir(dirname(dbPath), { recursive: true });

    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        mac TEXT NOT NULL,
        ip TEXT,
        broadcast TEXT
      );
    `);

    await this.migrateLegacyConfig();
  }

  async getDevices(): Promise<Device[]> {
    const db = this.ensureDb();
    const rows = await db.all<Device[]>('SELECT name, mac, ip, broadcast FROM devices ORDER BY name COLLATE NOCASE');
    return rows.map((device: Device) => this.normalizeDevice(device));
  }

  async getDevice(name: string): Promise<Device | undefined> {
    const db = this.ensureDb();
    const device = await db.get<Device>(
      'SELECT name, mac, ip, broadcast FROM devices WHERE name = ? COLLATE NOCASE',
      name
    );
    return device ? this.normalizeDevice(device) : undefined;
  }

  async addDevice(device: Device): Promise<void> {
    const db = this.ensureDb();
    const existing = await this.getDevice(device.name);
    if (existing) {
      throw new Error(`Device '${device.name}' already exists`);
    }

    await db.run(
      'INSERT INTO devices (name, mac, ip, broadcast) VALUES (?, ?, ?, ?)',
      device.name,
      device.mac,
      device.ip ?? null,
      device.broadcast ?? null
    );
  }

  async removeDevice(name: string): Promise<boolean> {
    const db = this.ensureDb();
    const result = await db.run('DELETE FROM devices WHERE name = ? COLLATE NOCASE', name);
    return (result.changes ?? 0) > 0;
  }

  async updateDevice(name: string, updates: Partial<Device>): Promise<boolean> {
    const db = this.ensureDb();
    const device = await this.getDevice(name);
    if (!device) {
      return false;
    }

    if (updates.name && updates.name !== name) {
      const existing = await this.getDevice(updates.name);
      if (existing) {
        throw new Error(`Device '${updates.name}' already exists`);
      }
    }

    const fields: string[] = [];
    const values: Array<string | null> = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name ?? null);
    }
    if (updates.mac !== undefined) {
      fields.push('mac = ?');
      values.push(updates.mac ?? null);
    }
    if (updates.ip !== undefined) {
      fields.push('ip = ?');
      values.push(updates.ip ?? null);
    }
    if (updates.broadcast !== undefined) {
      fields.push('broadcast = ?');
      values.push(updates.broadcast ?? null);
    }

    if (fields.length === 0) {
      return true;
    }

    values.push(name);
    const result = await db.run(
      `UPDATE devices SET ${fields.join(', ')} WHERE name = ? COLLATE NOCASE`,
      values
    );

    return (result.changes ?? 0) > 0;
  }

  private ensureDb(): Database {
    if (!this.db) {
      throw new Error('Device manager not initialized. Call loadDevices() first.');
    }
    return this.db;
  }

  private normalizeDevice(device: Device): Device {
    return {
      ...device,
      ip: device.ip ?? undefined,
      broadcast: device.broadcast ?? undefined
    };
  }

  private async migrateLegacyConfig(): Promise<void> {
    const db = this.ensureDb();
    const row = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM devices');
    if ((row?.count ?? 0) > 0) {
      return;
    }

    if (existsSync(LEGACY_CONFIG_PATH)) {
      try {
        const data = await readFile(LEGACY_CONFIG_PATH, 'utf-8');
        const devices = JSON.parse(data) as Device[];
        for (const device of devices) {
          await db.run(
            'INSERT INTO devices (name, mac, ip, broadcast) VALUES (?, ?, ?, ?)',
            device.name,
            device.mac,
            device.ip ?? null,
            device.broadcast ?? null
          );
        }
        return;
      } catch (error) {
        console.warn('Failed to migrate legacy devices.json:', error);
      }
    }

    await db.run(
      'INSERT INTO devices (name, mac, ip, broadcast) VALUES (?, ?, ?, ?)',
      'example-device',
      '00:11:22:33:44:55',
      '192.168.1.100',
      '192.168.1.255'
    );
  }
}
