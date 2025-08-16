import polyline from '@mapbox/polyline';

export function decodePolyline(encodedPolyline: string) {
  // Decode the polyline into an array of [latitude, longitude] coordinates
  const coordinates = polyline.decode(encodedPolyline);
  
  // Convert the coordinates into an array of {latitude, longitude} objects
  // which is more useful for React Native Maps
  return coordinates.map(([lat, lng]) => ({
    latitude: lat,
    longitude: lng
  }));
}
