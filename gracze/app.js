const state = {
  rawData: [],
  filteredData: [],
  player: "",
  playerName: "",
  playerProfiles: new Map(),
  excludedMatchIds: new Set(),
  map: "",
  dateFrom: null,
  dateTo: null,
};

const elements = {
  playerSelect: document.getElementById("playerSelect"),
  mapSelect: document.getElementById("mapSelect"),
  dateFrom: document.getElementById("dateFrom"),
  dateTo: document.getElementById("dateTo"),
  filtersInfo: document.getElementById("filtersInfo"),
  playerAvatar: document.getElementById("playerAvatar"),
  playerAvatarName: document.getElementById("playerAvatarName"),
  playerAvatarCard: document.getElementById("playerAvatarCard"),
  playerPage: document.querySelector(".player-page"),
  statsGrid: document.getElementById("statsGrid"),
  recentMatches: document.getElementById("recentMatches"),
  mapsGrid: document.getElementById("mapsGrid"),
  matchesTableBody: document.getElementById("matchesTableBody"),
  compareTableBody: document.getElementById("compareTableBody"),
  tabButtons: document.querySelectorAll(".tab-button"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  momentsGrid: document.getElementById("momentsGrid"),
  graphKda: document.getElementById("graphKda"),
  graphResults: document.getElementById("graphResults"),
  graphResultsLegend: document.getElementById("graphResultsLegend"),
  graphMatchesMonthly: document.getElementById("graphMatchesMonthly"),
  graphKillsMonthly: document.getElementById("graphKillsMonthly"),
  graphAdrMonthly: document.getElementById("graphAdrMonthly"),
  graphMatchesYearly: document.getElementById("graphMatchesYearly"),
  graphAdrYearly: document.getElementById("graphAdrYearly"),
};

const {
  normalizeRecord,
  uniqueValues,
  filterRecords,
  aggregateStats,
  formatNumber,
  formatPercentage,
} = window.PlayerStatsProcessing;

const mapImageFor = (mapName) => {
  if (!mapName) return "gracze/zdjecia/placeholder.svg";
  const slug = mapName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
  return `/gracze/zdjecia/${slug}.jpg`;
};

const avatarMap = {
  dziadek: "dziadek.png",
  "dz!adek": "dziadek.png",
  matka: "matka.png",
  ojciec: "ojciec.png",
  synek: "synek.png",
  telemans: "telemans.png",
  wujek: "wujek.png",
  wuja: "wujek.png",
  kowal: "kowal.png",
  gruby: "Gruby.png",
};

const CHART_AXIS_TEXT_COLOR = "#dbe3f5";

const getAvatarForPlayer = (playerName) => {
  if (!playerName) return "gracze/zdjecia/placeholder.svg";
  const key = playerName.trim().toLowerCase();
  return avatarMap[key] || "gracze/zdjecia/placeholder.svg";
};

const formatDatePL = (dateValue) => {
  if (!dateValue) return "-";
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.valueOf())) return "-";
  const months = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}`;
};

const formatDateOnlyPL = (dateValue) => {
  if (!dateValue) return "-";
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.valueOf())) return "-";
  const months = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

window.PlayerUI = elements;
window.PlayerState = {
  state,
  mapImageFor,
  formatDatePL,
  formatDateOnlyPL,
};

const updatePlayerAvatar = () => {
  if (!elements.playerAvatar || !elements.playerAvatarName || !elements.playerAvatarCard) return;
  if (!state.player) {
    elements.playerAvatar.src = "gracze/zdjecia/placeholder.svg";
    elements.playerAvatar.alt = "Avatar gracza";
    elements.playerAvatarName.textContent = "Wybierz gracza";
    elements.playerAvatarCard.classList.add("is-empty");
    return;
  }

  elements.playerAvatar.src = getAvatarForPlayer(state.playerName);
  elements.playerAvatar.alt = state.playerName || "Gracz";
  elements.playerAvatarName.textContent = state.playerName || "Wybierz gracza";
  elements.playerAvatarCard.classList.remove("is-empty");
};

const updateFilterInfo = () => {
  const parts = [];
  if (state.playerName) {
    parts.push(`Gracz: ${state.playerName}`);
  }
  if (state.map) parts.push(`Mapa: ${state.map}`);
  if (state.dateFrom) parts.push(`Od: ${state.dateFrom.toLocaleDateString("pl-PL")}`);
  if (state.dateTo) parts.push(`Do: ${state.dateTo.toLocaleDateString("pl-PL")}`);
  elements.filtersInfo.textContent = parts.length ? parts.join(" • ") : "Brak aktywnych filtrów";
};

const applyFilters = () => {
  updatePlayerAvatar();
  if (elements.playerPage) {
    elements.playerPage.classList.toggle("no-player-selected", !state.player);
  }
  if (!state.player) {
    state.filteredData = [];
    updateFilterInfo();
    renderEmptyState();
    return;
  }

  state.filteredData = filterRecords(state.rawData, {
    player: "",
    playerKey: state.player,
    map: state.map,
    dateFrom: state.dateFrom,
    dateTo: state.dateTo,
  });
  updateFilterInfo();
  renderStats();
  renderRecentMatches();
  window.PlayerMaps.renderMaps();
  renderMatches();
  window.PlayerComparison.renderCompare();
  window.PlayerMoments.renderMoments();
  attachMomentLinks();
  renderGraphs();
};

const graphState = {
  charts: {},
};

const resetGraphs = () => {
  Object.values(graphState.charts).forEach((chart) => {
    if (chart) chart.destroy();
  });
  graphState.charts = {};
};

const renderGraphs = () => {
  if (!window.Chart) return;
  resetGraphs();

  if (!state.filteredData.length) {
    return;
  }

  const stats = aggregateStats(state.filteredData);
  const totals = stats.totals;
  const averages = stats.averages;
  const safeDivide = (num, den) => (den ? num / den : 0);
  const monthLabels = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
  const monthlyBuckets = state.filteredData.reduce((acc, record) => {
    const date = record._date ? record._date : new Date(record["Data"]);
    if (!(date instanceof Date) || Number.isNaN(date.valueOf())) return acc;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!acc[key]) {
      acc[key] = { year: date.getFullYear(), month: date.getMonth(), records: [] };
    }
    acc[key].records.push(record);
    return acc;
  }, {});
  const monthlySeries = Object.values(monthlyBuckets)
    .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year))
    .map((bucket) => {
      const label = `${monthLabels[bucket.month]} ${bucket.year}`;
      const matches = bucket.records.length;
      const killsTotal = bucket.records.reduce((sum, record) => sum + (Number(record["Kills"]) || 0), 0);
      const adrTotal = bucket.records.reduce((sum, record) => sum + (Number(record["ADR"]) || 0), 0);
      return {
        label,
        matches,
        avgKills: matches ? killsTotal / matches : 0,
        avgAdr: matches ? adrTotal / matches : 0,
      };
    });

  if (elements.graphKda) {
    graphState.charts.kda = new Chart(elements.graphKda, {
      type: "bar",
      data: {
        labels: ["Zabójstwa", "Zgony", "Asysty"],
        datasets: [
          {
            label: "Średnia na mecz",
            data: [averages["Kills"], averages["Deaths"], averages["Assists"]],
            backgroundColor: ["#ff2a2a", "#ff8a8a", "#c85c5c"],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
      },
    });
  }

  if (elements.graphResults) {
    const baseBars = [
      { label: "Wygrane", count: stats.resultCounts.wins, color: "#2ecc71" },
      { label: "Przegrane", count: stats.resultCounts.losses, color: "#e74c3c" },
      { label: "Remisy", count: stats.resultCounts.draws, color: "#f1c40f" },
    ].sort((a, b) => b.count - a.count);

    const active = baseBars.map(() => true);

    const computePercentages = () => {
      const total = baseBars.reduce((sum, item, index) => sum + (active[index] ? item.count : 0), 0);
      return baseBars.map((item, index) => (active[index] && total ? (item.count / total) * 100 : null));
    };

    const computeMax = (values) => {
      const real = values.filter((v) => Number.isFinite(v));
      if (!real.length) return 100;
      return Math.min(100, Math.max(10, Math.ceil(Math.max(...real) + 5)));
    };

    const syncLegend = () => {
      if (!elements.graphResultsLegend) return;
      elements.graphResultsLegend.querySelectorAll("button").forEach((btn, idx) => {
        btn.classList.toggle("is-inactive", !active[idx]);
      });
    };

    const syncChart = (chart) => {
      const values = computePercentages();
      chart.data.datasets[0].data = values;
      chart.options.scales.y.max = computeMax(values);
      chart.update();
      syncLegend();
    };

    const toggleResult = (idx) => {
      const activeCount = active.filter(Boolean).length;
      if (active[idx] && activeCount === 1) return;
      active[idx] = !active[idx];
      syncChart(graphState.charts.results);
    };

    const initialValues = computePercentages();

    graphState.charts.results = new Chart(elements.graphResults, {
      type: "bar",
      data: {
        labels: baseBars.map((item) => item.label),
        datasets: [
          {
            label: "Udział [%]",
            data: initialValues,
            backgroundColor: baseBars.map((item) => item.color),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const source = baseBars[ctx.dataIndex];
                if (ctx.raw === null || ctx.raw === undefined) {
                  return `${source.label}: ukryte`;
                }
                return `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(1)}% (${source.count})`;
              },
            },
          },
        },
        onClick: (_event, elementsAtEvent) => {
          if (!elementsAtEvent.length) return;
          toggleResult(elementsAtEvent[0].index);
        },
        scales: {
          x: { ticks: { color: CHART_AXIS_TEXT_COLOR } },
          y: {
            beginAtZero: true,
            max: computeMax(initialValues),
            ticks: { callback: (value) => `${value}%`, color: CHART_AXIS_TEXT_COLOR },
          },
        },
      },
    });

    if (elements.graphResultsLegend) {
      elements.graphResultsLegend.innerHTML = baseBars.map((item, idx) => `
        <button type="button" class="results-legend-item" data-idx="${idx}" style="--legend-color:${item.color};">
          <span class="dot"></span><span class="txt">${item.label}</span>
        </button>
      `).join("");
      elements.graphResultsLegend.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => toggleResult(Number(btn.dataset.idx)));
      });
      syncLegend();
    }
  }

  if (elements.graphMatchesMonthly) {
    graphState.charts.matchesMonthly = new Chart(elements.graphMatchesMonthly, {
      type: "bar",
      data: {
        labels: monthlySeries.map((item) => item.label),
        datasets: [
          {
            label: "Mecze",
            data: monthlySeries.map((item) => item.matches),
            backgroundColor: "#ff2a2a",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
      },
    });
  }

  if (elements.graphKillsMonthly) {
    graphState.charts.killsMonthly = new Chart(elements.graphKillsMonthly, {
      type: "line",
      data: {
        labels: monthlySeries.map((item) => item.label),
        datasets: [
          {
            label: "Średnie zabójstwa",
            data: monthlySeries.map((item) => item.avgKills),
            borderColor: "#ff8a8a",
            backgroundColor: "rgba(255, 138, 138, 0.2)",
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
      },
    });
  }

  if (elements.graphAdrMonthly) {
    graphState.charts.adrMonthly = new Chart(elements.graphAdrMonthly, {
      type: "line",
      data: {
        labels: monthlySeries.map((item) => item.label),
        datasets: [
          {
            label: "Średni ADR",
            data: monthlySeries.map((item) => item.avgAdr),
            borderColor: "#f9c74f",
            backgroundColor: "rgba(249, 199, 79, 0.2)",
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
      },
    });
  }

  const yearlySeries = (() => {
    if (!state.player) return [];
    const playerRecords = state.rawData.filter((record) => record._playerKey === state.player);
    const bucket = playerRecords.reduce((acc, record) => {
      const date = record._date ? record._date : new Date(record["Data"]);
      if (!(date instanceof Date) || Number.isNaN(date.valueOf())) return acc;
      const year = date.getFullYear();
      const month = date.getMonth();
      if (!acc[year]) {
        acc[year] = Array.from({ length: 12 }, () => ({ matches: 0, adrTotal: 0 }));
      }
      acc[year][month].matches += 1;
      acc[year][month].adrTotal += Number(record["ADR"]) || 0;
      return acc;
    }, {});

    const currentYear = new Date().getFullYear();
    return Object.entries(bucket)
      .map(([year, months]) => {
        const yearNum = Number(year);
        const lastKnownMonth = months.reduce((idx, item, monthIndex) => (item.matches > 0 ? monthIndex : idx), -1);
        const matches = months.map((item, monthIndex) => {
          if (yearNum === currentYear && monthIndex > lastKnownMonth) return null;
          return item.matches > 0 ? item.matches : null;
        });
        const adr = months.map((item, monthIndex) => {
          if (yearNum === currentYear && monthIndex > lastKnownMonth) return null;
          return item.matches > 0 ? item.adrTotal / item.matches : null;
        });
        return { year, matches, adr };
      })
      .sort((a, b) => Number(a.year) - Number(b.year));
  })();

  const yearlyColorMap = {
    "2023": "#2ecc71",
    "2024": "#3498db",
    "2025": "#f1c40f",
    "2026": "#e74c3c",
    "2027": "#9b59b6",
  };

  const colorForYear = (year, index) => {
    if (yearlyColorMap[year]) return yearlyColorMap[year];
    return ["#2ecc71", "#3498db", "#f1c40f", "#e74c3c", "#9b59b6"][index % 5];
  };

  if (elements.graphMatchesYearly) {
    graphState.charts.matchesYearly = new Chart(elements.graphMatchesYearly, {
      type: "line",
      data: {
        labels: monthLabels,
        datasets: yearlySeries.map((series, index) => ({
          label: series.year,
          data: series.matches,
          backgroundColor: colorForYear(series.year, index),
          borderColor: colorForYear(series.year, index),
          tension: 0.25,
          fill: false,
          spanGaps: false,
        })),
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } },
      },
    });
  }

  if (elements.graphAdrYearly) {
    graphState.charts.adrYearly = new Chart(elements.graphAdrYearly, {
      type: "line",
      data: {
        labels: monthLabels,
        datasets: yearlySeries.map((series, index) => ({
          label: series.year,
          data: series.adr,
          backgroundColor: colorForYear(series.year, index),
          borderColor: colorForYear(series.year, index),
          tension: 0.25,
          fill: false,
          spanGaps: false,
        })),
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } },
      },
    });
  }
};

const renderEmptyState = () => {
  const message = "Wybierz gracza, aby zobaczyć statystyki.";
  elements.statsGrid.innerHTML = `<div class="empty-state">${message}</div>`;
  elements.recentMatches.innerHTML = "";
  elements.mapsGrid.innerHTML = `<div class="empty-state">${message}</div>`;
  elements.matchesTableBody.innerHTML = `<tr><td colspan="14">${message}</td></tr>`;
  elements.compareTableBody.innerHTML = `<tr><td colspan="17">${message}</td></tr>`;
  elements.momentsGrid.innerHTML = `<div class="empty-state">${message}</div>`;
  resetGraphs();
};

const renderStats = () => {
  elements.statsGrid.innerHTML = "";

  if (!state.filteredData.length) {
    elements.statsGrid.innerHTML = '<div class="empty-state">Brak danych do wyświetlenia.</div>';
    return;
  }

  const stats = aggregateStats(state.filteredData);
  const totals = stats.totals;
  const averages = stats.averages;
  const safeDivide = (num, den) => (den ? num / den : 0);
  const summary = [
    { label: "Mecze", value: stats.matches, kind: "matches" },
    {
      label: "Wygrane",
      value: stats.resultCounts.wins,
      percent: safeDivide(stats.resultCounts.wins, stats.resultCounts.wins + stats.resultCounts.losses),
      kind: "win",
    },
    {
      label: "Przegrane",
      value: stats.resultCounts.losses,
      percent: safeDivide(stats.resultCounts.losses, stats.resultCounts.wins + stats.resultCounts.losses),
      kind: "loss",
    },
    {
      label: "Remisy",
      value: stats.resultCounts.draws,
      kind: "draw",
    },
  ];

  const headerGrid = document.createElement("div");
  headerGrid.className = "stats-header-grid";

  summary.forEach((item) => {
    const card = document.createElement("div");
    card.className = `stat-card highlight ${item.kind ? `summary-${item.kind}` : ""}`;
    const percent = item.percent !== undefined ? `<em>${formatPercentage(item.percent * 100)}</em>` : "";
    card.innerHTML = `<span>${item.label}</span><strong>${formatNumber(item.value, 0)}</strong>${percent}`;
    headerGrid.appendChild(card);
  });

  const section = (title) => {
    const wrapper = document.createElement("div");
    wrapper.className = "stats-section";
    wrapper.innerHTML = `<h3>${title}</h3>`;
    return wrapper;
  };

  const addAverageCards = (wrapper, items) => {
    const grid = document.createElement("div");
    grid.className = "stats-cards";
    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "stat-card";
      card.innerHTML = `
        <span>${item.label}</span>
        <strong>${item.value}</strong>
        ${item.note ? `<em>${item.note}</em>` : ""}
      `;
      grid.appendChild(card);
    });
    wrapper.appendChild(grid);
  };

  const generalSection = section("OGÓLNE STATYSTYKI");
  addAverageCards(generalSection, [
    { label: "Zabójstwa", value: formatNumber(averages["Kills"]), note: "średnio" },
    { label: "Zabójstwa", value: formatNumber(totals["Kills"], 0), note: "suma" },
    { label: "Zgony", value: formatNumber(averages["Deaths"]), note: "średnio" },
    { label: "Asysty", value: formatNumber(averages["Assists"]), note: "średnio" },
    { label: "Asysty", value: formatNumber(totals["Assists"], 0), note: "suma" },
    { label: "Obrażenia", value: formatNumber(averages["ADR"]), note: "średnio" },
    { label: "HS%", value: formatPercentage(averages["HS%"]), note: "średnio" },
    {
      label: "KD",
      value: formatNumber(safeDivide(totals["Kills"], totals["Deaths"])),
      note: "średnio",
    },
    { label: "Rating", value: formatNumber(averages["Rating"]), note: "średnio" },
  ]);

  const clutchSection = section("Clutche i MultiKille");
  addAverageCards(clutchSection, [
    { label: "1v1", value: formatNumber(totals["1v1"], 0), note: "suma" },
    { label: "1v2", value: formatNumber(totals["1v2"], 0), note: "suma" },
    { label: "1v3", value: formatNumber(totals["1v3"], 0), note: "suma" },
    { label: "1v4", value: formatNumber(totals["1v4"], 0), note: "suma" },
    { label: "1v5", value: formatNumber(totals["1v5"], 0), note: "suma" },
    { label: "3K", value: formatNumber(totals["3K"], 0), note: "suma" },
    { label: "4K", value: formatNumber(totals["4K"], 0), note: "suma" },
    { label: "5K", value: formatNumber(totals["5K"], 0), note: "suma" },
  ]);

  const utilitySection = section("Użyteczność");
  const firstKD = safeDivide(totals["FK"], totals["FD"]);
  const tradeKD = safeDivide(totals["Trade Kills"], totals["Trade Deaths"]);
  addAverageCards(utilitySection, [
    { label: "KAST", value: formatPercentage(averages["KAST"]), note: "średnio" },
    { label: "Oślepieni", value: formatNumber(totals["EF"], 0), note: "suma" },
    { label: "Asysty Flash", value: formatNumber(totals["FA"], 0), note: "suma" },
    { label: "Czas Flesha", value: formatNumber(totals["EBT"]), note: "suma" },
    { label: "Nade+Mol DMG", value: formatNumber(totals["UD"]), note: "suma" },
    { label: "First Kill", value: formatNumber(totals["FK"], 0), note: "suma" },
    { label: "First Dead", value: formatNumber(totals["FD"], 0), note: "suma" },
    { label: "First K/D", value: formatNumber(firstKD), note: "średnio" },
    { label: "Trade Kill", value: formatNumber(totals["Trade Kills"], 0), note: "suma" },
    { label: "Trade Dead", value: formatNumber(totals["Trade Deaths"], 0), note: "suma" },
    { label: "Trade K/D", value: formatNumber(tradeKD), note: "średnio" },
  ]);

  elements.statsGrid.appendChild(headerGrid);
  elements.statsGrid.appendChild(generalSection);
  elements.statsGrid.appendChild(clutchSection);
  elements.statsGrid.appendChild(utilitySection);
};

const renderRecentMatches = () => {
  elements.recentMatches.innerHTML = "";
  if (!state.filteredData.length) return;

  const sorted = [...state.filteredData].sort((a, b) => {
    const dateA = a._date ? a._date.valueOf() : 0;
    const dateB = b._date ? b._date.valueOf() : 0;
    return dateB - dateA;
  });

  sorted.slice(0, 10).forEach((record) => {
    const card = document.createElement("article");
    card.className = "match-card";
    const image = mapImageFor(record["Mapa"]);
    const resultRaw = (record["Result"] || "").toUpperCase();
    const resultKey = resultRaw.includes("WIN")
      ? "win"
      : resultRaw.includes("LOSE")
        ? "loss"
        : resultRaw.includes("TIE") || resultRaw.includes("DRAW") || resultRaw.includes("REMIS")
          ? "draw"
          : "draw";
    const resultLabel = resultKey === "win" ? "Wygrana" : resultKey === "loss" ? "Przegrana" : "Remis";
    const side = (record["Drużyna"] || record["Dru yna"] || "").toString().toUpperCase();
    card.innerHTML = `
      <div class="match-map" style="background-image:url('${image}')"></div>
      <div class="match-info">
        <div class="chips-row"><span class="match-result-chip ${resultKey}">${resultLabel}</span><span class="side-chip">${side || "-"}</span></div>
        <h4>${record["Mapa"] || "Mapa"}</h4>
        <p class="match-result"><span>${record["Wynik"] || ""}</span></p>
        <span>${formatDatePL(record._date || record["Data"])}</span>
      </div>
    `;
    const matchId = String(record["ID meczu"] || "").trim();
    if (matchId) {
      card.classList.add("clickable");
      card.title = "Zobacz mecz";
      card.addEventListener("click", () => { window.location.href = `mecz.html?id=${encodeURIComponent(matchId)}`; });
    }
    elements.recentMatches.appendChild(card);
  });
};


const attachMomentLinks = () => {
  if (!elements.momentsGrid) return;
  elements.momentsGrid.querySelectorAll('.open-match-btn[data-match-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.matchId;
      if (id) window.location.href = `mecz.html?id=${encodeURIComponent(id)}`;
    });
  });
};

const renderMatches = () => {
  elements.matchesTableBody.innerHTML = "";
  if (!state.filteredData.length) {
    elements.matchesTableBody.innerHTML = '<tr><td colspan="14">Brak danych do wyświetlenia.</td></tr>';
    return;
  }

  const sorted = [...state.filteredData].sort((a, b) => {
    const dateA = a._date ? a._date.valueOf() : 0;
    const dateB = b._date ? b._date.valueOf() : 0;
    return dateB - dateA;
  });

  sorted.forEach((record) => {
    const row = document.createElement("tr");
    const kills = formatNumber(record["Kills"], 0);
    const deaths = formatNumber(record["Deaths"], 0);
    const assists = formatNumber(record["Assists"], 0);
    const result = (record["Result"] || "").toUpperCase();
    const ratingRaw = record["Rating"];
    const rating =
      typeof ratingRaw === "number"
        ? ratingRaw
        : Number.parseFloat(String(ratingRaw ?? "").replace(/,/g, ".").replace(/[^0-9.-]/g, ""));
    const resultClass = result.includes("WIN")
      ? "result-win"
      : result.includes("LOSE")
        ? "result-lose"
        : result.includes("TIE") || result.includes("DRAW") || result.includes("REMIS")
          ? "result-tie"
          : "";
    const mapImage = mapImageFor(record["Mapa"]);
    row.innerHTML = `
      <td class="date-cell">${formatDatePL(record._date || record["Data"])}</td>
      <td class="map-cell" style="--map-image:url('${mapImage}')">${record["Mapa"] || "-"}</td>
      <td class="score-cell ${resultClass}">${record["Wynik"] || "-"}</td>
      <td>${kills}/${deaths}/${assists}</td>
      <td>${formatNumber(record["ADR"])}</td>
      <td>${formatPercentage(record["HS%"])}</td>
      <td>${formatNumber(Number.isFinite(rating) ? rating : null)}</td>
      <td>${formatNumber(record["3K"], 0)}</td>
      <td>${formatNumber(record["4K"], 0)}</td>
      <td>${formatNumber(record["5K"], 0)}</td>
      <td>${formatNumber(record["1v3"], 0)}</td>
      <td>${formatNumber(record["1v4"], 0)}</td>
      <td>${formatNumber(record["1v5"], 0)}</td>
      <td><button class="open-match-btn" data-match-id="${String(record["ID meczu"] || "").trim()}">Zobacz mecz</button></td>
    `;
    const btn = row.querySelector(".open-match-btn");
    if (btn && btn.dataset.matchId) {
      btn.addEventListener("click", () => { window.location.href = `mecz.html?id=${encodeURIComponent(btn.dataset.matchId)}`; });
    }
    elements.matchesTableBody.appendChild(row);
  });
};

const activateTab = (target) => {
  elements.tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === target);
  });
  elements.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === target);
  });
};

const setQuickRange = (range) => {
  const now = new Date();
  let start = null;

  if (range === "30") {
    start = new Date();
    start.setDate(now.getDate() - 30);
  } else if (range === "prev-month") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    state.dateFrom = start;
    state.dateTo = end;
  } else if (range === "prev-year") {
    start = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear() - 1, 11, 31);
    state.dateFrom = start;
    state.dateTo = end;
  } else if (range === "current-year") {
    start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    state.dateFrom = start;
    state.dateTo = end;
  } else if (range === "all") {
    state.dateFrom = null;
    state.dateTo = null;
  }

  if (range === "30") {
    state.dateFrom = start;
    state.dateTo = now;
  }

  elements.dateFrom.value = state.dateFrom ? state.dateFrom.toISOString().slice(0, 10) : "";
  elements.dateTo.value = state.dateTo ? state.dateTo.toISOString().slice(0, 10) : "";
  applyFilters();
};

const initFilters = () => {
  elements.playerSelect.addEventListener("change", (event) => {
    const selectedOption = event.target.selectedOptions?.[0] || null;
    state.player = event.target.value;
    state.playerName = selectedOption?.dataset.playerName || "";
    applyFilters();
  });

  elements.mapSelect.addEventListener("change", (event) => {
    state.map = event.target.value;
    applyFilters();
  });

  elements.dateFrom.addEventListener("change", (event) => {
    state.dateFrom = event.target.value ? new Date(event.target.value) : null;
    applyFilters();
  });

  elements.dateTo.addEventListener("change", (event) => {
    state.dateTo = event.target.value ? new Date(event.target.value) : null;
    if (state.dateTo) {
      state.dateTo.setHours(23, 59, 59, 999);
    }
    applyFilters();
  });

  document.querySelectorAll(".quick-range").forEach((btn) => {
    btn.addEventListener("click", () => setQuickRange(btn.dataset.range));
  });

  elements.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });
};

const initMoments = () => {
  window.PlayerMoments.initMoments();
};


const buildPlayerProfiles = (records) => {
  const profiles = new Map();

  records.forEach((record) => {
    const rawName = (record["Gracz"] || "Nieznany").trim() || "Nieznany";
    const key = `name:${rawName.toLowerCase()}`;
    const timestamp = record._date instanceof Date && !Number.isNaN(record._date.valueOf()) ? record._date.valueOf() : 0;

    record._playerKey = key;
    record._playerName = rawName;

    const current = profiles.get(key);
    if (!current || timestamp >= current.lastDate) {
      profiles.set(key, { key, name: rawName, lastDate: timestamp });
    }
  });

  return profiles;
};

const populatePlayerSelect = (profiles) => {
  const sortedProfiles = Array.from(profiles.values()).sort((a, b) => a.name.localeCompare(b.name, "pl"));
  elements.playerSelect.innerHTML = '<option value="">Wybierz gracza</option>';
  sortedProfiles.forEach((profile) => {
    const option = document.createElement("option");
    option.value = profile.key;
    option.dataset.playerName = profile.name;
    option.textContent = profile.name;
    elements.playerSelect.appendChild(option);
  });
};


const fetchExcludedMatchIds = async () => {
  try {
    const response = await fetch("data/excluded-matches.json", { cache: "no-store" });
    if (!response.ok) return new Set();
    const data = await response.json();
    if (!Array.isArray(data)) return new Set();
    return new Set(data.map((id) => String(id).trim()).filter(Boolean));
  } catch {
    return new Set();
  }
};

const initData = async () => {
  try {
    const response = await fetch("data/gracze.json", { cache: "no-store" });
    const data = await response.json();
    state.rawData = data.map(normalizeRecord);
    state.excludedMatchIds = await fetchExcludedMatchIds();
    state.playerProfiles = buildPlayerProfiles(state.rawData);

    const maps = uniqueValues(state.rawData, "Mapa");

    populatePlayerSelect(state.playerProfiles);

    elements.mapSelect.innerHTML = '<option value="">Wszystkie mapy</option>';
    maps.forEach((map) => {
      const option = document.createElement("option");
      option.value = map;
      option.textContent = map;
      elements.mapSelect.appendChild(option);
    });

    applyFilters();
  } catch (error) {
    elements.statsGrid.innerHTML = '<div class="empty-state">Nie udało się wczytać danych.</div>';
  }
};

initFilters();
initMoments();
activateTab("tab-stats");
initData();
