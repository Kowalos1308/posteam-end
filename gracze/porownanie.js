window.PlayerComparison = (() => {
  const renderCompare = () => {
    const { compareTableBody } = window.PlayerUI;
    const { filterRecords, comparePlayers, formatNumber, formatPercentage } = window.PlayerStatsProcessing;
    const { state } = window.PlayerState;

    compareTableBody.innerHTML = "";
    if (!state.player) {
      compareTableBody.innerHTML = '<tr><td colspan="17">Wybierz gracza, aby porównać.</td></tr>';
      return;
    }

    const compareSource = filterRecords(state.rawData, {
      player: "",
      map: state.map,
      dateFrom: state.dateFrom,
      dateTo: state.dateTo,
    });
    const compareData = comparePlayers(compareSource);
    const selectedEntry = comparePlayers(state.filteredData).find((entry) => entry.key === state.player);
    const selectedStats = selectedEntry?.stats;

    if (!compareData.length || !selectedStats) {
      compareTableBody.innerHTML = '<tr><td colspan="17">Brak innych graczy do porównania.</td></tr>';
      return;
    }

    const sortedCompare = [...compareData].sort((a, b) => {
      if (a.key === state.player) return -1;
      if (b.key === state.player) return 1;
      return a.player.localeCompare(b.player, "pl");
    });

    sortedCompare.forEach((playerData) => {
      const stats = playerData.stats;
      const isSelf = playerData.key === state.player;
      const compareValues = (key, formatFn, decimals, inverse = false, source = "averages") => {
        const selectedValue = selectedStats[source]?.[key] ?? 0;
        const value = stats[source]?.[key] ?? 0;
        let className = "";
        if (!isSelf) {
          const isBetter = inverse ? value <= selectedValue : value >= selectedValue;
          className = isBetter ? "better" : "worse";
        } else {
          className = "self";
        }
        return {
          value: formatFn(value, decimals),
          className,
        };
      };

      const kills = compareValues("Kills", formatNumber);
      const deaths = compareValues("Deaths", formatNumber, undefined, true);
      const assists = compareValues("Assists", formatNumber);
      const plusMinus = compareValues("Plus/Minus", formatNumber);
      const hs = compareValues("HS%", formatPercentage);
      const adr = compareValues("ADR", formatNumber);
      const onev5 = compareValues("1v5", formatNumber, 0, false, "totals");
      const onev4 = compareValues("1v4", formatNumber, 0, false, "totals");
      const onev3 = compareValues("1v3", formatNumber, 0, false, "totals");
      const onev2 = compareValues("1v2", formatNumber, 0, false, "totals");
      const onev1 = compareValues("1v1", formatNumber, 0, false, "totals");
      const fivek = compareValues("5K", formatNumber, 0, false, "totals");
      const fourk = compareValues("4K", formatNumber, 0, false, "totals");
      const threek = compareValues("3K", formatNumber, 0, false, "totals");
      const rating = compareValues("Rating", formatNumber);
      const row = document.createElement("tr");
      if (isSelf) {
        row.classList.add("compare-self");
      }
      row.innerHTML = `
      <td>${playerData.player}${isSelf ? " (Ty)" : ""}</td>
      <td>${stats.matches}</td>
      <td class="${kills.className}">${kills.value}</td>
      <td class="${deaths.className}">${deaths.value}</td>
      <td class="${assists.className}">${assists.value}</td>
      <td class="${plusMinus.className}">${plusMinus.value}</td>
      <td class="${hs.className}">${hs.value}</td>
      <td class="${adr.className}">${adr.value}</td>
      <td class="${onev5.className}">${onev5.value}</td>
      <td class="${onev4.className}">${onev4.value}</td>
      <td class="${onev3.className}">${onev3.value}</td>
      <td class="${onev2.className}">${onev2.value}</td>
      <td class="${onev1.className}">${onev1.value}</td>
      <td class="${fivek.className}">${fivek.value}</td>
      <td class="${fourk.className}">${fourk.value}</td>
      <td class="${threek.className}">${threek.value}</td>
      <td class="${rating.className}">${rating.value}</td>
    `;
      compareTableBody.appendChild(row);
    });
  };

  return { renderCompare };
})();
