const imageInput = document.getElementById('image-input');
const frameSelect = document.getElementById('frame-select');
const previewImage = document.getElementById('preview-image');
const previewStage = document.getElementById('preview-stage');
const previewPlaceholder = document.getElementById('preview-placeholder');
const frameOverlay = document.getElementById('frame-overlay');
const scaleSlider = document.getElementById('scale-slider');
const scaleValue = document.getElementById('scale-value');
const horizontalSlider = document.getElementById('horizontal-slider');
const verticalSlider = document.getElementById('vertical-slider');
const centerImageBtn = document.getElementById('center-image-btn');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');

const state = {
  frameId: null,
  scale: 1,
  pan: { x: 0, y: 0 },
};

let loadedImage = null;
previewStage.dataset.draggable = 'false';
previewStage.dataset.dragging = 'false';

const overlayManifest = Array.isArray(window.FRAME_MANIFEST) ? window.FRAME_MANIFEST : [];
const overlayFrames = overlayManifest.map((entry, index) => {
  const overlayImage = new Image();
  const frame = {
    id: entry.id || `overlay-${index + 1}`,
    name: entry.name || `Overlay Frame ${index + 1}`,
    description: entry.description || 'PNG overlay stored in frames/',
    file: entry.file,
    previewSrc: entry.preview || entry.file,
    overlaySrc: entry.file,
    overlayImage,
    loadState: 'loading',
    dimensions: null,
  };

  overlayImage.onload = () => {
    frame.loadState = 'ready';
    frame.dimensions = `${overlayImage.naturalWidth}x${overlayImage.naturalHeight}`;
    handleFrameStatusChange(frame.id);
  };

  overlayImage.onerror = () => {
    frame.loadState = 'error';
    handleFrameStatusChange(frame.id);
  };

  overlayImage.src = entry.file;
  return frame;
});

function getFrameById(id) {
  return overlayFrames.find(frame => frame.id === id) || null;
}

function handleFrameStatusChange(frameId) {
  refreshFrameSelect();
  if (state.frameId === frameId) {
    const frame = getFrameById(frameId);
    updateOverlay(frame);
    updateFrameStatus(frame);
  }
}

function updateFrameStatus(frame) {
  // status display removed per user request
  return;
}

function refreshFrameSelect() {
  if (!frameSelect) return;
  frameSelect.innerHTML = '';

  if (!overlayFrames.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No frames found (add PNGs inside frames/)';
    option.selected = true;
    frameSelect.appendChild(option);
    frameSelect.disabled = true;
    state.frameId = null;
    updateOverlay(null);
    updateFrameStatus(null);
    return;
  }

  frameSelect.disabled = false;

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = 'Choose a frame…';
  frameSelect.appendChild(placeholder);

  overlayFrames.forEach(frame => {
    const option = document.createElement('option');
    option.value = frame.id;
    option.textContent = frame.name;
    option.disabled = frame.loadState === 'error';
    if (frame.id === state.frameId) {
      option.selected = true;
    }
    frameSelect.appendChild(option);
  });

  const selectedFrame = getFrameById(state.frameId);
  if (!selectedFrame || selectedFrame.loadState === 'error') {
    const preferredFrame = overlayFrames.find(frame => frame.loadState === 'ready')
      || overlayFrames.find(frame => frame.loadState !== 'error')
      || null;
    state.frameId = preferredFrame ? preferredFrame.id : null;
  }

  frameSelect.value = state.frameId || '';
  const activeFrame = getFrameById(state.frameId);
  updateOverlay(activeFrame);
  updateFrameStatus(activeFrame);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setAdjustmentAvailability(isEnabled) {
  horizontalSlider.disabled = !isEnabled;
  verticalSlider.disabled = !isEnabled;
  centerImageBtn.disabled = !isEnabled;
}

function getSquareCropSize() {
  const rect = previewStage.getBoundingClientRect();
  return Math.max(Math.round(Math.min(rect.width, rect.height)), 1);
}

function getRenderMetrics(squareSize = getSquareCropSize()) {
  if (!loadedImage?.naturalWidth || !loadedImage?.naturalHeight || !squareSize) {
    return null;
  }

  const baseScale = Math.max(
    squareSize / loadedImage.naturalWidth,
    squareSize / loadedImage.naturalHeight
  );
  const renderedWidth = loadedImage.naturalWidth * baseScale * state.scale;
  const renderedHeight = loadedImage.naturalHeight * baseScale * state.scale;

  return {
    squareSize,
    renderedWidth,
    renderedHeight,
    maxOffsetX: Math.max(0, (renderedWidth - squareSize) / 2),
    maxOffsetY: Math.max(0, (renderedHeight - squareSize) / 2),
  };
}

function syncAdjustmentSliders(metrics) {
  if (!metrics) {
    // if there's no loaded image yet, keep sliders at zero; otherwise
    // preserve current slider positions so user input isn't immediately reset
    if (!loadedImage) {
      horizontalSlider.value = '0';
      verticalSlider.value = '0';
    }
    return;
  }

  // slider range is -200..200, so scale pan [-1,1] to that range
  horizontalSlider.value = String(Math.round(state.pan.x * 200));
  verticalSlider.value = String(Math.round(state.pan.y * 200));
}

// adjustment status element removed; no-op placeholder kept for backward compatibility
function updateAdjustmentStatus() {
  return;
}

function renderPreview() {
  const metrics = getRenderMetrics();
  if (!metrics) {
    previewStage.style.setProperty('--image-rendered-width', '100%');
    previewStage.style.setProperty('--image-rendered-height', '100%');
    previewStage.style.setProperty('--image-offset-x', '0px');
    previewStage.style.setProperty('--image-offset-y', '0px');
    syncAdjustmentSliders(null);
    updateAdjustmentStatus();
    return;
  }

  const offsetX = state.pan.x * metrics.maxOffsetX;
  const offsetY = state.pan.y * metrics.maxOffsetY;

  previewStage.style.setProperty('--image-rendered-width', `${metrics.renderedWidth}px`);
  previewStage.style.setProperty('--image-rendered-height', `${metrics.renderedHeight}px`);
  previewStage.style.setProperty('--image-offset-x', `${offsetX}px`);
  previewStage.style.setProperty('--image-offset-y', `${offsetY}px`);
  syncAdjustmentSliders(metrics);
  updateAdjustmentStatus(metrics);
}

function setPan(nextPan) {
  state.pan = {
    x: clamp(nextPan.x, -1, 1),
    y: clamp(nextPan.y, -1, 1),
  };
  renderPreview();
}

function resetImagePosition() {
  setPan({ x: 0, y: 0 });
}

function setPanFromOffset(offsetPx) {
  const metrics = getRenderMetrics();
  if (!metrics) {
    return;
  }

  setPan({
    x: metrics.maxOffsetX ? offsetPx.x / metrics.maxOffsetX : 0,
    y: metrics.maxOffsetY ? offsetPx.y / metrics.maxOffsetY : 0,
  });
}

function updateOverlay(frame) {
  if (!frame || frame.loadState !== 'ready') {
    frameOverlay.hidden = true;
    frameOverlay.removeAttribute('src');
    return;
  }
  frameOverlay.src = frame.overlaySrc;
  frameOverlay.hidden = false;
}

function updateScale(value) {
  state.scale = clamp(Number(value) || 1, 1, 3);
  scaleSlider.value = String(state.scale);
  scaleValue.textContent = `${Math.round(state.scale * 100)}%`;
  renderPreview();
}

function resetWorkspace() {
  imageInput.value = '';
  previewImage.hidden = true;
  previewImage.removeAttribute('src');
  previewPlaceholder.hidden = false;
  frameOverlay.hidden = true;
  frameOverlay.removeAttribute('src');
  downloadBtn.disabled = true;
  resetBtn.disabled = true;
  loadedImage = null;
  dragState = null;
  previewStage.dataset.draggable = 'false';
  previewStage.dataset.dragging = 'false';
  setAdjustmentAvailability(false);
  updateScale(1);
  resetImagePosition();
}

function handleImageUpload(file) {
  if (!file?.type.startsWith('image/')) {
    alert('Please choose a valid image file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    previewImage.src = reader.result;
    previewImage.hidden = false;
    previewPlaceholder.hidden = true;
    downloadBtn.disabled = false;
    resetBtn.disabled = false;

    loadedImage = new Image();
    loadedImage.src = reader.result;
    loadedImage.onload = () => {
      previewStage.dataset.draggable = 'true';
      previewStage.dataset.dragging = 'false';
      setAdjustmentAvailability(true);
      updateOverlay(getFrameById(state.frameId));
      updateScale(1);
      resetImagePosition();
    };
  };
  reader.readAsDataURL(file);
}

function getExportSize(frame) {
  if (frame?.loadState === 'ready' && frame.overlayImage.naturalWidth && frame.overlayImage.naturalHeight) {
    return Math.max(1, Math.min(frame.overlayImage.naturalWidth, frame.overlayImage.naturalHeight));
  }

  if (loadedImage?.naturalWidth && loadedImage?.naturalHeight) {
    return Math.max(1, Math.min(loadedImage.naturalWidth, loadedImage.naturalHeight));
  }

  return 1080;
}

function drawSquareOverlay(ctx, overlayImage, outputSize) {
  const sourceSize = Math.min(overlayImage.naturalWidth, overlayImage.naturalHeight);
  const sourceX = (overlayImage.naturalWidth - sourceSize) / 2;
  const sourceY = (overlayImage.naturalHeight - sourceSize) / 2;

  ctx.drawImage(
    overlayImage,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    outputSize,
    outputSize
  );
}

function downloadFramedImage() {
  if (!loadedImage || !loadedImage.complete) {
    alert('Your image is still loading. Please try again in a second.');
    return;
  }

  const frame = state.frameId ? getFrameById(state.frameId) : null;
  const outputSize = getExportSize(frame);
  const metrics = getRenderMetrics(outputSize);
  if (!metrics) {
    alert('Unable to prepare the square export right now. Please try again.');
    return;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = outputSize;
  canvas.height = outputSize;

  const offsetX = (outputSize - metrics.renderedWidth) / 2 + state.pan.x * metrics.maxOffsetX;
  const offsetY = (outputSize - metrics.renderedHeight) / 2 + state.pan.y * metrics.maxOffsetY;
  ctx.drawImage(loadedImage, offsetX, offsetY, metrics.renderedWidth, metrics.renderedHeight);

  if (frame && frame.loadState === 'ready' && frame.overlayImage.complete && frame.overlayImage.naturalWidth) {
    drawSquareOverlay(ctx, frame.overlayImage, outputSize);
  }

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = frame ? `square-${frame.id}.png` : 'square-image.png';
  link.click();
}

refreshFrameSelect();
updateScale(scaleSlider.value);
resetImagePosition();
setAdjustmentAvailability(false);

let dragState = null;

const startDrag = event => {
  if (!loadedImage || previewImage.hidden) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;

  const metrics = getRenderMetrics();
  if (!metrics) return;

  dragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    baseOffset: {
      x: state.pan.x * metrics.maxOffsetX,
      y: state.pan.y * metrics.maxOffsetY,
    },
  };
  previewStage.dataset.dragging = 'true';
  previewStage.setPointerCapture(event.pointerId);
};

const onDrag = event => {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  const dx = event.clientX - dragState.startX;
  const dy = event.clientY - dragState.startY;
  setPanFromOffset({
    x: dragState.baseOffset.x + dx,
    y: dragState.baseOffset.y + dy,
  });
};

const endDrag = event => {
  if (!dragState || (event && dragState.pointerId !== event.pointerId)) return;
  if (event && previewStage.hasPointerCapture(event.pointerId)) {
    previewStage.releasePointerCapture(event.pointerId);
  }
  previewStage.dataset.dragging = 'false';
  dragState = null;
};

imageInput.addEventListener('change', event => {
  const [file] = event.target.files;
  handleImageUpload(file);
});

frameSelect.addEventListener('change', event => {
  const frame = getFrameById(event.target.value);
  state.frameId = frame ? frame.id : null;
  updateOverlay(frame || null);
  updateFrameStatus(frame || null);
});

scaleSlider.addEventListener('input', event => {
  updateScale(event.target.value);
});

horizontalSlider.addEventListener('input', event => {
  setPan({
    x: Number(event.target.value) / 200,
    y: state.pan.y,
  });
});

verticalSlider.addEventListener('input', event => {
  setPan({
    x: state.pan.x,
    y: Number(event.target.value) / 200,
  });
});

centerImageBtn.addEventListener('click', resetImagePosition);

downloadBtn.addEventListener('click', downloadFramedImage);
resetBtn.addEventListener('click', resetWorkspace);

previewStage.addEventListener('pointerdown', startDrag);
previewStage.addEventListener('pointermove', onDrag);
previewStage.addEventListener('pointerup', endDrag);
previewStage.addEventListener('pointerleave', endDrag);
previewStage.addEventListener('pointercancel', endDrag);

window.addEventListener('resize', () => {
  renderPreview();
});
