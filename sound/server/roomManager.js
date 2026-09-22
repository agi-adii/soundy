const crypto = require('crypto');

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> RoomData
  }

  generateRoomCode() {
    let code;
    do {
      code = crypto.randomBytes(3).toString('hex').toUpperCase();
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostConfig) {
    const roomId = this.generateRoomCode();
    this.rooms.set(roomId, {
      id: roomId,
      name: hostConfig.roomName || `Room ${roomId}`,
      hostId: null, // Will be set on join
      maxDevices: hostConfig.maxDevices || 10,
      privacy: hostConfig.privacy || 'public',
      permissions: {
        allowGuestsToAdd: true,
        allowGuestsToSkip: false,
        allowGuestsToVote: true,
        allowGuestsToPause: false,
      },
      members: new Map(), // connectionId -> { deviceName, type, latency, syncDrift, volume, isDJ }
      queue: [],
      playbackState: {
        trackId: null,
        position: 0,
        isPlaying: false,
        serverTimestamp: Date.now(),
        playbackRate: 1.0,
        updatedBy: null,
        epoch: 0
      }
    });
    return roomId;
  }

  roomExists(roomId) {
    return this.rooms.has(roomId);
  }

  joinRoom(roomId, ws, connectionId, deviceConfig) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (!room.hostId) {
      room.hostId = connectionId;
    }

    const memberData = {
      ws,
      id: connectionId,
      deviceName: deviceConfig.deviceName || 'Unknown Device',
      deviceType: deviceConfig.deviceType || 'desktop',
      latency: 0,
      syncDrift: 0,
      volume: 100,
      isDJ: room.hostId === connectionId
    };

    room.members.set(connectionId, memberData);

    // Send initial state to the joining member
    ws.send(JSON.stringify({
      type: 'ROOM_STATE',
      room: this.getSanitizedRoom(room),
      playbackState: room.playbackState,
      isHost: room.hostId === connectionId
    }));

    // Broadcast updated members list to the room
    this.broadcastMembers(roomId);
    
    // Broadcast join notification
    this.broadcast(roomId, {
      type: 'ACTIVITY',
      message: `${memberData.deviceName} joined the room.`
    });

    return true;
  }

  leaveRoom(roomId, connectionId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const member = room.members.get(connectionId);
    if (member) {
      room.members.delete(connectionId);
      this.broadcast(roomId, {
        type: 'ACTIVITY',
        message: `${member.deviceName} left the room.`
      });
      
      // If host left, maybe reassign or close room?
      if (room.hostId === connectionId) {
        if (room.members.size > 0) {
          // transfer host
          const nextHost = room.members.keys().next().value;
          room.hostId = nextHost;
          const nextHostMember = room.members.get(nextHost);
          nextHostMember.isDJ = true;
          this.broadcast(roomId, {
            type: 'ACTIVITY',
            message: `${nextHostMember.deviceName} is now the host.`
          });
        } else {
          // destroy room
          this.rooms.delete(roomId);
          return;
        }
      }
      this.broadcastMembers(roomId);
    }
  }

  getSanitizedRoom(room) {
    const members = Array.from(room.members.values()).map(m => ({
      id: m.id,
      deviceName: m.deviceName,
      deviceType: m.deviceType,
      latency: m.latency,
      syncDrift: m.syncDrift,
      volume: m.volume,
      isDJ: m.isDJ,
      isHost: m.id === room.hostId
    }));
    
    return {
      id: room.id,
      name: room.name,
      permissions: room.permissions,
      queue: room.queue,
      members
    };
  }

  broadcast(roomId, messageObj, excludeConnectionId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const messageStr = JSON.stringify(messageObj);
    for (const [id, member] of room.members.entries()) {
      if (id !== excludeConnectionId && member.ws.readyState === 1 /* OPEN */) {
        member.ws.send(messageStr);
      }
    }
  }

  broadcastMembers(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    this.broadcast(roomId, {
      type: 'MEMBERS_UPDATED',
      members: this.getSanitizedRoom(room).members
    });
  }

  updateDeviceStats(roomId, connectionId, stats) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const member = room.members.get(connectionId);
    if (member) {
      member.latency = stats.latency;
      member.syncDrift = stats.syncDrift;
      // We don't broadcast immediately to avoid spam, clients poll or we broadcast periodically
    }
  }

  handleQueueAction(roomId, connectionId, action, payload) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (action === 'ADD') {
      const member = room.members.get(connectionId);
      room.queue.push({
        id: crypto.randomUUID(),
        track: payload.track,
        addedBy: member ? member.deviceName : 'Unknown'
      });
      this.broadcastQueue(roomId);
    } else if (action === 'REMOVE') {
      room.queue = room.queue.filter(q => q.id !== payload.queueId);
      this.broadcastQueue(roomId);
    } else if (action === 'REORDER') {
      room.queue = payload.newQueue;
      this.broadcastQueue(roomId);
    } else if (action === 'CLEAR') {
      room.queue = [];
      this.broadcastQueue(roomId);
    }
  }

  broadcastQueue(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    this.broadcast(roomId, {
      type: 'QUEUE_UPDATED',
      queue: room.queue
    });
  }
}

module.exports = { RoomManager };
