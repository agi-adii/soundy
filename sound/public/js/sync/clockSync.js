class ClockSync {
  constructor(wsClient) {
    this.wsClient = wsClient;
    this.offsets = [];
    this.rtts = [];
    this.maxSamples = 10;
    this.syncInterval = null;
    this.currentOffset = 0;
    this.currentRtt = 0;
  }

  start() {
    this.ping();
    this.syncInterval = setInterval(() => this.ping(), 3000);
  }

  stop() {
    clearInterval(this.syncInterval);
  }

  ping() {
    if (this.wsClient.isConnected) {
      this.wsClient.send({
        type: 'SYNC_PING',
        clientSendTime: Date.now()
      });
    }
  }

  handlePong(data) {
    const clientReceiveTime = Date.now();
    const { clientSendTime, serverReceiveTime, serverTransmitTime } = data;
    
    // Calculate Round Trip Time
    const rtt = (clientReceiveTime - clientSendTime) - (serverTransmitTime - serverReceiveTime);
    
    // Calculate Clock Offset (how far ahead the server is compared to client)
    const offset = ((serverReceiveTime - clientSendTime) + (serverTransmitTime - clientReceiveTime)) / 2;

    this.rtts.push(rtt);
    this.offsets.push(offset);
    
    if (this.rtts.length > this.maxSamples) this.rtts.shift();
    if (this.offsets.length > this.maxSamples) this.offsets.shift();
    
    // Use median filtering to discard network jitter spikes
    this.currentOffset = this.getMedian(this.offsets);
    this.currentRtt = this.getMedian(this.rtts);
  }

  getServerTime() {
    return Date.now() + this.currentOffset;
  }

  getMedian(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }
}

window.clockSync = null; // Instantiated when WS connects
