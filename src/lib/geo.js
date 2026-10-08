/**
 * Stylised geo helpers. The prototype never calls a real geocoder: incident
 * coordinates are deterministic percentages on the dispatcher map, and these
 * functions turn them into plausible lat/lng + grid-cell values for the UI and
 * the AI payload.
 */

const ORIGIN = { lat: 37.7749, lng: -122.4194 };
const DEGREES_PER_PERCENT = 0.0016;

export function toLatLng({ x, y }) {
  return {
    lat: (ORIGIN.lat + (y - 50) * DEGREES_PER_PERCENT).toFixed(4),
    lng: (ORIGIN.lng + (x - 50) * DEGREES_PER_PERCENT).toFixed(4),
  };
}

export function toCoordinates({ x, y }) {
  const { lat, lng } = toLatLng({ x, y });
  return { lat: Number(lat), lng: Number(lng) };
}

export function gridCellFor({ x, y }) {
  const column = Math.min(8, Math.floor(x / 12.5) + 1);
  const row = Math.min(8, Math.floor(y / 12.5) + 1);
  return `GRID-7.${column}${row}`;
}
