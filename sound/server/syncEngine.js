class SyncEngine {
  constructor(roomManager) {
    this.roomManager = roomManager;
    
    // Periodically broadcast device stats to rooms
    setInterval(() => {
      for (const [roomId, room] of this.roomManager.rooms.entries()) {
        this.roomManager.broadcastMembers(roomId);
      }
    }, 5000);
  }

  handlePlaybackAction(roomId, connectionId, action, payload) {
    const room = this.roomManager.rooms.get(roomId);
    if (!room) return;

    // Check permissions
    const member = room.members.get(connectionId);
    if (!member) return;

    if (!member.isDJ && !room.permissions.allowGuestsToPause && (action === 'PAUSE' || action === 'PLAY')) {
      return; // Not allowed
    }

    const state = room.playbackState;
    state.epoch++;
    state.updatedBy = connectionId;

    switch (action) {
      case 'PLAY':
        state.isPlaying = true;
        state.serverTimestamp = Date.now();
        // If track changed or resumed
        if (payload && payload.trackId) state.trackId = payload.trackId;
        if (payload && payload.position !== undefined) state.position = payload.position;
        break;

      case 'PAUSE':
        state.isPlaying = false;
        state.serverTimestamp = Date.now();
        if (payload && payload.position !== undefined) state.position = payload.position;
        break;

      case 'SEEK':
        state.position = payload.position;
        state.serverTimestamp = Date.now();
        break;

      case 'CHANGE_TRACK':
        state.trackId = payload.trackId;
        state.position = 0;
        state.isPlaying = true;
        state.serverTimestamp = Date.now();
        break;
    }

    // Broadcast new authoritative state
    this.roomManager.broadcast(roomId, {
      type: 'PLAYBACK_STATE_UPDATE',
      state: state
    });
  }
}

module.exports = { SyncEngine };
