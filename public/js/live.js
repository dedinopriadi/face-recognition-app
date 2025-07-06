const video = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');

let stream = null;
let captureInterval = null;
let lastRecognizedId = null;
let paused = false;
let lastOverlayData = null;
let overlayInterval = null;

function setStatus(msg) {
  statusDiv.textContent = 'Status: ' + msg;
}

function drawOverlay(result) {
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (!result) return;

  // Draw bounding box if available
  if (result.box) {
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    ctx.strokeRect(result.box.x, result.box.y, result.box.width, result.box.height);
  }

  // Draw label (name & confidence)
  if (result.name) {
    ctx.font = '20px Arial';
    ctx.fillStyle = '#00FF00';
    const label = `${result.name} (${result.confidence ? (result.confidence * 100).toFixed(1) : '?'}%)`;
    const x = result.box ? result.box.x : 10;
    const y = result.box ? result.box.y - 10 : 30;
    ctx.fillText(label, x, y < 20 ? 20 : y);
  }

  // Simpan overlay terakhir
  lastOverlayData = result;
}

function startOverlayInterval() {
  if (overlayInterval) return;
  overlayInterval = setInterval(() => {
    if (lastOverlayData) {
      drawOverlay(lastOverlayData);
    }
  }, 33); // ~30 FPS
}

function stopOverlayInterval() {
  if (overlayInterval) {
    clearInterval(overlayInterval);
    overlayInterval = null;
  }
}

// --- Helper: Resize overlay canvas to match video ---
function resizeOverlay() {
  overlay.width = video.videoWidth || 640;
  overlay.height = video.videoHeight || 480;
}

// --- Dynamic Action Button Logic ---
function updateActionButton(state) {
  const btn = document.getElementById('actionBtn');
  if (!btn) return;
  btn.className = 'flex items-center justify-center px-8 py-2 rounded-full text-lg font-semibold shadow focus:outline-none transition';
  if (state === 'start') {
    btn.innerHTML = '<i class="fas fa-play mr-2"></i>Start Camera';
    btn.classList.add('bg-blue-600', 'text-white', 'hover:bg-blue-700', 'focus:ring-2', 'focus:ring-blue-500');
    btn.disabled = false;
  } else if (state === 'stop') {
    btn.innerHTML = '<i class="fas fa-stop mr-2"></i>Stop Camera';
    btn.classList.add('bg-gray-600', 'text-white', 'hover:bg-gray-700', 'focus:ring-2', 'focus:ring-gray-500');
    btn.disabled = false;
  } else if (state === 'resume') {
    btn.innerHTML = '<i class="fas fa-redo mr-2"></i>Resume';
    btn.classList.add('bg-green-600', 'text-white', 'hover:bg-green-700', 'focus:ring-2', 'focus:ring-green-500');
    btn.disabled = false;
  } else {
    btn.innerHTML = '...';
    btn.disabled = true;
  }
}

// --- Recognition Result Card ---
function showRecognitionResult(data) {
  const card = document.getElementById('recognition-result-card');
  const content = document.getElementById('result-content');
  if (data && data.name) {
    card.classList.remove('hidden');
    content.innerHTML = `
      <div class="flex items-center mb-2">
        <span class="inline-block bg-blue-600 text-white text-lg font-bold rounded px-3 py-1 mr-2 shadow">${data.name}</span>
        <span class="inline-block bg-green-100 text-green-700 text-xs font-semibold rounded px-2 py-1 mr-2">Confidence: ${(data.confidence * 100).toFixed(2)}%</span>
        ${data.similarity !== undefined ? `<span class='inline-block bg-yellow-100 text-yellow-700 text-xs font-semibold rounded px-2 py-1'>Similarity: ${(data.similarity * 100).toFixed(2)}%</span>` : ''}
      </div>
      <div class="flex items-center mt-2">
        <i class="fas fa-user-circle text-2xl text-blue-400 mr-2"></i>
        <span class="text-sm text-gray-600">ID: <span class="font-semibold">${data.id !== undefined ? data.id : '-'}</span></span>
      </div>
    `;
  } else {
    card.classList.remove('hidden');
    content.innerHTML = `
      <div class="flex items-center text-red-600 font-semibold text-base">
        <i class="fas fa-user-slash text-2xl mr-2"></i>Face not recognized
      </div>
    `;
  }
}

function handleRecognitionResult(result) {
  if (result && result.id) {
    if (result.id === lastRecognizedId) {
      // Wajah sama, pause capture
      if (!paused) {
        stopCapture();
        paused = true;
        cameraState = 'pause';
        updateActionButton('resume');
        setStatus('Paused: Same face recognized');
        startOverlayInterval();
      }
    } else {
      // Wajah baru, resume capture
      lastRecognizedId = result.id;
      if (paused) {
        startCapture();
        paused = false;
        cameraState = 'on';
        updateActionButton('stop');
        setStatus('Resumed: New face detected');
        stopOverlayInterval();
      }
      if (result) drawOverlay(result);
    }
    showRecognitionResult(result);
  } else {
    // Tidak ada wajah, resume capture
    if (lastRecognizedId !== null) {
      lastRecognizedId = null;
      if (paused) {
        startCapture();
        paused = false;
        cameraState = 'on';
        updateActionButton('stop');
        setStatus('Resumed: No face detected');
        stopOverlayInterval();
      }
    }
    drawOverlay(null);
    lastOverlayData = null;
    showRecognitionResult(null);
  }
}

async function sendFrame(blob) {
  setStatus('Sending frame...');
  const formData = new FormData();
  formData.append('image', blob, 'frame.jpg');
  try {
    const res = await fetch('/api/face/recognize-live', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    setStatus('Response: ' + (data && data.status ? data.status : 'OK'));
    // Overlay result
    if (data && data.data && data.data.recognized && data.data.person) {
      drawOverlay({
        name: data.data.person.name || 'Unknown',
        confidence: data.data.person.confidence,
        box: data.data.person.box
      });
      // Smart pause/resume logic
      handleRecognitionResult({
        id: data.data.person.id,
        name: data.data.person.name,
        confidence: data.data.person.confidence,
        box: data.data.person.box
      });
    } else {
      drawOverlay(null);
      // Smart pause/resume logic
      handleRecognitionResult(null);
    }
    console.log('Live recognize response:', data);
  } catch (err) {
    setStatus('Error sending frame: ' + err.message);
    drawOverlay(null);
    // Smart pause/resume logic
    handleRecognitionResult(null);
  }
}

function startCapture() {
  if (captureInterval) return;
  resizeOverlay();
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  overlay.width = canvas.width;
  overlay.height = canvas.height;
  captureInterval = setInterval(() => {
    if (video.readyState === 4) {
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) sendFrame(blob);
      }, 'image/jpeg', 0.85);
    }
  }, 1000); // 1 detik
}

function stopCapture() {
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }
  drawOverlay(null);
}

// --- Patch overlay resize on video start ---
video.addEventListener('loadedmetadata', resizeOverlay);
window.addEventListener('resize', resizeOverlay);

// --- Patch action button logic ---
let cameraState = 'off'; // 'off', 'on', 'pause'
updateActionButton('start');

document.getElementById('actionBtn').onclick = async () => {
  if (cameraState === 'off') {
    // Start camera
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
    setStatus('Camera started');
    cameraState = 'on';
    updateActionButton('stop');
    resizeOverlay();
    startCapture();
  } else if (cameraState === 'on') {
    // Stop camera
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
      stream = null;
    }
    setStatus('Camera stopped');
    cameraState = 'off';
    updateActionButton('start');
    stopCapture();
    drawOverlay(null);
    showRecognitionResult(null);
  } else if (cameraState === 'pause') {
    // Resume
    cameraState = 'on';
    updateActionButton('stop');
    startCapture();
    setStatus('Resumed');
  }
};

window.addEventListener('beforeunload', () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  stopCapture();
}); 