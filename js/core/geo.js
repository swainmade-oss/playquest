/**
 * Geolocation helpers for park selection.
 * - Ask for location (only after the kid/parent taps "Find my park")
 * - Sort parks by distance; suggest the nearest park when it's within NEAR_METERS
 * - If permission is denied/unavailable the manual list still works.
 */
export const NEAR_METERS = 200;

/** Great-circle distance in meters (haversine). */
export function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m) {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  if (m < 100000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m / 1000)} km`;
}

/** 'granted' | 'denied' | 'prompt' | 'unsupported' */
export async function permissionState() {
  if (!('geolocation' in navigator)) return 'unsupported';
  try {
    const p = await navigator.permissions?.query({ name: 'geolocation' });
    return p?.state || 'prompt';
  } catch {
    return 'prompt';
  }
}

/** Resolves to { lat, lng, accuracy } or rejects with a GeolocationPositionError. */
export function getPosition(timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('unsupported'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      reject,
      { enableHighAccuracy: true, timeout, maximumAge: 60000 },
    );
  });
}

/** Returns parks annotated with `distance` (meters) and sorted nearest-first. */
export function sortByDistance(parks, pos) {
  return parks
    .map((p) => ({ ...p, distance: distanceMeters(pos, p) }))
    .sort((a, b) => a.distance - b.distance);
}
