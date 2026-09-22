function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function generateDeviceName() {
  const ua = navigator.userAgent;
  let device = 'Device';
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    device = 'Phone';
  } else if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    device = 'Tablet';
  } else {
    device = 'Computer';
  }
  
  let browser = 'Browser';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';

  return `${browser} on ${device}`;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  if (type === 'error') toast.style.borderLeftColor = 'var(--danger)';
  if (type === 'success') toast.style.borderLeftColor = 'var(--success)';
  
  toast.innerText = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

window.formatTime = formatTime;
window.generateDeviceName = generateDeviceName;
window.showToast = showToast;
