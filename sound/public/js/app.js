document.addEventListener('DOMContentLoaded', async () => {
  // 1. Set User Profile Info
  document.getElementById('user-display-name').innerText = window.uiState.deviceName;

  // 2. Load Catalog
  try {
    const res = await fetch('/api/catalog');
    const catalog = await res.json();
    window.uiState.setCatalog(catalog);
  } catch(e) {
    console.error('Failed to load catalog', e);
  }

  // 3. Connect WebSocket
  const host = window.location.hostname;
  const port = window.location.port ? ':' + window.location.port : '';
  const wsUrl = `ws://${host}${port}`;
  
  window.wsClient = new WSClient(wsUrl);
  
  window.wsClient.on('connected', () => {
    window.showToast('Connected to server', 'success');
    
    // Check URL for ?room= parameter
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    if (roomCode) {
      window.wsClient.send({
        type: 'JOIN_ROOM',
        roomId: roomCode,
        deviceConfig: { deviceName: window.uiState.deviceName }
      });
      // clean url
      window.history.replaceState({}, document.title, "/");
    }
  });

  window.wsClient.on('disconnected', () => {
    window.showToast('Connection Lost — Reconnecting...', 'error');
  });

  window.wsClient.on('message', (data) => {
    switch (data.type) {
      case 'CONNECTED':
        window.uiState.connectionId = data.connectionId;
        break;
      
      case 'ROOM_CREATED':
        window.showToast(`Room created: ${data.roomId}`, 'success');
        break;

      case 'ROOM_STATE':
        window.uiState.setRoom(data.room, data.isHost);
        window.syncEngine.updateState(data.playbackState);
        window.queueManager.renderQueue(data.room.queue);
        window.syncEngine.start();
        break;

      case 'MEMBERS_UPDATED':
        if (window.uiState.room) {
          window.uiState.room.members = data.members;
          window.devicesView.render(data.members, window.uiState.isHost, window.uiState.connectionId);
        }
        break;
        
      case 'PLAYBACK_STATE_UPDATE':
        window.syncEngine.updateState(data.state);
        break;

      case 'ACTIVITY':
        window.chatManager.appendMessage({ senderName: 'System', message: data.message });
        break;
        
      case 'CHAT_MESSAGE':
        window.chatManager.appendMessage(data);
        break;
        
      case 'REACTION':
        window.chatManager.showReaction(data.reaction);
        break;
        
      case 'QUEUE_UPDATED':
        if (window.uiState.room) {
          window.uiState.room.queue = data.queue;
          window.queueManager.renderQueue(data.queue);
        }
        break;

      case 'ERROR':
        window.showToast(data.message, 'error');
        break;
    }
  });

  window.wsClient.connect();

  // 4. Setup Global UI Handlers
  document.getElementById('btn-submit-create-room').addEventListener('click', () => {
    const roomName = document.getElementById('input-room-name').value;
    const deviceName = document.getElementById('input-device-name').value;
    window.uiState.deviceName = deviceName || window.uiState.deviceName;
    
    window.wsClient.send({
      type: 'CREATE_ROOM',
      hostConfig: { roomName: roomName || `${deviceName}'s Party` },
      deviceConfig: { deviceName: window.uiState.deviceName }
    });
    document.getElementById('modal-create-room').classList.add('hidden');
    // Switch to Rooms tab
    document.querySelector('[data-target="rooms-view"]').click();
  });

  document.getElementById('btn-submit-join-room').addEventListener('click', () => {
    const code = document.getElementById('input-join-code').value.toUpperCase();
    const deviceName = document.getElementById('input-join-device-name').value;
    if (code.length < 6) return;
    
    window.uiState.deviceName = deviceName || window.uiState.deviceName;
    window.wsClient.send({
      type: 'JOIN_ROOM',
      roomId: code,
      deviceConfig: { deviceName: window.uiState.deviceName }
    });
    document.getElementById('modal-join-room').classList.add('hidden');
    document.querySelector('[data-target="rooms-view"]').click();
  });

  document.getElementById('btn-leave-room').addEventListener('click', () => {
    window.wsClient.send({ type: 'LEAVE_ROOM' });
    window.uiState.setRoom(null, false);
    window.syncEngine.stop();
    if (window.audioPlayer) window.audioPlayer.pause();
  });

  // Playback Controls
  document.getElementById('btn-play-pause').addEventListener('click', () => {
    if (!window.uiState.room) return window.showToast('Not in a room', 'error');
    if (!window.uiState.isHost && !window.uiState.room.permissions.allowGuestsToPause) {
      return window.showToast('Only host can control playback', 'error');
    }
    
    const isPlaying = window.syncEngine.serverState && window.syncEngine.serverState.isPlaying;
    window.wsClient.send({
      type: 'PLAYBACK_ACTION',
      action: isPlaying ? 'PAUSE' : 'PLAY',
      payload: { position: window.audioPlayer.getCurrentTime() }
    });
  });

  const progressWrapper = document.getElementById('progress-wrapper');
  progressWrapper.addEventListener('click', (e) => {
    if (!window.uiState.room || !window.uiState.isHost) return;
    const rect = progressWrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const seekTime = pct * window.audioPlayer.getDuration();
    
    window.wsClient.send({
      type: 'PLAYBACK_ACTION',
      action: 'SEEK',
      payload: { position: seekTime }
    });
  });

  // Audio File Upload
  const uploadBtn = document.getElementById('btn-upload-music');
  const uploadInput = document.getElementById('file-upload-input');
  uploadBtn.addEventListener('click', () => uploadInput.click());
  uploadInput.addEventListener('change', async (e) => {
    if (!e.target.files.length) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('audio', file);
    
    window.showToast('Uploading track...', 'info');
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        // Add to catalog temporarily (in MVP)
        const newTrack = {
          id: 'upload-' + Date.now(),
          title: data.filename,
          artist: 'Uploaded',
          album: 'Local',
          duration: 0,
          genre: 'Upload',
          coverArt: 'https://images.unsplash.com/photo-1619983081563-430f63602796?auto=format&fit=crop&q=80&w=400&h=400',
          audioUrl: data.url
        };
        const cat = [...window.uiState.catalog, newTrack];
        window.uiState.setCatalog(cat);
        window.showToast('Track uploaded successfully!', 'success');
      }
    } catch(err) {
      window.showToast('Upload failed', 'error');
    }
  });

});
