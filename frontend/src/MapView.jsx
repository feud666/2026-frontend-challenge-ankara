import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Using the same color tokens from your UI
const TYPE_COLORS = {
  checkin: '#378ADD', message: '#D4537E', sighting: '#1D9E75',
  note: '#7F77DD', tip: '#EF9F27',
};

// Custom HTML markers to match your app's design
const createCustomIcon = (type, isSelected, darkMode) => {
  const color = TYPE_COLORS[type] || '#888';
  const size = isSelected ? 20 : 14;
  const border = isSelected ? `3px solid ${darkMode ? '#f0f0f0' : '#2D3B55'}` : `2px solid ${darkMode ? '#2d2d2d' : 'white'}`;

  return divIcon({
    className: 'custom-map-marker',
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: ${border};
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: all 0.2s ease-in-out;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Invisible component that listens for selectedRecord changes and moves the camera
function MapController({ selectedRecord }) {
  const map = useMap();
  useEffect(() => {
    if (selectedRecord?.coordinates) {
      map.flyTo([selectedRecord.coordinates.lat, selectedRecord.coordinates.lng], 16, {
        animate: true,
        duration: 1.5
      });
    }
  }, [selectedRecord, map]);
  return null;
}

export default function MapView({ records, selectedRecord, darkMode = false, onSelectRecord }) {
  // 1. Filter to only records that have valid coordinates
  const mapableRecords = records.filter(r => r?.coordinates?.lat && r?.coordinates?.lng);

  // 2. Calculate Podo's specific route chronologically
  const podoRoute = mapableRecords
    .filter(r => r.people.some(p => p.toLowerCase() === 'podo'))
    .map(r => [r.coordinates.lat, r.coordinates.lng]);

  // Default center point (Ankara)
  const center = [39.9334, 32.8597];

  if (mapableRecords.length === 0) return null;

  // Select tile layer based on dark mode
  const tileUrl = darkMode
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels_under/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  return (
    <div style={{
      height: '320px',
      width: '100%',
      borderRadius: '10px',
      overflow: 'hidden',
      marginBottom: '20px',
      border: '1px solid var(--border)',
      position: 'relative',
      zIndex: 0
    }}>
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        {/* CartoDB Voyager tiles - switches to dark variant in dark mode */}
        <TileLayer
          key={darkMode ? "dark-tiles" : "light-tiles"}
          url={
            darkMode 
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          }
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <MapController selectedRecord={selectedRecord} />

        {/* Draw Podo's path if there are multiple points */}
        {podoRoute.length > 1 && (
          <Polyline 
            positions={podoRoute} 
            pathOptions={{ color: '#F4A261', weight: 3, dashArray: '5, 10', opacity: 0.8 }} 
          />
        )}

        {/* Render all the points on the map */}
        {mapableRecords.map((record) => {
          const isSelected = selectedRecord?.id === record.id;
          return (
            <Marker
              key={record.id}
              position={[record.coordinates.lat, record.coordinates.lng]}
              icon={createCustomIcon(record.type, isSelected, darkMode)}
              eventHandlers={{
                click: () => onSelectRecord(record),
              }}
            >
              <Popup closeButton={false}>
                <div style={{ margin: '-4px 0', fontFamily: 'Nunito, sans-serif' }}>
                  <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: TYPE_COLORS[record.type] }}>
                    {record.type}
                  </strong>
                  <br />
                  <span style={{ fontWeight: '700', color: darkMode ? '#f0f0f0' : '#2D3B55' }}>{record.location || "Unknown Location"}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}