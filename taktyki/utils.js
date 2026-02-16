window.TaktykiUtils = {
  isAdmin() {
    return localStorage.getItem("postteamAdminLoggedIn") === "true";
  },
  checkPinsAPI() {
    return window.PinsAPI && typeof window.PinsAPI.getPinsForMapAndBoard === "function";
  },
  capitalizeFirst(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
  },
  getPinTypeName(type) {
    const names = {
      miejscowka: "Miejscówka",
      pozycja: "Pozycja",
      "granat-smoke": "Smoke",
      "granat-flash": "Flash",
      "granat-nade": "HE",
      "granat-molotov": "Molotov",
      host: "H",
      bomba: "BOMBA",
    };

    return names[type] || type;
  },
  getPinBadgeStyle(type, players) {
    if (type === "pozycja") {
      return this.getPositionStyle(players);
    }

    const styles = {
      miejscowka: "background: rgba(255, 235, 59, 0.45); color: #111;",
      "granat-smoke": "background: #7d8b94; color: #fff;",
      "granat-flash": "background: #fffde7; color: #111;",
      "granat-nade": "background: #ef5350; color: #fff;",
      "granat-molotov": "background: #ffb74d; color: #111;",
      host: "background: #fff; color: #000;",
      rysunek: "background: rgba(50, 197, 255, 0.2); color: #9be7ff;",
      bomba: "background: #d32f2f; color: #fff;",
    };

    return styles[type] || "background: rgba(255, 255, 255, 0.08); color: #fff;";
  },
  getPositionStyle(players) {
    const fallback = "#7fffd4";
    if (!players || players.length === 0) {
      return `background: ${fallback}; color: #111;`;
    }

    const colors = players
      .map((player) => window.TaktykiState.playerColors[player])
      .filter(Boolean);
    if (!colors.length) {
      return `background: ${fallback}; color: #111;`;
    }
    if (colors.length === 1) {
      return `background: ${colors[0]}; color: #111;`;
    }

    const gradientStops = colors
      .map((color, index) => {
        const start = (index / colors.length) * 100;
        const end = ((index + 1) / colors.length) * 100;
        return `${color} ${start}%, ${color} ${end}%`;
      })
      .join(", ");

    return `background: linear-gradient(90deg, ${gradientStops}); color: #111;`;
  },
  getPositionArrowColor(players) {
    if (!players || players.length === 0) {
      return "#7fffd4";
    }
    const colors = players
      .map((player) => window.TaktykiState.playerColors[player])
      .filter(Boolean);
    if (!colors.length) return "#7fffd4";
    return colors[0];
  },
};
