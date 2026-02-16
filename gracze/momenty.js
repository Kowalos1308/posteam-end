window.PlayerMoments = (() => {
  const initMoments = () => {
    const { momentsGrid } = window.PlayerUI;
    momentsGrid.innerHTML = "";
  };

  const renderMoments = () => {
    const { momentsGrid } = window.PlayerUI;
    const { formatNumber } = window.PlayerStatsProcessing;
    const { state, formatDateOnlyPL, formatDatePL } = window.PlayerState;

    momentsGrid.innerHTML = "";
    const excluded = state.excludedMatchIds instanceof Set ? state.excludedMatchIds : new Set();
    const eligibleData = state.filteredData.filter((record) => !excluded.has(String(record["ID meczu"] || "").trim()));
    if (!eligibleData.length) {
      momentsGrid.innerHTML = '<div class="empty-state">Brak danych do wyróżnień.</div>';
      return;
    }

    const momentsConfig = [
      { key: "ADR", title: "Najwyższy ADR", suffix: "ADR", icon: "🎯" },
      { key: "Kills", title: "Najwięcej killi", suffix: "K", icon: "💥" },
      { key: "Assists", title: "Najwięcej asyst", suffix: "A", icon: "🤝" },
      { key: "Deaths", title: "Najmniej zgonów", suffix: "D", icon: "🛡️", mode: "min" },
      { key: "5K", title: "ACE (5K)", suffix: "ACE", icon: "🏆", mode: "total" },
      { key: "Rating", title: "Najwyższy rating", suffix: "Rating", icon: "⭐" },
    ];

    const matchesById = eligibleData.reduce((acc, record) => {
      const matchId = record["ID meczu"] || "unknown";
      if (!acc[matchId]) acc[matchId] = [];
      acc[matchId].push(record);
      return acc;
    }, {});

    const matchEntries = Object.values(matchesById).map((records) => {
      const sample = records[0];
      const result = (sample?.Result || "").toUpperCase();
      return {
        id: sample?.["ID meczu"] || "unknown",
        result,
        date: sample?._date || sample?.Data,
        map: sample?.Mapa || "-",
        records,
      };
    });

    const streaks = (() => {
      const sorted = [...matchEntries].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).valueOf() : 0;
        const dateB = b.date ? new Date(b.date).valueOf() : 0;
        return dateA - dateB;
      });
      let bestWin = { length: 0, start: null, end: null };
      let bestLose = { length: 0, start: null, end: null };
      let currentType = null;
      let currentLength = 0;
      let currentStart = null;
      let currentEnd = null;
      sorted.forEach((match) => {
        const isWin = match.result.includes("WIN");
        const isLose = match.result.includes("LOSE");
        const nextType = isWin ? "win" : isLose ? "lose" : null;

        if (!nextType) {
          currentType = null;
          currentLength = 0;
          currentStart = null;
          currentEnd = null;
          return;
        }

        if (currentType !== nextType) {
          currentType = nextType;
          currentLength = 1;
          currentStart = match.date;
          currentEnd = match.date;
        } else {
          currentLength += 1;
          currentEnd = match.date;
        }

        if (currentType === "win" && currentLength > bestWin.length) {
          bestWin = { length: currentLength, start: currentStart, end: currentEnd };
        }

        if (currentType === "lose" && currentLength > bestLose.length) {
          bestLose = { length: currentLength, start: currentStart, end: currentEnd };
        }
      });
      return { bestWin, bestLose };
    })();

    const bestMatchStat = (key) => {
      let best = null;
      let bestValue = null;
      matchEntries.forEach((match) => {
        const total = match.records.reduce((sum, record) => {
          const value = Number.parseFloat(record[key]);
          return Number.isNaN(value) ? sum : sum + value;
        }, 0);
        if (bestValue === null || total > bestValue) {
          bestValue = total;
          best = { match, total };
        }
      });
      return best;
    };

    const sumForKey = (key) =>
      eligibleData.reduce((sum, record) => {
        const value = Number.parseFloat(record[key]);
        return Number.isNaN(value) ? sum : sum + value;
      }, 0);

    const mostAceMatch = bestMatchStat("5K");

    momentsConfig.forEach((config) => {
      let bestRecord = null;
      let bestValue = null;

      if (config.mode === "total") {
        bestValue = sumForKey(config.key);
      } else {
        eligibleData.forEach((record) => {
          const value = Number.parseFloat(record[config.key]);
          if (Number.isNaN(value)) return;
          const isBetter = config.mode === "min" ? (bestValue === null || value < bestValue) : (bestValue === null || value > bestValue);
          if (isBetter) {
            bestValue = value;
            bestRecord = record;
          }
        });
      }

      if (bestValue === null) return;

      const card = document.createElement("div");
      card.className = "moment-card";

      if (config.mode === "total") {
        let footerNote = "Suma z wszystkich meczów";
        let valueMarkup = `${formatNumber(bestValue, 0)} ${config.suffix}`;

        if (config.key === "5K") {
          const aceValue = mostAceMatch ? formatNumber(mostAceMatch.total, 0) : "0";
          footerNote = `Najwięcej ACE w meczu: ${aceValue}`;
        }

        const linkedId = config.key === "5K" ? (mostAceMatch?.match?.id || "") : "";
        card.innerHTML = `
          <div class="moment-header">
            <span class="moment-icon">${config.icon}</span>
            <h4>${config.title}</h4>
          </div>
          <p class="moment-highlight">${valueMarkup}</p>
          <div class="moment-meta">
            <span>${footerNote}</span>
            ${linkedId ? `<button class="open-match-btn" data-match-id="${linkedId}">Zobacz mecz</button>` : ""}
          </div>
        `;
        momentsGrid.appendChild(card);
        return;
      }

      if (!bestRecord) return;
      const result = (bestRecord["Result"] || "").toUpperCase();
      const resultClass = result.includes("WIN")
        ? "result-win"
        : result.includes("LOSE")
          ? "result-lose"
          : result.includes("TIE") || result.includes("DRAW") || result.includes("REMIS")
            ? "result-tie"
            : "";
      const date = bestRecord._date ? bestRecord._date : bestRecord["Data"];
      const formattedDate = formatDatePL ? formatDatePL(date) : bestRecord["Data"] || "-";
      card.innerHTML = `
        <div class="moment-header">
          <span class="moment-icon">${config.icon}</span>
          <h4>${config.title}</h4>
        </div>
        <p class="moment-highlight">${formatNumber(bestValue)} ${config.suffix}</p>
        <div class="moment-meta">
          <span>${formattedDate}</span>
          <span>${bestRecord["Mapa"] || "-"}</span>
          <span class="${resultClass}">${bestRecord["Wynik"] || "-"} • ${bestRecord["Result"] || "-"}</span>
          <button class="open-match-btn" data-match-id="${bestRecord["ID meczu"] || ""}">Zobacz mecz</button>
        </div>
      `;
      momentsGrid.appendChild(card);
    });

    const extraMoments = [
      {
        title: "Najdłuższa seria zwycięstw",
        value: formatNumber(streaks.bestWin.length, 0),
        suffix: "meczy",
        icon: "🔥",
        range: streaks.bestWin,
      },
      {
        title: "Najdłuższa seria porażek",
        value: formatNumber(streaks.bestLose.length, 0),
        suffix: "meczy",
        icon: "🧊",
        range: streaks.bestLose,
      },
    ];

    extraMoments.forEach((moment) => {
      const card = document.createElement("div");
      card.className = "moment-card";
      const range = moment.range;
      const rangeText =
        range && range.start && range.end
          ? `Od ${formatDateOnlyPL ? formatDateOnlyPL(range.start) : range.start} do ${
              formatDateOnlyPL ? formatDateOnlyPL(range.end) : range.end
            }`
          : "";
      card.innerHTML = `
        <div class="moment-header">
          <span class="moment-icon">${moment.icon}</span>
          <h4>${moment.title}</h4>
        </div>
        <p class="moment-highlight">${moment.value} ${moment.suffix}</p>
        ${rangeText ? `<div class="moment-meta"><span>${rangeText}</span></div>` : ""}
      `;
      momentsGrid.appendChild(card);
    });

    const mostFlashes = bestMatchStat("EF");
    if (mostFlashes) {
      const card = document.createElement("div");
      card.className = "moment-card";
      const formattedDate = formatDatePL ? formatDatePL(mostFlashes.match.date) : mostFlashes.match.date || "-";
      card.innerHTML = `
        <div class="moment-header">
          <span class="moment-icon">💡</span>
          <h4>Najwięcej oślepionych wrogów</h4>
        </div>
        <p class="moment-highlight">${formatNumber(mostFlashes.total, 0)} szt.</p>
        <div class="moment-meta">
          <span>${formattedDate}</span>
          <span>${mostFlashes.match.map}</span>
          <button class="open-match-btn" data-match-id="${mostFlashes.match.id}">Zobacz mecz</button>
        </div>
      `;
      momentsGrid.appendChild(card);
    }

    const mostNadeDamage = bestMatchStat("UD");
    if (mostNadeDamage) {
      const card = document.createElement("div");
      card.className = "moment-card";
      const formattedDate = formatDatePL ? formatDatePL(mostNadeDamage.match.date) : mostNadeDamage.match.date || "-";
      card.innerHTML = `
        <div class="moment-header">
          <span class="moment-icon">💣</span>
          <h4>Najwięcej obrażeń z granatów</h4>
        </div>
        <p class="moment-highlight">${formatNumber(mostNadeDamage.total, 0)} DMG</p>
        <div class="moment-meta">
          <span>${formattedDate}</span>
          <span>${mostNadeDamage.match.map}</span>
          <button class="open-match-btn" data-match-id="${mostNadeDamage.match.id}">Zobacz mecz</button>
        </div>
      `;
      momentsGrid.appendChild(card);
    }
  };

  return { initMoments, renderMoments };
})();
