import { useEffect, useRef, useState } from "react";
import leaflet from "leaflet";
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

let DefaultIcon = leaflet.icon({
   iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
   shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
   iconSize: [25, 41],
   iconAnchor: [12, 41],
   popupAnchor: [1, -34],
   shadowSize: [41, 41]
});

leaflet.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
   destinationAddress?: string;
}

export default function Map({ destinationAddress }: MapProps) {
   const mapRef = useRef<HTMLDivElement>(null);
   const mapInstanceRef = useRef<leaflet.Map | null>(null);
   const routingControlRef = useRef<any>(null);
   const [locationError, setLocationError] = useState<string | null>(null);
   const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
   const [isLoadingRoute, setIsLoadingRoute] = useState(false);

   // Geocode address to coordinates
   const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
      try {
         const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=ca&limit=1`
         );
         const data = await response.json();
         
         if (data && data.length > 0) {
            const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            return coords;
         } else {
            setLocationError(`Could not find address: ${address}`);
         }
         return null;
      } catch (error) {
         console.error('Geocoding error:', error);
         setLocationError('Error geocoding address');
         return null;
      }
   };

   // get user and destination location
   useEffect(() => {
      if (!mapInstanceRef.current && mapRef.current) {
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
                  const location: [number, number] = [latitude, longitude];
                  
                  setUserLocation(location);
                  map.setView(location, 13);

                  leaflet.marker(location)
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
         if (routingControlRef.current) {
            routingControlRef.current.remove();
         }
         if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
         }
      };
   }, []);

   // Handle routing when destination address changes
   useEffect(() => {
      const setupRoute = async () => {
         
         if (!destinationAddress || !userLocation || !mapInstanceRef.current) {
            return;
         }

         setIsLoadingRoute(true);
         setLocationError(null);

         const destinationCoords = await geocodeAddress(destinationAddress);
         
         if (!destinationCoords) {
            setLocationError('Could not find the destination address');
            setIsLoadingRoute(false);
            return;
         }

         // Remove existing routing control if present
         if (routingControlRef.current) {
            routingControlRef.current.remove();
         }

         try {
            // Create routing control
            const routingControl = (leaflet as any).Routing.control({
               waypoints: [
                  leaflet.latLng(userLocation[0], userLocation[1]),
                  leaflet.latLng(destinationCoords[0], destinationCoords[1])
               ],
               routeWhileDragging: false,
               addWaypoints: false,
               show: true,
               fitSelectedRoutes: true,
               lineOptions: {
                  styles: [{ color: 'blue', opacity: 0.6, weight: 4 }]
               }
            }).addTo(mapInstanceRef.current);

            routingControlRef.current = routingControl;

            // Add destination marker
            leaflet.marker(destinationCoords)
               .addTo(mapInstanceRef.current)
               .bindPopup('Destination')
               .openPopup();

            setIsLoadingRoute(false);
         } catch (error) {
            console.error('Error creating route:', error);
            setLocationError('Error creating route');
            setIsLoadingRoute(false);
         }
      };

      setupRoute();
   }, [destinationAddress, userLocation]);

   return (
      <div className="mapContainer">
         {locationError && <div style={{ color: 'red', padding: '10px' }}>{locationError}</div>}
         {isLoadingRoute && <div style={{ color: 'blue', padding: '10px' }}>Loading route...</div>}
         <div id="map" ref={mapRef}></div>
      </div>
   );
}