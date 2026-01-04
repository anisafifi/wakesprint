import wol from 'wake_on_lan';
import type { Device, WakeResult } from './types.js';

export class WakeOnLanService {
  /**
   * Wake a single device by MAC address
   */
  async wake(mac: string, broadcast?: string): Promise<WakeResult> {
    return new Promise((resolve) => {
      const callback = (error: Error | null) => {
        if (error) {
          resolve({
            success: false,
            device: 'Unknown',
            mac,
            message: `Failed to wake device: ${error.message}`
          });
        } else {
          resolve({
            success: true,
            device: 'Unknown',
            mac,
            message: 'Magic packet sent successfully'
          });
        }
      };

      if (broadcast) {
        wol.wake(mac, { address: broadcast }, callback);
      } else {
        wol.wake(mac, callback);
      }
    });
  }

  /**
   * Wake a device using device configuration
   */
  async wakeDevice(device: Device): Promise<WakeResult> {
    return new Promise((resolve) => {
      const callback = (error: Error | null) => {
        if (error) {
          resolve({
            success: false,
            device: device.name,
            mac: device.mac,
            message: `Failed to wake ${device.name}: ${error.message}`
          });
        } else {
          resolve({
            success: true,
            device: device.name,
            mac: device.mac,
            message: `Magic packet sent to ${device.name} successfully`
          });
        }
      };

      if (device.broadcast) {
        wol.wake(device.mac, { address: device.broadcast }, callback);
      } else {
        wol.wake(device.mac, callback);
      }
    });
  }

  /**
   * Wake multiple devices
   */
  async wakeMultiple(devices: Device[]): Promise<WakeResult[]> {
    const promises = devices.map(device => this.wakeDevice(device));
    return Promise.all(promises);
  }

  /**
   * Validate MAC address format
   */
  isValidMac(mac: string): boolean {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac);
  }
}
