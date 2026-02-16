window.TaktykiModals = (() => {
  const showPinTypeModal = () => {
    const modal = document.getElementById("pin-type-modal");
    if (!modal) return;

    modal.style.display = "flex";

    const closeModal = () => {
      modal.style.display = "none";
    };

    document.getElementById("close-pin-type-modal").onclick = closeModal;
    document.getElementById("cancel-pin-type").onclick = closeModal;

    modal.onclick = (event) => {
      if (event.target === modal) closeModal();
    };

    modal.querySelectorAll(".pin-type-option").forEach((option) => {
      option.onclick = () => {
        const type = option.dataset.type;
        window.TaktykiState.pinType = type;
        window.TaktykiState.isAddingPin = true;
        window.TaktykiState.tempPosition = null;
        window.TaktykiState.editingPin = null;
        window.TaktykiActions.showPinMode();
        closeModal();
      };
    });
  };

  const showPinModal = (pinToEdit = null) => {
    const modal = document.getElementById("pin-modal");
    if (!modal) return;

    if (pinToEdit) {
      window.TaktykiState.pinType = pinToEdit.type;
      window.TaktykiState.tempPosition = { x: pinToEdit.x, y: pinToEdit.y };
      window.TaktykiState.editingPin = pinToEdit;
    }

    modal.style.display = "flex";

    const textGroup = document.getElementById("pin-text-group");
    const textInput = document.getElementById("pin-text");
    const pinPlayerGroup = document.getElementById("pin-player-group");
    const imageGroup = document.getElementById("pin-image-group");
    const imageInput = document.getElementById("pin-image-url");
    const videoInput = document.getElementById("pin-video-url");
    const submitBtn = document.querySelector("#pin-form .primary-btn");

    const isPozycja = window.TaktykiState.pinType === "pozycja";
    const isHost = window.TaktykiState.pinType === "host";
    const isBomba = window.TaktykiState.pinType === "bomba";
    const isEditing = !!window.TaktykiState.editingPin;
    const isGrenade = (window.TaktykiState.pinType || "").startsWith("granat-");

    if (pinPlayerGroup) {
      pinPlayerGroup.style.display = isPozycja ? "grid" : "none";
    }
    if (imageGroup) {
      imageGroup.style.display = isBomba ? "grid" : "none";
    }
    if (textGroup && textInput) {
      textGroup.style.display = isHost || isBomba ? "none" : "grid";
      textInput.required = !(isHost || isBomba || isPozycja || isGrenade);
    }
    if (submitBtn) {
      submitBtn.textContent = isEditing ? "Zapisz zmiany" : "Dodaj pinezkę";
    }

    if (isEditing && window.TaktykiState.editingPin) {
      const editingPin = window.TaktykiState.editingPin;
      textInput.value = isHost || isBomba ? "" : editingPin.text || "";
      document.getElementById("pin-description").value = editingPin.description || "";
      if (imageInput) imageInput.value = editingPin.imageUrl || "";
      if (videoInput) videoInput.value = editingPin.videoUrl || "";
      const playersSelect = document.getElementById("pin-players");
      if (playersSelect) {
        const selected = new Set(editingPin.players || []);
        Array.from(playersSelect.options).forEach((option) => {
          option.selected = selected.has(option.value);
        });
      }
    }

    const closeModal = () => {
      modal.style.display = "none";
      document.getElementById("pin-text").value = "";
      document.getElementById("pin-description").value = "";
      if (imageInput) imageInput.value = "";
      if (videoInput) videoInput.value = "";
      if (submitBtn) submitBtn.textContent = "Dodaj pinezkę";
      window.TaktykiState.editingPin = null;
      const playersSelect = document.getElementById("pin-players");
      if (playersSelect) {
        Array.from(playersSelect.options).forEach((option) => {
          option.selected = false;
        });
      }
    };

    document.getElementById("close-pin-modal").onclick = closeModal;
    document.getElementById("cancel-pin").onclick = closeModal;

    modal.onclick = (event) => {
      if (event.target === modal) closeModal();
    };

    document.getElementById("pin-form").onsubmit = async (event) => {
      event.preventDefault();

      if (!window.TaktykiState.currentMap || !window.TaktykiState.currentBoard || !window.TaktykiUtils.checkPinsAPI()) {
        return;
      }

      const rawText = document.getElementById("pin-text").value.trim();
      const description = document.getElementById("pin-description").value.trim();
      const imageUrl = imageInput ? imageInput.value.trim() : "";
      const playersSelect = document.getElementById("pin-players");
      const videoUrl = videoInput ? videoInput.value.trim() : "";
      const players =
        playersSelect && isPozycja
          ? Array.from(playersSelect.selectedOptions).map((option) => option.value)
          : [];

      const playersFallbackText = isPozycja && players.length ? players.join("/") : "";

      let grenadeFallbackText = "";
      if (isGrenade && !rawText) {
        try {
          const boardPins = await window.PinsAPI.getPinsForMapAndBoard(window.TaktykiState.currentMap, window.TaktykiState.currentBoard);
          const sameTypePins = (boardPins || []).filter((pin) => pin.type === window.TaktykiState.pinType);
          const numericValues = sameTypePins.map((pin) => Number(pin.text)).filter((value) => Number.isFinite(value));
          grenadeFallbackText = String((numericValues.length ? Math.max(...numericValues) : 0) + 1);
        } catch (error) {
          grenadeFallbackText = "1";
        }
      }

      const text = isHost ? "H" : isBomba ? "BOMBA" : rawText || playersFallbackText || grenadeFallbackText;

      if (!text || !window.TaktykiState.tempPosition) return;

      if (isEditing && window.TaktykiState.editingPin) {
        const editedPin = {
          ...window.TaktykiState.editingPin,
          text,
          description,
          players,
          imageUrl,
          videoUrl,
          floor: window.TaktykiState.editingPin.floor || (window.TaktykiState.currentMap === "vertigo" ? window.TaktykiState.currentFloor : 1),
        };
        await window.TaktykiActions.updatePinOnServer(
          window.TaktykiState.currentMap,
          window.TaktykiState.currentBoard,
          editedPin
        );
      } else {
        await window.TaktykiActions.addPinToServer(
          window.TaktykiState.currentMap,
          window.TaktykiState.currentBoard,
          window.TaktykiState.tempPosition.x,
          window.TaktykiState.tempPosition.y,
          text,
          window.TaktykiState.pinType,
          description,
          players,
          imageUrl,
          window.TaktykiState.currentMap === "vertigo" ? window.TaktykiState.currentFloor : 1,
          { videoUrl }
        );
      }

      closeModal();
      window.TaktykiActions.resetAddPinMode();
    };

    setTimeout(() => {
      if (!(isHost || isBomba)) {
        document.getElementById("pin-text").focus();
      }
    }, 100);
  };

  const showAddBoardModal = async () => {
    if (!window.TaktykiState.currentMap || !window.TaktykiUtils.checkPinsAPI()) return;

    const modal = document.getElementById("board-modal");
    if (!modal) return;

    modal.style.display = "flex";

    const closeModal = () => {
      modal.style.display = "none";
      document.getElementById("board-name").value = "";
    };

    document.getElementById("close-board-modal").onclick = closeModal;
    document.getElementById("cancel-board").onclick = closeModal;

    modal.onclick = (event) => {
      if (event.target === modal) closeModal();
    };

    document.getElementById("board-form").onsubmit = async (event) => {
      event.preventDefault();

      const boardName = document.getElementById("board-name").value.trim();
      if (!boardName) return;

      try {
        const currentBoards = await window.PinsAPI.getBoardsForMap(window.TaktykiState.currentMap);
        if (currentBoards.includes(boardName)) {
          document.getElementById("board-name").value = "";
          document.getElementById("board-name").focus();
          return;
        }

        const result = await window.PinsAPI.addBoard(window.TaktykiState.currentMap, boardName);

        if (result.success) {
          window.TaktykiState.currentBoard = boardName;

          if (window.PinsAPI.cache) {
            window.PinsAPI.cache = null;
            window.PinsAPI.lastFetch = null;
          }

          await window.TaktykiSidebar.generateSidebar();
          await window.TaktykiMap.loadAndDisplayPins();
          closeModal();
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };
  };

  return { showPinTypeModal, showPinModal, showAddBoardModal };
})();
