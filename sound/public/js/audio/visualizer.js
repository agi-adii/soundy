class Visualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.mode = 'bars'; // bars, waveform, circular
    this.modes = ['bars', 'waveform', 'circular'];
    this.isActive = false;
    
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start() {
    if (!this.canvas || !window.audioPlayer || !window.audioPlayer.analyserNode) return;
    this.isActive = true;
    this.analyser = window.audioPlayer.analyserNode;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    this.draw();
  }

  stop() {
    this.isActive = false;
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  cycleMode() {
    const currentIndex = this.modes.indexOf(this.mode);
    this.mode = this.modes[(currentIndex + 1) % this.modes.length];
  }

  draw() {
    if (!this.isActive) return;
    requestAnimationFrame(() => this.draw());
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    if (this.mode === 'bars') {
      this.analyser.getByteFrequencyData(this.dataArray);
      
      const barWidth = (width / this.bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      for(let i = 0; i < this.bufferLength; i++) {
        barHeight = this.dataArray[i] * 2;
        
        const gradient = this.ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, '#8b5cf6'); // Accent primary
        gradient.addColorStop(1, '#6366f1'); // Accent secondary
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        
        x += barWidth + 2;
      }
    } 
    else if (this.mode === 'waveform') {
      this.analyser.getByteTimeDomainData(this.dataArray);
      
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = '#8b5cf6';
      
      this.ctx.beginPath();
      const sliceWidth = width * 1.0 / this.bufferLength;
      let x = 0;
      
      for(let i = 0; i < this.bufferLength; i++) {
        const v = this.dataArray[i] / 128.0;
        const y = v * height / 2;
        if(i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      this.ctx.lineTo(width, height / 2);
      this.ctx.stroke();
    }
    else if (this.mode === 'circular') {
      this.analyser.getByteFrequencyData(this.dataArray);
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 4;
      
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)';
      this.ctx.stroke();

      const bars = 100;
      const step = (Math.PI * 2) / bars;
      
      for (let i = 0; i < bars; i++) {
        const value = this.dataArray[i * 2];
        const barHeight = (value / 255) * radius;
        
        const angle = step * i;
        const startX = centerX + Math.cos(angle) * radius;
        const startY = centerY + Math.sin(angle) * radius;
        const endX = centerX + Math.cos(angle) * (radius + barHeight);
        const endY = centerY + Math.sin(angle) * (radius + barHeight);
        
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = `hsl(${260 + (value/255)*40}, 100%, 65%)`; // Purple to blue
        this.ctx.stroke();
      }
    }
  }
}

window.visualizer = new Visualizer('visualizer-canvas');
