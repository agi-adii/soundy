class QueueManager {
  renderQueue(queue) {
    const list = document.getElementById('queue-list');
    list.innerHTML = '';
    
    if (!queue || queue.length === 0) {
      list.innerHTML = '<div class="empty-state small">Queue is empty</div>';
      return;
    }

    queue.forEach(item => {
      const track = window.uiState.catalog.find(t => t.id === item.track);
      if (!track) return;

      const el = document.createElement('div');
      el.className = 'queue-item';
      el.innerHTML = `
        <img src="${track.coverArt}" alt="Cover">
        <div class="queue-info">
          <span class="title">${track.title}</span>
          <span class="added-by">Added by ${item.addedBy}</span>
        </div>
        ${window.uiState.isHost ? `
        <div class="queue-actions">
          <button class="remove-btn" data-id="${item.id}"><i data-lucide="x"></i></button>
        </div>` : ''}
      `;
      list.appendChild(el);
      
      const removeBtn = el.querySelector('.remove-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          window.wsClient.send({
            type: 'QUEUE_ACTION',
            action: 'REMOVE',
            payload: { queueId: item.id }
          });
        });
      }
    });
    lucide.createIcons();
  }
}
window.queueManager = new QueueManager();
