(() => {
  const byId = (id) => document.getElementById(id);
  const PLAYER_BY_STEAM = {
    "76561198009437428": "Dziadek", "76561198021612193": "Wujek", "76561198863079353": "Ojciec", "76561198019301588": "Synek",
    "76561198043824587": "Matka", "76561198080571359": "Kowal", "76561199075504972": "Gruby", "76561198035378205": "Telemans",
  };
  const AVATAR = { Dziadek: "dziadek.png", Wujek: "wujek.png", Ojciec: "ojciec.png", Matka: "matka.png", Synek: "synek.png", Gruby: "gruby.png", Kowal: "kowal.png", Telemans: "telemans.png" };
  const PLAYER_COLORS = { Dziadek: "#ff9f40", Wujek: "#ffd93d", Ojciec: "#1f4fbf", Matka: "#32c267", Synek: "#b27dff", Gruby: "#ff4757", Kowal: "#6ee7ff", Telemans: "#000000" };
  const MAP_IMAGE_BY_KEY = {
    overpass: "de_overpass.jpg", train: "de_train.jpg", vertigo: "de_vertigo.jpg", ancient: "de_ancient.jpg", dust2: "de_dust2.jpg",
    mirage: "de_mirage.jpg", nuke: "de_nuke.jpg", agency: "cs_agency.jpg", italy: "cs_italy.jpg", office: "cs_office.jpg",
  };

  const columnGroups = [
    { key: "general", label: "Staty ogólne", cols: [["Kills", "Kills"], ["Deaths", "Deaths"], ["Assists", "Assists"], ["+/-", "Plus/Minus"], ["HS%", "HS%"], ["ADR", "ADR"]] },
    { key: "utility", label: "Użyteczność", cols: [["KAST", "KAST"], ["EF", "EF"], ["FA", "FA"], ["EBT", "EBT"], ["UD", "UD"], ["FK", "FK"], ["FD", "FD"], ["TK", "Trade Kills"], ["TD", "Trade Deaths"]] },
    { key: "rating", label: "Rating", cols: [["Rating", "Rating"]] },
  ];
  const flatCols = [["Gracz", "player"], ...columnGroups.flatMap((g) => g.cols)];
  const clutchKeys = ["1v5", "1v4", "1v3", "1v2", "1v1", "5K", "4K", "3K"];

  const normPlayer = (name, steam) => PLAYER_BY_STEAM[String(steam)] || ({ wuja: "Wujek", tele: "Telemans", "dz!adek": "Dziadek" }[(name || "").toLowerCase()] || name || "Nieznany");
  const toNum = (v) => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const n = Number.parseFloat(String(v).replace(/%/g, "").replace(/s$/i, "").replace(/,/g, ".").replace(/[^0-9.-]/g, ""));
    return Number.isNaN(n) ? null : n;
  };
  const parseDate = (raw) => {
    const d = new Date(raw);
    if (!Number.isNaN(d.valueOf())) return d;
    const m = String(raw || "").match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})\s+(\d{2}:\d{2}:\d{2})/);
    if (!m) return null;
    const mm = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    return new Date(`${m[3]}-${String(mm[m[2].slice(0, 3).toLowerCase()] || 1).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}T${m[4]}`);
  };
  const resultType = (r) => (String(r).includes("WIN") ? "win" : String(r).includes("LOSE") ? "loss" : "draw");
  const mapKey = (raw) => String(raw || "office").toLowerCase().replace(/^de[_\s-]/, "").replace(/^cs[_\s-]/, "").replace(/\s+/g, "").trim();
  const mapImage = (m) => `gracze/zdjecia/${MAP_IMAGE_BY_KEY[mapKey(m)] || "placeholder.svg"}`;
  const formatDatePL = (d) => d ? d.toLocaleString("pl-PL", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

  const getMatchId = () => {
    const q = new URLSearchParams(window.location.search).get("id");
    const fromAttr = document.body.dataset.matchId;
    return (q || fromAttr || "").trim();
  };

  const renderEmpty = () => {
    byId("matchPage").innerHTML = byId("emptyStateTpl").innerHTML;
  };

  const parseScore = (scoreRaw) => {
    const m = String(scoreRaw || "0:0").match(/(\d+)\s*:\s*(\d+)/);
    return m ? [Number(m[1]), Number(m[2])] : [0, 0];
  };

  const computeBestFlags = (rows) => {
    const max = (k) => Math.max(...rows.map((r) => toNum(r[k]) ?? -Infinity));
    const min = (k) => Math.min(...rows.map((r) => toNum(r[k]) ?? Infinity));
    return {
      Kills: max("Kills"), Assists: max("Assists"), ADR: max("ADR"), "HS%": max("HS%"), FK: max("FK"), "Trade Kills": max("Trade Kills"),
      "Plus/Minus": max("Plus/Minus"), Rating: max("Rating"), Deaths: min("Deaths"),
    };
  };

  const renderHero = (meta, rows) => {
    byId("heroBg").style.backgroundImage = `url('${mapImage(meta["Mapa"])}')`;
    byId("heroDate").textContent = formatDatePL(parseDate(meta.Data));

    const [our, opp] = parseScore(meta.Wynik);
    const type = resultType(meta.Result);
    byId("heroScore").innerHTML = `<span class="score-our ${type}">${our}</span><span class="score-sep">:</span><span class="score-opp">${opp}</span>`;

    const resultText = type === "win" ? "WYGRANA" : type === "loss" ? "PRZEGRANA" : "REMIS";
    byId("heroResult").textContent = resultText;
    byId("heroResult").className = `hero-result ${type}`;

    const roster = rows.map((r) => ({ name: normPlayer(r.Gracz, r["Steam ID"]), steam: String(r["Steam ID"] || "") }));
    byId("heroRoster").innerHTML = roster.map((p) => `
      <div class="roster-player">
        <img src="${AVATAR[p.name] || "gracze/zdjecia/placeholder.svg"}" alt="${p.name}">
        <span style="color:${PLAYER_COLORS[p.name] || "#ffffff"}">${p.name}</span>
      </div>
    `).join("");
    byId("heroRosterMeta").textContent = `${rows.length}/5`;
  };

  const renderTable = (rows) => {
    const table = byId("playersTable");
    table.querySelector("thead").innerHTML = `
      <tr>
        <th rowspan="2" data-key="player" title="Kliknij aby sortować">Gracz</th>
        ${columnGroups.map((g) => `<th class="group-${g.key}" colspan="${g.cols.length}">${g.label}</th>`).join("")}
      </tr>
      <tr>${columnGroups.flatMap((g) => g.cols.map(([n, k]) => `<th data-key="${k}" class="group-${g.key}" title="Kliknij aby sortować">${n}</th>`)).join("")}</tr>`;

    const best = computeBestFlags(rows);
    const sortedByRating = [...rows].sort((a, b) => (toNum(b.Rating) ?? -99) - (toNum(a.Rating) ?? -99));
    const topRatingNames = new Set(sortedByRating.slice(0, 2).map((r) => normPlayer(r.Gracz, r["Steam ID"])));

    const renderBody = (data) => {
      table.querySelector("tbody").innerHTML = data.map((r) => {
        const playerName = normPlayer(r.Gracz, r["Steam ID"]);
        const isTopRating = topRatingNames.has(playerName);
        const cells = flatCols.map(([_, key]) => {
          if (key === "player") {
            return `<td><div class="player-cell"><img src="${AVATAR[playerName] || "gracze/zdjecia/placeholder.svg"}" alt="${playerName}"><span style="color:${PLAYER_COLORS[playerName] || "#ffffff"}">${playerName}</span></div></td>`;
          }
          const raw = r[key];
          const num = toNum(raw);
          const isBest = key === "Deaths" ? num === best.Deaths : num === best[key];
          let cls = isBest ? "best-cell" : "";
          if (key === "Plus/Minus") cls += ` ${(num || 0) >= 0 ? "plus" : "minus"}`;
          if (key === "ADR") cls += " adr-strong";
          if (key === "Rating") {
            const r = toNum(raw) || 0;
            cls += r > 1.2 ? " rating-high" : r >= 0.8 ? " rating-mid" : " rating-low";
            if (isTopRating) cls += " best-cell";
          }
          const text = key === "KAST" ? String(raw ?? "-") : (raw ?? "-");
          return `<td class="${cls.trim()}">${text}</td>`;
        }).join("");
        return `<tr>${cells}</tr>`;
      }).join("");
    };

    let sortKey = "Rating";
    let sortDir = -1;
    const sortRows = () => [...rows].sort((a, b) => {
      const av = sortKey === "player" ? normPlayer(a.Gracz, a["Steam ID"]) : (toNum(a[sortKey]) ?? -Infinity);
      const bv = sortKey === "player" ? normPlayer(b.Gracz, b["Steam ID"]) : (toNum(b[sortKey]) ?? -Infinity);
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });

    table.querySelectorAll("th").forEach((th) => th.onclick = () => {
      const key = th.dataset.key;
      if (!key) return;
      sortDir = key === sortKey ? sortDir * -1 : -1;
      sortKey = key;
      renderBody(sortRows());
    });

    renderBody(sortRows());
  };

  const renderClutch = (rows) => {
    byId("clutchGrid").innerHTML = rows.map((r) => {
      const player = normPlayer(r.Gracz, r["Steam ID"]);
      return `
        <article class="clutch-player-card">
          <div class="clutch-player-head"><img src="${AVATAR[player] || "gracze/zdjecia/placeholder.svg"}" alt="${player}"><span>${player}</span></div>
          <div class="clutch-mini-grid">
            ${clutchKeys.map((k) => {
              const v = toNum(r[k]) || 0;
              return `<div class="clutch-mini ${["5K", "4K", "3K"].includes(k) ? "mk" : ""}"><div class="k">${k}</div><div class="v ${v > 0 ? "pos" : "zero"}">${v}</div></div>`;
            }).join("")}
          </div>
        </article>`;
    }).join("");
  };

  const renderHighlights = (rows) => {
    const pick = (label, key, icon, desc, mode = "max", valueFn = null) => {
      const ranked = rows.map((r) => ({
        row: r,
        value: valueFn ? valueFn(r) : (toNum(r[key]) ?? (mode === "min" ? Infinity : -Infinity)),
      }));
      const target = mode === "min"
        ? Math.min(...ranked.map((x) => x.value))
        : Math.max(...ranked.map((x) => x.value));
      const winners = ranked.filter((x) => x.value === target).map((x) => x.row);
      let names = [...new Set(winners.map((w) => normPlayer(w.Gracz, w["Steam ID"])))];
      if ((mode !== "min" && target <= 0) || !Number.isFinite(target)) names = [];
      return {
        label,
        value: Number.isFinite(target) ? target.toFixed(1).replace(/\.0$/, "") : target,
        names,
        icon,
        desc,
      };
    };

    const cards = [
      pick("Najwięcej fragów", "Kills", "fa-skull", "lider eliminacji"),
      pick("Najwięcej asyst", "Assists", "fa-handshake", "najwięcej wsparcia"),
      pick("Najwyższy ADR", "ADR", "fa-burst", "obrażenia na rundę"),
      pick("Najmniej zgonów", "Deaths", "fa-shield", "najlepszy survival", "min"),
      pick("Najwyższy HS%", "HS%", "fa-head-side-virus", "strzelec wyborowy"),
      pick("Najwięcej first kill", "FK", "fa-bolt", "otwierający rundy"),
      pick("Najlepszy trader", "Trade Kills", "fa-arrows-rotate", "trady zabójstw"),
      pick("Najwięcej multi-killi", null, "fa-medal", "3K + 4K + 5K", "max", (r) => (toNum(r["3K"]) || 0) + (toNum(r["4K"]) || 0) + (toNum(r["5K"]) || 0)),
      pick("Najwięcej clutchy", null, "fa-hand-fist", "1v1 + 1v2 + 1v3 + 1v4 + 1v5", "max", (r) => (toNum(r["1v1"]) || 0) + (toNum(r["1v2"]) || 0) + (toNum(r["1v3"]) || 0) + (toNum(r["1v4"]) || 0) + (toNum(r["1v5"]) || 0)),
      pick("Najwięcej rzuconych flashy", "EF", "fa-lightbulb", "Oślepieni przeciwnicy"),
      pick("Najwięcej oślepionych", "FA", "fa-eye", "Asysty fleshem"),
      pick("Najwięcej obrażeń od granatów", "UD", "fa-bomb", "Utility damage"),
    ];

    byId("highlightsGrid").innerHTML = cards.map((c) => `
      <article class="highlight-card">
        <i class="fa-solid ${c.icon} icon"></i>
        <div class="title">${c.label}</div>
        <div class="value">${c.value}</div>
        <div class="name-list">${c.names.length ? c.names.map((n) => `<span class="name-pill" style="--nclr:${PLAYER_COLORS[n] || "#fff"};color:${(PLAYER_COLORS[n] || "").toLowerCase()==="#000000" ? "#fff" : "#0b111d"};">${n}</span>`).join("") : "—"}</div>
        <div class="desc">${c.desc}</div>
      </article>`).join("");
  };

  const renderAceBanner = (rows) => {
    const aces = rows.filter((r) => (toNum(r["5K"]) || 0) > 0);
    const el = byId("aceBanner");
    if (!el) return;
    if (!aces.length) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    el.innerHTML = aces.map((r) => {
      const p = normPlayer(r.Gracz, r["Steam ID"]);
      const count = toNum(r["5K"]) || 0;
      const clr = PLAYER_COLORS[p] || "#ffffff";
      const txt = clr.toLowerCase() === "#000000" ? "#ffffff" : "#0a101b";
      return `<div class="ace-pill" style="--ace-color:${clr};background:${clr};border-color:${clr};color:${txt};"><strong>${p}</strong> zdobył ACE (${count}) w tym meczu!</div>`;
    }).join("");
  };

  const load = async () => {
    const id = getMatchId();
    if (!id) return renderEmpty();

    const raw = await (await fetch("data/gracze.json", { cache: "no-store" })).json();
    const rows = raw.filter((r) => String(r["ID meczu"]) === String(id));
    if (!rows.length) return renderEmpty();

    const matchRows = rows.slice(0, 5);
    const meta = matchRows[0];

    renderHero(meta, matchRows);
    renderAceBanner(matchRows);
    renderTable(matchRows);
    renderClutch(matchRows);
    renderHighlights(matchRows);
  };

  load().catch((e) => {
    console.error(e);
    renderEmpty();
  });
})();
