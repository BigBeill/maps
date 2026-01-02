import { useEffect, useRef, useState } from "react";
import leaflet from "leaflet";
import 'leaflet/dist/leaflet.css';

let DefaultIcon = leaflet.icon({
   iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
   shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
   iconSize: [25, 41],
   iconAnchor: [12, 41],
   popupAnchor: [1, -34],
   shadowSize: [41, 41]
});

leaflet.Marker.prototype.options.icon = DefaultIcon;

export default function Map() {
   const mapRef = useRef<HTMLDivElement>(null);
   const mapInstanceRef = useRef<leaflet.Map | null>(null);
   const [locationError, setLocationError] = useState<string | null>(null);

   useEffect(() => {
      if (!mapInstanceRef.current && mapRef.current){
         const map = leaflet.map(mapRef.current).setView([43.6426, -79.3871], 12);

         leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
         }).addTo(map);

         mapInstanceRef.current = map;

         if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
               (position) => {
                  const { latitude, longitude } = position.coords;

                  map.setView([latitude, longitude], 13);

                  leaflet.marker([latitude, longitude])
                     .addTo(map)
                     .bindPopup('You are here!')
                     .openPopup();
               },
               (error) => {
                  console.error('Error getting location:', error);
                  setLocationError(error.message);
               }
            );
         } else {
            setLocationError('Geolocation is not supported by your browser');
         }
      }

      return () => {
         if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
         }
      }

   }, []);

   return (
      <div className="mapContainer">
         {locationError && <div style={{ color: 'red', padding: '10px' }}>{locationError}</div>}
         <div id="map" ref={mapRef}></div>
      </div>
   );
}