# Node.js Wake-on-LAN Application

A modern Wake-on-LAN (WOL) application built with Node.js, TypeScript, and ESM. Supports both CLI and REST API interfaces for waking devices on your network.

## Features

- ✨ **Dual Interface**: CLI and REST API support
- 📦 **Modern Stack**: TypeScript, ESM modules, latest packages
- 🎯 **Single & Multiple**: Wake one device or multiple devices at once
- 💾 **Device Management**: Store and manage device configurations
- 🔧 **Flexible**: Support custom broadcast addresses
- ✅ **Type-Safe**: Full TypeScript support with type definitions

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

## Usage

### API Server

Start the API server:

```bash
npm start
```

Or in development mode with hot reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000` by default. Set the `PORT` environment variable to change it.

#### Swagger Documentation

Interactive API documentation is available at `http://localhost:3000/api-docs`

#### API Endpoints

**Device Management:**

- `GET /api/devices` - List all configured devices
- `GET /api/devices/:name` - Get device by name
- `POST /api/devices` - Add new device
  ```json
  {
    "name": "my-computer",
    "mac": "00:11:22:33:44:55",
    "ip": "192.168.1.100",
    "broadcast": "192.168.1.255"
  }
  ```
- `PUT /api/devices/:name` - Update device
- `DELETE /api/devices/:name` - Remove device

**Wake Operations:**

- `GET /api/wake?device=<name>` - Wake device by name (query param)
- `GET /api/wake?mac=<address>` - Wake by MAC address (query param)
- `GET /api/wake?mac=<address>&broadcast=<broadcast>` - Wake with custom broadcast
- `POST /api/wake/:name` - Wake device by name
- `POST /api/wake` - Wake device by MAC address
  ```json
  {
    "mac": "00:11:22:33:44:55",
    "broadcast": "192.168.1.255"
  }
  ```
- `POST /api/wake-all` - Wake all configured devices
- `POST /api/wake-multiple` - Wake multiple devices
  ```json
  {
    "devices": ["device1", "device2", "device3"]
  }
  ```

**Health Check:**

- `GET /health` - Server health status

### CLI

The CLI can be used directly during development or after building:

**Development:**
```bash
npm run dev:cli -- <command>
```

**After build:**
```bash
npm run cli -- <command>
```

Or if installed globally:
```bash
wol <command>
```

#### CLI Commands

**Wake devices:**
```bash
# Wake by device name
wol wake my-computer

# Wake by MAC address
wol wake 00:11:22:33:44:55

# Wake with custom broadcast
wol wake my-computer --broadcast 192.168.1.255

# Wake all configured devices
wol wake-all
```

**Device management:**
```bash
# List all devices
wol list

# Add new device
wol add my-computer 00:11:22:33:44:55 --ip 192.168.1.100 --broadcast 192.168.1.255

# Remove device
wol remove my-computer

# Update device
wol update my-computer --mac 00:11:22:33:44:66 --ip 192.168.1.101
```

**Help:**
```bash
# Show all commands
wol --help

# Show command-specific help
wol wake --help
```

## Configuration

Devices are stored in `devices.json` in the project root. The file is automatically created with an example device on first run.

Example `devices.json`:
```json
[
  {
    "name": "my-computer",
    "mac": "00:11:22:33:44:55",
    "ip": "192.168.1.100",
    "broadcast": "192.168.1.255"
  },
  {
    "name": "media-server",
    "mac": "AA:BB:CC:DD:EE:FF",
    "ip": "192.168.1.200"
  }
]
```

## Requirements

- Node.js 18 or higher
- Network devices with Wake-on-LAN enabled in BIOS/UEFI
- Devices must be on the same network or reachable via broadcast

## API Examples

**Using curl:**

```bash
# Wake by device name (GET)
curl "http://localhost:3000/api/wake?device=my-computer"

# Wake by MAC address (GET)
curl "http://localhost:3000/api/wake?mac=00:11:22:33:44:55"

# Wake with custom broadcast (GET)
curl "http://localhost:3000/api/wake?mac=00:11:22:33:44:55&broadcast=192.168.1.255"

# Wake a device (POST)
curl -X POST http://localhost:3000/api/wake/my-computer

# Add a device
curl -X POST http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -d '{"name":"server","mac":"00:11:22:33:44:55","ip":"192.168.1.50"}'

# Wake all devices
curl -X POST http://localhost:3000/api/wake-all

# List devices
curl http://localhost:3000/api/devices
```

## Development

```bash
# Install dependencies
npm install

# Run API server in dev mode
npm run dev

# Run CLI in dev mode
npm run dev:cli -- list

# Type check without building
npm run type-check

# Build for production
npm run build
```

## Technologies

- **TypeScript 5.7** - Type safety and modern JavaScript features
- **Express 4.21** - REST API framework
- **Commander 12.1** - CLI framework
- **wake_on_lan 1.0** - Wake-on-LAN magic packet implementation
- **tsx** - TypeScript execution for development

## License

MIT
