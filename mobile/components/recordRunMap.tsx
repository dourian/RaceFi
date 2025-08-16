import Map from "./map";
import { nycPolyline, appleParkPolyline, buildArrowMarkers } from "../src/helpers/polyline";

export default function RecordRunMap({ coords, watching }: { coords: { latitude: number; longitude: number; timestamp: number }[], watching: boolean }) {
    const movingPolyline = coords.map(coord => ({
        latitude: coord.latitude,
        longitude: coord.longitude,
    }));

    type LatLng = { latitude: number; longitude: number };


    const arrowMarkers = buildArrowMarkers(nycPolyline);
    
    return (    
    <Map
        showsUserLocation={true}
        followsUserLocation={watching}
        alterMapEnabled={true}
        movingPolyline={movingPolyline}
        staticPolyline={nycPolyline}
        arrowMarkers={arrowMarkers}
    />
    )
}