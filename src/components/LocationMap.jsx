import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Leaflet's default marker icons reference relative paths that break once
// Vite bundles the app — this re-points them at the actual bundled URLs.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Head office, verified against a banking directory and Google's listing —
// double-check this if the branch in your photo is a different one.
const BRANCH = {
  position: [16.3251746, 120.3666942],
  name: 'Cooperative Bank of La Union',
  address: 'Dona Torilba Aspiras Road, Consolacion, Agoo, La Union',
  phone: '(072) 521-0006',
};

export default function LocationMap() {
  return (
    <section id="location" className="scroll-mt-24 border-y border-line bg-panel px-6 py-20">
      <div className="mx-auto mb-8 max-w-xl">
        <h2 className="mb-2 font-display text-3xl font-medium md:text-4xl">Find us</h2>
        <p className="text-ink-soft">{BRANCH.address}</p>
      </div>
      <div className="isolate mx-auto h-96 max-w-5xl overflow-hidden rounded-3xl border border-line shadow-sm transition-shadow duration-200 hover:shadow-lg">
        <MapContainer
          center={BRANCH.position}
          zoom={16}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={BRANCH.position}>
            <Popup>
              <strong>{BRANCH.name}</strong>
              <br />
              {BRANCH.address}
              <br />
              {BRANCH.phone}
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </section>
  );
}