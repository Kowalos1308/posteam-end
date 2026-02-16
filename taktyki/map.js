window.TaktykiMap = (() => {
  const isVertigo = () => window.TaktykiState.currentMap === "vertigo";

  const getPinFloor = (pin) => {
    const rawFloor = Number(pin?.floor);
    return Number.isFinite(rawFloor) && rawFloor > 0 ? rawFloor : 1;
  };

  const getCurrentMapImagePath = () => {
    const mapImageConfig = window.TaktykiState.mapImages[window.TaktykiState.currentMap];
    if (!mapImageConfig) return "taktyki/mapy/placeholder.svg";
    if (typeof mapImageConfig === "string") return mapImageConfig;
    return mapImageConfig[window.TaktykiState.currentFloor] || mapImageConfig[1] || "taktyki/mapy/placeholder.svg";
  };

  const updateFloorSwitcher = () => {
    const floorSwitcher = document.getElementById("map-floor-switcher");
    if (!floorSwitcher) return;

    if (!isVertigo()) {
      floorSwitcher.style.display = "none";
      return;
    }

    floorSwitcher.style.display = "inline-flex";
    floorSwitcher.querySelectorAll(".floor-btn").forEach((button) => {
      const floor = Number(button.dataset.floor || "1");
      button.classList.toggle("active", floor === window.TaktykiState.currentFloor);
      button.onclick = async () => {
        if (floor === window.TaktykiState.currentFloor) return;
        window.TaktykiState.currentFloor = floor;
        await showMap();
      };
    });

    let isFreeDrawingNow = false;
    mapContainer.addEventListener("pointerdown", (event) => {
      if (!window.TaktykiUtils.isAdmin() || !window.TaktykiState.isFreeDrawing) return;
      if (window.TaktykiState.drawMode !== "pen") return;
      if (event.button !== 0) return;
      event.preventDefault();
      const rect = mapContainer.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      isFreeDrawingNow = true;
      window.TaktykiState.tempStrokePoints = [{ x, y }];
    });

    mapContainer.addEventListener("pointermove", (event) => {
      if (!isFreeDrawingNow || !window.TaktykiState.isFreeDrawing) return;
      if (window.TaktykiState.drawMode !== "pen") return;
      const rect = mapContainer.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      const points = window.TaktykiState.tempStrokePoints || [];
      points.push({ x, y });
      window.TaktykiState.tempStrokePoints = points;
      renderTempFreeDraw(points, window.TaktykiState.freeDrawColor, window.TaktykiState.freeDrawDashed);
    });

    const endFreeDraw = async () => {
      if (!isFreeDrawingNow) return;
      isFreeDrawingNow = false;
      const points = [...(window.TaktykiState.tempStrokePoints || [])];
      window.TaktykiState.tempStrokePoints = [];
      clearTempFreeDraw();
      if (points.length >= 2) {
        await window.TaktykiActions.addFreeDrawStrokeToServer(points, window.TaktykiState.freeDrawColor, window.TaktykiState.freeDrawDashed);
      }
    };

    mapContainer.addEventListener("pointerup", endFreeDraw);
    mapContainer.addEventListener("pointerleave", endFreeDraw);
  };

  const shouldDisplayPin = (pin) => {
    if (!isVertigo()) return true;
    return getPinFloor(pin) === window.TaktykiState.currentFloor;
  };

  const showMap = async () => {
    if (!window.TaktykiState.currentMap) return;

    const mapContainer = document.getElementById("map-container");
    const mapImage = document.getElementById("map-image");
    const mapTitle = document.getElementById("map-title");
    const boardInfo = document.getElementById("current-board");

    if (!mapContainer || !mapImage || !mapTitle || !boardInfo) return;

    mapContainer.style.display = "block";
    mapTitle.textContent = window.TaktykiUtils.capitalizeFirst(window.TaktykiState.currentMap);
    boardInfo.textContent = isVertigo()
      ? `${window.TaktykiState.currentBoard} • Poziom ${window.TaktykiState.currentFloor}`
      : window.TaktykiState.currentBoard;

    updateFloorSwitcher();

    mapImage.dataset.floorFallbackTried = "0";
    mapImage.src = getCurrentMapImagePath();

    mapImage.onload = async () => {
      adjustMapSize();
      setupMapInteraction();
      await loadAndDisplayPins();
      if (window.TaktykiLive) {
        window.TaktykiLive.handleMapReady();
      }
    };

    mapImage.onerror = async () => {
      if (isVertigo() && window.TaktykiState.currentFloor === 2 && mapImage.dataset.floorFallbackTried !== "1") {
        mapImage.dataset.floorFallbackTried = "1";
        const fallbackFloorOne = window.TaktykiState.mapImages.vertigo?.[1] || "taktyki/mapy/placeholder.svg";
        mapImage.src = fallbackFloorOne;
        return;
      }

      mapImage.src = "taktyki/mapy/placeholder.svg";
      adjustMapSize();
      setupMapInteraction();
      await loadAndDisplayPins();
      if (window.TaktykiLive) {
        window.TaktykiLive.handleMapReady();
      }
    };
  };

  const adjustMapSize = () => {
    const mapImage = document.getElementById("map-image");
    const mapContainer = document.getElementById("map-image-container");
    const mapWrapper = document.getElementById("map-wrapper");

    if (!mapImage || !mapContainer || !mapWrapper) return;

    if (mapImage.complete && mapImage.naturalHeight !== 0) {
      mapImage.style.width = "100%";
      mapImage.style.height = "auto";
      mapImage.style.maxWidth = "1000px";
      mapImage.style.objectFit = "contain";
      mapImage.style.display = "block";
      mapImage.style.margin = "0 auto";

      mapContainer.style.width = "100%";
      mapContainer.style.maxWidth = "1000px";
      mapContainer.style.height = "auto";
      mapContainer.style.position = "relative";
      mapContainer.style.margin = "0 auto";

      mapWrapper.style.minHeight = "auto";
    } else {
      setTimeout(adjustMapSize, 100);
    }
  };

  const setupMapInteraction = () => {
    const mapContainer = document.getElementById("map-image-container");
    const pinsContainer = document.getElementById("pins-container");
    const arrowsContainer = document.getElementById("arrows-container");
    const drawingsContainer = document.getElementById("drawings-container");
    const tempArrowContainer = document.getElementById("temp-arrow-container");

    if (!mapContainer || !pinsContainer || !arrowsContainer || !drawingsContainer || !tempArrowContainer) return;

    if (mapContainer.dataset.interactionBound === "1") return;
    mapContainer.dataset.interactionBound = "1";

    pinsContainer.style.position = "absolute";
    pinsContainer.style.top = "0";
    pinsContainer.style.left = "0";
    pinsContainer.style.width = "100%";
    pinsContainer.style.height = "100%";
    pinsContainer.style.pointerEvents = "none";
    pinsContainer.style.zIndex = "10";

    arrowsContainer.style.position = "absolute";
    arrowsContainer.style.top = "0";
    arrowsContainer.style.left = "0";
    arrowsContainer.style.width = "100%";
    arrowsContainer.style.height = "100%";
    arrowsContainer.style.pointerEvents = "auto";
    arrowsContainer.style.zIndex = "8";

    drawingsContainer.style.position = "absolute";
    drawingsContainer.style.top = "0";
    drawingsContainer.style.left = "0";
    drawingsContainer.style.width = "100%";
    drawingsContainer.style.height = "100%";
    drawingsContainer.style.pointerEvents = "none";
    drawingsContainer.style.zIndex = "7";

    tempArrowContainer.style.position = "absolute";
    tempArrowContainer.style.top = "0";
    tempArrowContainer.style.left = "0";
    tempArrowContainer.style.width = "100%";
    tempArrowContainer.style.height = "100%";
    tempArrowContainer.style.pointerEvents = "none";
    tempArrowContainer.style.zIndex = "9";

    mapContainer.addEventListener("click", (event) => {
      const target = event.target;
      if (target && target.closest && target.closest(".arrow-element")) return;

      if (window.TaktykiState.isFreeDrawing) {
        if (!window.TaktykiUtils.isAdmin()) return;
        if (window.TaktykiState.drawMode !== "line") return;
        const rect = mapContainer.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        if (x < 0 || x > 100 || y < 0 || y > 100) return;

        if (!window.TaktykiState.lineDrawStart) {
          window.TaktykiState.lineDrawStart = { x, y };
          window.TaktykiState.tempStrokePoints = [{ x, y }];
          renderTempFreeDraw([{ x, y }, { x, y }], window.TaktykiState.freeDrawColor, window.TaktykiState.freeDrawDashed);
          return;
        }

        const points = [window.TaktykiState.lineDrawStart, { x, y }];
        window.TaktykiState.lineDrawStart = null;
        window.TaktykiState.tempStrokePoints = [];
        clearTempFreeDraw();
        window.TaktykiActions.addFreeDrawStrokeToServer(points, window.TaktykiState.freeDrawColor, window.TaktykiState.freeDrawDashed);
        return;
      }
      if (window.TaktykiState.isAddingPin && !window.TaktykiState.isAddingArrow) {
        const rect = mapContainer.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
          window.TaktykiState.tempPosition = { x, y };
          window.TaktykiModals.showPinModal();
        }
      } else if (window.TaktykiState.isAddingArrow && window.TaktykiState.currentArrowPin) {
        const rect = mapContainer.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
          window.TaktykiActions.addArrowToServer(window.TaktykiState.currentArrowPin, x, y);
          window.TaktykiActions.cancelArrowDrawing();
        }
      }
    });


    let isFreeDrawingNow = false;
    mapContainer.addEventListener("pointerdown", (event) => {
      if (!window.TaktykiUtils.isAdmin() || !window.TaktykiState.isFreeDrawing) return;
      if (window.TaktykiState.drawMode !== "pen") return;
      if (event.button !== 0) return;
      event.preventDefault();
      const rect = mapContainer.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      isFreeDrawingNow = true;
      window.TaktykiState.tempStrokePoints = [{ x, y }];
    });

    mapContainer.addEventListener("pointermove", (event) => {
      if (!isFreeDrawingNow || !window.TaktykiState.isFreeDrawing) return;
      if (window.TaktykiState.drawMode !== "pen") return;
      const rect = mapContainer.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      const points = window.TaktykiState.tempStrokePoints || [];
      points.push({ x, y });
      window.TaktykiState.tempStrokePoints = points;
      renderTempFreeDraw(points, window.TaktykiState.freeDrawColor, window.TaktykiState.freeDrawDashed);
    });

    const endFreeDraw = async () => {
      if (!isFreeDrawingNow) return;
      isFreeDrawingNow = false;
      const points = [...(window.TaktykiState.tempStrokePoints || [])];
      window.TaktykiState.tempStrokePoints = [];
      clearTempFreeDraw();
      if (points.length >= 2) {
        await window.TaktykiActions.addFreeDrawStrokeToServer(points, window.TaktykiState.freeDrawColor, window.TaktykiState.freeDrawDashed);
      }
    };

    mapContainer.addEventListener("pointerup", endFreeDraw);
    mapContainer.addEventListener("pointerleave", endFreeDraw);

    mapContainer.addEventListener("mousemove", (event) => {
      if (window.TaktykiState.isAddingArrow && window.TaktykiState.currentArrowPin) {
        const rect = mapContainer.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        window.TaktykiActions.drawTempArrow(
          window.TaktykiState.currentArrowPin.x,
          window.TaktykiState.currentArrowPin.y,
          x,
          y
        );
      }

      if (window.TaktykiState.isFreeDrawing && window.TaktykiState.drawMode === "line" && window.TaktykiState.lineDrawStart) {
        const rect = mapContainer.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        renderTempFreeDraw([window.TaktykiState.lineDrawStart, { x, y }], window.TaktykiState.freeDrawColor, window.TaktykiState.freeDrawDashed);
      }
    });
  };

  const loadAndDisplayPins = async () => {
    if (!window.TaktykiState.currentMap || !window.TaktykiState.currentBoard || !window.TaktykiUtils.checkPinsAPI()) return;

    try {
      const pins = await window.PinsAPI.getPinsForMapAndBoard(
        window.TaktykiState.currentMap,
        window.TaktykiState.currentBoard
      );
      displayPins(pins);
    } catch (error) {
      console.error("TaktykiModule: Error loading pins:", error);
    }
  };

  const displayPins = (pins) => {
    const pinsContainer = document.getElementById("pins-container");
    const arrowsContainer = document.getElementById("arrows-container");
    const drawingsContainer = document.getElementById("drawings-container");
    const boardInfo = document.getElementById("current-board");

    if (!pinsContainer || !arrowsContainer || !drawingsContainer || !boardInfo) return;

    pinsContainer.innerHTML = "";
    arrowsContainer.innerHTML = "";
    drawingsContainer.innerHTML = "";
    boardInfo.textContent = isVertigo()
      ? `${window.TaktykiState.currentBoard} • Poziom ${window.TaktykiState.currentFloor}`
      : window.TaktykiState.currentBoard;

    const visiblePins = pins.filter((pin) => shouldDisplayPin(pin));

    visiblePins.forEach((pin) => {
      if (pin.type === "rysunek") {
        drawStoredFreeDraw(pin);
        if (window.TaktykiUtils.isAdmin()) {
          const pinElement = createPinElement(pin);
          pinsContainer.appendChild(pinElement);
        }
        return;
      }

      const pinElement = createPinElement(pin);
      pinsContainer.appendChild(pinElement);

      if (pin.type === "pozycja" && pin.arrows && pin.arrows.length > 0) {
        pin.arrows.forEach((arrow) => {
          window.TaktykiActions.drawArrow(pin, arrow);
        });
      }
    });

    window.TaktykiSidebar.updatePinsList();
  };


  const attachDragForAdmin = (pinElement, pin) => {
    if (!window.TaktykiUtils.isAdmin() || !pin || pin.type === "rysunek") return;

    let dragging = false;
    let moved = false;

    pinElement.addEventListener("pointerdown", (event) => {
      const target = event.target;
      if (window.TaktykiState.isFreeDrawing) return;
      if (target && (target.closest(".pin-menu-btn") || target.closest(".pin-actions-menu"))) return;
      if (event.button !== 0) return;
      dragging = true;
      moved = false;
      pinElement.setPointerCapture?.(event.pointerId);
      pinElement.classList.add("is-dragging");
      event.preventDefault();
    });

    pinElement.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const mapContainer = document.getElementById("map-image-container");
      if (!mapContainer) return;
      const rect = mapContainer.getBoundingClientRect();
      let x = ((event.clientX - rect.left) / rect.width) * 100;
      let y = ((event.clientY - rect.top) / rect.height) * 100;
      x = Math.max(0, Math.min(100, x));
      y = Math.max(0, Math.min(100, y));
      pinElement.style.left = `${x}%`;
      pinElement.style.top = `${y}%`;
      pin._dragX = x;
      pin._dragY = y;
      moved = true;
    });

    pinElement.addEventListener("pointerup", async (event) => {
      if (!dragging) return;
      dragging = false;
      pinElement.classList.remove("is-dragging");
      if (!moved || pin._dragX === undefined || pin._dragY === undefined) return;
      const updatedPin = { ...pin, x: pin._dragX, y: pin._dragY };
      if (Array.isArray(updatedPin.arrows) && updatedPin.arrows.length) {
        updatedPin.arrows = updatedPin.arrows.map((arrow) => ({
          ...arrow,
          startX: pin._dragX,
          startY: pin._dragY,
        }));
      }
      delete updatedPin._dragX;
      delete updatedPin._dragY;
      try {
        const result = await window.PinsAPI.addPin(window.TaktykiState.currentMap, window.TaktykiState.currentBoard, updatedPin);
        if (result?.success) {
          if (window.PinsAPI.cache) window.PinsAPI.cache = null;
          await loadAndDisplayPins();
          await window.TaktykiSidebar.updatePinsList();
        }
      } catch (error) {
        console.error("TaktykiModule: Error dragging pin:", error);
      }
      event.preventDefault();
    });
  };

  const createPinElement = (pin) => {
    const pinElement = document.createElement("div");
    pinElement.className = "pin";
    pinElement.style.position = "absolute";
    pinElement.style.left = `${pin.x}%`;
    pinElement.style.top = `${pin.y}%`;
    pinElement.style.transform = "translate(-50%, -50%)";
    pinElement.style.pointerEvents = "auto";
    pinElement.style.cursor = "pointer";
    pinElement.dataset.pinId = pin.id;

    const isAdmin = window.TaktykiUtils.isAdmin();
    const safeTitle = (pin.description || pin.text || "").replace(/"/g, "&quot;");

    let pinHTML = "";
    let pinClass = "";

    switch (pin.type) {
      case "miejscowka":
        pinClass = "pin-miejscowka";
        pinHTML = `
          <div class="${pinClass}" title="${safeTitle}">
            ${pin.text}
            ${isAdmin ? '<button class="pin-menu-btn"><i class="fas fa-pen"></i></button>' : ""}
          </div>
        `;
        break;
      case "pozycja":
        pinClass = "pin-position";
        pinHTML = `
          <div class="${pinClass}" style="${window.TaktykiUtils.getPositionStyle(pin.players || [])}" title="${safeTitle}">
            <span class="pin-position-dot"></span>
            ${isAdmin ? '<button class="pin-menu-btn"><i class="fas fa-pen"></i></button>' : ""}
          </div>
        `;
        break;
      case "granat-smoke":
        pinClass = "pin-grenade pin-smoke";
        pinHTML = `<div class="${pinClass}" title="${safeTitle || "Smoke"}"><span class="pin-grenade-label">S</span>${
          isAdmin ? '<button class="pin-menu-btn"><i class="fas fa-pen"></i></button>' : ""
        }</div>`;
        break;
      case "granat-flash":
        pinClass = "pin-grenade pin-flash";
        pinHTML = `<div class="${pinClass}" title="${safeTitle || "Flash"}"><span class="pin-grenade-label">F</span>${
          isAdmin ? '<button class="pin-menu-btn"><i class="fas fa-pen"></i></button>' : ""
        }</div>`;
        break;
      case "granat-nade":
        pinClass = "pin-grenade pin-nade";
        pinHTML = `<div class="${pinClass}" title="${safeTitle || "HE Grenade"}"><span class="pin-grenade-label">H</span>${
          isAdmin ? '<button class="pin-menu-btn"><i class="fas fa-pen"></i></button>' : ""
        }</div>`;
        break;
      case "granat-molotov":
        pinClass = "pin-grenade pin-molotov";
        pinHTML = `<div class="${pinClass}" title="${safeTitle || "Molotov"}"><span class="pin-grenade-label">M</span>${
          isAdmin ? '<button class="pin-menu-btn"><i class="fas fa-pen"></i></button>' : ""
        }</div>`;
        break;
      case "host":
        pinClass = "pin-host";
        pinHTML = `<div class="${pinClass}" title="${safeTitle || "H"}">H${
          isAdmin ? '<button class="pin-menu-btn"><i class="fas fa-pen"></i></button>' : ""
        }</div>`;
        break;
      case "bomba":
        pinClass = "pin-bomba";
        pinHTML = `<div class="${pinClass}" title="${safeTitle || "BOMBA"}"><i class="fas fa-bomb"></i>${
          pin.imageUrl ? `<div class="bomb-hover-preview"><img src="${pin.imageUrl}" alt="Podgląd bomby"></div>` : ""
        }${isAdmin ? '<button class="pin-menu-btn"><i class="fas fa-pen"></i></button>' : ""}</div>`;
        break;
      case "rysunek":
        pinClass = "pin-drawing-handle";
        pinHTML = `<div class="${pinClass}" title="Rysunek odręczny">${isAdmin ? '<button class="pin-menu-btn"><i class="fas fa-pen"></i></button>' : ""}</div>`;
        break;
      default:
        pinClass = "pin-miejscowka";
        pinHTML = `<div class="${pinClass}" title="${safeTitle}">${pin.text}</div>`;
        break;
    }

    pinElement.innerHTML = pinHTML;

    if (isAdmin) {
      const menuBtn = pinElement.querySelector(".pin-menu-btn");
      if (menuBtn) {
        const actionsMenu = document.createElement("div");
        actionsMenu.className = "pin-actions-menu";
        if (pin.type === "rysunek") actionsMenu.classList.add("for-drawing");

        let actionsHTML = "";
        if (pin.type === "pozycja") {
          actionsHTML += `
            <button class="pin-action-btn add-arrow">
              <i class="fas fa-arrow-right"></i>
              <span>Dodaj strzałkę</span>
            </button>
          `;
        }
        if (pin.type !== "rysunek") {
          actionsHTML += `
            <button class="pin-action-btn edit">
              <i class="fas fa-pen"></i>
              <span>Edytuj pinezkę</span>
            </button>
          `;
        }
        actionsHTML += `
          <button class="pin-action-btn delete">
            <i class="fas fa-trash"></i>
            <span>Usuń pinezkę</span>
          </button>
        `;

        actionsMenu.innerHTML = actionsHTML;
        pinElement.appendChild(actionsMenu);

        let menuVisible = false;

        const toggleMenu = (event) => {
          event.stopPropagation();
          menuVisible = !menuVisible;

          if (menuVisible) {
            actionsMenu.classList.add("show");
            setTimeout(() => {
              const closeMenuHandler = (clickEvent) => {
                if (!pinElement.contains(clickEvent.target)) {
                  actionsMenu.classList.remove("show");
                  menuVisible = false;
                  document.removeEventListener("click", closeMenuHandler);
                }
              };
              document.addEventListener("click", closeMenuHandler);
            }, 0);
          } else {
            actionsMenu.classList.remove("show");
          }
        };

        menuBtn.onclick = toggleMenu;

        const editBtn = actionsMenu.querySelector(".edit");
        if (editBtn) {
          editBtn.onclick = (event) => {
            event.stopPropagation();
            actionsMenu.classList.remove("show");
            menuVisible = false;
            window.TaktykiModals.showPinModal(pin);
          };
        }

        const deleteBtn = actionsMenu.querySelector(".delete");
        if (deleteBtn) {
          deleteBtn.onclick = (event) => {
            event.stopPropagation();
            actionsMenu.classList.remove("show");
            menuVisible = false;

            let confirmMessage = "Usunąć tę pinezkę?";
            if (pin.type.includes("granat-") || pin.type === "bomba") {
              confirmMessage = "Usunąć ten granat?";
            } else if (pin.type === "miejscowka") {
              confirmMessage = "Usunąć tę miejscówkę?";
            } else if (pin.type === "pozycja") {
              confirmMessage = "Usunąć tę pozycję?";
            }

            if (confirm(confirmMessage)) {
              window.TaktykiActions.removePinFromServer(
                window.TaktykiState.currentMap,
                window.TaktykiState.currentBoard,
                pin.id
              );
            }
          };
        }

        const addArrowBtn = actionsMenu.querySelector(".add-arrow");
        if (addArrowBtn) {
          addArrowBtn.onclick = (event) => {
            event.stopPropagation();
            actionsMenu.classList.remove("show");
            menuVisible = false;
            window.TaktykiActions.startArrowDrawing(pin);
          };
        }
      }
    }

    const pinContainer = pinElement.querySelector(`.${pinClass.split(" ")[0]}`) || pinElement.firstElementChild;
    if (pinContainer) {
      pinContainer.addEventListener("mouseenter", () => {
        window.TaktykiSidebar.highlightPin(pin.id);
      });

      pinContainer.addEventListener("mouseleave", () => {
        window.TaktykiSidebar.unhighlightPin(pin.id);
      });
    }

    attachDragForAdmin(pinElement, pin);
    return pinElement;
  };


  const toSvgPath = (points = [], width, height) => {
    if (!Array.isArray(points) || points.length < 2) return "";
    return points
      .map((point, index) => {
        const px = (Number(point.x) / 100) * width;
        const py = (Number(point.y) / 100) * height;
        return `${index === 0 ? "M" : "L"}${px.toFixed(2)} ${py.toFixed(2)}`;
      })
      .join(" ");
  };

  const drawStoredFreeDraw = (pin) => {
    const drawingsContainer = document.getElementById("drawings-container");
    const mapContainer = document.getElementById("map-image-container");
    if (!drawingsContainer || !mapContainer) return;
    const points = Array.isArray(pin.strokePoints) ? pin.strokePoints : [];
    if (points.length < 2) return;
    const rect = mapContainer.getBoundingClientRect();
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "drawing-svg");
    svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    svg.setAttribute("preserveAspectRatio", "none");
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", toSvgPath(points, rect.width, rect.height));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", pin.strokeColor || "#32d583");
    path.setAttribute("stroke-width", window.innerWidth <= 600 ? "1.6" : "2.4");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    if (pin.strokeDashed) path.setAttribute("stroke-dasharray", "7 6");
    svg.appendChild(path);
    drawingsContainer.appendChild(svg);
  };

  const renderTempFreeDraw = (points, color, dashed) => {
    const drawingsContainer = document.getElementById("drawings-container");
    const mapContainer = document.getElementById("map-image-container");
    if (!drawingsContainer || !mapContainer) return;
    clearTempFreeDraw();
    const rect = mapContainer.getBoundingClientRect();
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "drawing-svg drawing-temp");
    svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    svg.setAttribute("preserveAspectRatio", "none");
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", toSvgPath(points, rect.width, rect.height));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", color || "#32d583");
    path.setAttribute("stroke-width", window.innerWidth <= 600 ? "1.6" : "2.2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    if (dashed) path.setAttribute("stroke-dasharray", "7 6");
    svg.appendChild(path);
    drawingsContainer.appendChild(svg);
  };

  const clearTempFreeDraw = () => {
    document.querySelectorAll(".drawing-temp").forEach((node) => node.remove());
  };

  return {
    showMap,
    adjustMapSize,
    setupMapInteraction,
    loadAndDisplayPins,
    displayPins,
    createPinElement,
    shouldDisplayPin,
    getPinFloor,
  };
})();
