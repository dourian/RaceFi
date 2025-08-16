import polyline from "@mapbox/polyline";
import { LatLng } from "react-native-maps";

export function decodePolyline(encodedPolyline: string) {
  // Decode the polyline into an array of [latitude, longitude] coordinates
  const coordinates = polyline.decode(encodedPolyline);

  // Convert the coordinates into an array of {latitude, longitude} objects
  // which is more useful for React Native Maps
  return coordinates.map(([lat, lng]) => ({
    latitude: lat,
    longitude: lng,
  }));
}

const toRadians = (deg: number) => (deg * Math.PI) / 180;
const toDegrees = (rad: number) => (rad * 180) / Math.PI;

const computeBearing = (from: LatLng, to: LatLng) => {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (toDegrees(Math.atan2(y, x)) + 360) % 360; // 0 = north, clockwise
  return brng;
};

const haversineMeters = (a: LatLng, b: LatLng) => {
  const R = 6371000;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
};

export const buildArrowMarkers = (
  points?: LatLng[],
  approxIntervalMeters: number = 500
) => {
  if (!points || points.length < 2)
    return [] as { coordinate: LatLng; bearing: number }[];
  const segmentLengths: number[] = [];
  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const len = haversineMeters(points[i], points[i + 1]);
    segmentLengths.push(len);
    totalDistance += len;
  }
  if (totalDistance === 0) return [];

  const MAX_MARKERS = 7; // set cap here
  const markerCount = Math.min(
    MAX_MARKERS,
    Math.max(1, Math.round(totalDistance / approxIntervalMeters))
  );
  const interval = totalDistance / markerCount;

  const markers: { coordinate: LatLng; bearing: number }[] = [];
  let accumulated = 0;
  let nextThreshold = interval;
  for (let i = 0; i < points.length - 1 && markers.length < markerCount; i++) {
    const start = points[i];
    const end = points[i + 1];
    const segDist = segmentLengths[i];
    if (segDist <= 0) {
      continue;
    }
    while (
      nextThreshold <= accumulated + segDist &&
      markers.length < markerCount
    ) {
      const distanceIntoSeg = nextThreshold - accumulated;
      const t = distanceIntoSeg / segDist;
      const coordinate = {
        latitude: start.latitude + (end.latitude - start.latitude) * t,
        longitude: start.longitude + (end.longitude - start.longitude) * t,
      };
      const bearing = computeBearing(start, end);
      markers.push({ coordinate, bearing });
      nextThreshold += interval;
    }
    accumulated += segDist;
  }
  return markers;
};

export const appleParkPolyline = [
  { latitude: 37.3349, longitude: -122.00532 },
  { latitude: 37.33645, longitude: -122.005816 },
  { latitude: 37.33758, longitude: -122.00717 },
  { latitude: 37.338, longitude: -122.00902 },
  { latitude: 37.33758, longitude: -122.01087 },
  { latitude: 37.33645, longitude: -122.012224 },
  { latitude: 37.3349, longitude: -122.01272 },
  { latitude: 37.33335, longitude: -122.012224 },
  { latitude: 37.33222, longitude: -122.01087 },
  { latitude: 37.3318, longitude: -122.00902 },
  { latitude: 37.33222, longitude: -122.00717 },
  { latitude: 37.33335, longitude: -122.005816 },
  { latitude: 37.3349, longitude: -122.00532 },
];

// This version makes the polyline 4x more dense by interpolating 3 points between each original pair
function interpolatePoints(p1, p2, numSegments) {
  const points = [];
  for (let i = 1; i < numSegments; i++) {
    const t = i / numSegments;
    points.push({
      latitude: p1.latitude + (p2.latitude - p1.latitude) * t,
      longitude: p1.longitude + (p2.longitude - p1.longitude) * t,
    });
  }
  return points;
}

const nycPolylineBase = [
  { latitude: 40.74015, longitude: -73.9969 },
  { latitude: 40.74015, longitude: -73.9959 },
  { latitude: 40.74195, longitude: -73.9959 },
  { latitude: 40.74195, longitude: -73.9998 },
  { latitude: 40.74015, longitude: -73.9998 },
];

// For each segment, interpolate 3 points between each pair (so 4x density)
export const nycPolyline = [];
for (let i = 0; i < nycPolylineBase.length - 1; i++) {
  const p1 = nycPolylineBase[i];
  const p2 = nycPolylineBase[i + 1];
  nycPolyline.push(p1, ...interpolatePoints(p1, p2, 4));
}
// Add the last point
nycPolyline.push(nycPolylineBase[nycPolylineBase.length - 1]);
