window.PlayerMaps = (() => {
  const renderMaps = () => {
    const { mapsGrid } = window.PlayerUI;
    const { mapStats, formatPercentage } = window.PlayerStatsProcessing;
    const { state, mapImageFor } = window.PlayerState;

    mapsGrid.innerHTML = "";
    const mapData = mapStats(state.filteredData);

    if (!mapData.length) {
      mapsGrid.innerHTML = '<div class="empty-state">Brak danych map.</div>';
      return;
    }

    mapData
      .sort((a, b) => b.games - a.games)
      .forEach((item) => {
      const card = document.createElement("div");
      card.className = "map-card";
      const image = mapImageFor(item.map);
      card.innerHTML = `
      <img src="${image}" alt="${item.map}" onerror="this.src='gracze/zdjecia/placeholder.svg'" />
      <div class="map-card-body">
        <h4>${item.map}</h4>
        <div class="map-stats">
          <span>Mecze: <strong>${item.games}</strong></span>
          <span>Wygrane: <strong class="result-win">${item.wins}</strong></span>
          <span>Przegrane: <strong class="result-lose">${item.losses}</strong></span>
          <span>Remisy: <strong class="result-tie">${item.draws}</strong></span>
          <span>Wygrane T: <strong>${formatPercentage(item.tWinrate)}</strong></span>
          <span>Wygrane CT: <strong>${formatPercentage(item.ctWinrate)}</strong></span>
          <span>Winrate: <strong>${formatPercentage(item.winrate)}</strong></span>
        </div>
      </div>
    `;
      mapsGrid.appendChild(card);
    });
  };

  return { renderMaps };
})();
