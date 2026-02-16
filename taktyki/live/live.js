window.TaktykiLive = (() => {
  let liveState = {
    active: false,
    map: null,
    board: null,
    strokes: [],
    updatedAt: null,
    expiresAt: null,
    brushColor: "#32d583",
    brushSize: 4,
  };
  let pollingTimer = null;
  let isDrawing = false;
  let currentStroke = null;
  let canvas = null;
  let context = null;
  let watchingLive = false;
  let countdownTimer = null;

  const init = async () => {
    await fetchState();
    startPolling();
    refreshControls();
    window.addEventListener("resize", () => {
      resizeCanvas();
      renderLive();
    });
    startCountdown();
  };

  const fetchState = async () => {
    try {
      const state = await window.TaktykiLiveAPI.getState();
      if (state && typeof state === "object") {
        liveState = {
          active: !!state.active,
          map: state.map || null,
          board: state.board || "Miejscowki",
          strokes: Array.isArray(state.strokes) ? state.strokes : [],
          updatedAt: state.updatedAt || null,
          expiresAt: state.expiresAt || null,
          brushColor: state.brushColor || "#32d583",
          brushSize: state.brushSize || 4,
        };
        if (liveState.active) {
          startCountdown();
        }
      }
    } catch (error) {
      console.error("Live: błąd pobierania stanu:", error);
    }
  };

  const saveState = async () => {
    liveState.updatedAt = new Date().toISOString();
    await window.TaktykiLiveAPI.setState(liveState);
  };

  const startPolling = () => {
    if (pollingTimer) return;
    pollingTimer = setInterval(async () => {
      try {
        const state = await window.TaktykiLiveAPI.getState();
        if (!state || typeof state !== "object") return;
        if (isDrawing) return;
        if (state.updatedAt && state.updatedAt === liveState.updatedAt) return;
        liveState = {
          active: !!state.active,
          map: state.map || null,
          board: state.board || "Miejscowki",
          strokes: Array.isArray(state.strokes) ? state.strokes : [],
          updatedAt: state.updatedAt || null,
          expiresAt: state.expiresAt || null,
          brushColor: state.brushColor || "#32d583",
          brushSize: state.brushSize || 4,
        };
        if (!liveState.active) {
          stopCountdown();
        } else {
          startCountdown();
        }
        refreshControls();
        if (watchingLive && liveState.active) {
          await syncToLiveMap();
        } else {
          renderLive();
        }
      } catch (error) {
        console.error("Live: błąd odświeżania:", error);
      }
    }, 3000);
  };

  const createCanvas = () => {
    const container = document.getElementById("map-image-container");
    if (!container) return;

    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "live-canvas";
      canvas.className = "live-canvas";
      container.appendChild(canvas);
      context = canvas.getContext("2d");
    }

    resizeCanvas();
    setupCanvasEvents();
    updateCanvasInteractivity();
    renderLive();
  };

  const resizeCanvas = () => {
    if (!canvas) return;
    const container = document.getElementById("map-image-container");
    if (!container) return;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  };

  const setupCanvasEvents = () => {
    if (!canvas) return;
    canvas.onpointerdown = (event) => {
      if (!liveState.active || !window.TaktykiUtils.isAdmin()) return;
      if (!window.TaktykiState.currentMap) return;
      isDrawing = true;
      const { x, y } = getPercentPosition(event);
      currentStroke = {
        color: getBrushColor(),
        width: getBrushSize(),
        points: [{ x, y }],
      };
    };

    canvas.onpointermove = (event) => {
      if (!isDrawing || !currentStroke) return;
      const { x, y } = getPercentPosition(event);
      currentStroke.points.push({ x, y });
      drawStroke(currentStroke, false);
    };

    const finishStroke = async () => {
      if (!isDrawing || !currentStroke) return;
      isDrawing = false;
      liveState.strokes.push(currentStroke);
      currentStroke = null;
      await saveState();
      renderLive();
    };

    canvas.onpointerup = finishStroke;
    canvas.onpointerleave = finishStroke;
  };

  const getPercentPosition = (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    return { x, y };
  };

  const drawStroke = (stroke, clear = true) => {
    if (!context) return;
    if (clear) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (!stroke.points || stroke.points.length === 0) return;
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.width;
    context.lineJoin = "round";
    context.lineCap = "round";

    context.beginPath();
    stroke.points.forEach((point, index) => {
      const x = (point.x / 100) * canvas.width;
      const y = (point.y / 100) * canvas.height;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.stroke();
  };

  const renderLive = () => {
    if (!context || !canvas) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!liveState.active) return;
    liveState.strokes.forEach((stroke) => drawStroke(stroke, false));
  };

  const getBrushColor = () => {
    const input = document.getElementById("live-brush-color");
    return input ? input.value : liveState.brushColor || "#32d583";
  };

  const getBrushSize = () => {
    const input = document.getElementById("live-brush-size");
    return input ? Number(input.value) : liveState.brushSize || 4;
  };

  const refreshControls = () => {
    const container = document.getElementById("live-controls");
    if (!container) return;
    const isAdmin = window.TaktykiUtils.isAdmin();
    const hasMap = !!window.TaktykiState.currentMap;
    const remaining = getRemainingTime();
    const remainingLabel = remaining ? formatRemainingTime(remaining) : "--:--";
    const mode = isAdmin ? "admin" : "viewer";
    const activeFlag = liveState.active ? "1" : "0";
    const needsRebuild =
      container.dataset.mode !== mode || container.dataset.active !== activeFlag;

    if (needsRebuild) {
      container.dataset.mode = mode;
      container.dataset.active = activeFlag;
      if (isAdmin) {
        container.innerHTML = `
          <div class="live-admin">
            <button class="live-btn live-start" id="live-toggle-btn">
              <i class="fas fa-broadcast-tower"></i>
              ${liveState.active ? "Zakończ LIVE" : "START LIVE"}
            </button>
            <div class="live-tools" ${liveState.active ? "" : "style=\"display:none;\""}>
              <div class="live-timer">
                <span>Pozostały czas</span>
                <strong id="live-remaining">${remainingLabel}</strong>
              </div>
              <label>
                Kolor
                <input type="color" id="live-brush-color" value="${liveState.brushColor}">
              </label>
              <label>
                Grubość
                <input type="range" id="live-brush-size" min="2" max="12" value="${liveState.brushSize}">
              </label>
              <button class="live-btn live-extend" id="live-extend-btn">
                <i class="fas fa-clock"></i> Przedłuż LIVE
              </button>
              <button class="live-btn live-clear" id="live-clear-btn">
                <i class="fas fa-eraser"></i> Wyczyść rysunek
              </button>
            </div>
          </div>
        `;

        const toggleBtn = document.getElementById("live-toggle-btn");
        if (toggleBtn) {
          toggleBtn.onclick = async () => {
            if (!hasMap) return;
            if (liveState.active) {
              await stopLive();
            } else {
              await startLive();
            }
          };
        }

        const clearBtn = document.getElementById("live-clear-btn");
        if (clearBtn) {
          clearBtn.onclick = async () => {
            liveState.strokes = [];
            await saveState();
            renderLive();
          };
        }

        const extendBtn = document.getElementById("live-extend-btn");
        if (extendBtn) {
          extendBtn.onclick = async () => {
            await extendLive();
          };
        }

        const colorInput = document.getElementById("live-brush-color");
        if (colorInput) {
          colorInput.value = liveState.brushColor;
          colorInput.oninput = async (event) => {
            liveState.brushColor = event.target.value;
            if (liveState.active) {
              await saveState();
            }
          };
        }

        const sizeInput = document.getElementById("live-brush-size");
        if (sizeInput) {
          sizeInput.value = liveState.brushSize;
          sizeInput.oninput = async (event) => {
            liveState.brushSize = Number(event.target.value);
            if (liveState.active) {
              await saveState();
            }
          };
        }
      } else {
        container.innerHTML = liveState.active
          ? `
            <button class="live-btn live-watch" id="live-watch-btn">
              <i class="fas fa-eye"></i> ZOBACZ LIVE
            </button>
          `
          : `<div class="live-offline">LIVE aktualnie nieaktywne</div>`;

        const watchBtn = document.getElementById("live-watch-btn");
        if (watchBtn) {
          watchBtn.onclick = async () => {
            watchingLive = true;
            await syncToLiveMap();
          };
        }
      }
    }

    if (isAdmin) {
      const toggleBtn = document.getElementById("live-toggle-btn");
      if (toggleBtn) {
        toggleBtn.disabled = !hasMap;
        toggleBtn.innerHTML = `
          <i class="fas fa-broadcast-tower"></i>
          ${liveState.active ? "Zakończ LIVE" : "START LIVE"}
        `;
      }
      updateTimerDisplay();
    }
    updateCanvasInteractivity();
  };

  const startLive = async () => {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    liveState = {
      active: true,
      map: window.TaktykiState.currentMap,
      board: window.TaktykiState.currentBoard,
      strokes: [],
      updatedAt: null,
      expiresAt,
      brushColor: liveState.brushColor || "#32d583",
      brushSize: liveState.brushSize || 4,
    };
    await saveState();
    refreshControls();
    createCanvas();
    renderLive();
    startCountdown();
  };

  const stopLive = async () => {
    liveState.active = false;
    liveState.expiresAt = null;
    await saveState();
    refreshControls();
    renderLive();
    stopCountdown();
  };

  const extendLive = async () => {
    if (!liveState.active) return;
    liveState.expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await saveState();
    refreshControls();
  };

  const getRemainingTime = () => {
    if (!liveState.active || !liveState.expiresAt) return null;
    const remaining = new Date(liveState.expiresAt).getTime() - Date.now();
    return remaining > 0 ? remaining : 0;
  };

  const formatRemainingTime = (remainingMs) => {
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const updateTimerDisplay = () => {
    const timer = document.getElementById("live-remaining");
    if (!timer) return;
    const remaining = getRemainingTime();
    timer.textContent = remaining ? formatRemainingTime(remaining) : "--:--";
  };

  const startCountdown = () => {
    if (countdownTimer) return;
    countdownTimer = setInterval(async () => {
      if (!liveState.active) return;
      const remaining = getRemainingTime();
      if (remaining !== null && remaining <= 0) {
        await stopLive();
        return;
      }
      updateTimerDisplay();
    }, 1000);
  };

  const stopCountdown = () => {
    if (!countdownTimer) return;
    clearInterval(countdownTimer);
    countdownTimer = null;
  };

  const syncToLiveMap = async () => {
    if (!liveState.active || !liveState.map) return;
    window.TaktykiState.currentMap = liveState.map;
    window.TaktykiState.currentBoard = liveState.board || "Miejscowki";
    await window.TaktykiSidebar.generateSidebar();
    await window.TaktykiMap.showMap();
    createCanvas();
    renderLive();
  };

  const handleMapReady = () => {
    createCanvas();
    renderLive();
  };

  const updateCanvasInteractivity = () => {
    if (!canvas) return;
    const isAdmin = window.TaktykiUtils.isAdmin();
    const allowDrawing = liveState.active && isAdmin;
    canvas.style.pointerEvents = allowDrawing ? "auto" : "none";
    const pinsContainer = document.getElementById("pins-container");
    const arrowsContainer = document.getElementById("arrows-container");
    const tempArrowContainer = document.getElementById("temp-arrow-container");
    const pointerValue = allowDrawing ? "none" : "";
    if (pinsContainer) pinsContainer.style.pointerEvents = pointerValue;
    if (arrowsContainer) arrowsContainer.style.pointerEvents = pointerValue;
    if (tempArrowContainer) tempArrowContainer.style.pointerEvents = pointerValue;
  };

  const handleMapBoardChange = async () => {
    refreshControls();
    if (!window.TaktykiUtils.isAdmin()) return;
    if (!liveState.active) return;
    if (!window.TaktykiState.currentMap) {
      await stopLive();
      return;
    }
    liveState.map = window.TaktykiState.currentMap;
    liveState.board = window.TaktykiState.currentBoard;
    liveState.strokes = [];
    await saveState();
    renderLive();
  };

  return {
    init,
    refreshControls,
    handleMapReady,
    handleMapBoardChange,
  };
})();
