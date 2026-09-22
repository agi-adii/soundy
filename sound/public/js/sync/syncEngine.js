class SyncEngine {
  constructor() {
    this.serverState = null;
    this.calibrationOffset = 0; // ms, adjusted by user for bluetooth/hw delay
    this.driftCheckInterval = null;
    this.lastEpoch = -1;
  }

  start() {
    this.driftCheckInterval = setInterval(() => this.checkDrift(), 250);
  }

  stop() {
    clearInterval(this.driftCheckInterval);
  }

  setCalibrationOffset(offset) {
    this.calibrationOffset = offset;
  }

  updateState(newState) {
    // If we received a new epoch, process it immediately
    if (newState.epoch > this.lastEpoch) {
      this.serverState = newState;
      this.lastEpoch = newState.epoch;
      this.applyHardState();
    }
  }

  async applyHardState() {
    if (!this.serverState || !window.audioPlayer) return;

    if (this.serverState.isPlaying) {
      const expected = this.getExpectedPosition();
      window.audioPlayer.seek(expected);
      await window.audioPlayer.play();
    } else {
      window.audioPlayer.pause();
      window.audioPlayer.seek(this.serverState.position);
    }
    
    window.uiState.updatePlayerUI();
  }

  getExpectedPosition() {
    if (!this.serverState) return 0;
    if (!this.serverState.isPlaying) return this.serverState.position;

    const serverTimeNow = window.clockSync.getServerTime();
    // Include user calibration offset
    const elapsedSeconds = ((serverTimeNow - this.serverState.serverTimestamp) + this.calibrationOffset) / 1000;
    return this.serverState.position + (elapsedSeconds * this.serverState.playbackRate);
  }

  checkDrift() {
    if (!this.serverState || !this.serverState.isPlaying || !window.audioPlayer.isInitialized) return;

    const actual = window.audioPlayer.getCurrentTime();
    const expected = this.getExpectedPosition();
    const drift = actual - expected; // in seconds
    
    const driftMs = drift * 1000;
    const absDriftMs = Math.abs(driftMs);
    
    window.uiState.updateSyncIndicator(driftMs);

    // Adaptive Correction
    if (absDriftMs < 20) {
      // Perfect sync
      window.audioPlayer.setPlaybackRate(1.0);
    } else if (absDriftMs < 100) {
      // Micro-adjustment phase alignment to avoid pops
      if (driftMs < 0) { // Behind
        window.audioPlayer.setPlaybackRate(1.02);
      } else { // Ahead
        window.audioPlayer.setPlaybackRate(0.98);
      }
    } else {
      // Hard seek required (drift >= 100ms)
      console.warn(`Hard sync correction: Drift was ${driftMs.toFixed(0)}ms`);
      window.audioPlayer.seek(expected);
      window.audioPlayer.setPlaybackRate(1.0);
    }

    // Report stats back to server occasionally
    if (Math.random() < 0.2 && window.wsClient) {
      window.wsClient.send({
        type: 'DEVICE_REPORT',
        stats: {
          latency: window.clockSync.currentRtt,
          syncDrift: Math.round(driftMs)
        }
      });
    }
  }
}

window.syncEngine = new SyncEngine();
