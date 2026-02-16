const loginForm = document.getElementById("adminLoginForm");
const loginStatus = document.getElementById("loginStatus");
const adminPanel = document.getElementById("adminPanel");
const importButton = document.getElementById("importButton");
const fileInput = document.getElementById("xlsxInput");
const importStatus = document.getElementById("importStatus");
const addMatchButton = document.getElementById("addMatchButton");
const adminMatchJson = document.getElementById("adminMatchJson");
const addMatchStatus = document.getElementById("addMatchStatus");
const excludedMatchIdInput = document.getElementById("excludedMatchIdInput");
const addExcludedMatchButton = document.getElementById("addExcludedMatchButton");
const excludedMatchStatus = document.getElementById("excludedMatchStatus");
const excludedMatchesList = document.getElementById("excludedMatchesList");

const ADMIN_USER = "admin";
const ADMIN_PASS = "postteam";
const STORAGE_KEY = "postteamAdminLoggedIn";

let isLoggedIn = localStorage.getItem(STORAGE_KEY) === "true";

const setStatus = (message) => {
  loginStatus.textContent = message;
};

const setImportStatus = (message) => {
  importStatus.textContent = message;
};

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = loginForm.querySelector("#adminUser").value.trim();
  const password = loginForm.querySelector("#adminPass").value.trim();

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    isLoggedIn = true;
    adminPanel.classList.add("active");
    setStatus("Zalogowano jako administrator.");
    localStorage.setItem(STORAGE_KEY, "true");
    loginForm.reset();
    loadExcludedMatches();
  } else {
    setStatus("Niepoprawne dane logowania.");
  }
});

if (isLoggedIn) {
  adminPanel.classList.add("active");
  setStatus("Zalogowano jako administrator.");
}

importButton.addEventListener("click", async () => {
  if (!isLoggedIn) {
    setImportStatus("Najpierw zaloguj się jako administrator.");
    return;
  }

  if (!fileInput.files.length) {
    setImportStatus("Wybierz plik .xlsx do importu.");
    return;
  }

  const file = fileInput.files[0];
  const data = await file.arrayBuffer();

  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = "Mecze z PostTeam";
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    setImportStatus(`Nie znaleziono zakładki "${sheetName}".`);
    return;
  }

  const json = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });

  try {
    const response = await fetch("admin/import.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: json }),
    });

    if (!response.ok) {
      throw new Error("Błąd zapisu danych na serwerze.");
    }

    const result = await response.json();
    setImportStatus(result.message || "Dane zapisane.");
  } catch (error) {
    setImportStatus("Nie udało się zapisać danych.");
  }
});


const setAddMatchStatus = (message) => {
  if (addMatchStatus) addMatchStatus.textContent = message;
};

if (addMatchButton) {
  addMatchButton.addEventListener("click", async () => {
    if (!isLoggedIn) {
      setAddMatchStatus("Najpierw zaloguj się jako administrator.");
      return;
    }

    const raw = (adminMatchJson?.value || "").trim();
    if (!raw) {
      setAddMatchStatus("Wklej dane JSON meczu.");
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setAddMatchStatus("Błędny JSON. Sprawdź format danych.");
      return;
    }

    if (!Array.isArray(parsed) || !parsed.length) {
      setAddMatchStatus("JSON musi być niepustą tablicą rekordów.");
      return;
    }

    addMatchButton.disabled = true;
    setAddMatchStatus("Dodawanie meczu...");

    try {
      const response = await fetch("admin/add-match.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsed }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        setAddMatchStatus(result.message || "Nie udało się dodać meczu.");
        return;
      }
      setAddMatchStatus(result.message || "Mecz został dodany.");
      if (result.added && adminMatchJson) adminMatchJson.value = "";
    } catch (error) {
      console.error(error);
      setAddMatchStatus("Błąd połączenia z API.");
    } finally {
      addMatchButton.disabled = false;
    }
  });
}


const setExcludedStatus = (message) => {
  if (excludedMatchStatus) excludedMatchStatus.textContent = message;
};

const renderExcludedMatches = (ids = []) => {
  if (!excludedMatchesList) return;
  const list = Array.isArray(ids) ? ids : [];
  if (!list.length) {
    excludedMatchesList.innerHTML = '<span class="hint">Brak wykluczonych meczów.</span>';
    return;
  }
  excludedMatchesList.innerHTML = list
    .map((id) => `<span class="excluded-pill">${id}</span>`)
    .join('');
};

const loadExcludedMatches = async () => {
  try {
    const response = await fetch('admin/excluded-matches.php', { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      renderExcludedMatches([]);
      return;
    }
    renderExcludedMatches(result.matchIds || []);
  } catch (error) {
    renderExcludedMatches([]);
  }
};

if (addExcludedMatchButton) {
  addExcludedMatchButton.addEventListener('click', async () => {
    if (!isLoggedIn) {
      setExcludedStatus('Najpierw zaloguj się jako administrator.');
      return;
    }
    const matchId = (excludedMatchIdInput?.value || '').trim();
    if (!matchId) {
      setExcludedStatus('Podaj ID meczu.');
      return;
    }

    addExcludedMatchButton.disabled = true;
    setExcludedStatus('Dodawanie...');
    try {
      const response = await fetch('admin/excluded-matches.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        setExcludedStatus(result.message || 'Nie udało się dodać ID.');
        return;
      }
      setExcludedStatus(result.message || 'Dodano ID meczu.');
      if (excludedMatchIdInput) excludedMatchIdInput.value = '';
      renderExcludedMatches(result.matchIds || []);
    } catch (error) {
      setExcludedStatus('Błąd połączenia z API.');
    } finally {
      addExcludedMatchButton.disabled = false;
    }
  });
}

if (isLoggedIn) {
  loadExcludedMatches();
}
