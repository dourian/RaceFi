import Map from "./map";
import { buildArrowMarkers, decodePolyline } from "../src/helpers/polyline";
import polyline from "@mapbox/polyline";

export default function RecordRunMap({ coords, watching, recenterToRouteTrigger }: { coords: { latitude: number; longitude: number; timestamp: number }[], watching: boolean, recenterToRouteTrigger?: number }) {
    const movingPolyline = coords.map(coord => ({
        latitude: coord.latitude,
        longitude: coord.longitude,
    }));

    const mockPolyline = decodePolyline("eo{bFzqzgV?L@L?J?L@JAL?N?L?JAL?L");

    const arrowMarkers = buildArrowMarkers(mockPolyline);
    
    return (    
    <Map
        showsUserLocation={true}
        followsUserLocation={watching}
        alterMapEnabled={true}
        movingPolyline={movingPolyline}
        staticPolyline={mockPolyline}
        arrowMarkers={arrowMarkers}
        recenterToRouteTrigger={recenterToRouteTrigger}
    />
    )
}