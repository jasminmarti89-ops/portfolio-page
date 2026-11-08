/* =========================================================
   "Meine Stationen" – world map with Leaflet
   The places are loaded from stationen.json (one object per place, in travel order).
   Language follows the DE | EN switch (script.js sends a "langchange" event).
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const mapEl = document.getElementById('map');
  const statsEl = document.getElementById('map_stats');
  if (!mapEl) return;

  const COUNTRIES = {
    ZA: ['Südafrika', 'South Africa'], NA: ['Namibia', 'Namibia'], BW: ['Botswana', 'Botswana'], ZW: ['Simbabwe', 'Zimbabwe'],
    IN: ['Indien', 'India'], MY: ['Malaysia', 'Malaysia'], SG: ['Singapur', 'Singapore'], AU: ['Australien', 'Australia'],
    PE: ['Peru', 'Peru'], BO: ['Bolivien', 'Bolivia'], CL: ['Chile', 'Chile'], EC: ['Ecuador', 'Ecuador'], CO: ['Kolumbien', 'Colombia'],
    PA: ['Panama', 'Panama'], CR: ['Costa Rica', 'Costa Rica'], NI: ['Nicaragua', 'Nicaragua'], GT: ['Guatemala', 'Guatemala'],
    BZ: ['Belize', 'Belize'], MX: ['Mexiko', 'Mexico'], CU: ['Kuba', 'Cuba'], PG: ['Papua-Neuguinea', 'Papua New Guinea'],
    ID: ['Indonesien', 'Indonesia'], NZ: ['Neuseeland', 'New Zealand'], AR: ['Argentinien', 'Argentina'], BR: ['Brasilien', 'Brazil'],
    US: ['USA', 'USA'], CA: ['Kanada', 'Canada'], FR: ['Frankreich', 'France'], CH: ['Schweiz', 'Switzerland']
  };

  // One colour per group; language stays get a larger rosé dot
  const GROUPS = {
    trip2014: { color: '#9b6b5a', de: 'Weltreise 2014–2015', en: 'World trip 2014–2015' },
    trip2018: { color: '#5b7f95', de: 'Weltreise 2018–2019', en: 'World trip 2018–2019' },
    home:     { color: '#292929', de: 'Arbeit & Ausbildung', en: 'Work & education' }
  };
  const LANGUAGE_STAY = { color: '#c0a094', de: 'Sprachaufenthalt', en: 'Language stay' };

  const TEXT = {
    de: {
      stats: (places, countries) => `${places} Orte in ${countries} Ländern – zwei Weltreisen, Sprachaufenthalte und meine Stationen in der Schweiz.`,
      error: 'Die Karte konnte nicht geladen werden. Lokal funktioniert sie nur über einen Webserver (z. B. „Live Server" in VS Code), nicht per Doppelklick auf die Datei.'
    },
    en: {
      stats: (places, countries) => `${places} places in ${countries} countries – two world trips, language stays and my stops in Switzerland.`,
      error: 'The map could not be loaded. Locally it only works through a web server (e.g. "Live Server" in VS Code), not by double-clicking the file.'
    }
  };

  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'de');
  const idx = () => (lang() === 'en' ? 1 : 0);
  const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let map = null;
  let stations = [];
  let markers = [];               // [{ marker, station }]
  const layer = { markers: null, routes: null };
  let filter = 'all';

  function placeName(s) {
    if (lang() === 'en' && s.name_en) return s.name_en;
    return s.name || COUNTRIES[s.country][idx()];   // places without a name stand for the whole country
  }

  function popupHtml(s) {
    const t = lang();
    const group = s.language ? LANGUAGE_STAY[t] : GROUPS[s.group][t];
    const note = t === 'en' ? s.note_en : s.note;
    return '<div class="map_pop">'
      + `<strong>${escapeHtml(placeName(s))}</strong>`
      + (s.name ? `<span>${escapeHtml(COUNTRIES[s.country][idx()])}</span>` : '')
      + `<em>${escapeHtml(group)}</em>`
      + (note ? `<p>${escapeHtml(note)}</p>` : '')
      + '</div>';
  }

  function matches(s) {
    if (filter === 'all') return true;
    if (filter === 'language') return !!s.language;
    if (filter === 'home') return s.group === 'home' && !s.language;
    return s.group === filter;
  }

  // Route of one trip as polyline pieces. A jump of more than 180° in longitude (e.g. Australia -> South America
  // across the Pacific) would be drawn the wrong way round the globe, so the line is split there.
  function routePieces(points) {
    const pieces = [[]];
    points.forEach((p, i) => {
      if (i > 0 && Math.abs(p.lng - points[i - 1].lng) > 180) pieces.push([]);
      pieces[pieces.length - 1].push([p.lat, p.lng]);
    });
    return pieces.filter((piece) => piece.length > 1);
  }

  function render() {
    layer.markers.clearLayers();
    layer.routes.clearLayers();
    markers = [];

    // dashed travel routes (only when a whole trip is shown)
    ['trip2014', 'trip2018'].forEach((trip) => {
      if (filter !== 'all' && filter !== trip) return;
      routePieces(stations.filter((s) => s.group === trip)).forEach((piece) => {
        L.polyline(piece, { color: GROUPS[trip].color, weight: 1.5, opacity: 0.55, dashArray: '4 6', interactive: false }).addTo(layer.routes);
      });
    });

    const visible = stations.filter(matches);
    visible.forEach((s) => {
      const color = s.language ? LANGUAGE_STAY.color : GROUPS[s.group].color;
      const marker = L.circleMarker([s.lat, s.lng], {
        radius: s.language ? 8 : 5,
        color: s.language ? '#292929' : '#fff',
        weight: s.language ? 2 : 1,
        fillColor: color,
        fillOpacity: 0.95
      }).bindPopup(popupHtml(s));
      marker.addTo(layer.markers);
      markers.push({ marker, station: s });
    });

    if (visible.length) {
      map.fitBounds(L.latLngBounds(visible.map((s) => [s.lat, s.lng])), { padding: [30, 30], maxZoom: 7 });
    }
  }

  function updateTexts() {
    const countries = new Set(stations.map((s) => s.country)).size;
    statsEl.textContent = TEXT[lang()].stats(stations.length, countries);
    markers.forEach(({ marker, station }) => marker.setPopupContent(popupHtml(station)));
  }

  function showError() {
    mapEl.classList.add('map_error');
    mapEl.textContent = TEXT[lang()].error;
  }

  // ---------- Filter buttons ----------
  document.querySelectorAll('.map_filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      document.querySelectorAll('.map_filter').forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', b === btn);
      });
      if (map) render();
    });
  });

  document.addEventListener('langchange', () => {
    if (map) updateTexts();
    else if (mapEl.classList.contains('map_error')) mapEl.textContent = TEXT[lang()].error;
  });

  // ---------- Load data and build the map ----------
  if (typeof L === 'undefined') { showError(); return; }   // Leaflet itself could not be loaded

  fetch('stationen.json')
    .then((response) => {
      if (!response.ok) throw new Error(response.status);
      return response.json();
    })
    .then((data) => {
      stations = data;
      // scroll-wheel zoom only after a click into the map, so scrolling the page is not caught by the map
      map = L.map(mapEl, { scrollWheelZoom: false, worldCopyJump: true, minZoom: 1 });
      map.on('click focus', () => map.scrollWheelZoom.enable());
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18
      }).addTo(map);
      layer.routes = L.layerGroup().addTo(map);
      layer.markers = L.layerGroup().addTo(map);
      render();
      updateTexts();
    })
    .catch(showError);
});
