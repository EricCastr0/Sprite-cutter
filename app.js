/**
 * Sprite Cutter — Application Logic
 * Handles image upload, sprite detection (auto & grid), background removal, and export.
 */

(function () {
  'use strict';

  console.log('Sprite Cutter initialized. JSZip available:', typeof JSZip);

  // ===== DOM Elements =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dropZone = $('#drop-zone');
  const fileInput = $('#file-input');
  const uploadSection = $('#upload-section');
  const workspace = $('#workspace');
  const previewCanvas = $('#preview-canvas');
  const overlayCanvas = $('#overlay-canvas');
  const canvasWrapper = $('#canvas-wrapper');
  const resultsSection = $('#results-section');
  const resultsGrid = $('#results-grid');
  const spriteCountBadge = $('#sprite-count');
  const loadingOverlay = $('#loading-overlay');

  // Settings
  const btnModeAuto = $('#btn-mode-auto');
  const btnModeGrid = $('#btn-mode-grid');
  const bgColorInput = $('#bg-color-input');
  const colorPreview = $('#color-preview');
  const btnEyedropper = $('#btn-eyedropper');
  const toleranceSlider = $('#tolerance-slider');
  const toleranceValue = $('#tolerance-value');

  // Two separate background options
  const highlightBgCheck = $('#highlight-bg-check');
  const removeBgCheck = $('#remove-bg-check');

  // Merge nearby
  const mergeCheck = $('#merge-check');
  const mergeSlider = $('#merge-slider');
  const mergeValue = $('#merge-value');
  const mergeSection = $('#merge-section');
  const mergeDistanceRow = $('#merge-distance-row');
  const highlightBgSection = $('#highlight-bg-section');

  const gridSettings = $('#grid-settings');
  const bgColorSection = $('#bg-color-section');
  const minSizeSection = $('#min-size-section');
  const gridWidth = $('#grid-width');
  const gridHeight = $('#grid-height');
  const gridOffsetX = $('#grid-offset-x');
  const gridOffsetY = $('#grid-offset-y');
  const gridSpacingX = $('#grid-spacing-x');
  const gridSpacingY = $('#grid-spacing-y');
  const minSpriteW = $('#min-sprite-w');
  const minSpriteH = $('#min-sprite-h');
  const paddingInput = $('#padding-input');

  // Actions
  const btnCut = $('#btn-cut');
  const btnReset = $('#btn-reset');
  const btnDownloadAll = $('#btn-download-all');
  const btnZoomIn = $('#btn-zoom-in');
  const btnZoomOut = $('#btn-zoom-out');
  const btnZoomFit = $('#btn-zoom-fit');
  const zoomLevelLabel = $('#zoom-level');
  const imageInfoLabel = $('#image-info');

  // ===== State =====
  let sourceImage = null;
  let sourceImageData = null;
  let cutMode = 'auto'; // 'auto' | 'grid'
  let zoom = 1;
  let pickMode = false; // persistent pick-color-on-canvas mode
  let detectedSprites = []; // Array of {x, y, w, h}
  let colorTooltip = null;
  let isHighlightingBg = false;

  const pickColorBanner = $('#pick-color-banner');
  const ctx = previewCanvas.getContext('2d', { willReadFrequently: true });
  const overlayCtx = overlayCanvas.getContext('2d');

  // ===== File Upload =====
  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImage(file);
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) loadImage(file);
  });

  function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        sourceImage = img;
        initWorkspace();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function initWorkspace() {
    uploadSection.classList.add('hidden');
    workspace.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    detectedSprites = [];

    // Read source image data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sourceImage.width;
    tempCanvas.height = sourceImage.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCtx.drawImage(sourceImage, 0, 0);
    sourceImageData = tempCtx.getImageData(0, 0, sourceImage.width, sourceImage.height);

    // Set initial color to transparent placeholder
    bgColorInput.value = '#000000';
    colorPreview.style.background = '#000000';

    drawPreview();
    fitZoom();
    imageInfoLabel.textContent = `${sourceImage.width} × ${sourceImage.height} px`;

    // Auto-activate pick-color mode so user clicks on image
    enterPickMode();
  }

  function drawPreview() {
    if (!sourceImage) return;
    previewCanvas.width = sourceImage.width;
    previewCanvas.height = sourceImage.height;
    previewCanvas.style.width = (sourceImage.width * zoom) + 'px';
    previewCanvas.style.height = (sourceImage.height * zoom) + 'px';
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.drawImage(sourceImage, 0, 0);

    // Apply background highlighting if enabled
    if (isHighlightingBg) {
      applyBgHighlight();
    }

    updateOverlay();
  }

  /**
   * Visually removes the background color from the preview canvas
   * to help the user identify sprite boundaries.
   */
  function applyBgHighlight() {
    const imgData = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
    const d = imgData.data;
    const tolerance = parseInt(toleranceSlider.value);
    const bgHex = bgColorInput.value;
    const bgR = parseInt(bgHex.substr(1, 2), 16);
    const bgG = parseInt(bgHex.substr(3, 2), 16);
    const bgB = parseInt(bgHex.substr(5, 2), 16);

    for (let i = 0; i < d.length; i += 4) {
      const diff = Math.abs(d[i] - bgR) + Math.abs(d[i + 1] - bgG) + Math.abs(d[i + 2] - bgB);
      if (diff <= tolerance * 3) {
        // Make transparent (shows checkerboard underneath)
        d[i + 3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // ===== Highlight BG Toggle =====
  highlightBgCheck.addEventListener('change', () => {
    isHighlightingBg = highlightBgCheck.checked;
    drawPreview();
  });

  // Re-draw preview when color or tolerance changes (if highlight is active)
  bgColorInput.addEventListener('input', () => {
    colorPreview.style.background = bgColorInput.value;
    if (isHighlightingBg) drawPreview();
  });

  toleranceSlider.addEventListener('input', () => {
    toleranceValue.textContent = toleranceSlider.value;
    if (isHighlightingBg) drawPreview();
  });

  // ===== Merge slider =====
  mergeSlider.addEventListener('input', () => {
    mergeValue.textContent = mergeSlider.value;
  });

  mergeCheck.addEventListener('change', () => {
    mergeDistanceRow.style.display = mergeCheck.checked ? '' : 'none';
  });

  // ===== Zoom =====
  function setZoom(z) {
    zoom = Math.max(0.25, Math.min(z, 16));
    previewCanvas.style.width = (sourceImage.width * zoom) + 'px';
    previewCanvas.style.height = (sourceImage.height * zoom) + 'px';
    zoomLevelLabel.textContent = Math.round(zoom * 100) + '%';
    updateOverlay();
  }

  function fitZoom() {
    if (!sourceImage) return;
    const wrapRect = canvasWrapper.getBoundingClientRect();
    const padded = 40;
    const zw = (wrapRect.width - padded) / sourceImage.width;
    const zh = (wrapRect.height - padded) / sourceImage.height;
    setZoom(Math.min(zw, zh, 4));
  }

  btnZoomIn.addEventListener('click', () => setZoom(zoom * 1.25));
  btnZoomOut.addEventListener('click', () => setZoom(zoom / 1.25));
  btnZoomFit.addEventListener('click', fitZoom);

  // Mouse wheel zoom
  canvasWrapper.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(zoom * factor);
    }
  }, { passive: false });

  // ===== Cut Mode Toggle =====
  btnModeAuto.addEventListener('click', () => switchMode('auto'));
  btnModeGrid.addEventListener('click', () => switchMode('grid'));

  function switchMode(mode) {
    cutMode = mode;
    btnModeAuto.classList.toggle('active', mode === 'auto');
    btnModeGrid.classList.toggle('active', mode === 'grid');
    gridSettings.classList.toggle('hidden', mode !== 'grid');
    bgColorSection.classList.toggle('hidden', mode === 'grid');
    minSizeSection.classList.toggle('hidden', mode === 'grid');
    mergeSection.classList.toggle('hidden', mode === 'grid');
    highlightBgSection.classList.toggle('hidden', mode === 'grid');
  }

  // ===== Pick Color Mode =====
  function enterPickMode() {
    pickMode = true;
    canvasWrapper.classList.add('pick-mode');
    btnEyedropper.classList.add('active');
    overlayCanvas.style.pointerEvents = 'auto';
    pickColorBanner.classList.remove('hidden');
  }

  function exitPickMode() {
    pickMode = false;
    canvasWrapper.classList.remove('pick-mode');
    btnEyedropper.classList.remove('active');
    overlayCanvas.style.pointerEvents = 'none';
    pickColorBanner.classList.add('hidden');
    removeColorTooltip();
  }

  // Eyedropper button toggles pick mode
  btnEyedropper.addEventListener('click', () => {
    if (pickMode) {
      exitPickMode();
    } else {
      enterPickMode();
    }
  });

  // Click on canvas to pick color
  overlayCanvas.addEventListener('click', (e) => {
    if (!pickMode || !sourceImageData) return;
    const rect = overlayCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / zoom);
    const y = Math.floor((e.clientY - rect.top) / zoom);
    if (x < 0 || y < 0 || x >= sourceImage.width || y >= sourceImage.height) return;

    const idx = (y * sourceImage.width + x) * 4;
    const r = sourceImageData.data[idx];
    const g = sourceImageData.data[idx + 1];
    const b = sourceImageData.data[idx + 2];
    const hex = rgbToHex(r, g, b);

    bgColorInput.value = hex;
    colorPreview.style.background = hex;

    // Auto-enable highlight preview so user sees the result immediately
    if (!isHighlightingBg) {
      isHighlightingBg = true;
      highlightBgCheck.checked = true;
    }

    // Stay in pick mode — user can keep clicking to try different colors
    // The banner updates to reflect the picked color
    drawPreview();
  });

  // Hover tooltip while in pick mode
  overlayCanvas.addEventListener('mousemove', (e) => {
    if (!pickMode || !sourceImageData) return;
    const rect = overlayCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / zoom);
    const y = Math.floor((e.clientY - rect.top) / zoom);
    if (x < 0 || y < 0 || x >= sourceImage.width || y >= sourceImage.height) {
      removeColorTooltip();
      return;
    }
    const idx = (y * sourceImage.width + x) * 4;
    const r = sourceImageData.data[idx];
    const g = sourceImageData.data[idx + 1];
    const b = sourceImageData.data[idx + 2];
    const hex = rgbToHex(r, g, b);
    showColorTooltip(e.clientX, e.clientY, hex, r, g, b);
  });

  overlayCanvas.addEventListener('mouseleave', () => {
    if (pickMode) removeColorTooltip();
  });

  function showColorTooltip(cx, cy, hex, r, g, b) {
    if (!colorTooltip) {
      colorTooltip = document.createElement('div');
      colorTooltip.className = 'color-tooltip';
      document.body.appendChild(colorTooltip);
    }
    colorTooltip.innerHTML = `<span style="display:inline-block;width:12px;height:12px;background:${hex};border-radius:2px;vertical-align:middle;margin-right:6px;border:1px solid rgba(255,255,255,0.2);"></span>${hex} (${r}, ${g}, ${b})`;
    colorTooltip.style.left = (cx + 16) + 'px';
    colorTooltip.style.top = (cy - 10) + 'px';
  }

  function removeColorTooltip() {
    if (colorTooltip) {
      colorTooltip.remove();
      colorTooltip = null;
    }
  }

  // ===== Overlay Drawing =====
  function updateOverlay() {
    if (!sourceImage) return;
    const cw = sourceImage.width * zoom;
    const ch = sourceImage.height * zoom;

    // Position overlay on top of preview canvas
    const canvasRect = previewCanvas.getBoundingClientRect();
    const wrapRect = canvasWrapper.getBoundingClientRect();
    overlayCanvas.width = cw;
    overlayCanvas.height = ch;
    overlayCanvas.style.width = cw + 'px';
    overlayCanvas.style.height = ch + 'px';
    overlayCanvas.style.left = (canvasRect.left - wrapRect.left + canvasWrapper.scrollLeft) + 'px';
    overlayCanvas.style.top = (canvasRect.top - wrapRect.top + canvasWrapper.scrollTop) + 'px';

    overlayCtx.clearRect(0, 0, cw, ch);

    // Draw grid/sprite overlay
    if (detectedSprites.length > 0) {
      overlayCtx.save();
      overlayCtx.scale(zoom, zoom);
      detectedSprites.forEach((spr, i) => {
        const color = getColorForIndex(i);
        overlayCtx.strokeStyle = color;
        overlayCtx.lineWidth = 2 / zoom;
        overlayCtx.strokeRect(spr.x + 0.5, spr.y + 0.5, spr.w - 1, spr.h - 1);

        // Index label
        const labelH = Math.max(12, Math.min(16, spr.h * 0.3));
        const labelW = Math.max(20, Math.min(30, spr.w * 0.4));
        overlayCtx.fillStyle = color;
        overlayCtx.globalAlpha = 0.85;
        overlayCtx.fillRect(spr.x, spr.y, labelW, labelH);
        overlayCtx.globalAlpha = 1;
        overlayCtx.fillStyle = '#fff';
        overlayCtx.font = `bold ${Math.min(10, labelH - 2)}px Inter, sans-serif`;
        overlayCtx.textBaseline = 'middle';
        overlayCtx.fillText(`${i + 1}`, spr.x + 3, spr.y + labelH / 2);
      });
      overlayCtx.restore();
    }

    // Draw grid preview for manual mode
    if (cutMode === 'grid' && detectedSprites.length === 0) {
      drawGridPreview();
    }
  }

  function drawGridPreview() {
    const gw = parseInt(gridWidth.value) || 32;
    const gh = parseInt(gridHeight.value) || 32;
    const ox = parseInt(gridOffsetX.value) || 0;
    const oy = parseInt(gridOffsetY.value) || 0;
    const sx = parseInt(gridSpacingX.value) || 0;
    const sy = parseInt(gridSpacingY.value) || 0;

    overlayCtx.save();
    overlayCtx.scale(zoom, zoom);
    overlayCtx.strokeStyle = 'rgba(108, 92, 231, 0.5)';
    overlayCtx.lineWidth = 1 / zoom;
    overlayCtx.setLineDash([4 / zoom, 4 / zoom]);

    for (let x = ox; x + gw <= sourceImage.width; x += gw + sx) {
      for (let y = oy; y + gh <= sourceImage.height; y += gh + sy) {
        overlayCtx.strokeRect(x + 0.5, y + 0.5, gw - 1, gh - 1);
      }
    }

    overlayCtx.restore();
  }

  // Redraw overlay on grid setting changes
  [gridWidth, gridHeight, gridOffsetX, gridOffsetY, gridSpacingX, gridSpacingY].forEach(el => {
    el.addEventListener('input', () => {
      if (cutMode === 'grid') {
        detectedSprites = [];
        updateOverlay();
      }
    });
  });

  // ===== Sprite Detection (Auto — Histogram Projection) =====
  function autoDetectSprites() {
    if (!sourceImageData) return [];

    const w = sourceImage.width;
    const h = sourceImage.height;
    const data = sourceImageData.data;
    const tolerance = parseInt(toleranceSlider.value);
    const bgHex = bgColorInput.value;
    const bgR = parseInt(bgHex.substr(1, 2), 16);
    const bgG = parseInt(bgHex.substr(3, 2), 16);
    const bgB = parseInt(bgHex.substr(5, 2), 16);

    // Create binary mask: 1 = non-background pixel, 0 = background
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
      if (a < 10) {
        mask[i] = 0;
        continue;
      }
      const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
      mask[i] = diff > tolerance * 3 ? 1 : 0;
    }

    // --- Column histogram: count non-bg pixels per column ---
    const colHist = new Float64Array(w);
    for (let x = 0; x < w; x++) {
      let count = 0;
      for (let y = 0; y < h; y++) {
        if (mask[y * w + x]) count++;
      }
      colHist[x] = count / h; // as percentage of height
    }

    // --- Row histogram: count non-bg pixels per row ---
    const rowHist = new Float64Array(h);
    for (let y = 0; y < h; y++) {
      let count = 0;
      for (let x = 0; x < w; x++) {
        if (mask[y * w + x]) count++;
      }
      rowHist[y] = count / w; // as percentage of width
    }

    // --- Find contiguous ranges above threshold ---
    const densityThreshold = 0.005; // 0.5% — very low to catch even sparse glow
    const minGap = parseInt(minSpriteW.value) || 4; // minimum gap in px to consider a separator

    const xRanges = findContiguousRanges(colHist, densityThreshold, minGap);
    const yRanges = findContiguousRanges(rowHist, densityThreshold, minGap);

    if (xRanges.length === 0 || yRanges.length === 0) return [];

    // --- Create sprites at each grid intersection ---
    const padding = parseInt(paddingInput.value) || 0;
    const sprites = [];

    for (const yRange of yRanges) {
      for (const xRange of xRanges) {
        // Optionally trim the cell to the actual content bounding box
        const trimmed = trimCellToContent(mask, w, h, xRange.start, yRange.start, xRange.end, yRange.end);

        if (!trimmed) continue; // empty cell, skip

        const sx = Math.max(0, trimmed.x1 - padding);
        const sy = Math.max(0, trimmed.y1 - padding);
        const ex = Math.min(w, trimmed.x2 + 1 + padding);
        const ey = Math.min(h, trimmed.y2 + 1 + padding);

        sprites.push({
          x: sx,
          y: sy,
          w: ex - sx,
          h: ey - sy,
        });
      }
    }

    return sprites;
  }

  /**
   * Find contiguous ranges in a histogram where values are above threshold.
   * Gaps smaller than minGap are bridged (merged).
   */
  function findContiguousRanges(hist, threshold, minGap) {
    const rawRanges = [];
    let inRange = false;
    let start = 0;

    for (let i = 0; i <= hist.length; i++) {
      const val = i < hist.length ? hist[i] : 0;
      if (val > threshold && !inRange) {
        start = i;
        inRange = true;
      } else if (val <= threshold && inRange) {
        rawRanges.push({ start, end: i });
        inRange = false;
      }
    }

    if (rawRanges.length === 0) return [];

    // Merge ranges that are separated by gaps smaller than minGap
    const merged = [{ ...rawRanges[0] }];
    for (let i = 1; i < rawRanges.length; i++) {
      const prev = merged[merged.length - 1];
      const curr = rawRanges[i];
      if (curr.start - prev.end < minGap) {
        // Bridge the gap
        prev.end = curr.end;
      } else {
        merged.push({ ...curr });
      }
    }

    return merged;
  }

  /**
   * Trim a cell region to the tightest bounding box of non-background pixels.
   * Returns {x1, y1, x2, y2} or null if the cell is empty.
   */
  function trimCellToContent(mask, imgW, imgH, x1, y1, x2, y2) {
    let minX = x2, maxX = x1, minY = y2, maxY = y1;
    let found = false;

    for (let y = y1; y < y2 && y < imgH; y++) {
      for (let x = x1; x < x2 && x < imgW; x++) {
        if (mask[y * imgW + x]) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    if (!found) return null;

    // Check if the content is large enough (filter noise)
    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;
    const minSizeW = parseInt(minSpriteW.value) || 4;
    const minSizeH = parseInt(minSpriteH.value) || 4;
    if (cw < minSizeW || ch < minSizeH) return null;

    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  }

  // ===== Grid-based Sprite Cutting =====
  function gridCutSprites() {
    const gw = parseInt(gridWidth.value) || 32;
    const gh = parseInt(gridHeight.value) || 32;
    const ox = parseInt(gridOffsetX.value) || 0;
    const oy = parseInt(gridOffsetY.value) || 0;
    const sx = parseInt(gridSpacingX.value) || 0;
    const sy = parseInt(gridSpacingY.value) || 0;
    const padding = parseInt(paddingInput.value) || 0;

    const sprites = [];
    for (let y = oy; y + gh <= sourceImage.height; y += gh + sy) {
      for (let x = ox; x + gw <= sourceImage.width; x += gw + sx) {
        sprites.push({
          x: Math.max(0, x - padding),
          y: Math.max(0, y - padding),
          w: Math.min(sourceImage.width, x + gw + padding) - Math.max(0, x - padding),
          h: Math.min(sourceImage.height, y + gh + padding) - Math.max(0, y - padding),
        });
      }
    }
    return sprites;
  }

  // ===== Cut Button =====
  btnCut.addEventListener('click', () => {
    if (!sourceImage) return;

    loadingOverlay.classList.remove('hidden');

    // Use requestAnimationFrame to let loading overlay render
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          if (cutMode === 'auto') {
            detectedSprites = autoDetectSprites();
          } else {
            detectedSprites = gridCutSprites();
          }

          updateOverlay();
          renderResults();
        } finally {
          loadingOverlay.classList.add('hidden');
        }
      }, 50);
    });
  });

  // ===== Render Results =====
  function renderResults() {
    resultsGrid.innerHTML = '';
    if (detectedSprites.length === 0) {
      resultsSection.classList.add('hidden');
      return;
    }

    resultsSection.classList.remove('hidden');
    spriteCountBadge.textContent = detectedSprites.length;

    const removeBg = removeBgCheck.checked;
    const bgHex = bgColorInput.value;
    const bgR = parseInt(bgHex.substr(1, 2), 16);
    const bgG = parseInt(bgHex.substr(3, 2), 16);
    const bgB = parseInt(bgHex.substr(5, 2), 16);
    const tolerance = parseInt(toleranceSlider.value);

    detectedSprites.forEach((spr, i) => {
      const sprCanvas = document.createElement('canvas');
      sprCanvas.width = spr.w;
      sprCanvas.height = spr.h;
      const sprCtx = sprCanvas.getContext('2d');
      sprCtx.drawImage(sourceImage, spr.x, spr.y, spr.w, spr.h, 0, 0, spr.w, spr.h);

      // Remove background if needed
      if (removeBg) {
        removeBgFromCanvas(sprCtx, spr.w, spr.h, bgR, bgG, bgB, tolerance);
      }

      const dataUrl = sprCanvas.toDataURL('image/png');

      // Create card
      const card = document.createElement('div');
      card.className = 'sprite-card';
      card.style.animation = `popIn 0.3s ease ${Math.min(i * 0.03, 1)}s both`;

      card.innerHTML = `
        <div class="sprite-thumb-wrapper">
          <img src="${dataUrl}" alt="Sprite ${i + 1}" draggable="false">
        </div>
        <div class="sprite-info">
          <strong>#${i + 1}</strong> — ${spr.w}×${spr.h}
        </div>
        <button class="download-btn" title="Baixar sprite">
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
        </button>
      `;

      // Download single
      card.querySelector('.download-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        downloadDataUrl(dataUrl, `sprite_${i + 1}.png`);
      });

      resultsGrid.appendChild(card);
    });

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Remove background color from a canvas context.
   */
  function removeBgFromCanvas(sprCtx, w, h, bgR, bgG, bgB, tolerance) {
    const imgData = sprCtx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let j = 0; j < d.length; j += 4) {
      const diff = Math.abs(d[j] - bgR) + Math.abs(d[j + 1] - bgG) + Math.abs(d[j + 2] - bgB);
      if (diff <= tolerance * 3) {
        d[j + 3] = 0; // Make transparent
      }
    }
    sprCtx.putImageData(imgData, 0, 0);
  }

  // ===== Download Helpers =====
  function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) document.body.removeChild(a);
    }, 200);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Keep blob URL alive for 10 seconds to guarantee browser finishes downloading
    setTimeout(() => {
      if (a.parentNode) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 10000);
  }

  btnDownloadAll.addEventListener('click', async () => {
    if (detectedSprites.length === 0) return;

    loadingOverlay.classList.remove('hidden');

    // Use setTimeout so the loading overlay displays immediately
    setTimeout(async () => {
      try {
        if (typeof JSZip === 'undefined') {
          throw new Error('Biblioteca JSZip não encontrada.');
        }

        const zip = new JSZip();
        const removeBg = removeBgCheck.checked;
        const bgHex = bgColorInput.value;
        const bgR = parseInt(bgHex.substr(1, 2), 16);
        const bgG = parseInt(bgHex.substr(3, 2), 16);
        const bgB = parseInt(bgHex.substr(5, 2), 16);
        const tolerance = parseInt(toleranceSlider.value);

        for (let i = 0; i < detectedSprites.length; i++) {
          const spr = detectedSprites[i];
          const sprCanvas = document.createElement('canvas');
          sprCanvas.width = spr.w;
          sprCanvas.height = spr.h;
          const sprCtx = sprCanvas.getContext('2d');
          sprCtx.drawImage(sourceImage, spr.x, spr.y, spr.w, spr.h, 0, 0, spr.w, spr.h);

          if (removeBg) {
            removeBgFromCanvas(sprCtx, spr.w, spr.h, bgR, bgG, bgB, tolerance);
          }

          const dataUrl = sprCanvas.toDataURL('image/png');
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
          const filename = `sprite_${String(i + 1).padStart(3, '0')}.png`;
          zip.file(filename, base64Data, { base64: true });
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, 'sprites.zip');
      } catch (err) {
        console.error('Erro ao gerar ZIP:', err);
        // Fallback: download sprites individually
        alert('Iniciando download dos sprites individualmente...');
        for (let i = 0; i < detectedSprites.length; i++) {
          const spr = detectedSprites[i];
          const sprCanvas = document.createElement('canvas');
          sprCanvas.width = spr.w;
          sprCanvas.height = spr.h;
          const sprCtx = sprCanvas.getContext('2d');
          sprCtx.drawImage(sourceImage, spr.x, spr.y, spr.w, spr.h, 0, 0, spr.w, spr.h);
          if (removeBgCheck.checked) {
            const bgHex = bgColorInput.value;
            removeBgFromCanvas(
              sprCtx, spr.w, spr.h,
              parseInt(bgHex.substr(1, 2), 16),
              parseInt(bgHex.substr(3, 2), 16),
              parseInt(bgHex.substr(5, 2), 16),
              parseInt(toleranceSlider.value)
            );
          }
          downloadDataUrl(sprCanvas.toDataURL('image/png'), `sprite_${String(i + 1).padStart(3, '0')}.png`);
          await new Promise(r => setTimeout(r, 150));
        }
      } finally {
        loadingOverlay.classList.add('hidden');
      }
    }, 50);
  });

  // ===== Reset =====
  btnReset.addEventListener('click', () => {
    sourceImage = null;
    sourceImageData = null;
    detectedSprites = [];
    zoom = 1;
    isHighlightingBg = false;
    highlightBgCheck.checked = false;
    exitPickMode();
    workspace.classList.add('hidden');
    resultsSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    fileInput.value = '';
    resultsGrid.innerHTML = '';
  });

  // ===== Utility =====
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  const COLORS = [
    '#6C5CE7', '#00cec9', '#fd79a8', '#fdcb6e',
    '#00b894', '#e17055', '#0984e3', '#d63031',
    '#a29bfe', '#55efc4', '#fab1a0', '#74b9ff',
  ];

  function getColorForIndex(i) {
    return COLORS[i % COLORS.length];
  }

  // ===== Window resize handler =====
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (sourceImage && !workspace.classList.contains('hidden')) {
        updateOverlay();
      }
    }, 100);
  });

  // Recalculate overlay position on scroll
  canvasWrapper.addEventListener('scroll', () => {
    if (sourceImage) updateOverlay();
  });

})();
