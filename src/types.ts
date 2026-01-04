export interface Device {
  name: string;
  mac: string;
  ip?: string;
  broadcast?: string;
}

export interface WakeResult {
  success: boolean;
  device: string;
  mac: string;
  message: string;
}
