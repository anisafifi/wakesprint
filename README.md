# WakeSprint

WakeSprint wakes devices on your local network via a REST API, a CLI, and a web UI. The backend is a TypeScript Express server that manages device configs and sends Wake-on-LAN magic packets. The frontend is a Next.js dashboard for device management and wake actions.

![Screenshot](./screenshot.png)

## Features

- REST API with Swagger docs
- Device management (add, update, delete, list)
- Wake by device name or MAC
- Wake all or multiple devices in one call
- CLI tool for local automation
- Web UI for management and one-click wake
- Request logging and rate limiting

## Architecture

- Backend: Express + TypeScript, stores devices in a SQLite database at `backend/data/database.db`
- Frontend: Next.js App Router, talks to the backend API
- Docker: backend uses host networking to send WoL packets

## Requirements

- Node.js 20+ recommended for local dev
- Docker + Docker Compose (optional, for containers)
- A LAN that allows broadcast magic packets

## Quick Start (Docker Compose)

```bash
docker-compose up -d
```

- Frontend: http://localhost:3002
- Backend API: http://localhost:3001
- Swagger: http://localhost:3001/api-docs

Note: The backend runs with `network_mode: host` so it can send WoL packets on the local network. Port mapping is ignored when host networking is enabled.

## Prebuilt Docker Images (GHCR)

Images are published to GitHub Container Registry.

```bash
docker pull ghcr.io/<owner>/<repo>-backend:latest
docker pull ghcr.io/<owner>/<repo>-frontend:latest
```

Replace `<owner>/<repo>` with your GitHub repository. For this repo:

```bash
docker pull ghcr.io/anisafifi/wakesprint-backend:latest
docker pull ghcr.io/anisafifi/wakesprint-frontend:latest
```

To use the images with Compose, set `image` and remove `build`:

```yaml
services:
  backend:
    image: ghcr.io/anisafifi/wakesprint-backend:latest
  frontend:
    image: ghcr.io/anisafifi/wakesprint-frontend:latest
```

## Local Development

### Backend

```bash
cd backend
npm install
npm run dev
```

- API base URL: http://localhost:3001
- Swagger: http://localhost:3001/api-docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- Web UI: http://localhost:3002
- Configure API URL via `NEXT_PUBLIC_API_URL` (defaults to empty, same origin)

## Configuration

Devices are stored in `backend/data/database.db`. On first run, the backend will migrate data from
`backend/devices.json` if it exists, or seed a sample device.

Example:

```json
[
  {
    "name": "nas",
    "mac": "00:11:22:33:44:55",
    "ip": "192.168.1.10",
    "broadcast": "192.168.1.255"
  }
]
```

## API Overview

Base URL: `http://localhost:3001`

- `GET /health` - Health check
- `GET /api/devices` - List devices
- `GET /api/devices/:name` - Get device by name
- `POST /api/devices` - Add device
- `PUT /api/devices/:name` - Update device
- `DELETE /api/devices/:name` - Remove device
- `GET /api/wake?device=<name>` - Wake by device name
- `GET /api/wake?mac=<mac>&broadcast=<addr>` - Wake by MAC
- `POST /api/wake/:name` - Wake by device name (POST)
- `POST /api/wake` - Wake by MAC (POST)
- `POST /api/wake-all` - Wake all devices
- `POST /api/wake-multiple` - Wake specific devices

Swagger is available at `/api-docs` for request and schema details.

## CLI Usage

The CLI is built from the backend package.

```bash
cd backend
npm install
npm run build
npm run cli -- list
npm run cli -- wake my-device
npm run cli -- wake-all
npm run cli -- add "nas" "00:11:22:33:44:55" --ip "192.168.1.10" --broadcast "192.168.1.255"
```

## Frontend UI

The web UI lets you:

- Add, edit, duplicate, and delete devices
- Wake individual devices or all devices
- See success or error feedback via toasts

## Environment Variables

Backend:

- `PORT` (default: 3001)
- `LOG_LEVEL` (default: info)
- `CORS_ORIGIN` (default: `*`)
- `DEVICES_DB_PATH` (default: `backend/data/database.db`)

Frontend:

- `NEXT_PUBLIC_API_URL` (default: empty)

## Remote Access (VPN / Zero Trust)

WakeSprint is designed for LAN use, but you can operate it remotely by connecting your client to the same private network as the backend. Common approaches:

- Site-to-site or client VPN into your home LAN
- Overlay networks like Tailscale
- Zero-trust access like Twingate

Guidelines:

- Run the backend on a machine that can broadcast WoL packets on the target LAN
- Connect your client device to the same private network (VPN, Tailscale, or Twingate)
- Set `NEXT_PUBLIC_API_URL` to the backend address reachable over that private network
- Do not expose the backend directly to the public internet without additional security

## Logs

Backend logs are written to:

- `backend/logs/combined.log`
- `backend/logs/error.log`

## Troubleshooting

- WoL fails in Docker: ensure host networking is enabled and broadcast is allowed on your LAN
- Port conflicts: make sure 3001 and 3002 are free
- Device not found: check the SQLite database and use exact device name

## License

MIT
