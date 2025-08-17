import { buildArrowMarkers, decodePolyline } from "../helpers/polyline";
import Map from "./map";
import polyline from "@mapbox/polyline";

export default function RecordRunMap({
  coords,
  watching,
  recenterToRouteTrigger,
  staticPolyline,
}: {
  coords: { latitude: number; longitude: number; timestamp: number }[];
  watching: boolean;
  recenterToRouteTrigger?: number;
  staticPolyline: { latitude: number; longitude: number }[];
}) {
  const movingPolyline = coords.map((coord) => ({
    latitude: coord.latitude,
    longitude: coord.longitude,
  }));

  const arrowMarkers = buildArrowMarkers(staticPolyline);

  return (
    <Map
      showsUserLocation={true}
      followsUserLocation={watching}
      alterMapEnabled={true}
      movingPolyline={movingPolyline}
      staticPolyline={staticPolyline}
      arrowMarkers={arrowMarkers}
      recenterToRouteTrigger={recenterToRouteTrigger}
    />
  );
}
