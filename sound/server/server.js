const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const { RoomManager } = require('./roomManager');
const { SyncEngine } = require('./syncEngine');
const { getCatalog } = require('./catalog');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const roomManager = new RoomManager();
const syncEngine = new SyncEngine(roomManager);

const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Upload handling for user audio
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// API Endpoints
app.get('/api/catalog', (req, res) => {
  res.json(getCatalog());
});

app.post('/api/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.originalname });
});

// For QR Code generation in local network
app.get('/api/ip', (req, res) => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let localIp = 'localhost';
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIp = net.address;
        break;
      }
    }
  }
  res.json({ ip: localIp });
});

// WebSocket Server
wss.on('connection', (ws, req) => {
  let connectionId = require('uuid').v4();
  let currentRoomId = null;
  
  ws.send(JSON.stringify({ type: 'CONNECTED', connectionId }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch(data.type) {
        // --- NTP Clock Sync ---
        case 'SYNC_PING':
          ws.send(JSON.stringify({
            type: 'SYNC_PONG',
            clientSendTime: data.clientSendTime,
            serverReceiveTime: Date.now(),
            serverTransmitTime: Date.now()
          }));
          break;
          
        // --- Room Management ---
        case 'CREATE_ROOM':
          const roomCode = roomManager.createRoom(data.hostConfig);
          currentRoomId = roomCode;
          roomManager.joinRoom(roomCode, ws, connectionId, data.deviceConfig);
          ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomId: roomCode }));
          break;
          
        case 'JOIN_ROOM':
          if (roomManager.roomExists(data.roomId)) {
            currentRoomId = data.roomId;
            roomManager.joinRoom(data.roomId, ws, connectionId, data.deviceConfig);
          } else {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
          }
          break;
          
        case 'LEAVE_ROOM':
          if (currentRoomId) {
            roomManager.leaveRoom(currentRoomId, connectionId);
            currentRoomId = null;
          }
          break;
          
        case 'DEVICE_REPORT':
          if (currentRoomId) {
            roomManager.updateDeviceStats(currentRoomId, connectionId, data.stats);
          }
          break;

        // --- Playback Sync ---
        case 'PLAYBACK_ACTION':
          if (currentRoomId) {
            syncEngine.handlePlaybackAction(currentRoomId, connectionId, data.action, data.payload);
          }
          break;

        // --- Social ---
        case 'CHAT_MESSAGE':
          if (currentRoomId) {
            roomManager.broadcast(currentRoomId, {
              type: 'CHAT_MESSAGE',
              message: data.message,
              senderId: connectionId,
              senderName: data.senderName,
              timestamp: Date.now()
            });
          }
          break;
          
        case 'REACTION':
          if (currentRoomId) {
            roomManager.broadcast(currentRoomId, {
              type: 'REACTION',
              reaction: data.reaction,
              senderId: connectionId
            });
          }
          break;

        case 'QUEUE_ACTION':
          if (currentRoomId) {
            roomManager.handleQueueAction(currentRoomId, connectionId, data.action, data.payload);
          }
          break;
      }
    } catch (e) {
      console.error('Error processing message:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoomId) {
      roomManager.leaveRoom(currentRoomId, connectionId);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`SyncPlay Server running on http://0.0.0.0:${PORT}`);
});
