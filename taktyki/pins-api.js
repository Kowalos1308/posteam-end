window.PinsAPI = (() => {
  const endpoint = "taktyki/pins.php";
  let cache = null;
  let lastFetch = null;

  const fetchAll = async () => {
    const now = Date.now();
    if (cache && lastFetch && now - lastFetch < 5000) {
      return cache;
    }
    const response = await fetch(endpoint, { cache: "no-store" });
    const data = await response.json();
    cache = data;
    lastFetch = now;
    return data;
  };

  const postAction = async (payload) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.json();
  };

  const getBoardsForMap = async (map) => {
    const data = await fetchAll();
    if (!data[map]) return ["Miejscowki"];
    return Object.keys(data[map]).filter((key) => !key.startsWith("_"));
  };

  const getPinsForMapAndBoard = async (map, board) => {
    const data = await fetchAll();
    if (!data[map] || !data[map][board]) return [];
    return data[map][board];
  };

  const addPin = async (map, board, pin) => {
    cache = null;
    lastFetch = null;
    return postAction({ action: "addPin", map, board, pin });
  };

  const deletePin = async (map, board, pinId) => {
    cache = null;
    lastFetch = null;
    return postAction({ action: "deletePin", map, board, pinId });
  };

  const clearBoardPins = async (map, board) => {
    cache = null;
    lastFetch = null;
    return postAction({ action: "clearBoard", map, board });
  };

  const addBoard = async (map, boardName) => {
    cache = null;
    lastFetch = null;
    return postAction({ action: "addBoard", map, board: "Miejscowki", boardName });
  };

  const getBoardNote = async (map, board) => {
    const data = await fetchAll();
    return (data._boardNotes && data._boardNotes[map] && data._boardNotes[map][board]) || "";
  };

  const saveBoardNote = async (map, board, html) => {
    cache = null;
    lastFetch = null;
    return postAction({ action: "setBoardNote", map, board, noteHtml: html });
  };

  const deleteBoard = async (map, board) => {
    cache = null;
    lastFetch = null;
    return postAction({ action: "deleteBoard", map, board });
  };

  const isBoardRemovable = async (map, board) => {
    const data = await fetchAll();
    return !!(data._customBoards && data._customBoards[map] && data._customBoards[map][board]);
  };

  const renameBoard = async (map, oldBoardName, newBoardName) => {
    cache = null;
    lastFetch = null;
    return postAction({ action: "renameBoard", map, board: oldBoardName, newBoardName });
  };

  const getAllPins = async () => fetchAll();

  return {
    getBoardsForMap,
    getPinsForMapAndBoard,
    addPin,
    deletePin,
    clearBoardPins,
    addBoard,
    getBoardNote,
    saveBoardNote,
    deleteBoard,
    isBoardRemovable,
    renameBoard,
    getAllPins,
    get cache() {
      return cache;
    },
    set cache(value) {
      cache = value;
    },
    get lastFetch() {
      return lastFetch;
    },
    set lastFetch(value) {
      lastFetch = value;
    },
  };
})();
