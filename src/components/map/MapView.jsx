import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { MapPin, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

const originIcon = createCustomIcon('#3B82F6');
const destIcon = createCustomIcon('#10B981');
const driverIcon = createCustomIcon('#8B5CF6');

function LocationMarker({ position, setPosition, type = 'origin' }) {
  const map = useMapEvents({
    click(e) {
      if (setPosition) {
        setPosition(e.latlng);
      }
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position ? (
    <Marker 
      position={position} 
      icon={type === 'origin' ? originIcon : destIcon}
      draggable={!!setPosition}
      eventHandlers={{
        dragend: (e) => {
          if (setPosition) {
            setPosition(e.target.getLatLng());
          }
        },
      }}
    >
      <Popup>{type === 'origin' ? 'Punto de recogida' : 'Destino'}</Popup>
    </Marker>
  ) : null;
}

function SetViewOnChange({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapView({ 
  origin, 
  destination, 
  setOrigin, 
  setDestination,
  driverLocation,
  center,
  zoom = 14,
  className = '',
  interactive = true
}) {
  const [mapCenter, setMapCenter] = useState(center || { lat: 19.4326, lng: -99.1332 }); // CDMX default

  useEffect(() => {
    if (center) {
      setMapCenter(center);
    } else if (origin) {
      setMapCenter(origin);
    }
  }, [center, origin]);

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={zoom}
        scrollWheelZoom={interactive}
        zoomControl={false}
        className="h-full w-full rounded-xl"
        style={{ minHeight: '300px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <SetViewOnChange center={mapCenter} zoom={zoom} />

        {origin && (
          <LocationMarker 
            position={origin} 
            setPosition={interactive ? setOrigin : null} 
            type="origin" 
          />
        )}

        {destination && (
          <LocationMarker 
            position={destination} 
            setPosition={interactive ? setDestination : null} 
            type="destination" 
          />
        )}

        {driverLocation && (
          <Marker position={driverLocation} icon={driverIcon}>
            <Popup>Conductor</Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Zoom controls */}
      {interactive && (
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <button
            onClick={() => {}}
            className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-50"
          >
            <Navigation className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}