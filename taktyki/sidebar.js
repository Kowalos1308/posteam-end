window.TaktykiSidebar = (() => {
  const filterPinsForCurrentFloor = (pinsList = []) => {
    if (window.TaktykiState.currentMap !== "vertigo") return pinsList;
    return pinsList.filter((pin) => (window.TaktykiMap?.shouldDisplayPin ? window.TaktykiMap.shouldDisplayPin(pin) : true));
  };


  let noteMenuGlobalsBound = false;

  const removeNotePinMenu = () => {
    const existing = document.getElementById("note-pin-context-menu");
    if (existing) existing.remove();
  };

  const getReadableTextColorForStyle = (style = "") => {
    const normalized = style.toLowerCase();
    if (normalized.includes("#fff") || normalized.includes("255, 255, 255") || normalized.includes("#ffeb3b") || normalized.includes("255, 235, 59")) {
      return "#111";
    }
    return "#fff";
  };

  const insertPinLabelAtSelection = (editor, pin, selectedRange) => {
    if (!editor || !pin || !selectedRange) return;
    const range = selectedRange.cloneRange();
    const label = document.createElement("span");
    label.className = "note-pin-inline";
    label.contentEditable = "false";
    const pinTypeName = window.TaktykiUtils.getPinTypeName(pin.type);
    const pinLabelText = (pin.text || "").trim() || pinTypeName;
    label.textContent = pinLabelText;
    label.title = `${pinTypeName}${pin.description ? ` • ${pin.description}` : ""}`;
    label.dataset.pinId = pin.id;

    const pinStyle = window.TaktykiUtils.getPinBadgeStyle(pin.type, pin.players || []);
    label.style.cssText = `${pinStyle}; border-width: 1px; border-style: solid; border-color: rgba(0,0,0,0.25);`;
    label.style.color = getReadableTextColorForStyle(pinStyle);

    label.addEventListener("mouseenter", () => {
      window.TaktykiSidebar.highlightPin(pin.id);
    });

    label.addEventListener("mouseleave", () => {
      window.TaktykiSidebar.unhighlightPin(pin.id);
    });

    range.deleteContents();
    range.insertNode(label);
    const space = document.createTextNode(" ");
    label.parentNode.insertBefore(space, label.nextSibling);

    const after = document.createRange();
    after.setStartAfter(space);
    after.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(after);
    editor.focus();
  };

  const bindEditorPinContextMenu = async () => {
    const editor = document.getElementById("map-note-editor");
    if (!editor || editor.dataset.pinMenuBound === "1") return;
    editor.dataset.pinMenuBound = "1";

    let storedRange = null;
    editor.addEventListener("contextmenu", async (event) => {
      event.preventDefault();
      removeNotePinMenu();

      if (!window.TaktykiState.currentMap) return;

      let pins = [];
      try {
        pins = await window.PinsAPI.getPinsForMapAndBoard(window.TaktykiState.currentMap, window.TaktykiState.currentBoard);
      } catch (error) {
        console.error("TaktykiModule: Error loading pins for note menu:", error);
      }

      const filtered = filterPinsForCurrentFloor(pins).filter((pin) => isListablePin(pin) && (pin.text || "").trim());
      if (!filtered.length) return;

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        storedRange = selection.getRangeAt(0).cloneRange();
      }

      const menu = document.createElement("div");
      menu.id = "note-pin-context-menu";
      menu.className = "note-pin-context-menu";
      menu.style.left = `${event.clientX}px`;
      menu.style.top = `${event.clientY}px`;

      const title = document.createElement("div");
      title.className = "note-pin-context-title";
      title.textContent = "Wstaw pinezkę do notatki";
      menu.appendChild(title);

      filtered.slice(0, 24).forEach((pin) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "note-pin-context-item";
        btn.innerHTML = `<span class="note-pin-type" style="${window.TaktykiUtils.getPinBadgeStyle(pin.type, pin.players || [])}">${window.TaktykiUtils.getPinTypeName(pin.type)}</span><span>${pin.text}</span>`;
        btn.addEventListener("click", () => {
          insertPinLabelAtSelection(editor, pin, storedRange);
          removeNotePinMenu();
        });
        menu.appendChild(btn);
      });

      document.body.appendChild(menu);

      const rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth - 8) menu.style.left = `${Math.max(8, window.innerWidth - rect.width - 8)}px`;
      if (rect.bottom > window.innerHeight - 8) menu.style.top = `${Math.max(8, window.innerHeight - rect.height - 8)}px`;
    });

    if (!noteMenuGlobalsBound) {
      noteMenuGlobalsBound = true;
      document.addEventListener("click", (event) => {
        const menu = document.getElementById("note-pin-context-menu");
        if (menu && !menu.contains(event.target)) removeNotePinMenu();
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") removeNotePinMenu();
      });
    }
  };

  const bindNotePinHoverSync = () => {
    const noteRoot = document.getElementById("map-note-editor") || document.querySelector(".map-note-view");
    if (!noteRoot || noteRoot.dataset.pinHoverBound === "1") return;
    noteRoot.dataset.pinHoverBound = "1";

    noteRoot.addEventListener("mouseover", (event) => {
      if (!(event.target instanceof Element)) return;
      const chip = event.target.closest(".note-pin-inline");
      if (!chip || !noteRoot.contains(chip)) return;
      const pinId = chip.dataset.pinId;
      if (pinId) highlightPin(pinId);
    });

    noteRoot.addEventListener("mouseout", (event) => {
      if (!(event.target instanceof Element)) return;
      const chip = event.target.closest(".note-pin-inline");
      if (!chip || !noteRoot.contains(chip)) return;
      const related = event.relatedTarget;
      if (related && chip.contains(related)) return;
      const pinId = chip.dataset.pinId;
      if (pinId) unhighlightPin(pinId);
    });
  };

  const isListablePin = (pin) => pin && pin.type !== "rysunek";

  const renderPinsList = (pinsList, interactive = false) => {
    const displayPins = pinsList.filter(isListablePin);
    if (!displayPins.length) return '<div class="no-pins">Brak pinezek w tej planszy</div>';
    return displayPins
      .map(
        (pin) => `
      <div class="pin-list-item" data-pin-id="${pin.id}" ${
          interactive
            ? `onmouseenter="TaktykiModule.highlightPin('${pin.id}')"
                     onmouseleave="TaktykiModule.unhighlightPin('${pin.id}')"
                     onclick="TaktykiModule.centerOnPin('${pin.id}')"`
            : ""
        }>
        <div class="pin-list-header">
          <span class="pin-list-type ${pin.type}" style="${window.TaktykiUtils.getPinBadgeStyle(pin.type, pin.players || [])}">${window.TaktykiUtils.getPinTypeName(pin.type)}</span>
          <span class="pin-list-text">${pin.text}</span>
          ${window.TaktykiState.currentMap === "vertigo" ? `<span class="pin-floor-badge">P${window.TaktykiMap?.getPinFloor ? window.TaktykiMap.getPinFloor(pin) : 1}</span>` : ""}
          
        </div>
        ${pin.description ? `<div class="pin-list-desc">${pin.description}</div>` : ""}
        ${pin.videoUrl ? `<a class="pin-video-link" href="${pin.videoUrl}" target="_blank" rel="noopener noreferrer">ODPAL FILM YOUTUBE</a>` : ""}
      </div>
    `
      )
      .join("");
  };


  const renderNotesContent = (currentMap, isAdmin, boardNote) => {
    if (!currentMap) {
      return `<div class="map-note-view"><p>Wybierz mapę, aby zobaczyć notatki.</p></div>`;
    }
    if (isAdmin) {
      return `
        <div class="notes-toolbar">
          <button type="button" class="secondary-btn notes-cmd" data-cmd="bold"><i class="fas fa-bold"></i></button>
          <button type="button" class="secondary-btn notes-cmd" data-cmd="insertUnorderedList"><i class="fas fa-list-ul"></i></button>
          <button type="button" class="secondary-btn notes-cmd" data-cmd="insertOrderedList"><i class="fas fa-list-ol"></i></button>
          <button type="button" class="primary-btn" id="save-map-note"><i class="fas fa-save"></i> Zapisz</button>
          <span id="note-save-status" class="hint"></span>
        </div>
        <div id="map-note-editor" class="map-note-editor" contenteditable="true">${boardNote || "<p>Wpisz notatkę taktyczną dla tej planszy...</p>"}</div>
      `;
    }
    return `<div class="map-note-view">${boardNote || "<p>Brak notatek dla tej planszy.</p>"}</div>`;
  };

  const syncMobileNotesContainer = () => {
    const mobileContainer = document.getElementById("mobile-notes-container");
    const notesSection = document.querySelector(".notes-section");
    if (!mobileContainer || !notesSection) return;
    const isMobile = window.innerWidth <= 980;
    if (!isMobile) {
      mobileContainer.style.display = "none";
      mobileContainer.innerHTML = "";
      return;
    }
    mobileContainer.style.display = "block";
    mobileContainer.innerHTML = notesSection.outerHTML;
  };


  const stopFreeDrawingMode = () => {
    if (!window.TaktykiState.isFreeDrawing) return;
    window.TaktykiState.isFreeDrawing = false;
    window.TaktykiState.tempStrokePoints = [];
    window.TaktykiState.lineDrawStart = null;
    window.TaktykiState.drawMode = "pen";
    document.querySelectorAll(".drawing-temp").forEach((node) => node.remove());
    const drawBtn = document.getElementById("toggle-draw-btn");
    if (drawBtn) {
      drawBtn.innerHTML = '<i class="fas fa-pen"></i> Rysowanie';
    }
    const drawTools = document.getElementById("draw-tools");
    if (drawTools) {
      drawTools.classList.add("hidden");
    }
  };

  const generateSidebar = async () => {
    const sidebar = document.getElementById("sidebar-content");
    const { currentMap, currentBoard, isAddingPin, mapImages } = window.TaktykiState;
    if (!sidebar) return;

    const isAdmin = window.TaktykiUtils.isAdmin();
    let boardsList = ["Miejscowki"];
    let pinsList = [];
    let boardNote = "";

    if (currentMap) {
      try {
        boardsList = await window.PinsAPI.getBoardsForMap(currentMap);
        pinsList = await window.PinsAPI.getPinsForMapAndBoard(currentMap, currentBoard);
        pinsList = filterPinsForCurrentFloor(pinsList);
        boardNote = await window.PinsAPI.getBoardNote(currentMap, currentBoard);
      } catch (error) {
        console.error("TaktykiModule: Error loading data:", error);
      }
    }

    sidebar.innerHTML = `
      <div class="filter-section">
        <h3><i class="fas fa-map"></i> Wybierz mapę</h3>

        <div class="filter-group">
          <select id="map-select" class="filter-select">
            <option value="">Wybierz mapę</option>
            ${Object.keys(mapImages)
              .map(
                (map) => `
              <option value="${map}" ${currentMap === map ? "selected" : ""}>
                ${window.TaktykiUtils.capitalizeFirst(map)}
              </option>
            `
              )
              .join("")}
          </select>
        </div>

        <div class="filter-group">
          <label for="board-select"><i class="fas fa-th-large"></i> Wybierz planszę:</label>
          <select id="board-select" class="filter-select">
            ${boardsList
              .map(
                (board) => `
              <option value="${board}" ${currentBoard === board ? "selected" : ""}>${board}</option>
            `
              )
              .join("")}
          </select>
        </div>

        ${
          isAdmin
            ? `
          <div class="admin-controls">
            <button id="add-pin-btn" class="admin-action-btn ${isAddingPin ? "active" : ""}">
              <i class="fas fa-map-pin"></i> ${isAddingPin ? "Anuluj" : "Dodaj pinezkę"}
            </button>
            <button id="toggle-draw-btn" class="admin-action-btn draw-toggle-btn secondary">
              <i class="fas fa-draw-polygon"></i> ${window.TaktykiState.isFreeDrawing ? "Zakończ rysowanie" : "Rysowanie"}
            </button>
            <button id="add-board-btn" class="admin-action-btn secondary">
              <i class="fas fa-plus-square"></i> Dodaj planszę
            </button>
            <button id="clear-pins-btn" class="admin-action-btn secondary">
              <i class="fas fa-trash"></i> Wyczyść pinezki
            </button>
            <button id="rename-board-btn" class="admin-action-btn secondary">
              <i class="fas fa-edit"></i> Zmień nazwę planszy
            </button>
            <button id="delete-board-btn" class="admin-action-btn secondary">
              <i class="fas fa-minus-square"></i> Usuń planszę
            </button>
            <div class="draw-tools ${window.TaktykiState.isFreeDrawing ? "" : "hidden"}" id="draw-tools">
              <div class="draw-tools-row"><i class="fas fa-pen"></i> Tryb rysowania na planszy</div>
              <button type="button" id="draw-mode-toggle" class="secondary-btn draw-mode-toggle">Tryb: ${window.TaktykiState.drawMode === "line" ? "Linia" : "Pisak"}</button>
              <div class="draw-player-colors" id="draw-player-colors">
                ${Object.entries(window.TaktykiState.playerColors || {}).map(([name,color]) => `<button type="button" class="draw-color-chip" data-color="${color}" title="${name}" style="--chip:${color}">${name[0] || "•"}</button>`).join("")}
              </div>
              <label>Kolor linii <input type="color" id="draw-color" value="${window.TaktykiState.freeDrawColor || "#32d583"}"></label>
              <label><input type="checkbox" id="draw-dashed" ${window.TaktykiState.freeDrawDashed ? "checked" : ""}> Linia przerywana</label>
              <small class="hint">Domyślnie działa pisak. Kliknij „Tryb: Pisak/Linia”, aby przełączyć na rysowanie linii (punkt startowy + punkt końcowy).</small>
            </div>
          </div>
        `
            : ""
        }

        <div id="live-controls" class="live-controls"></div>

        <div class="pins-list-section collapsed" id="pins-list-section">
          <button type="button" class="pins-list-toggle" id="pins-list-toggle" aria-expanded="false">
            <h4><i class="fas fa-list"></i> Pinezki w planszy (${pinsList.filter(isListablePin).length})</h4>
            <i class="fas fa-chevron-right pins-toggle-icon" aria-hidden="true"></i>
          </button>
          <div class="pins-list" id="pins-list">
            ${renderPinsList(pinsList)}
          </div>
        </div>

        <div class="notes-section">
          <h4><i class="fas fa-book"></i> Taktyki — notatki planszy</h4>
          ${renderNotesContent(currentMap, isAdmin, boardNote)}
        </div>
      </div>
    `;

    const mapSelect = document.getElementById("map-select");
    if (mapSelect) {
      mapSelect.addEventListener("change", async (event) => {
        window.TaktykiState.currentMap = event.target.value;
        window.TaktykiState.currentBoard = "Miejscowki";
        window.TaktykiState.currentFloor = 1;
        window.TaktykiActions.resetAddPinMode();
        await generateSidebar();
        await window.TaktykiMap.showMap();
        if (window.TaktykiLive) {
          await window.TaktykiLive.handleMapBoardChange();
        }
      });
    }


    const pinsToggle = document.getElementById("pins-list-toggle");
    const pinsSection = document.getElementById("pins-list-section");
    if (pinsToggle && pinsSection) {
      pinsToggle.addEventListener("click", () => {
        const collapsed = pinsSection.classList.toggle("collapsed");
        pinsToggle.setAttribute("aria-expanded", String(!collapsed));
      });
    }


    const boardSelect = document.getElementById("board-select");
    if (boardSelect) {
      boardSelect.addEventListener("change", async (event) => {
        window.TaktykiState.currentBoard = event.target.value;
        window.TaktykiActions.resetAddPinMode();
        await generateSidebar();
        await window.TaktykiMap.loadAndDisplayPins();
        if (window.TaktykiLive) {
          await window.TaktykiLive.handleMapBoardChange();
        }
      });
    }

    const addPinBtn = document.getElementById("add-pin-btn");
    if (addPinBtn) {
      addPinBtn.disabled = !window.TaktykiState.currentMap;
      addPinBtn.classList.toggle("disabled", !window.TaktykiState.currentMap);
      addPinBtn.addEventListener("click", () => {
        if (!window.TaktykiState.currentMap) return;
        stopFreeDrawingMode();
        if (window.TaktykiState.isAddingPin) {
          window.TaktykiActions.resetAddPinMode();
        } else {
          window.TaktykiModals.showPinTypeModal();
        }
      });
    }


    const drawBtn = document.getElementById("toggle-draw-btn");
    if (drawBtn) {
      drawBtn.disabled = !window.TaktykiState.currentMap;
      drawBtn.classList.toggle("disabled", !window.TaktykiState.currentMap);
      drawBtn.addEventListener("click", () => {
        if (!window.TaktykiState.currentMap) return;
        window.TaktykiState.isFreeDrawing = !window.TaktykiState.isFreeDrawing;
        if (window.TaktykiState.isFreeDrawing) {
          window.TaktykiState.isAddingPin = false;
          window.TaktykiState.isAddingArrow = false;
          window.TaktykiState.lineDrawStart = null;
          window.TaktykiState.drawMode = window.TaktykiState.drawMode || "pen";
        }
        generateSidebar();
      });
    }

    const drawColor = document.getElementById("draw-color");
    if (drawColor) {
      drawColor.addEventListener("input", (event) => {
        window.TaktykiState.freeDrawColor = event.target.value || "#32d583";
      });
    }

    const drawDashed = document.getElementById("draw-dashed");
    if (drawDashed) {
      drawDashed.addEventListener("change", (event) => {
        window.TaktykiState.freeDrawDashed = !!event.target.checked;
      });
    }

    const drawModeToggle = document.getElementById("draw-mode-toggle");
    if (drawModeToggle) {
      drawModeToggle.addEventListener("click", () => {
        window.TaktykiState.drawMode = window.TaktykiState.drawMode === "line" ? "pen" : "line";
        window.TaktykiState.lineDrawStart = null;
        document.querySelectorAll(".drawing-temp").forEach((node) => node.remove());
        drawModeToggle.textContent = `Tryb: ${window.TaktykiState.drawMode === "line" ? "Linia" : "Pisak"}`;
      });
    }

    const drawColorChips = document.querySelectorAll(".draw-color-chip");
    if (drawColorChips.length) {
      drawColorChips.forEach((chip) => {
        chip.addEventListener("click", () => {
          const color = chip.dataset.color || "#32d583";
          window.TaktykiState.freeDrawColor = color;
          const picker = document.getElementById("draw-color");
          if (picker) picker.value = color;
          drawColorChips.forEach((c) => c.classList.toggle("active", c === chip));
        });
      });
      const current = (window.TaktykiState.freeDrawColor || "").toLowerCase();
      drawColorChips.forEach((c) => c.classList.toggle("active", (c.dataset.color || "").toLowerCase() == current));
    }

    const addBoardBtn = document.getElementById("add-board-btn");
    if (addBoardBtn) {
      addBoardBtn.disabled = !window.TaktykiState.currentMap;
      addBoardBtn.classList.toggle("disabled", !window.TaktykiState.currentMap);
      addBoardBtn.addEventListener("click", () => {
        if (!window.TaktykiState.currentMap) return;
        stopFreeDrawingMode();
        window.TaktykiModals.showAddBoardModal();
      });
    }

    const clearPinsBtn = document.getElementById("clear-pins-btn");
    if (clearPinsBtn) {
      clearPinsBtn.disabled = !window.TaktykiState.currentMap;
      clearPinsBtn.classList.toggle("disabled", !window.TaktykiState.currentMap);
      clearPinsBtn.addEventListener("click", async () => {
        if (!window.TaktykiState.currentMap) return;
        stopFreeDrawingMode();
        if (
          confirm(
            `Czy na pewno chcesz usunąć wszystkie pinezki z planszy "${window.TaktykiState.currentBoard}"?`
          )
        ) {
          await window.TaktykiActions.clearPinsForCurrentBoard();
        }
      });
    }

    bindNotePinHoverSync();

    document.querySelectorAll(".notes-cmd").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.execCommand(btn.dataset.cmd, false);
      });
    });

    bindEditorPinContextMenu();

    const saveMapNoteBtn = document.getElementById("save-map-note");
    if (saveMapNoteBtn) {
      saveMapNoteBtn.addEventListener("click", async () => {
        stopFreeDrawingMode();
        const editor = document.getElementById("map-note-editor");
        if (!editor || !window.TaktykiState.currentMap) return;
        const status = document.getElementById("note-save-status");
        const result = await window.PinsAPI.saveBoardNote(
          window.TaktykiState.currentMap,
          window.TaktykiState.currentBoard,
          editor.innerHTML
        );
        if (status) {
          status.textContent = result && result.success ? "Zapisano ✅" : "Błąd zapisu ❌";
          setTimeout(() => {
            status.textContent = "";
          }, 1800);
        }
      });
    }


    const renameBoardBtn = document.getElementById("rename-board-btn");
    if (renameBoardBtn) {
      const canRename = !!window.TaktykiState.currentMap && window.TaktykiState.currentBoard !== "Miejscowki";
      renameBoardBtn.disabled = !canRename;
      renameBoardBtn.classList.toggle("disabled", !canRename);
      renameBoardBtn.addEventListener("click", async () => {
        if (!canRename) return;
        stopFreeDrawingMode();
        const nextName = prompt("Nowa nazwa planszy:", window.TaktykiState.currentBoard);
        if (!nextName) return;
        const result = await window.PinsAPI.renameBoard(
          window.TaktykiState.currentMap,
          window.TaktykiState.currentBoard,
          nextName.trim()
        );
        if (result.success) {
          window.TaktykiState.currentBoard = nextName.trim();
          await generateSidebar();
          await window.TaktykiMap.loadAndDisplayPins();
        }
      });
    }

    const deleteBoardBtn = document.getElementById("delete-board-btn");
    if (deleteBoardBtn) {
      const canDelete = !!window.TaktykiState.currentMap && window.TaktykiState.currentBoard !== "Miejscowki";
      deleteBoardBtn.disabled = !canDelete;
      deleteBoardBtn.classList.toggle("disabled", !canDelete);
      deleteBoardBtn.addEventListener("click", async () => {
        if (!canDelete) return;
        stopFreeDrawingMode();
        if (!confirm(`Usunąć planszę "${window.TaktykiState.currentBoard}"?`)) return;
        const result = await window.PinsAPI.deleteBoard(window.TaktykiState.currentMap, window.TaktykiState.currentBoard);
        if (result.success) {
          window.TaktykiState.currentBoard = "Miejscowki";
          await generateSidebar();
          await window.TaktykiMap.loadAndDisplayPins();
        }
      });
    }

    if (window.TaktykiState.currentMap && mapSelect) {
      mapSelect.value = window.TaktykiState.currentMap;
    }

    if (window.TaktykiLive) {
      window.TaktykiLive.refreshControls();
    }

    syncMobileNotesContainer();
  };

  const updatePinsList = async () => {
    try {
      const pinsList = await window.PinsAPI.getPinsForMapAndBoard(
        window.TaktykiState.currentMap,
        window.TaktykiState.currentBoard
      );

      const floorFilteredPins = filterPinsForCurrentFloor(pinsList).filter(isListablePin);

      const uniquePins = [];
      const seenIds = new Set();

      for (const pin of floorFilteredPins) {
        if (!seenIds.has(pin.id)) {
          seenIds.add(pin.id);
          uniquePins.push(pin);
        }
      }

      const pinsListContainer = document.getElementById("pins-list");
      const pinsListTitle = document.querySelector(".pins-list-section h4");

      if (pinsListTitle) {
        pinsListTitle.innerHTML = `<i class="fas fa-list"></i> Pinezki w planszy (${uniquePins.length})`;
      }

      if (pinsListContainer) {
        pinsListContainer.innerHTML = renderPinsList(uniquePins, true);
      }
    } catch (error) {
      console.error("TaktykiModule: Error updating pins list:", error);
    }
  };

  const highlightPin = (pinId) => {
    const pinElement = document.querySelector(`.pin[data-pin-id="${pinId}"]`);
    if (pinElement) {
      pinElement.classList.add("highlighted");
    }

    const listItem = document.querySelector(`.pin-list-item[data-pin-id="${pinId}"]`);
    if (listItem) {
      listItem.classList.add("highlighted");
    }

    document.querySelectorAll(`.note-pin-inline[data-pin-id="${pinId}"]`).forEach((chip) => {
      chip.classList.add("highlighted");
    });
  };

  const unhighlightPin = (pinId) => {
    const pinElement = document.querySelector(`.pin[data-pin-id="${pinId}"]`);
    if (pinElement) {
      pinElement.classList.remove("highlighted");
    }

    const listItem = document.querySelector(`.pin-list-item[data-pin-id="${pinId}"]`);
    if (listItem) {
      listItem.classList.remove("highlighted");
    }

    document.querySelectorAll(`.note-pin-inline[data-pin-id="${pinId}"]`).forEach((chip) => {
      chip.classList.remove("highlighted");
    });
  };

  const centerOnPin = (pinId) => {
    const pinElement = document.querySelector(`.pin[data-pin-id="${pinId}"]`);
    if (pinElement && pinElement.parentElement) {
      const mapContainer = pinElement.parentElement;
      const pinX = parseFloat(pinElement.style.left);
      const pinY = parseFloat(pinElement.style.top);
      const scrollX = (pinX / 100) * mapContainer.scrollWidth - mapContainer.clientWidth / 2;
      const scrollY = (pinY / 100) * mapContainer.scrollHeight - mapContainer.clientHeight / 2;

      mapContainer.scrollTo({
        left: scrollX,
        top: scrollY,
        behavior: "smooth",
      });

      pinElement.classList.add("highlighted");
      setTimeout(() => {
        pinElement.classList.remove("highlighted");
      }, 1500);
    }
  };

  return { generateSidebar, updatePinsList, highlightPin, unhighlightPin, centerOnPin };
})();
