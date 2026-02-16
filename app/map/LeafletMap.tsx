"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  LayerGroup,
  WMSTileLayer,
  Polyline,
  Rectangle,
  useMap,
} from "react-leaflet";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ports from "../../data/ports.json";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const { BaseLayer, Overlay } = LayersControl;

function formatDMS(lat: number, lng: number) {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";

  const latAbs = Math.abs(lat);
  const lngAbs = Math.abs(lng);

  const latDeg = Math.floor(latAbs);
  const lngDeg = Math.floor(lngAbs);

  const latMin = ((latAbs - latDeg) * 60).toFixed(2);
  const lngMin = ((lngAbs - lngDeg) * 60).toFixed(2);

  return {
    lat: `${latDeg}° ${latMin} ${latDir}`,
    lng: `${lngDeg}° ${lngMin} ${lngDir}`,
    raw: `(${lat.toFixed(6)}, ${lng.toFixed(6)})`,
  };
}

function MouseCoordinates() {
  const map = useMap();
  const [coords, setCoords] = useState<{ lat: string; lng: string; raw: string } | null>(null);

  useEffect(() => {
    // Remove Leaflet default "Leaflet ❤️ Ukraine" prefix
    map.attributionControl.setPrefix(false);

    const onMove = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setCoords(formatDMS(lat, lng));
    };

    map.on("mousemove", onMove);
    return () => {
      map.off("mousemove", onMove);
    };
  }, [map]);

  if (!coords) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 52,
        right: 15,
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(6px)",
        color: "#1a1a1a",
        padding: "8px 12px",
        borderRadius: "10px",
        fontSize: "13px",
        lineHeight: "1.35",
        zIndex: 1000,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, monospace",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        border: "1px solid rgba(0,0,0,0.05)",
        userSelect: "none",
      }}
    >
      <div style={{ fontWeight: 600 }}>{coords.lat}</div>
      <div style={{ fontWeight: 600 }}>{coords.lng}</div>
      <div style={{ opacity: 0.6, marginTop: 2 }}>{coords.raw}</div>
    </div>
  );
}


function SearchControls({ ports }: { ports: any[] }) {
  const map = useMap();
  const [country, setCountry] = useState("");
  const [port, setPort] = useState("");

  // Helpers (case-insensitive exact match)
  const normalize = (s: string) => (s || "").trim().toLowerCase();
  const exactMatch = (options: string[], value: string) => {
    const v = normalize(value);
    if (!v) return "";
    const hit = options.find(o => normalize(o) === v);
    return hit || "";
  };

  // Option lists
  const countries = useMemo(
    () =>
      Array.from(
        new Set(
          ports
            .map((p) => (p.country || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [ports]
  );

  const selectedCountry = useMemo(() => exactMatch(countries, country), [countries, country]);

  const countryPorts = useMemo(() => {
    if (!selectedCountry) return ports;
    const n = normalize(selectedCountry);
    return ports.filter((p) => normalize(p.country || "") === n);
  }, [ports, selectedCountry]);

  const portNames = useMemo(
    () =>
      Array.from(
        new Set(
          countryPorts
            .map((p) => (p.name || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [countryPorts]
  );

  const selectedPort = useMemo(() => exactMatch(portNames, port), [portNames, port]);

  const zoomToCountry = (countryName: string) => {
    const name = normalize(countryName);
    if (!name) return;
    const pts = ports
      .filter((p) => normalize(p.country || "") === name)
      .filter((p) => typeof p.lat === "number" && typeof p.lng === "number");

    if (!pts.length) return;

    const bounds = L.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  };

  const zoomToPort = (portName: string) => {
    const name = normalize(portName);
    if (!name) return;

    const p = ports.find((x) => normalize(x.name || "") === name);
    if (!p || typeof p.lat !== "number" || typeof p.lng !== "number") return;

    map.setView([p.lat, p.lng], Math.max(map.getZoom(), 8), { animate: true });
  };

  // If user picked a country, but the current port doesn't belong to it, clear the port input.
  useEffect(() => {
    if (!selectedCountry) return;
    if (!port) return;
    if (selectedPort) return; // already valid within filtered list
    setPort("");
  }, [selectedCountry, port, selectedPort]);

  return (
    <div style={{
      position: "absolute",
      left: 12,
      top: 12,
      zIndex: 1000,
      display: "flex",
      gap: 10,
      alignItems: "center",
      padding: "10px 12px",
      borderRadius: 10,
      background: "rgba(255,255,255,0.92)",
      boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
      backdropFilter: "blur(6px)"
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 12, color: "#333" }}>Country</div>
        <input
          list="country-list"
          value={country}
          onChange={(e) => {
            const v = e.target.value;
            setCountry(v);
            const hit = exactMatch(countries, v);
            if (hit) zoomToCountry(hit);
          }}
          placeholder="Type a country…"
          style={{
            width: 220,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            outline: "none",
          }}
        />
        <datalist id="country-list">
          {countries.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 12, color: "#333" }}>Port</div>
        <input
          list="port-list"
          value={port}
          onChange={(e) => {
            const v = e.target.value;
            setPort(v);
            const hit = exactMatch(portNames, v);
            if (hit) zoomToPort(hit);
          }}
          placeholder={selectedCountry ? `Type a port in ${selectedCountry}…` : "Type a port…"}
          style={{
            width: 260,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            outline: "none",
          }}
        />
        <datalist id="port-list">
          {portNames.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>

      <button
        onClick={() => {
          setCountry("");
          setPort("");
          map.setView([20, 0], 2, { animate: true });
        }}
        style={{
          marginTop: 18,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.12)",
          background: "#fff",
          cursor: "pointer",
          fontWeight: 600
        }}
        title="Reset"
      >
        Reset
      </button>
    </div>
  );
}



function ZoomLevelControl({ top = 120, left = 12 }: { top?: number; left?: number }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on("zoomend", onZoom);
    return () => {
      map.off("zoomend", onZoom);
    };
  }, [map]);

  const btnStyle = {
    width: 34,
    height: 34,
    border: "none",
    background: "rgba(255,255,255,0.92)",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: "34px",
  };

  return (
    <div
      className="leaflet-control"
      style={{
        position: "absolute",
        top,
        left,
        zIndex: 1000,
        boxShadow: "0 1px 5px rgba(0,0,0,0.2)",
        borderRadius: 4,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <button aria-label="Zoom in" style={btnStyle} onClick={() => map.zoomIn()}>
        +
      </button>
      <div
        aria-label="Current zoom"
        style={{
          width: 34,
          height: 30,
          background: "rgba(255,255,255,0.92)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          borderTop: "1px solid rgba(0,0,0,0.12)",
          borderBottom: "1px solid rgba(0,0,0,0.12)",
        }}
      >
        {zoom}
      </div>
      <button aria-label="Zoom out" style={btnStyle} onClick={() => map.zoomOut()}>
        −
      </button>
    </div>
  );
}

function Watermark() {
  return (
    <div
      style={{
        position: "absolute",
        right: 8,
        bottom: 8,
        zIndex: 1000,
        fontSize: 11,
        padding: "3px 8px",
        borderRadius: 6,
        background: "rgba(255, 255, 255, 0.72)",
        color: "rgba(0,0,0,0.65)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      Developed by Capt. Alexander Nazarov
    </div>
  );
}

type BaseMap =
  | "osm"
  | "osmHot"
  | "cartoLight"
  | "cartoDark"
  | "cartoVoyager"
  | "esriSat"
  | "esriStreet"
  | "esriTopo"
  | "nasaBlueMarble"
  | "nasaNightLights"
  | "openTopo"
  | "nautical";

type LayerMenuProps = {
  baseMap: BaseMap;
  setBaseMap: (v: BaseMap) => void;
  showPorts: boolean;
  setShowPorts: (v: boolean) => void;
  showSeamarks: boolean;
  setShowSeamarks: (v: boolean) => void;
  showEEZ: boolean;
  setShowEEZ: (v: boolean) => void;
  showBathymetry: boolean;
  setShowBathymetry: (v: boolean) => void;
  showRailways: boolean;
  setShowRailways: (v: boolean) => void;
};

function LayerMenu({
  baseMap,
  setBaseMap,
  showPorts,
  setShowPorts,
  showSeamarks,
  setShowSeamarks,
  showEEZ,
  setShowEEZ,
  showBathymetry,
  setShowBathymetry,
  showRailways,
  setShowRailways,
}: LayerMenuProps) {
  const [open, setOpen] = useState(false);

  const toggleOpen = () => setOpen((v) => !v);

  return (
    <div className="layer-ui">
      <button
        type="button"
        className={"ui-btn layer-btn" + (open ? " is-active" : "")}
        aria-label="Layers"
        onClick={toggleOpen}
      >
        ▤
      </button>

      {open && (
        <div className="layer-menu" role="dialog" aria-label="Map layers">
          <div className="layer-menu-header">
            <div className="layer-menu-title">Map type</div>
            <button
              type="button"
              className="ui-btn layer-close"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="layer-menu-body">
            <div className="layer-section">
              {[
                ["osm", "OpenStreetMap"],
                ["osmHot", "OpenStreetMap HOT"],
                ["cartoLight", "Carto Light"],
                ["cartoDark", "Carto Dark"],
                ["cartoVoyager", "Carto Voyager"],
                ["esriSat", "Esri Satellite"],
                ["esriStreet", "Esri Street Map"],
                ["esriTopo", "Esri Topographic"],
                ["openTopo", "OpenTopoMap"],
                ["nautical", "Nautical (OSM + Seamarks)"],
              ].map(([key, label]) => (
                <label key={key} className="layer-item">
                  <input
                    type="radio"
                    name="basemap"
                    checked={baseMap === key}
                    onChange={() => setBaseMap(key as BaseMap)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="layer-divider" />

            <div className="layer-section">
              <div className="layer-section-title">Overlays</div>

              <label className="layer-item">
                <input type="checkbox" checked={showPorts} onChange={(e) => setShowPorts(e.target.checked)} />
                <span>Ports (all)</span>
              </label>

              <label className="layer-item">
                <input type="checkbox" checked={showSeamarks} onChange={(e) => setShowSeamarks(e.target.checked)} />
                <span>OpenSeaMap Seamarks</span>
              </label>

              <label className="layer-item">
                <input type="checkbox" checked={showEEZ} onChange={(e) => setShowEEZ(e.target.checked)} />
                <span>EEZ Maritime Boundaries</span>
              </label>

              <label className="layer-item">
                <input
                  type="checkbox"
                  checked={showBathymetry}
                  onChange={(e) => setShowBathymetry(e.target.checked)}
                />
                <span>Bathymetry (EMODnet)</span>
              </label>

              <label className="layer-item">
                <input type="checkbox" checked={showRailways} onChange={(e) => setShowRailways(e.target.checked)} />
                <span>Railways (OpenRailwayMap)</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeafletMap() {
  const [baseMap, setBaseMap] = useState<BaseMap>("osm");
  const [showPorts, setShowPorts] = useState(true);
  const [showSeamarks, setShowSeamarks] = useState(true);
  const [showEEZ, setShowEEZ] = useState(true);
  const [showBathymetry, setShowBathymetry] = useState(true);
  const [showRailways, setShowRailways] = useState(false);
  const seamarksEnabled = showSeamarks || baseMap === "nautical";

  return (
    <div style={{ height: "90vh", width: "100%" }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: "100%", width: "100%" }}
        attributionControl={true}
        zoomControl={false}
      >
        {/* Base maps */}
        {baseMap === "osm" && (
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        )}
        {baseMap === "osmHot" && (
          <TileLayer url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png" />
        )}        {baseMap === "cyclOSM" && (
          <TileLayer url="https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png" />
        )}        {baseMap === "cartoLight" && (
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        )}
        {baseMap === "cartoDark" && (
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        )}
        {baseMap === "cartoVoyager" && (
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        )}
        {baseMap === "esriSat" && (
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        )}
        {baseMap === "esriStreet" && (
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" />
        )}
        {baseMap === "esriTopo" && (
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}" />
        )}        {baseMap === "openTopo" && (
          <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" />
        )}
        {baseMap === "nasaBlueMarble" && (
          <TileLayer
            url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief/default/2013-12-01/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg"
            attribution="&copy; NASA GIBS"
            maxZoom={9}
          />
        )}
        {baseMap === "nasaNightLights" && (
          <TileLayer
            url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/2012-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg"
            attribution="&copy; NASA GIBS"
            maxZoom={8}
          />
        )}
        {baseMap === "nautical" && (
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        )}

        {/* Overlays */}
        {showPorts && (
          <LayerGroup>
            {(ports as any[]).map((p) => (
              <Marker key={p.id} position={[p.lat, p.lng]}>
                <Popup>
                  <b>{p.name}</b>
                  <br />
                  {p.country}
                </Popup>
              </Marker>
            ))}
          </LayerGroup>
        )}

        {seamarksEnabled && (
          <TileLayer url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png" opacity={0.9} />
        )}

        {showEEZ && (
          <WMSTileLayer
            url="https://geo.vliz.be/geoserver/MarineRegions/wms"
            layers="MarineRegions:eez"
            format="image/png"
            transparent
            opacity={0.6}
          />
        )}

        {showBathymetry && (
          <WMSTileLayer
            url="https://ows.emodnet-bathymetry.eu/wms"
            layers="emodnet:mean_multicolour"
            format="image/png"
            transparent
            opacity={0.6}
          />
        )}
        {showRailways && (
          <TileLayer
            url="https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png"
            opacity={0.85}
          />
        )}
        <SearchControls ports={ports as any} />
        <ZoomLevelControl />
        <LayerMenu
        baseMap={baseMap}
        setBaseMap={setBaseMap}
        showPorts={showPorts}
        setShowPorts={setShowPorts}
        showSeamarks={showSeamarks}
        setShowSeamarks={setShowSeamarks}
        showEEZ={showEEZ}
        setShowEEZ={setShowEEZ}
        showBathymetry={showBathymetry}
        setShowBathymetry={setShowBathymetry}
        showRailways={showRailways}
        setShowRailways={setShowRailways}
      />
        <Watermark />
        <MouseCoordinates />
      </MapContainer>
    </div>
  );
}
