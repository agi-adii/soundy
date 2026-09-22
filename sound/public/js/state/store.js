class UIState {
  constructor() {
    this.room = null;
    this.isHost = false;
    this.catalog = [];
    this.currentTrack = null;
    this.deviceName = window.generateDeviceName();
    this.connectionId = null;
  }

  setCatalog(catalog) {
    this.catalog = catalog;
    this.renderCatalog();
  }

  setRoom(room, isHost) {
    this.room = room;
    this.isHost = isHost;
    
    if (room) {
      document.getElementById('current-room-status').classList.remove('hidden');
      document.getElementById('current-room-id-text').innerText = `Connected: ${room.name}`;
      document.getElementById('display-room-code').innerText = room.id;
      document.getElementById('room-dashboard').classList.remove('hidden');
      document.getElementById('no-room-state').classList.add('hidden');
      
      if (isHost) {
        document.getElementById('host-controls').classList.remove('hidden');
      } else {
        document.getElementById('host-controls').classList.add('hidden');
      }

      const deviceCount = room.members ? room.members.length : 0;
      const counter = document.getElementById('nav-device-count');
      counter.innerText = deviceCount;
      counter.classList.remove('hidden');

      window.devicesView.render(room.members, isHost, this.connectionId);
    } else {
      document.getElementById('current-room-status').classList.add('hidden');
      document.getElementById('room-dashboard').classList.add('hidden');
      document.getElementById('no-room-state').classList.remove('hidden');
      document.getElementById('nav-device-count').classList.add('hidden');
    }
  }

  updatePlayerUI() {
    if (!window.syncEngine || !window.syncEngine.serverState) return;
    const state = window.syncEngine.serverState;
    const track = this.catalog.find(t => t.id === state.trackId) || this.currentTrack;
    
    if (track && track !== this.currentTrack) {
      this.currentTrack = track;
      document.getElementById('pb-title').innerText = track.title;
      document.getElementById('pb-artist').innerText = track.artist;
      const cover = document.getElementById('pb-cover');
      cover.src = track.coverArt || '';
      cover.classList.remove('hidden');
      
      document.getElementById('party-title').innerText = track.title;
      document.getElementById('party-artist').innerText = track.artist;
      document.getElementById('party-cover').src = track.coverArt || '';

      if (window.audioPlayer && track.audioUrl) {
        window.audioPlayer.loadTrack(track.audioUrl, track.id).then(() => {
          if (state.isPlaying) {
             window.audioPlayer.seek(window.syncEngine.getExpectedPosition());
             window.audioPlayer.play();
          }
        });
      }
    }

    const playBtnIcon = document.querySelector('#btn-play-pause i');
    if (state.isPlaying) {
      playBtnIcon.setAttribute('data-lucide', 'pause');
      document.getElementById('party-cover').classList.remove('paused');
    } else {
      playBtnIcon.setAttribute('data-lucide', 'play');
      document.getElementById('party-cover').classList.add('paused');
    }
    lucide.createIcons();
  }

  updateProgressUI() {
    if (window.audioPlayer && window.audioPlayer.isInitialized) {
      const current = window.audioPlayer.getCurrentTime();
      const total = window.audioPlayer.getDuration() || 1;
      
      document.getElementById('time-current').innerText = window.formatTime(current);
      document.getElementById('time-total').innerText = window.formatTime(total);
      
      const pct = (current / total) * 100;
      document.getElementById('progress-fill').style.width = `${pct}%`;
      document.getElementById('party-progress-fill').style.width = `${pct}%`;
    }
    requestAnimationFrame(() => this.updateProgressUI());
  }

  updateSyncIndicator(driftMs) {
    const indicator = document.getElementById('sync-status-indicator');
    const dot = indicator.querySelector('.dot');
    const text = indicator.querySelector('.sync-text');
    
    const abs = Math.abs(driftMs);
    text.innerText = `±${Math.round(abs)} ms`;
    
    dot.className = 'dot'; // reset
    if (abs < 20) {
      dot.classList.add('sync-good');
    } else if (abs < 80) {
      dot.classList.add('sync-fair');
    } else {
      dot.classList.add('sync-poor');
    }
  }

  renderCatalog() {
    const list = document.getElementById('library-track-list');
    list.innerHTML = '';
    this.catalog.forEach(track => {
      const el = document.createElement('div');
      el.className = 'track-card';
      el.innerHTML = `
        <img src="${track.coverArt}" alt="Cover">
        <div class="track-card-info">
          <div class="title">${track.title}</div>
          <div class="artist">${track.artist}</div>
        </div>
        <div class="track-card-actions">
          <button class="btn btn-primary btn-small w-100 play-direct" data-id="${track.id}">Play Now</button>
        </div>
      `;
      list.appendChild(el);
      
      el.querySelector('.play-direct').addEventListener('click', () => {
        if (!this.room) return window.showToast('Please create or join a room first', 'error');
        if (!this.isHost && !this.room.permissions.allowGuestsToAdd) {
          return window.showToast('Only host can change tracks', 'error');
        }
        window.wsClient.send({
          type: 'PLAYBACK_ACTION',
          action: 'CHANGE_TRACK',
          payload: { trackId: track.id }
        });
      });
    });
  }
}

window.uiState = new UIState();
requestAnimationFrame(() => window.uiState.updateProgressUI());
