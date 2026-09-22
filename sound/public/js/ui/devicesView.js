class DevicesView {
  render(members, isHost, selfId) {
    const container = document.getElementById('devices-list-container');
    container.innerHTML = '';
    
    if (!members) return;

    members.forEach(member => {
      const isSelf = member.id === selfId;
      const el = document.createElement('div');
      el.className = 'device-card';
      
      let syncStatus = 'sync-good';
      if (Math.abs(member.syncDrift) > 20) syncStatus = 'sync-fair';
      if (Math.abs(member.syncDrift) > 80) syncStatus = 'sync-poor';

      el.innerHTML = `
        <div class="device-icon">
          <i data-lucide="${member.deviceType === 'desktop' ? 'monitor' : 'smartphone'}"></i>
        </div>
        <div class="device-info">
          <div class="name">
            ${member.deviceName} ${isSelf ? '(You)' : ''}
            ${member.isHost ? '<span class="badge host-badge">Host</span>' : ''}
          </div>
          <div class="device-stats">
            <span>RTT: ${member.latency}ms</span>
            <span style="display:flex; align-items:center; gap:4px">
              <span class="dot ${syncStatus}"></span> ±${Math.abs(member.syncDrift)}ms
            </span>
          </div>
        </div>
        <div class="device-volume">
          <i data-lucide="${member.volume === 0 ? 'volume-x' : 'volume-2'}" style="width:16px; height:16px;"></i>
          ${isSelf ? `<input type="range" class="styled-slider" min="0" max="100" value="${member.volume}" id="self-volume">` : `<span style="font-size:12px;color:var(--text-secondary)">${member.volume}%</span>`}
        </div>
        ${isHost && !isSelf ? `
        <div class="device-actions">
          <button title="Mute/Kick not implemented in MVP" disabled><i data-lucide="minus-circle"></i></button>
        </div>` : ''}
      `;
      container.appendChild(el);
      
      if (isSelf) {
        const slider = el.querySelector('#self-volume');
        if (slider) {
          slider.addEventListener('input', (e) => {
            const vol = e.target.value / 100;
            if (window.audioPlayer) window.audioPlayer.setVolume(vol);
          });
        }
      }
    });
    lucide.createIcons();
  }
}
window.devicesView = new DevicesView();
