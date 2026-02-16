window.TaktykiActions = (() => {
  const drawTempArrow = (x1, y1, x2, y2) => {
    const tempArrowContainer = document.getElementById("temp-arrow-container");
    if (!tempArrowContainer) return;

    tempArrowContainer.innerHTML = "";
    tempArrowContainer.style.display = "block";

    const mapContainer = document.getElementById("map-image-container");
    if (!mapContainer) return;

    const rect = mapContainer.getBoundingClientRect();
    const startX = (x1 / 100) * rect.width;
    const startY = (y1 / 100) * rect.height;
    const endX = (x2 / 100) * rect.width;
    const endY = (y2 / 100) * rect.height;

    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    const line = document.createElement("div");
    line.className = "temp-arrow-line";
    line.style.position = "absolute";
    line.style.left = `${startX}px`;
    line.style.top = `${startY}px`;
    line.style.width = `${length}px`;
    const isMobile = window.innerWidth <= 600;
    line.style.height = isMobile ? "1px" : "3px";
    const arrowColor = window.TaktykiUtils.getPositionArrowColor(window.TaktykiState.currentArrowPin?.players);
    line.style.backgroundColor = arrowColor;
    line.style.transformOrigin = "0 50%";
    line.style.transform = `rotate(${angle}deg)`;
    line.style.zIndex = "9";

    const arrowhead = document.createElement("div");
    arrowhead.className = "temp-arrow-head";
    arrowhead.style.position = "absolute";
    arrowhead.style.left = `${endX}px`;
    arrowhead.style.top = `${endY}px`;
    arrowhead.style.width = "0";
    arrowhead.style.height = "0";
    const headSize = isMobile ? 6 : 8;
    const headLen = isMobile ? 10 : 14;
    arrowhead.style.borderLeft = `${headSize}px solid transparent`;
    arrowhead.style.borderRight = `${headSize}px solid transparent`;
    arrowhead.style.borderTop = `${headLen}px solid ${arrowColor}`;
    arrowhead.style.transform = `translate(-50%, -50%) rotate(${angle - 90}deg)`;
    arrowhead.style.zIndex = "9";

    tempArrowContainer.appendChild(line);
    tempArrowContainer.appendChild(arrowhead);
  };

  const showPinMode = () => {
    window.TaktykiState.isAddingPin = true;
    const addPinBtn = document.getElementById("add-pin-btn");
    if (addPinBtn) {
      addPinBtn.innerHTML = '<i class="fas fa-times"></i> Anuluj';
      addPinBtn.classList.add("active");
    }
  };

  const resetAddPinMode = () => {
    window.TaktykiState.isAddingPin = false;
    window.TaktykiState.pinType = null;
    window.TaktykiState.tempPosition = null;
    window.TaktykiState.lineDrawStart = null;
    cancelArrowDrawing();
    window.TaktykiState.isFreeDrawing = false;
    window.TaktykiState.tempStrokePoints = [];
    window.TaktykiState.editingPin = null;

    const addPinBtn = document.getElementById("add-pin-btn");
    if (addPinBtn) {
      addPinBtn.innerHTML = '<i class="fas fa-map-pin"></i> Dodaj pinezkę';
      addPinBtn.classList.remove("active");
    }
  };

  const cancelAddPinMode = () => {
    window.TaktykiState.isAddingPin = false;
    window.TaktykiState.pinType = null;
    window.TaktykiState.tempPosition = null;
    window.TaktykiState.lineDrawStart = null;

    const addPinBtn = document.getElementById("add-pin-btn");
    if (addPinBtn) {
      addPinBtn.innerHTML = '<i class="fas fa-map-pin"></i> Dodaj pinezkę';
      addPinBtn.classList.remove("active");
    }
  };

  const startArrowDrawing = (pin) => {
    window.TaktykiState.isAddingArrow = true;
    window.TaktykiState.currentArrowPin = pin;
    cancelAddPinMode();

    const tempArrowContainer = document.getElementById("temp-arrow-container");
    if (tempArrowContainer) {
      tempArrowContainer.style.display = "block";
    }

    const cancelBtn = document.createElement("button");
    cancelBtn.innerHTML = "×";
    cancelBtn.className = "cancel-arrow-btn";
    cancelBtn.onclick = () => cancelArrowDrawing();
    cancelBtn.id = "cancel-arrow-btn";
    document.body.appendChild(cancelBtn);
  };

  const cancelArrowDrawing = () => {
    window.TaktykiState.isAddingArrow = false;
    window.TaktykiState.currentArrowPin = null;

    const tempArrowContainer = document.getElementById("temp-arrow-container");
    if (tempArrowContainer) {
      tempArrowContainer.style.display = "none";
      tempArrowContainer.innerHTML = "";
    }

    const cancelBtn = document.getElementById("cancel-arrow-btn");
    if (cancelBtn) {
      cancelBtn.remove();
    }
  };

  const addPinToServer = async (mapName, boardName, x, y, text, type, description = "", players = [], imageUrl = "", floor = 1, extraData = {}) => {
    const pinId = Date.now();
    const newPin = {
      id: pinId,
      x,
      y,
      text,
      type,
      description,
      players,
      imageUrl,
      arrows: [],
      floor: Number.isFinite(Number(floor)) ? Number(floor) : 1,
      createdAt: new Date().toISOString(),
      ...extraData,
    };

    try {
      const result = await window.PinsAPI.addPin(mapName, boardName, newPin);
      if (result.success) {
        if (window.PinsAPI.cache) {
          window.PinsAPI.cache = null;
        }
        await window.TaktykiMap.loadAndDisplayPins();
        await window.TaktykiSidebar.updatePinsList();
      }
    } catch (error) {
      console.error("TaktykiModule: Error adding pin:", error);
    }
  };

  const updatePinOnServer = async (mapName, boardName, pinData) => {
    if (!pinData || !pinData.id) return;
    try {
      const result = await window.PinsAPI.addPin(mapName, boardName, pinData);
      if (result.success) {
        if (window.PinsAPI.cache) {
          window.PinsAPI.cache = null;
        }
        await window.TaktykiMap.loadAndDisplayPins();
        await window.TaktykiSidebar.updatePinsList();
      }
    } catch (error) {
      console.error("TaktykiModule: Error updating pin:", error);
    }
  };

  const addArrowToServer = async (pin, endX, endY) => {
    const arrowId = Date.now();
    const newArrow = { id: arrowId, endX, endY, startX: pin.x, startY: pin.y };

    try {
      const allPins = await window.PinsAPI.getAllPins();

      if (allPins[window.TaktykiState.currentMap] && allPins[window.TaktykiState.currentMap][window.TaktykiState.currentBoard]) {
        const pins = allPins[window.TaktykiState.currentMap][window.TaktykiState.currentBoard];
        const pinIndex = pins.findIndex((item) => item.id === pin.id);

        if (pinIndex !== -1) {
          if (!pins[pinIndex].arrows) {
            pins[pinIndex].arrows = [];
          }
          pins[pinIndex].arrows.push(newArrow);

          const result = await window.PinsAPI.addPin(
            window.TaktykiState.currentMap,
            window.TaktykiState.currentBoard,
            pins[pinIndex]
          );

          if (result.success) {
            if (window.PinsAPI.cache) {
              window.PinsAPI.cache = null;
            }
            await window.TaktykiMap.loadAndDisplayPins();
            await window.TaktykiSidebar.updatePinsList();
          }
        }
      }
    } catch (error) {
      console.error("TaktykiModule: Error adding arrow:", error);
    }
  };

  const updateArrowEndpointOnServer = async (pinId, arrowId, endX, endY) => {
    try {
      const allPins = await window.PinsAPI.getAllPins();
      const mapPins = allPins?.[window.TaktykiState.currentMap]?.[window.TaktykiState.currentBoard];
      if (!mapPins) return;
      const pinIndex = mapPins.findIndex((item) => item.id === pinId);
      if (pinIndex === -1 || !Array.isArray(mapPins[pinIndex].arrows)) return;
      const arrowIndex = mapPins[pinIndex].arrows.findIndex((item) => item.id === arrowId);
      if (arrowIndex === -1) return;
      mapPins[pinIndex].arrows[arrowIndex].endX = endX;
      mapPins[pinIndex].arrows[arrowIndex].endY = endY;
      const result = await window.PinsAPI.addPin(
        window.TaktykiState.currentMap,
        window.TaktykiState.currentBoard,
        mapPins[pinIndex]
      );
      if (result.success) {
        if (window.PinsAPI.cache) window.PinsAPI.cache = null;
        await window.TaktykiMap.loadAndDisplayPins();
        await window.TaktykiSidebar.updatePinsList();
      }
    } catch (error) {
      console.error("TaktykiModule: Error updating arrow endpoint:", error);
    }
  };

  const removeArrowFromServer = async (pinId, arrowId) => {
    try {
      const allPins = await window.PinsAPI.getAllPins();
      if (allPins[window.TaktykiState.currentMap] && allPins[window.TaktykiState.currentMap][window.TaktykiState.currentBoard]) {
        const pins = allPins[window.TaktykiState.currentMap][window.TaktykiState.currentBoard];
        const pinIndex = pins.findIndex((item) => item.id === pinId);

        if (pinIndex !== -1 && pins[pinIndex].arrows) {
          pins[pinIndex].arrows = pins[pinIndex].arrows.filter((arrow) => arrow.id !== arrowId);

          const result = await window.PinsAPI.addPin(
            window.TaktykiState.currentMap,
            window.TaktykiState.currentBoard,
            pins[pinIndex]
          );

          if (result.success) {
            if (window.PinsAPI.cache) {
              window.PinsAPI.cache = null;
            }
            await window.TaktykiMap.loadAndDisplayPins();
            await window.TaktykiSidebar.updatePinsList();
          }
        }
      }
    } catch (error) {
      console.error("TaktykiModule: Error removing arrow:", error);
    }
  };

  const removePinFromServer = async (mapName, boardName, pinId) => {
    if (!window.TaktykiUtils.checkPinsAPI()) return;

    const result = await window.PinsAPI.deletePin(mapName, boardName, pinId);
    if (result.success) {
      await window.TaktykiMap.loadAndDisplayPins();
      await window.TaktykiSidebar.updatePinsList();
    }
  };

  const clearPinsForCurrentBoard = async () => {
    if (!window.TaktykiState.currentMap || !window.TaktykiState.currentBoard || !window.TaktykiUtils.checkPinsAPI()) return;

    const result = await window.PinsAPI.clearBoardPins(window.TaktykiState.currentMap, window.TaktykiState.currentBoard);
    if (result.success) {
      await window.TaktykiMap.loadAndDisplayPins();
      await window.TaktykiSidebar.updatePinsList();
    }
  };

  const drawArrow = (pin, arrow) => {
    const arrowsContainer = document.getElementById("arrows-container");
    const pinsContainer = document.getElementById("pins-container");
    if (!arrowsContainer) return;

    const arrowElement = document.createElement("div");
    arrowElement.className = "arrow-element";
    arrowElement.dataset.pinId = pin.id;
    arrowElement.dataset.arrowId = arrow.id;

    const mapContainer = document.getElementById("map-image-container");
    if (!mapContainer) return;

    const rect = mapContainer.getBoundingClientRect();
    const arrowStartX = Number.isFinite(Number(arrow.startX)) ? Number(arrow.startX) : pin.x;
    const arrowStartY = Number.isFinite(Number(arrow.startY)) ? Number(arrow.startY) : pin.y;
    const startX = (arrowStartX / 100) * rect.width;
    const startY = (arrowStartY / 100) * rect.height;
    const endX = (arrow.endX / 100) * rect.width;
    const endY = (arrow.endY / 100) * rect.height;

    const color = window.TaktykiUtils.getPositionArrowColor(pin.players);
    const isMobile = window.innerWidth <= 600;

    const line = document.createElement("div");
    line.className = "arrow-line";
    line.style.position = "absolute";
    line.style.left = `${startX}px`;
    line.style.top = `${startY}px`;
    line.style.height = isMobile ? "1.5px" : "4px";
    line.style.backgroundColor = color;
    line.style.transformOrigin = "0 50%";
    line.style.zIndex = "8";

    const arrowhead = document.createElement("div");
    arrowhead.className = "arrow-head";
    arrowhead.style.position = "absolute";
    arrowhead.style.width = "0";
    arrowhead.style.height = "0";
    const headSize = isMobile ? 5 : 7;
    const headLen = isMobile ? 9 : 12;
    arrowhead.style.borderLeft = `${headSize}px solid transparent`;
    arrowhead.style.borderRight = `${headSize}px solid transparent`;
    arrowhead.style.borderTop = `${headLen}px solid ${color}`;
    arrowhead.style.zIndex = "11";
    arrowhead.style.pointerEvents = "none";
    arrowhead.style.cursor = window.TaktykiUtils.isAdmin() ? "grab" : "default";

    const redrawArrow = (targetX, targetY) => {
      const dx = targetX - startX;
      const dy = targetY - startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      line.style.width = `${length}px`;
      line.style.transform = `rotate(${angle}deg)`;
      arrowhead.style.left = `${targetX}px`;
      arrowhead.style.top = `${targetY}px`;
      arrowhead.style.transform = `translate(-50%, -50%) rotate(${angle - 90}deg)`;
      return angle;
    };

    redrawArrow(endX, endY);

    const isAdmin = window.TaktykiUtils.isAdmin();
    if (isAdmin) {
      const arrowControl = document.createElement("div");
      arrowControl.className = "arrow-head-control";
      arrowControl.style.position = "absolute";
      arrowControl.style.left = `${endX}px`;
      arrowControl.style.top = `${endY}px`;
      arrowControl.style.width = isMobile ? "28px" : "34px";
      arrowControl.style.height = isMobile ? "28px" : "34px";
      arrowControl.style.transform = "translate(-50%, -50%)";
      arrowControl.style.zIndex = "40";
      arrowControl.style.pointerEvents = "auto";

      const menuBtn = document.createElement("button");
      menuBtn.type = "button";
      menuBtn.className = "pin-menu-btn arrow-head-menu-btn";
      menuBtn.innerHTML = '<i class="fas fa-pen"></i>';
      menuBtn.style.position = "absolute";
      menuBtn.style.left = "14px";
      menuBtn.style.top = "-12px";
      menuBtn.style.transform = "none";

      const menu = document.createElement("div");
      menu.className = "arrow-head-menu";
      menu.style.left = "14px";
      menu.style.top = "-14px";
      menu.style.transform = "translate(0, -100%)";
      menu.innerHTML = `
        <button type="button" class="pin-action-btn add-chain"><i class="fas fa-arrow-right"></i><span>Dodaj strzałkę</span></button>
        <button type="button" class="pin-action-btn delete-arrow"><i class="fas fa-trash"></i><span>Usuń strzałkę</span></button>
      `;

      let menuVisible = false;
      const hideMenu = () => {
        menuVisible = false;
        menu.classList.remove("show");
      };

      menuBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        menuVisible = !menuVisible;
        menu.classList.toggle("show", menuVisible);
      });

      menu.addEventListener("click", (event) => event.stopPropagation());

      const addChainBtn = menu.querySelector(".add-chain");
      if (addChainBtn) {
        addChainBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          hideMenu();
          const currentX = (parseFloat(arrowControl.style.left) / rect.width) * 100;
          const currentY = (parseFloat(arrowControl.style.top) / rect.height) * 100;
          startArrowDrawing({ id: pin.id, x: currentX, y: currentY, players: pin.players || [] });
        });
      }

      const deleteArrowBtn = menu.querySelector(".delete-arrow");
      if (deleteArrowBtn) {
        deleteArrowBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          if (confirm("Usunąć tę strzałkę?")) {
            removeArrowFromServer(pin.id, arrow.id);
          }
        });
      }

      document.addEventListener("click", (event) => {
        if (!arrowElement.contains(event.target)) hideMenu();
      });

      let dragging = false;
      let moved = false;

      const startDrag = (event) => {
        if (event.button !== 0) return;
        if (window.TaktykiState.isFreeDrawing) return;
        if (event.target.closest(".arrow-head-menu") || event.target.closest(".arrow-head-menu-btn")) return;
        dragging = true;
        moved = false;
        arrowControl.setPointerCapture?.(event.pointerId);
        hideMenu();
        event.preventDefault();
      };

      const moveDrag = (event) => {
        if (!dragging) return;
        const dragRect = mapContainer.getBoundingClientRect();
        let px = event.clientX - dragRect.left;
        let py = event.clientY - dragRect.top;
        px = Math.max(0, Math.min(dragRect.width, px));
        py = Math.max(0, Math.min(dragRect.height, py));
        arrowControl.style.left = `${px}px`;
        arrowControl.style.top = `${py}px`;
        redrawArrow(px, py);
        moved = true;
      };

      const endDrag = async () => {
        if (!dragging) return;
        dragging = false;
        if (!moved) return;
        const px = parseFloat(arrowControl.style.left);
        const py = parseFloat(arrowControl.style.top);
        const nx = Math.max(0, Math.min(100, (px / rect.width) * 100));
        const ny = Math.max(0, Math.min(100, (py / rect.height) * 100));
        await updateArrowEndpointOnServer(pin.id, arrow.id, nx, ny);
      };

      arrowControl.addEventListener("pointerdown", startDrag);
      arrowControl.addEventListener("pointermove", moveDrag);
      arrowControl.addEventListener("pointerup", endDrag);

      arrowControl.appendChild(menuBtn);
      arrowControl.appendChild(menu);
      if (pinsContainer) {
        pinsContainer.appendChild(arrowControl);
      } else {
        arrowElement.appendChild(arrowControl);
      }
      arrowhead.style.cursor = "grab";
    }

    arrowElement.appendChild(line);
    arrowElement.appendChild(arrowhead);
    arrowsContainer.appendChild(arrowElement);
  };


  const addFreeDrawStrokeToServer = async (points, color, dashed) => {
    if (!Array.isArray(points) || points.length < 2) return;
    const start = points[0];
    await addPinToServer(
      window.TaktykiState.currentMap,
      window.TaktykiState.currentBoard,
      start.x,
      start.y,
      "Rysunek",
      "rysunek",
      "",
      [],
      "",
      window.TaktykiState.currentMap === "vertigo" ? window.TaktykiState.currentFloor : 1,
      { strokePoints: points, strokeColor: color || "#32d583", strokeDashed: !!dashed }
    );
  };

  return {
    drawTempArrow,
    showPinMode,
    resetAddPinMode,
    cancelAddPinMode,
    startArrowDrawing,
    cancelArrowDrawing,
    addPinToServer,
    updatePinOnServer,
    addArrowToServer,
    removeArrowFromServer,
    removePinFromServer,
    clearPinsForCurrentBoard,
    drawArrow,
    addFreeDrawStrokeToServer,
  };
})();
