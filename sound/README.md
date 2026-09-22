# SyncPlay - Multi-Device Audio Synchronization App

SyncPlay is a real-time, premium music watch-party application. It allows multiple devices to stream the same music simultaneously with millisecond precision over WebSockets using a custom NTP-style clock synchronization engine.

## Features
- **Precision Audio Sync**: Adaptive drift correction across all connected devices.
- **Party Mode**: 60fps Canvas audio visualizers and floating chat reactions.
- **Local / Remote Rooms**: Share a QR code to invite friends to your listening room.
- **Audio Uploads**: Drag and drop your own MP3/WAV files to stream them synchronously to the room.

## Deployment Ready

This application is ready to be deployed to platforms like Render, Heroku, Fly.io, or any Docker-compatible cloud.

### Deploying with Docker

1. Build the image:
```bash
docker build -t syncplay .
```

2. Run the container:
```bash
docker run -p 3000:3000 syncplay
```

### Deploying to Render / Heroku
The `package.json` contains the standard `npm start` script.
- Ensure you set the environment variable `PORT` if required (default is `3000`).
- The server will serve the frontend from the `public/` directory and handle WebSocket connections on the same port.

## Local Development
```bash
npm install
npm start
```
Go to `http://localhost:3000`.
