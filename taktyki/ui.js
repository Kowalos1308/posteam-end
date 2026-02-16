window.TaktykiUI = (() => {
  const generateContent = () => {
    const content = document.getElementById("content-body");
    if (!content || document.getElementById("map-container")) return;

    content.innerHTML = `
      <div id="map-container" style="display: none;">
          <div class="map-header">
            <h4 id="map-title">Mapa</h4>
            <div id="board-info" class="board-info">
              <i class="fas fa-th-large"></i>
              <span id="current-board">${window.TaktykiState.currentBoard}</span>
            </div>
          </div>
          <div class="map-wrapper" id="map-wrapper">
            <div class="map-image-container" id="map-image-container">
              <div class="map-floor-switcher" id="map-floor-switcher" style="display: none;">
                <button type="button" class="floor-btn active" data-floor="1" aria-label="Poziom 1">1</button>
                <button type="button" class="floor-btn" data-floor="2" aria-label="Poziom 2">2</button>
              </div>
              <img id="map-image" src="" alt="Mapa" class="map-image">
              <div id="pins-container"></div>
              <div id="arrows-container"></div>
              <div id="drawings-container"></div>
              <div id="temp-arrow-container" style="display: none;"></div>
            </div>
          </div>
      </div>
      <div id="mobile-notes-container" class="mobile-notes-container" style="display:none;"></div>

      <div id="pin-type-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3><i class="fas fa-map-pin"></i> Wybierz typ pinezki</h3>
            <button class="modal-close" id="close-pin-type-modal">&times;</button>
          </div>
          <div class="modal-body">
            <div class="pin-type-grid">
              <div class="pin-type-option" data-type="miejscowka">
                <div class="pin-type-icon pin-miejscowka"><i class="fas fa-map-marker-alt"></i></div>
                <div class="pin-type-info"><h4>Miejscówka</h4><p>Żółty opis miejsca</p></div>
              </div>

              <div class="pin-type-option" data-type="pozycja">
                <div class="pin-type-icon pin-pozycja"><i class="fas fa-circle"></i></div>
                <div class="pin-type-info"><h4>Pozycja</h4><p>Kolorowa kropka + strzałki</p></div>
              </div>

              <div class="pin-type-option" data-type="granat-smoke">
                <div class="pin-type-icon pin-smoke"><i class="fas fa-smog"></i></div>
                <div class="pin-type-info"><h4>Granat - Smoke</h4><p>Kolor dymu</p></div>
              </div>

              <div class="pin-type-option" data-type="granat-flash">
                <div class="pin-type-icon pin-flash"><i class="fas fa-bolt"></i></div>
                <div class="pin-type-info"><h4>Granat - Flash</h4><p>Kolor flasha</p></div>
              </div>

              <div class="pin-type-option" data-type="granat-nade">
                <div class="pin-type-icon pin-nade"><i class="fas fa-burst"></i></div>
                <div class="pin-type-info"><h4>Granat - HE</h4><p>Kolor HE</p></div>
              </div>

              <div class="pin-type-option" data-type="granat-molotov">
                <div class="pin-type-icon pin-molotov"><i class="fas fa-fire"></i></div>
                <div class="pin-type-info"><h4>Granat - Molotov</h4><p>Kolor ognia</p></div>
              </div>

              <div class="pin-type-option" data-type="host">
                <div class="pin-type-icon pin-host"><strong>H</strong></div>
                <div class="pin-type-info"><h4>H</h4><p>Biały napis z mocnym cieniem</p></div>
              </div>

              <div class="pin-type-option" data-type="bomba">
                <div class="pin-type-icon pin-bomba"><i class="fas fa-bomb"></i></div>
                <div class="pin-type-info"><h4>BOMBA</h4><p>Ikona bomby + opcjonalny podgląd obrazka</p></div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="secondary-btn" id="cancel-pin-type">Anuluj</button>
            </div>
          </div>
        </div>
      </div>

      <div id="pin-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3><i class="fas fa-map-pin"></i> Dodaj pinezkę</h3>
            <button class="modal-close" id="close-pin-modal">&times;</button>
          </div>
          <div class="modal-body">
            <form id="pin-form">
              <div class="form-group" id="pin-text-group">
                <label for="pin-text">Tekst:</label>
                <input type="text" id="pin-text" placeholder="Wpisz tekst lub cyfrę" required autofocus>
              </div>

              <div class="form-group" id="pin-player-group" style="display: none;">
                <label for="pin-players">Pozycja kolor (gracze):</label>
                <select id="pin-players" multiple>
                  <option value="Dziadek">Dziadek</option>
                  <option value="Matka">Matka</option>
                  <option value="Ojciec">Ojciec</option>
                  <option value="Wujek">Wujek</option>
                  <option value="Synek">Synek</option>
                  <option value="Kowal">Kowal</option>
                  <option value="Telemans">Telemans</option>
                  <option value="Gruby">Gruby</option>
                </select>
                <small class="hint">Brak wyboru = seledynowy. Wybierz 2+ aby uzyskać naprzemienne barwy.</small>
              </div>

              <div class="form-group" id="pin-image-group" style="display: none;">
                <label for="pin-image-url">Link do obrazka podglądu (dla BOMBA):</label>
                <input type="url" id="pin-image-url" placeholder="https://...">
                <small class="hint">Po najechaniu myszką na bombę pokaże się podgląd obrazka.</small>
              </div>

              <div class="form-group">
                <label for="pin-description">Opis (opcjonalny):</label>
                <textarea id="pin-description" placeholder="Możesz dodać opis lub link" rows="3"></textarea>
              </div>


              <div class="form-group">
                <label for="pin-video-url">Link YouTube (opcjonalny):</label>
                <input type="url" id="pin-video-url" placeholder="https://www.youtube.com/watch?v=...">
                <small class="hint">Jeśli podasz link, w liście pinezek pojawi się przycisk „ODPAL FILM YOUTUBE”.</small>
              </div>

              <div class="form-actions">
                <button type="button" class="secondary-btn" id="cancel-pin">Anuluj</button>
                <button type="submit" class="primary-btn">Dodaj pinezkę</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="board-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3><i class="fas fa-plus-square"></i> Dodaj nową planszę</h3>
            <button class="modal-close" id="close-board-modal">&times;</button>
          </div>
          <div class="modal-body">
            <form id="board-form">
              <div class="form-group">
                <label for="board-name">Nazwa planszy:</label>
                <input type="text" id="board-name" placeholder="np. Smoke setups" required autofocus>
              </div>

              <div class="form-actions">
                <button type="button" class="secondary-btn" id="cancel-board">Anuluj</button>
                <button type="submit" class="primary-btn">Dodaj planszę</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  };

  const init = async () => {
    generateContent();
    await window.TaktykiSidebar.generateSidebar();
  };

  return { init, generateContent };
})();
