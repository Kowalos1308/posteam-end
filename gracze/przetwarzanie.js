(() => {
  const monthMap = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };

  const numericKeysHint = [
    "Kills",
    "Deaths",
    "Assists",
    "Plus/Minus",
    "HS%",
    "ADR",
    "KAST",
    "EF",
    "FA",
    "EBT",
    "UD",
    "FK",
    "FD",
    "Trade Kills",
    "Trade Deaths",
    "1v5",
    "1v4",
    "1v3",
    "1v2",
    "1v1",
    "5K",
    "4K",
    "3K",
    "Rating",
  ];

  const normalizeWhitespace = (value) => (value || "").toString().trim();

  const toNumber = (value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    const cleaned = value
      .toString()
      .trim()
      .replace(/%/g, "")
      .replace(/s$/i, "")
      .replace(/\s/g, "")
      .replace(/,/g, ".")
      .replace(/[^0-9.-]/g, "");

    if (cleaned === "") {
      return null;
    }

    const parsed = Number.parseFloat(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const parseDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;

    const direct = new Date(value);
    if (!Number.isNaN(direct.valueOf())) {
      return direct;
    }

    const match = value
      .toString()
      .trim()
      .match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})\s+(\d{2}:\d{2}:\d{2})/);
    if (!match) return null;

    const day = Number.parseInt(match[1], 10);
    const month = monthMap[match[2].slice(0, 3).toLowerCase()];
    const year = Number.parseInt(match[3], 10);
    const time = match[4];

    if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
      return null;
    }

    return new Date(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${time}`);
  };

  const getTeamKey = (record) => record["Drużyna"] ?? record["Dru yna"] ?? "";

  const normalizeRecord = (record) => {
    const normalized = { ...record };
    normalized["ID meczu"] = normalizeWhitespace(record["ID meczu"]);
    normalized["Steam ID"] = normalizeWhitespace(record["Steam ID"]);
    normalized["Gracz"] = normalizeWhitespace(record["Gracz"]);
    normalized["Mapa"] = normalizeWhitespace(record["Mapa"]);
    normalized["Data"] = normalizeWhitespace(record["Data"]);
    normalized._date = parseDate(record["Data"]);
    normalized["Result"] = normalizeWhitespace(record["Result"]).toUpperCase();
    normalized["Wynik"] = normalizeWhitespace(record["Wynik"]);
    normalized._team = normalizeWhitespace(getTeamKey(record));

    numericKeysHint.forEach((key) => {
      const numeric = toNumber(record[key]);
      if (numeric !== null) {
        normalized[key] = numeric;
      }
    });

    return normalized;
  };

  const uniqueValues = (data, key) => {
    const set = new Set();
    data.forEach((item) => {
      const value = normalizeWhitespace(item[key]);
      if (value) set.add(value);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pl"));
  };

  const filterRecords = (data, filters) => {
    return data.filter((record) => {
      if (filters.player && record["Gracz"] !== filters.player) return false;
      if (filters.playerKey && record._playerKey !== filters.playerKey) return false;
      if (filters.map && record["Mapa"] !== filters.map) return false;
      if (filters.dateFrom && record._date && record._date < filters.dateFrom) return false;
      if (filters.dateTo && record._date && record._date > filters.dateTo) return false;
      return true;
    });
  };

  const aggregateStats = (records) => {
    const totals = {};
    const averages = {};
    const valuesCount = {};

    records.forEach((record) => {
      Object.keys(record).forEach((key) => {
        if (key.startsWith("_")) return;
        const numeric = toNumber(record[key]);
        if (numeric === null) return;
        totals[key] = (totals[key] || 0) + numeric;
        valuesCount[key] = (valuesCount[key] || 0) + 1;
      });
    });

    Object.keys(totals).forEach((key) => {
      averages[key] = totals[key] / valuesCount[key];
    });

    const resultCounts = records.reduce(
      (acc, record) => {
        const result = record["Result"] || "";
        if (result.includes("WIN")) acc.wins += 1;
        else if (result.includes("LOSE")) acc.losses += 1;
        else if (result.includes("DRAW") || result.includes("REMIS") || result.includes("TIE")) acc.draws += 1;
        return acc;
      },
      { wins: 0, losses: 0, draws: 0 }
    );

    return {
      totals,
      averages,
      valuesCount,
      resultCounts,
      matches: records.length,
    };
  };

  const groupByMap = (records) => {
    const grouped = {};

    records.forEach((record) => {
      const map = record["Mapa"] || "Nieznana";
      if (!grouped[map]) {
        grouped[map] = { map, records: [] };
      }
      grouped[map].records.push(record);
    });

    return Object.values(grouped);
  };

  const mapStats = (records) => {
    return groupByMap(records).map((group) => {
      const resultCounts = { wins: 0, losses: 0, draws: 0 };
      const teamCounts = { T: { wins: 0, total: 0 }, CT: { wins: 0, total: 0 } };

      group.records.forEach((record) => {
        const result = record["Result"] || "";
        const team = (record._team || "").toUpperCase();
        const isWin = result.includes("WIN");
        if (isWin) resultCounts.wins += 1;
        else if (result.includes("LOSE")) resultCounts.losses += 1;
        else if (result.includes("DRAW") || result.includes("REMIS") || result.includes("TIE")) resultCounts.draws += 1;

        if (team === "T" || team === "CT") {
          teamCounts[team].total += 1;
          if (isWin) teamCounts[team].wins += 1;
        }
      });

      const gamesForWinrate = resultCounts.wins + resultCounts.losses;
      const winrate = gamesForWinrate === 0 ? 0 : (resultCounts.wins / gamesForWinrate) * 100;

      return {
        map: group.map,
        games: group.records.length,
        wins: resultCounts.wins,
        losses: resultCounts.losses,
        draws: resultCounts.draws,
        winrate,
        tWinrate: teamCounts.T.total ? (teamCounts.T.wins / teamCounts.T.total) * 100 : 0,
        ctWinrate: teamCounts.CT.total ? (teamCounts.CT.wins / teamCounts.CT.total) * 100 : 0,
      };
    });
  };

  const comparePlayers = (records) => {
    const grouped = {};
    records.forEach((record) => {
      const key = record._playerKey || `name:${(record["Gracz"] || "nieznany").toString().toLowerCase()}`;
      if (!grouped[key]) grouped[key] = { key, records: [], player: record._playerName || record["Gracz"] || "Nieznany" };
      grouped[key].records.push(record);
      if (!grouped[key].player && (record._playerName || record["Gracz"])) {
        grouped[key].player = record._playerName || record["Gracz"];
      }
    });

    return Object.values(grouped)
      .map((group) => ({
        key: group.key,
        player: group.player,
        records: group.records,
        stats: aggregateStats(group.records),
      }))
      .sort((a, b) => a.player.localeCompare(b.player, "pl"));
  };

  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return "-";
    if (!Number.isFinite(value)) return "-";
    return value.toLocaleString("pl-PL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  };

  const formatPercentage = (value, decimals = 1) => {
    if (value === null || value === undefined) return "-";
    if (!Number.isFinite(value)) return "-";
    return `${value.toFixed(decimals)}%`;
  };

  const getNumericKeys = (records) => {
    const keys = new Set();
    records.forEach((record) => {
      numericKeysHint.forEach((hint) => {
        if (record[hint] !== undefined) keys.add(hint);
      });
      Object.keys(record).forEach((key) => {
        if (key.startsWith("_")) return;
        const numeric = toNumber(record[key]);
        if (numeric !== null) keys.add(key);
      });
    });
    return Array.from(keys);
  };

  window.PlayerStatsProcessing = {
    normalizeRecord,
    uniqueValues,
    filterRecords,
    aggregateStats,
    mapStats,
    comparePlayers,
    formatNumber,
    formatPercentage,
    getNumericKeys,
  };
})();
