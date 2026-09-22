class ChatManager {
  constructor() {
    this.messagesDiv = document.getElementById('chat-messages');
    this.chatForm = document.getElementById('chat-form');
    this.chatInput = document.getElementById('chat-input');
    
    this.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.chatInput.value.trim();
      if (!text || !window.wsClient) return;
      
      window.wsClient.send({
        type: 'CHAT_MESSAGE',
        message: text,
        senderName: window.uiState.deviceName
      });
      this.chatInput.value = '';
    });

    document.querySelectorAll('.reaction-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji');
        if (window.wsClient) {
          window.wsClient.send({
            type: 'REACTION',
            reaction: emoji
          });
        }
      });
    });
  }

  appendMessage(data) {
    const isSelf = data.senderId === window.uiState.connectionId;
    const msg = document.createElement('div');
    msg.className = `chat-msg ${isSelf ? 'self' : ''}`;
    msg.innerHTML = `
      <div class="sender">${data.senderName || 'Unknown'}</div>
      <div class="text">${data.message}</div>
    `;
    this.messagesDiv.appendChild(msg);
    this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
  }

  showReaction(emoji) {
    // Show in chat
    const msg = document.createElement('div');
    msg.className = 'chat-msg';
    msg.style.background = 'transparent';
    msg.innerHTML = `<div class="text" style="font-size:24px">${emoji}</div>`;
    this.messagesDiv.appendChild(msg);
    this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;

    // Show floating reaction in Party Mode
    if (!document.getElementById('party-mode-overlay').classList.contains('hidden')) {
      const container = document.getElementById('floating-reactions');
      const floater = document.createElement('div');
      floater.className = 'floating-reaction';
      floater.innerText = emoji;
      floater.style.left = `${10 + Math.random() * 80}%`;
      container.appendChild(floater);
      setTimeout(() => floater.remove(), 3000);
    }
  }
}
window.chatManager = new ChatManager();
