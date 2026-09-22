// Setup Navigation
document.querySelectorAll('.nav-links li').forEach(li => {
  li.addEventListener('click', () => {
    document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
    li.classList.add('active');
    
    const target = li.getAttribute('data-target');
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(target).classList.add('active');
  });
});

// Setup Modals
document.querySelectorAll('.close-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const modalId = btn.getAttribute('data-modal');
    document.getElementById(modalId).classList.add('hidden');
  });
});

document.getElementById('btn-create-room').addEventListener('click', () => {
  document.getElementById('modal-create-room').classList.remove('hidden');
  document.getElementById('input-device-name').value = window.uiState.deviceName;
});

document.getElementById('btn-join-room-prompt').addEventListener('click', () => {
  document.getElementById('modal-join-room').classList.remove('hidden');
  document.getElementById('input-join-device-name').value = window.uiState.deviceName;
});

document.getElementById('btn-calibrate').addEventListener('click', () => {
  document.getElementById('modal-calibration').classList.remove('hidden');
});

// Party Mode
document.getElementById('btn-party-mode').addEventListener('click', () => {
  document.getElementById('party-mode-overlay').classList.remove('hidden');
  if (window.visualizer) window.visualizer.start();
});

document.getElementById('btn-exit-party').addEventListener('click', () => {
  document.getElementById('party-mode-overlay').classList.add('hidden');
  if (window.visualizer) window.visualizer.stop();
});

document.getElementById('btn-cycle-vis').addEventListener('click', () => {
  if (window.visualizer) window.visualizer.cycleMode();
});

// Calibration Slider
const calSlider = document.getElementById('cal-slider');
const calDisplay = document.getElementById('cal-value-display');
calSlider.addEventListener('input', (e) => {
  const val = parseInt(e.target.value);
  calDisplay.innerText = `${val} ms`;
  if (window.syncEngine) window.syncEngine.setCalibrationOffset(val);
});
document.querySelectorAll('.presets button').forEach(btn => {
  btn.addEventListener('click', () => {
    const val = parseInt(btn.getAttribute('data-offset'));
    calSlider.value = val;
    calDisplay.innerText = `${val} ms`;
    if (window.syncEngine) window.syncEngine.setCalibrationOffset(val);
  });
});

// Right Panel Tabs
document.querySelectorAll('.panel-tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.panel-tabs .tab').forEach(el => el.classList.remove('active'));
    tab.classList.add('active');
    
    const target = tab.getAttribute('data-panel');
    document.querySelectorAll('.panel-content').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`panel-${target}`).classList.add('active');
  });
});
