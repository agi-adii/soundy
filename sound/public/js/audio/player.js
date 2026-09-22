class AudioPlayer {
  constructor() {
    this.audioContext = null;
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';

    this.sourceNode = null;
    this.gainNode = null;
    this.analyserNode = null;

    this.isInitialized = false;
    this.currentTrackId = null;
    this.volume = 1.0;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    // Create audio context on first user interaction to comply with browser autoplay policies
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
    this.gainNode = this.audioContext.createGain();
    this.analyserNode = this.audioContext.createAnalyser();
    
    this.analyserNode.fftSize = 2048;
    this.gainNode.gain.value = this.volume;

    // Connect pipeline
    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    this.isInitialized = true;
  }

  setVolume(vol) {
    this.volume = vol;
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(vol, this.audioContext.currentTime, 0.1);
    }
    this.audioElement.volume = vol; // fallback
  }

  async loadTrack(trackUrl, trackId) {
    if (this.currentTrackId === trackId && this.audioElement.src === trackUrl) return;
    
    this.currentTrackId = trackId;
    this.audioElement.src = trackUrl;
    this.audioElement.load();
    return new Promise((resolve) => {
      this.audioElement.oncanplay = () => resolve();
    });
  }

  async play() {
    if (!this.isInitialized) await this.initialize();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    await this.audioElement.play();
  }

  pause() {
    this.audioElement.pause();
  }

  seek(time) {
    this.audioElement.currentTime = time;
  }

  setPlaybackRate(rate) {
    this.audioElement.playbackRate = rate;
  }

  getCurrentTime() {
    return this.audioElement.currentTime;
  }

  getDuration() {
    return this.audioElement.duration || 0;
  }
}

window.audioPlayer = new AudioPlayer();
