(() => {
  const TEAM_ORDER = ["Dziadek", "Wujek", "Ojciec", "Matka", "Synek", "Gruby", "Kowal", "Telemans"];
  const PLAYER_BY_STEAM = {
    "76561198009437428": "Dziadek", "76561198021612193": "Wujek", "76561198863079353": "Ojciec", "76561198019301588": "Synek",
    "76561198043824587": "Matka", "76561198080571359": "Kowal", "76561199075504972": "Gruby", "76561198035378205": "Telemans",
  };
  const AVATAR = { Dziadek: "dziadek.png", Wujek: "wujek.png", Ojciec: "ojciec.png", Matka: "matka.png", Synek: "synek.png", Gruby: "Gruby.png", Kowal: "kowal.png", Telemans: "telemans.png" };
  const YEAR_COLORS = { 2023: "#3fb950", 2024: "#4da3ff", 2025: "#f2cc60", 2026: "#ff5f5f" };
  const TEAM_NAME_COLORS = { Dziadek: "#ff9f40", Wujek: "#ffd93d", Ojciec: "#1f4fbf", Matka: "#32c267", Synek: "#b27dff", Gruby: "#ff4757", Kowal: "#6ee7ff", Telemans: "#000000" };
  const PLAYER_COLORS = {
    Dziadek: "#ff9f40",
    Wujek: "#ffd93d",
    Ojciec: "#4da3ff",
    Matka: "#32c267",
    Synek: "#b27dff",
    Gruby: "#ff5f5f",
    Kowal: "#6ee7ff",
    Telemans: "#d8dde8",
  };
  const MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
  const MANUAL_MATCHES = [
    { map: "office", score: "10:13", result: "LOSE", side: "T" }, { map: "office", score: "13:8", result: "WIN", side: "CT" },
    { map: "office", score: "13:2", result: "WIN", side: "T" }, { map: "vertigo", score: "2:13", result: "LOSE", side: "CT" },
    { map: "office", score: "12:12", result: "TIE", side: "T" }, { map: "office", score: "13:2", result: "WIN", side: "CT" },
    { map: "office", score: "13:8", result: "WIN", side: "T" }, { map: "office", score: "13:8", result: "WIN", side: "CT" },
    { map: "office", score: "7:13", result: "LOSE", side: "T" }, { map: "office", score: "12:12", result: "TIE", side: "CT" },
    { map: "office", score: "10:13", result: "LOSE", side: "T" }, { map: "office", score: "13:6", result: "WIN", side: "T" },
    { map: "office", score: "13:5", result: "WIN", side: "CT" }, { map: "office", score: "3:13", result: "LOSE", side: "T" },
    { map: "office", score: "5:13", result: "LOSE", side: "CT" }, { map: "office", score: "13:5", result: "WIN", side: "T" },
    { map: "office", score: "10:13", result: "LOSE", side: "CT" },
  ];
  const CSGO_2023_CUMULATIVE = {
    games: [21, 25, 44, 46, 61, 70, 79, 79, 89, 105, 114, 117],
    winrate: [52.6, 54.5, 50.0, 52.5, 48.1, 50.8, 49.3, 49.3, 50.0, 51.1, 52.0, 52.5],
  };
  const TABLE_2023_OVERRIDES = { 9: { games: 16, winrate: 57 }, 10: { games: 9, winrate: 62 } };
  const TABLE_2023_FINAL_WINRATE = 60;
  const charts = [];

  const LINE_CHART_BASE_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "nearest", axis: "xy", intersect: false },
    plugins: {
      legend: { position: "bottom" },
      tooltip: { enabled: true },
    },
    elements: {
      point: { radius: 4, hoverRadius: 7, hitRadius: 18 },
      line: { borderWidth: 3 },
    },
    spanGaps: false,
  };

  const BAR_CHART_BASE_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  const byId = (id) => document.getElementById(id);
  const fmt = (n, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "-");
  const yearColor = (y) => YEAR_COLORS[y] || "#c4cad8";
  const MAP_IMAGE_BY_KEY = {
    overpass: "de_overpass.jpg",
    train: "de_train.jpg",
    vertigo: "de_vertigo.jpg",
    ancient: "de_ancient.jpg",
    dust2: "de_dust2.jpg",
    mirage: "de_mirage.jpg",
    nuke: "de_nuke.jpg",
    agency: "cs_agency.jpg",
    italy: "cs_italy.jpg",
    office: "cs_office.jpg",
  };
  const mapImg = (m) => {
    const key = normMap(m);
    const file = MAP_IMAGE_BY_KEY[key];
    return file ? `url('gracze/zdjecia/${file}')` : "url('gracze/zdjecia/placeholder.svg')";
  };
  const avatar = (p) => AVATAR[p] || "gracze/zdjecia/placeholder.svg";
  const toNum = (v) => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const x = Number.parseFloat(v.toString().replace(/%/g, "").replace(/s$/i, "").replace(/\s/g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, ""));
    return Number.isNaN(x) ? null : x;
  };

  const parseDate = (raw) => {
    const d = new Date(raw);
    if (!Number.isNaN(d.valueOf())) return d;
    const m = (raw || "").toString().match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})\s+(\d{2}:\d{2}:\d{2})/);
    if (!m) return null;
    const mm = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    return new Date(`${m[3]}-${String(mm[m[2].slice(0, 3).toLowerCase()] || 1).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}T${m[4]}`);
  };

  const normPlayer = (name, steam) => PLAYER_BY_STEAM[steam] || ({ wuja: "Wujek", tele: "Telemans", "dz!adek": "Dziadek" }[(name || "").toString().trim().toLowerCase()] || (name || "").toString().trim());
  const normResult = (r) => (r.includes("WIN") ? "win" : r.includes("LOSE") ? "loss" : (r.includes("DRAW") || r.includes("TIE") || r.includes("REMIS") ? "draw" : "draw"));
  const normMap = (m) => {
    const raw = (m || "Nieznana").toString().trim().toLowerCase();
    if (!raw) return "nieznana";
    const base = raw
      .replace(/^de[_\s-]/, "")
      .replace(/^cs[_\s-]/, "")
      .replace(/^workshop[/:_-]*/, "")
      .replace(/\s*\(.*?\)\s*/g, " ")
      .replace(/[^a-z0-9\s_-]/g, " ")
      .replace(/[_\s-]+/g, " ")
      .trim();
    const aliases = {
      "office": "office",
      "vertigo": "vertigo",
      "mirage": "mirage",
      "inferno": "inferno",
      "anubis": "anubis",
      "ancient": "ancient",
      "dust2": "dust2",
      "dust 2": "dust2",
      "nuke": "nuke",
      "train": "train",
      "cache": "cache",
      "overpass": "overpass",
    };
    return aliases[base] || base.replace(/\s+/g, "-") || "nieznana";
  };

  const normalizeRows = (raw) => (Array.isArray(raw) ? raw : []).map((r) => {
    const steamId = (r["Steam ID"] || "").toString().trim();
    return {
      ...r,
      steamId,
      player: normPlayer(r["Gracz"], steamId),
      id: (r["ID meczu"] || "").toString().trim(),
      map: normMap(r["Mapa"]),
      score: (r["Wynik"] || "-").toString().trim(),
      side: (r["Drużyna"] || r["Dru yna"] || "").toString().trim().toUpperCase(),
      resultRaw: (r.Result || "").toString().trim().toUpperCase(),
      date: parseDate(r.Data),
    };
  });

  const manualRows = () => MANUAL_MATCHES.map((m, i) => ({
    id: `manual_${i + 1}`,
    map: m.map,
    score: m.score,
    side: m.side,
    resultRaw: m.result,
    date: null,
    records: [],
    manual: true,
  }));

  const dedupeMatches = (rows) => {
    const grouped = new Map();
    rows.forEach((r) => {
      const key = r.id || `${r.date?.toISOString() || ""}_${r.map}_${r.score}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(r);
    });
    const matches = Array.from(grouped.entries()).map(([key, rec]) => {
      const s = rec[0] || {};
      const counts = { win: 0, loss: 0, draw: 0 };
      const sides = { CT: 0, T: 0 };
      rec.forEach((r) => { counts[normResult(r.resultRaw)] += 1; if (r.side === "CT" || r.side === "T") sides[r.side] += 1; });
      return { key, map: normMap(s.map), score: s.score || "-", date: s.date || null, result: Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "draw", startingSide: sides.CT >= sides.T ? "CT" : "T", records: rec, manual: false };
    });
    const mm = manualRows().map((m) => ({ ...m, map: normMap(m.map), result: normResult(m.resultRaw), startingSide: m.side }));
    return [...matches, ...mm].sort((a, b) => (b.date?.valueOf() || 0) - (a.date?.valueOf() || 0));
  };

  const getYearCells = (stats, y) => stats[y].map((x, idx) => (y === 2023 && TABLE_2023_OVERRIDES[idx] ? { ...x, ...TABLE_2023_OVERRIDES[idx] } : x));

  const buildStats = (matches) => {
    const y0 = 2023; const y1 = new Date().getFullYear();
    const stats = {};
    for (let y = y0; y <= y1; y += 1) stats[y] = Array.from({ length: 12 }, () => ({ games: 0, wins: 0, losses: 0, winrate: null }));
    matches.forEach((m) => {
      if (!m.date) return;
      const y = m.date.getFullYear(); if (!stats[y]) return;
      const cell = stats[y][m.date.getMonth()];
      cell.games += 1;
      if (m.result === "win") cell.wins += 1;
      if (m.result === "loss") cell.losses += 1;
    });
    Object.values(stats).forEach((row) => row.forEach((c) => { const b = c.wins + c.losses; c.winrate = b ? (c.wins / b) * 100 : null; }));
    return stats;
  };

  const renderYearTable = (stats) => {
    const years = Object.keys(stats).map(Number);
    const thead = `<thead><tr><th rowspan="2">Miesiąc</th>${years.map((y) => `<th colspan="2" class="year-head year-${y}" style="color:${yearColor(y)}">${y}</th>`).join("")}</tr><tr>${years.map((y) => `<th class="year-sub year-${y}">Ilość gier</th><th class="year-sub year-${y}">Winrate</th>`).join("")}</tr></thead>`;
    const yearPeaks = Object.fromEntries(years.map((y) => {
      const cells = getYearCells(stats, y);
      return [y, {
        maxGames: Math.max(...cells.map((x) => x.games)),
        bestWr: Math.max(...cells.map((x) => (x.winrate ?? -1))),
      }];
    }));

    const body = MONTHS.map((m, mi) => {
      const row = years.map((y) => {
        const cells = getYearCells(stats, y);
        const c = { ...cells[mi] };
        const peaks = yearPeaks[y];
        const isPeakGames = c.games > 0 && c.games === peaks.maxGames;
        const isHotGames = (y === 2023 && mi === 9) || (y !== 2023 && c.games > 15);
        const isPeakWinrate = c.winrate !== null && c.winrate === peaks.bestWr;
        const cg = [isPeakGames ? "peak-games" : "", isHotGames ? "hot-games" : ""].join(" ").trim();
        const cw = isPeakWinrate ? "peak-winrate" : "";
        return `<td class="year-col year-${y} ${cg}">${c.games}</td><td class="year-col year-${y} ${cw}">${c.winrate === null ? "-" : `${fmt(c.winrate, 0)}%`}</td>`;
      }).join("");
      return `<tr><th>${m.toUpperCase()}</th>${row}</tr>`;
    }).join("");

    const foot = years.map((y) => {
      const vals = getYearCells(stats, y);
      const games = vals.reduce((s, c) => s + c.games, 0);
      const wins = vals.reduce((s, c) => s + c.wins, 0);
      const losses = vals.reduce((s, c) => s + c.losses, 0);
      let wr = wins + losses ? (wins / (wins + losses)) * 100 : null;
      if (y === 2023) wr = TABLE_2023_FINAL_WINRATE;
      return `<td class="summary-cell year-col year-${y}">${games}</td><td class="summary-cell year-col year-${y}">${wr === null ? "-" : `${fmt(wr, 1)}%`}</td>`;
    }).join("");

    byId("yearBreakdownTable").innerHTML = `${thead}<tbody>${body}</tbody><tfoot><tr><th>SUMA</th>${foot}</tr></tfoot>`;
  };

  const renderCharts = (stats) => {
    const years = Object.keys(stats).map(Number);
    const dsGames = [];
    const dsWr = [];

    years.forEach((y) => {
      if (y === 2023) {
        dsGames.push({ label: "2023 (CS:GO)", data: CSGO_2023_CUMULATIVE.games, borderColor: yearColor(y), tension: 0.25, fill: false, spanGaps: false });
        dsWr.push({ label: "2023 (CS:GO)", data: CSGO_2023_CUMULATIVE.winrate, borderColor: yearColor(y), tension: 0.25, fill: false, spanGaps: false });
        return;
      }

      const lastMonth = (() => {
        let idx = -1;
        stats[y].forEach((c, i) => {
          if (c.games > 0 || c.wins > 0 || c.losses > 0) idx = i;
        });
        return idx;
      })();
      if (lastMonth < 0) return;

      let runningGames = 0;
      let w = 0;
      let l = 0;
      const gameData = stats[y].map((c, i) => {
        if (i > lastMonth) return null;
        runningGames += c.games;
        return runningGames;
      });
      const wrData = stats[y].map((c, i) => {
        if (i > lastMonth) return null;
        w += c.wins;
        l += c.losses;
        return w + l ? (w / (w + l)) * 100 : null;
      });

      dsGames.push({ label: `${y}`, data: gameData, borderColor: yearColor(y), tension: 0.25, fill: false, spanGaps: false });
      dsWr.push({ label: `${y}`, data: wrData, borderColor: yearColor(y), tension: 0.25, fill: false, spanGaps: false });
    });

    if (dsGames.length) {
      charts.push(new Chart(byId("monthlyMatchesByYearChart"), {
        type: "line",
        data: { labels: MONTHS, datasets: dsGames.map((d) => ({ ...d, pointRadius: 4, pointHoverRadius: 7, pointHitRadius: 18 })) },
        options: { ...LINE_CHART_BASE_OPTIONS, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
      }));
    }

    if (dsWr.length) {
      const wrValues = dsWr.flatMap((d) => d.data).filter((v) => Number.isFinite(v));
      const minWr = wrValues.length ? Math.max(0, Math.floor(Math.min(...wrValues) - 2)) : 0;
      const maxWr = wrValues.length ? Math.min(100, Math.ceil(Math.max(...wrValues) + 2)) : 100;
      charts.push(new Chart(byId("monthlyWinrateByYearChart"), {
        type: "line",
        data: { labels: MONTHS, datasets: dsWr.map((d) => ({ ...d, pointRadius: 4, pointHoverRadius: 7, pointHitRadius: 18 })) },
        options: { ...LINE_CHART_BASE_OPTIONS, scales: { y: { min: minWr, max: maxWr } } },
      }));
    }
  };

  const streaks = (matches) => {
    const ordered = [...matches].sort((a, b) => (a.date?.valueOf() || 0) - (b.date?.valueOf() || 0));
    let cw = 0, cl = 0, cnp = 0, mw = 0, ml = 0, mnp = 0;
    ordered.forEach((m) => {
      if (m.result === "win") { cw += 1; cl = 0; cnp += 1; }
      else if (m.result === "loss") { cl += 1; cw = 0; cnp = 0; }
      else { cw = 0; cl = 0; cnp += 1; }
      mw = Math.max(mw, cw); ml = Math.max(ml, cl); mnp = Math.max(mnp, cnp);
    });
    return { mw, ml, mnp };
  };


  const renderPlayersMonthlyMatchesChart = (rows) => {
    const dated = rows.filter((r) => r.date instanceof Date && !Number.isNaN(r.date.valueOf()) && TEAM_ORDER.includes(r.player));
    if (!dated.length) return;

    const monthKeys = Array.from(new Set(dated.map((r) => `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, "0")}`))).sort();
    const monthLabels = monthKeys.map((k) => {
      const [y, m] = k.split("-").map(Number);
      return `${MONTHS[m - 1].toUpperCase()} ${y}`;
    });

    const monthIndex = new Map(monthKeys.map((k, i) => [k, i]));
    const playerMonthly = new Map(TEAM_ORDER.map((p) => [p, Array(monthKeys.length).fill(0)]));

    dated.forEach((r) => {
      const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, "0")}`;
      const idx = monthIndex.get(key);
      if (idx === undefined) return;
      playerMonthly.get(r.player)[idx] += 1;
    });

    const datasets = TEAM_ORDER.map((player) => {
      const monthly = playerMonthly.get(player);
      let running = 0;
      const cumulative = monthly.map((v) => {
        running += v;
        return running;
      });
      const color = PLAYER_COLORS[player] || "#c4cad8";
      return {
        label: player,
        data: cumulative,
        borderColor: color,
        backgroundColor: color,
        tension: 0.25,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointHitRadius: 16,
      };
    });

    charts.push(new Chart(byId("playersMonthlyMatchesChart"), {
      type: "line",
      data: { labels: monthLabels, datasets },
      options: {
        ...LINE_CHART_BASE_OPTIONS,
        interaction: { mode: "index", intersect: false },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { ticks: { maxRotation: 45, minRotation: 45 } },
        },
      },
    }));
  };

  const renderResults = (matches) => {
    const wins = matches.filter((m) => m.result === "win").length;
    const losses = matches.filter((m) => m.result === "loss").length;
    const draws = matches.filter((m) => m.result === "draw").length;
    const noDraw = wins + losses;
    charts.push(new Chart(byId("resultsChart"), {
      type: "doughnut",
      data: { labels: ["Wygrane", "Porażki", "Remisy"], datasets: [{ data: [wins, losses, draws], backgroundColor: ["#32c267", "#ff6868", "#ffd266"] }] },
      options: { plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 10, color: "#dce3f5", font: { size: 12, weight: "700" } } } } },
    }));
    byId("resultsSummary").innerHTML = `
      <div class="result-pill win"><span class="label">Wygrane</span><span class="value">${wins}</span><span class="pct">${noDraw ? fmt((wins / noDraw) * 100, 1) : "0.0"}%</span></div>
      <div class="result-pill loss"><span class="label">Porażki</span><span class="value">${losses}</span><span class="pct">${noDraw ? fmt((losses / noDraw) * 100, 1) : "0.0"}%</span></div>
      <div class="result-pill draw"><span class="label">Remisy</span><span class="value">${draws}</span><span class="pct">niewliczane do %</span></div>`;

    const st = streaks(matches);
    const cs2 = matches.length;
    byId("resultsExtra").innerHTML = `
      <div class="extra-pill cs2"><span>Mecze CS2</span><strong>${cs2}</strong></div>
      <div class="extra-pill win-streak"><span>Seria zwycięstw</span><strong>${st.mw}</strong></div>
      <div class="extra-pill unbeaten"><span>Seria bez porażki</span><strong>${st.mnp}</strong></div>
      <div class="extra-pill lose-streak"><span>Seria przegranych</span><strong>${st.ml}</strong></div>
      <div class="extra-pill all-matches"><span>Mecze CSGO + CS2</span><strong>${cs2 + 477}</strong></div>`;
  };

  const renderRecent = (matches) => {
    byId("recentMatches").innerHTML = matches.slice(0, 10).map((m) => `
      <article class="match-tile ${m.result}" data-match-id="${m.id || m.key || ""}" title="Zobacz mecz">
        <div class="match-map" style="background-image:${mapImg(m.map)}"></div>
        <div class="match-content">
          <div class="chips-row"><span class="match-result-chip ${m.result}">${m.result === "win" ? "Wygrana" : (m.result === "loss" ? "Przegrana" : "Remis")}</span><span class="side-chip">${m.startingSide || "-"}</span></div>
          <strong>${m.map.toUpperCase()}</strong><span>${m.score}</span><span>${m.date ? m.date.toLocaleDateString("pl-PL") : "-"}</span>
        </div>
      </article>`).join("");
  };

  const renderRanking = (rows) => {
    const grouped = new Map(TEAM_ORDER.map((p) => [p, []]));
    rows.forEach((r) => { const p = PLAYER_BY_STEAM[r.steamId] || r.player; if (grouped.has(p)) grouped.get(p).push(r); });
    const rank = TEAM_ORDER.map((p) => {
      const rec = grouped.get(p) || [];
      const max = (k) => rec.reduce((m, x) => Math.max(m, toNum(x[k]) ?? -Infinity), -Infinity);
      const min = (k) => rec.reduce((m, x) => Math.min(m, toNum(x[k]) ?? Infinity), Infinity);
      return { p, k: max("Kills"), a: max("Assists"), d: min("Deaths"), adr: max("ADR") };
    });
    const bk = Math.max(...rank.map((x) => (Number.isFinite(x.k) ? x.k : -Infinity)));
    const ba = Math.max(...rank.map((x) => (Number.isFinite(x.a) ? x.a : -Infinity)));
    const bd = Math.min(...rank.map((x) => (Number.isFinite(x.d) ? x.d : Infinity)));
    const br = Math.max(...rank.map((x) => (Number.isFinite(x.adr) ? x.adr : -Infinity)));
    const cell = (v, w, d = 0) => `<td class="${w ? "winner" : ""}">${Number.isFinite(v) ? fmt(v, d) : "-"}</td>`;
    byId("topRankingTable").querySelector("tbody").innerHTML = rank.map((r) => `<tr><td><div class="player-cell"><img src="${avatar(r.p)}" alt="${r.p}"><span style="color:${(TEAM_NAME_COLORS[r.p] || "#ffffff") === "#000000" ? "#f5f7ff" : (TEAM_NAME_COLORS[r.p] || "#ffffff")}">${r.p}</span></div></td>${cell(r.k, r.k === bk)}${cell(r.a, r.a === ba)}${cell(r.d, r.d === bd)}${cell(r.adr, r.adr === br, 1)}</tr>`).join("");
  };

  const aggregateMaps = (matches) => {
    const grouped = new Map();
    matches.forEach((m) => { if (!grouped.has(m.map)) grouped.set(m.map, []); grouped.get(m.map).push(m); });
    const avgKeys = ["Kills", "Deaths", "Assists", "K/D", "Plus/Minus", "HS%", "ADR", "EF", "Rating", "FK", "FD", "Trade Kills", "Trade Deaths"];
    const sumKeys = ["1v5", "1v4", "1v3", "1v2", "1v1", "5K", "4K", "3K", "EF", "EBT", "FA", "UD"];
    return Array.from(grouped.entries()).map(([map, list]) => {
      const wins = list.filter((x) => x.result === "win").length, losses = list.filter((x) => x.result === "loss").length, draws = list.filter((x) => x.result === "draw").length;
      const base = wins + losses;
      const rows = list.flatMap((m) => m.records || []);
      const bySide = { CT: { games: 0, wins: 0 }, T: { games: 0, wins: 0 } };
      list.forEach((m) => { if (m.startingSide === "CT" || m.startingSide === "T") { bySide[m.startingSide].games += 1; if (m.result === "win") bySide[m.startingSide].wins += 1; } });
      const avg = {}; avgKeys.forEach((k) => { let s = 0, c = 0; rows.forEach((r) => { const v = toNum(r[k]); if (v !== null) { s += v; c += 1; } }); avg[k] = c ? s / c : null; });
      avg["+/-"] = avg["Plus/Minus"]; avg["Użyteczność"] = avg.EF; avg["First K/D"] = avg.FD ? avg.FK / avg.FD : null; avg["Trade K/D"] = avg["Trade Deaths"] ? avg["Trade Kills"] / avg["Trade Deaths"] : null;
      const sums = {}; sumKeys.forEach((k) => { sums[k] = rows.reduce((s, r) => s + (toNum(r[k]) || 0), 0); });
      return { map, games: list.length, wins, losses, draws, winPct: base ? (wins / base) * 100 : 0, lossPct: base ? (losses / base) * 100 : 0, bySide, avg, sums };
    }).sort((a, b) => b.games - a.games);
  };

  const metricCard = (l, v, d = 2) => `<div class="metric-card"><span>${l}</span><strong>${Number.isFinite(v) ? fmt(v, d) : "-"}</strong></div>`;

  const renderTop3MapCharts = (maps) => {
    const top = maps.slice(0, 3);
    if (!top.length) return;
    charts.push(new Chart(byId("topMapsCountChart"), {
      type: "bar",
      data: {
        labels: top.map((m) => m.map.toUpperCase()),
        datasets: [{ data: top.map((m) => m.games), backgroundColor: ["#5f86ff", "#44c978", "#ffbf4d"], borderRadius: 8, maxBarThickness: 70 }],
      },
      options: BAR_CHART_BASE_OPTIONS,
    }));
    const topWrValues = top.map((m) => m.winPct).filter((v) => Number.isFinite(v));
    const topWrMax = topWrValues.length ? Math.min(100, Math.max(10, Math.ceil(Math.max(...topWrValues) + 3))) : 100;
    charts.push(new Chart(byId("topMapsWinrateChart"), {
      type: "bar",
      data: {
        labels: top.map((m) => m.map.toUpperCase()),
        datasets: [{ data: top.map((m) => m.winPct), backgroundColor: ["#5f86ff", "#44c978", "#ffbf4d"], borderRadius: 8, maxBarThickness: 70 }],
      },
      options: { ...BAR_CHART_BASE_OPTIONS, scales: { y: { beginAtZero: true, max: topWrMax } } },
    }));
  };

  const renderMapSlider = (maps) => {
    if (!maps.length) return;
    let i = 0;
    const draw = () => {
      const m = maps[i];
      const cwr = m.bySide.CT.games ? (m.bySide.CT.wins / m.bySide.CT.games) * 100 : 0;
      const twr = m.bySide.T.games ? (m.bySide.T.wins / m.bySide.T.games) * 100 : 0;
      byId("mapCard").innerHTML = `
      <div class="map-hero" style="background-image:${mapImg(m.map)}"><h4>${m.map}</h4></div>
      <div class="map-details colorful">
        <div class="map-grid">
          <div class="map-stat c1"><strong>${m.games}</strong><span>Ilość meczy</span></div><div class="map-stat c2"><strong>${m.wins}</strong><span>Wygrane</span></div><div class="map-stat c3"><strong>${m.losses}</strong><span>Porażki</span></div>
          <div class="map-stat c4"><strong>${m.draws}</strong><span>Remisy</span></div><div class="map-stat c2"><strong>${fmt(m.winPct)}%</strong><span>Wygrane [%]</span></div><div class="map-stat c3"><strong>${fmt(m.lossPct)}%</strong><span>Porażki [%]</span></div>
        </div>
        <div class="side-row"><div class="ct"><span>Start jako CT</span><strong>${m.bySide.CT.games} • WR ${fmt(cwr)}%</strong></div><div class="tt"><span>Start jako T</span><strong>${m.bySide.T.games} • WR ${fmt(twr)}%</strong></div></div>
        <h5>Średnie</h5>
        <div class="metrics-grid">${metricCard("Zabójstwa", m.avg.Kills)}${metricCard("Zgony", m.avg.Deaths)}${metricCard("Asysty", m.avg.Assists)}${metricCard("K/D", m.avg["K/D"])}${metricCard("+/-", m.avg["+/-"])}${metricCard("HS%", m.avg["HS%"])}${metricCard("ADR", m.avg.ADR)}${metricCard("Użyteczność", m.avg["Użyteczność"])}${metricCard("Rating", m.avg.Rating)}${metricCard("First K/D", m.avg["First K/D"])}${metricCard("Trade K/D", m.avg["Trade K/D"])} </div>
        <h5>Sumy</h5>
        <div class="metrics-grid sums">${metricCard("1v5", m.sums["1v5"], 0)}${metricCard("1v4", m.sums["1v4"], 0)}${metricCard("1v3", m.sums["1v3"], 0)}${metricCard("1v2", m.sums["1v2"], 0)}${metricCard("1v1", m.sums["1v1"], 0)}${metricCard("5K", m.sums["5K"], 0)}${metricCard("4K", m.sums["4K"], 0)}${metricCard("3K", m.sums["3K"], 0)}${metricCard("Oślepieni", m.sums["EF"], 0)}${metricCard("Asysty Flash", m.sums["FA"], 0)}${metricCard("Czas Flasha (s)", m.sums["EBT"], 1)}${metricCard("Nade DMG", m.sums["UD"], 0)}</div>
      </div>`;
    };
    byId("mapPrev").onclick = () => { i = (i - 1 + maps.length) % maps.length; draw(); };
    byId("mapNext").onclick = () => { i = (i + 1) % maps.length; draw(); };
    draw();
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

  const attachRecentMatchLinks = () => {
    const wrap = byId("recentMatches");
    wrap.onclick = (ev) => {
      const tile = ev.target.closest(".match-tile[data-match-id]");
      if (!tile) return;
      const id = tile.dataset.matchId;
      if (id) window.location.href = `mecz.html?id=${encodeURIComponent(id)}`;
    };
  };

  const render = (rows, matches, excludedMatchIds = new Set()) => {
    const datedMatches = matches.filter((m) => !m.manual && m.date);

    const stats = buildStats(datedMatches);
    renderYearTable(stats);
    renderCharts(stats);

    renderResults(matches);
    renderRecent(datedMatches);
    attachRecentMatchLinks();
    renderPlayersMonthlyMatchesChart(rows);
    const rowsForRecords = rows.filter((r) => {
      const matchId = String(r.id || r["ID meczu"] || "").trim();
      return !excludedMatchIds.has(matchId);
    });
    renderRanking(rowsForRecords);

    const maps = aggregateMaps(matches);
    renderTop3MapCharts(maps);
    renderMapSlider(maps);
  };

  const load = async () => {
    try {
      const raw = await (await fetch("data/gracze.json", { cache: "no-store" })).json();
      const rows = normalizeRows(raw);
      const matches = dedupeMatches(rows);
      const excludedMatchIds = await fetchExcludedMatchIds();
      charts.splice(0).forEach((c) => c?.destroy?.());
      render(rows, matches, excludedMatchIds);
    } catch (e) {
      console.error(e);
    }
  };

  load();
})();
