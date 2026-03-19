const CENTER = [100.00, 9.73]; // Koh Phangan

let map, hoverPopup = null, selId = null;
let propertiesData = [];
let fType = 'all', fStatus = null;

function initMap() {
  try {
    map = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          sat: { type: 'raster', tiles: ['https://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}'], tileSize: 256, maxzoom: 22, attribution: 'Google' },
          str: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19 }
        },
        layers: [
          { id: 'satellite', type: 'raster', source: 'sat' },
          { id: 'streets', type: 'raster', source: 'str', layout: { visibility: 'none' } }
        ]
      },
      center: CENTER, zoom: 12, maxZoom: 22,
      fadeDuration: 0
    });
    map.on('load', onMapLoad);
  } catch (e) {
    console.error('Map init failed:', e);
  }
}

async function onMapLoad() {
  try {
    const res = await fetch('data.geojson');
    const geojsonData = await res.json();
    propertiesData = geojsonData.features.map(f => ({ ...f.properties, geom: f.geometry }));
    
    // Add 3d buildings source for Mapbox if available (Simulated via OSM or custom if using Mapbox token later)
    // For now, we just plot our GeoJSON features.
    map.addSource('props', {
      type: 'geojson',
      data: geojsonData,
      cluster: true, clusterMaxZoom: 14, clusterRadius: 50
    });

    map.addSource('props-unclustered', {
      type: 'geojson', 
      data: geojsonData
    });

    // Filled polygons for land
    map.addLayer({ 
      id: 'prop-fill', type: 'fill', source: 'props-unclustered',
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 
        'fill-color': ['match', ['get', 'type'], 'land', '#E8A820', 'roof', '#2ED89A', '#666'],
        'fill-opacity': 0.4
      } 
    });

    // Outlines
    map.addLayer({ 
      id: 'prop-line', type: 'line', source: 'props-unclustered',
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 
        'line-color': ['match', ['get', 'type'], 'land', '#E8A820', 'roof', '#2ED89A', '#666'],
        'line-width': 2, 'line-opacity': 0.8
      } 
    });

    // Points for clustered or small items
    map.addLayer({
      id: 'prop-point', type: 'circle', source: 'props-unclustered',
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 6,
        'circle-color': ['match', ['get', 'type'], 'land', '#E8A820', 'roof', '#2ED89A', '#666'],
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff'
      }
    });

    // Clusters
    map.addLayer({
      id: 'clusters', type: 'circle', source: 'props', filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#E8A820', 'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32], 'circle-opacity': 0.9
      }
    });

    map.addLayer({
      id: 'cluster-count', type: 'symbol', source: 'props', filter: ['has', 'point_count'],
      layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['Open Sans Regular'], 'text-size': 12 },
      paint: { 'text-color': '#111' }
    });

    // Interactions
    map.on('click', 'prop-fill', e => openDetail(e.features[0].properties));
    map.on('click', 'prop-point', e => openDetail(e.features[0].properties));

    hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
    
    const showHover = e => {
      map.getCanvas().style.cursor = 'pointer';
      if (!e.features.length) return;
      const p = e.features[0].properties;
      const title = p.title || 'Property';
      hoverPopup.setLngLat(e.lngLat).setHTML(
        `<div class="popup-name">${title}</div>` +
        `<div class="popup-stats">${p.type.toUpperCase()} · ${p.status} · ${p.size}</div>`
      ).addTo(map);
    };

    map.on('mouseenter', 'prop-fill', showHover);
    map.on('mousemove', 'prop-fill', e => hoverPopup.setLngLat(e.lngLat));
    map.on('mouseleave', 'prop-fill', () => { map.getCanvas().style.cursor = ''; hoverPopup.remove(); });

    document.querySelector('.loading-overlay').classList.add('hide');
    renderList();
  } catch (err) {
    console.error("Failed to load geojson", err);
    document.querySelector('.loading-text').innerText = "Failed to load data.geojson (Have you created it?)";
  }
}

function setStyle(s, el) {
  document.querySelectorAll('.htb').forEach(b => b.classList.remove('on'));
  if (el) el.classList.add('on');
  map.setLayoutProperty('satellite', 'visibility', s === 'sat' ? 'visible' : 'none');
  map.setLayoutProperty('streets', 'visibility', s === 'str' ? 'visible' : 'none');
}

function resetView() { map.flyTo({ center: CENTER, zoom: 12, duration: 600 }); }

function getFiltered() {
  let f = propertiesData;
  if (fType !== 'all') f = f.filter(p => p.type === fType);
  if (fStatus) f = f.filter(p => p.status === fStatus);
  const q = document.getElementById('search').value.toLowerCase().trim();
  if (q) f = f.filter(p => (p.title || '').toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q));
  return f;
}

function setFilter(f) {
  const typeBtns = ['all', 'land', 'roof'];
  if (typeBtns.includes(f)) fType = f; else fStatus = fStatus === f ? null : f;
  
  document.querySelectorAll('.fbtn').forEach(btn => {
    const d = btn.dataset.f;
    if (typeBtns.includes(d)) btn.classList.toggle('on', d === fType);
    else btn.classList.toggle('on', d === fStatus);
  });
  renderList();
}

function renderList() {
  const f = getFiltered();
  const el = document.getElementById('propertyList');
  
  const landCount = f.filter(p => p.type === 'land').length;
  const roofCount = f.filter(p => p.type === 'roof').length;
  const saleCount = f.filter(p => p.status === 'sale').length;
  document.getElementById('s-total').textContent = f.length;
  document.getElementById('s-land').textContent = landCount;
  document.getElementById('s-roof').textContent = roofCount;
  document.getElementById('s-sale').textContent = saleCount;
  document.getElementById('subtitle').textContent = `${f.length.toLocaleString()} properties · ${landCount} lands · ${roofCount} roofs`;

  if (f.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:20px;opacity:.5;font-size:12px">No properties found.</div>`;
    return;
  }

  el.innerHTML = f.map(p => `
    <div class="bc type-${p.type}" onclick="selectListItem('${p.id}')">
      <div class="bc-top">
        <div class="bc-name">${p.title || 'Property'}</div>
        <span class="badge" style="background:${p.type==='land'?'rgba(232,168,32,.2)':'rgba(46,216,154,.2)'};color:${p.type==='land'?'#E8A820':'#2ED89A'}">${p.type.toUpperCase()}</span>
      </div>
      <div class="bc-row">
        <span>📍 ${p.location || 'Unknown'}</span>
        <span>📏 ${p.size || 'N/A'}</span>
      </div>
      <div class="bc-row">
        <span style="color:var(--gold)">💰 ${p.price || 'N/A'}</span>
      </div>
    </div>
  `).join('');
  
  // Update map filter
  if (!map || !map.getLayer('prop-fill')) return;
  const ids = f.map(p => p.id);
  const fltr = ['in', ['get', 'id'], ['literal', ids]];
  map.setFilter('prop-fill', fltr);
  map.setFilter('prop-line', fltr);
  map.setFilter('prop-point', fltr);
}

function selectListItem(id) {
  const p = propertiesData.find(x => x.id === id);
  if (!p) return;
  // If we have coordinates, fly to them. 
  // For polygons, we can take the first coordinate of the first ring
  let coords = CENTER;
  if (p.geom.type === 'Point') coords = p.geom.coordinates;
  else if (p.geom.type === 'Polygon') coords = p.geom.coordinates[0][0];
  
  map.flyTo({ center: coords, zoom: 16 });
  openDetail(p);
}

function openDetail(p) {
  document.querySelector('.sidebar-list-content').classList.add('hidden');
  document.getElementById('propertyList').style.display = 'none';
  document.querySelector('.detail-view').classList.add('show');
  
  document.getElementById('detailContent').innerHTML = `
    <button class="detail-back" onclick="closeDetail()">← Back to list</button>
    <div class="dp-head">
      <h2>${p.title}</h2>
    </div>
    <div class="dp-meta">
      ${p.type.toUpperCase()} · Status: ${p.status.toUpperCase()}<br>
      Location: ${p.location}
    </div>
    <div class="dp-grid">
      <div class="dg"><div class="dg-v">${p.size || '-'}</div><div class="dg-l">Size</div></div>
      <div class="dg"><div class="dg-v">${p.price || '-'}</div><div class="dg-l">Price</div></div>
    </div>
    
    <div style="margin-top:20px; padding:10px; background:rgba(255,255,255,.05); border-radius:8px">
      <h4 style="color:var(--gold);font-size:11px;margin-bottom:8px">CONTACT / OWNER INFO</h4>
      <div style="font-size:12px;opacity:.8;margin-bottom:4px">👤 Name: ${p.owner || 'Unknown'}</div>
      <div style="font-size:12px;opacity:.8;margin-bottom:4px">📞 Phone: ${p.phone || 'Unknown'}</div>
      <div style="font-size:12px;opacity:.8;margin-bottom:4px">🏢 Agent: ${p.agent || 'Direct'}</div>
    </div>

    <div class="dp-actions">
      ${p.link && p.link !== 'N/A' ? `<a class="act-link" href="${p.link}" target="_blank">🔗 Original Listing</a>` : ''}
      <a class="act-map" href="https://www.google.com/maps/search/?api=1&query=${p.title}" target="_blank">📍 Google Maps</a>
    </div>
  `;
}

function closeDetail() {
  document.querySelector('.sidebar-list-content').classList.remove('hidden');
  document.getElementById('propertyList').style.display = 'block';
  document.querySelector('.detail-view').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  document.getElementById('search').addEventListener('input', renderList);
  document.querySelectorAll('.fbtn').forEach(btn => btn.addEventListener('click', e => setFilter(e.target.dataset.f)));
});
