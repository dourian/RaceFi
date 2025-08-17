import Map from "./map";

export default function RecordRunMap({
  coords,
  watching,
  recenterToRouteTrigger,
}: {
  coords: { latitude: number; longitude: number; timestamp: number }[];
  watching: boolean;
  recenterToRouteTrigger?: number;
}) {
  const movingPolyline = coords.map((coord) => ({
    latitude: coord.latitude,
    longitude: coord.longitude,
  }));

  return (
    <Map
      showsUserLocation={true}
      followsUserLocation={watching}
      alterMapEnabled={true}
      movingPolyline={movingPolyline}
      recenterToRouteTrigger={recenterToRouteTrigger}
    />
  );
}
