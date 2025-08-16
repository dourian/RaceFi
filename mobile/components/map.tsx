import { useEffect, useState } from "react";
import MapView, { Polyline, Marker } from "react-native-maps";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import theme from "../app/theme";
import { useLocation } from "../contexts/locationContext";

export default function Map({
  showsUserLocation,
  followsUserLocation,
  initialZoom = 0.01,
  alterMapEnabled,
  staticPolyline,
  movingPolyline,
  routeColor = "#e64a00",
  arrowMarkers,
  recenterToRouteTrigger,
}: {
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  alterMapEnabled?: boolean;
  initialZoom?: number;
  staticPolyline?: Array<{ latitude: number; longitude: number }>;
  movingPolyline?: Array<{ latitude: number; longitude: number }>;
  routeColor?: string;
  arrowMarkers?: Array<{
    coordinate: { latitude: number; longitude: number };
    bearing: number;
  }>;
  recenterToRouteTrigger?: number;
}) {
  const [isGuest, setIsGuest] = useState(false);
  const { currentLocation, getCurrentLocation, locationPermission } =
    useLocation();
  const [mapRef, setMapRef] = useState<MapView | null>(null);

  const getInitialRegionForRoute = () => {
    if (staticPolyline && staticPolyline.length > 0) {
      const lats = staticPolyline.map((coord) => coord.latitude);
      const lngs = staticPolyline.map((coord) => coord.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      const deltaLat = (maxLat - minLat) * 1.2;
      const deltaLng = (maxLng - minLng) * 1.2;

      return {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: Math.max(deltaLat),
        longitudeDelta: Math.max(deltaLng),
      };
    }
    return undefined;
  };

  const getInitialRegionForUser = () => {
    return {
      latitude: currentLocation?.latitude || 37.78825,
      longitude: currentLocation?.longitude || -122.4324,
      latitudeDelta: initialZoom,
      longitudeDelta: initialZoom,
    };
  };

  const getInitialRegion = () => {
    // If following the user, initialize around the user's current location
    if (followsUserLocation) {
      return getInitialRegionForUser();
    }

    // Otherwise, if there is a static route, initialize around the route
    const routeRegion = getInitialRegionForRoute();
    if (routeRegion) {
      return routeRegion;
    }

    // When recording without a static route, use the latest moving polyline point if available
    if (movingPolyline && movingPolyline.length > 0) {
      const last = movingPolyline[movingPolyline.length - 1];
      return {
        latitude: last.latitude,
        longitude: last.longitude,
        latitudeDelta: initialZoom,
        longitudeDelta: initialZoom,
      };
    }

    // Fallback to user location or default
    return getInitialRegionForUser();
  };

  const initialRegion = getInitialRegion();

  useEffect(() => {
    const getLocation = async () => {
      await getCurrentLocation();
    };
    getLocation();
  }, []);

  // When follow is toggled on (or user location updates while following), animate to user immediately
  useEffect(() => {
    if (followsUserLocation && mapRef && currentLocation) {
      const targetRegion = getInitialRegionForUser();
      // Animate quickly to give instant feedback
      // Small timeout ensures mapRef is ready after any re-render
      const id = setTimeout(() => {
        try {
          mapRef.animateToRegion(targetRegion, 400);
        } catch {}
      }, 0);
      return () => clearTimeout(id);
    }
  }, [followsUserLocation, currentLocation, mapRef]);

  // Recenter to the static route when triggered
  useEffect(() => {
    if (!recenterToRouteTrigger) return;
    if (!mapRef) return;
    if (!staticPolyline || staticPolyline.length === 0) return;
    // If we're actively following the user, do not recenter to the route to avoid camera tug-of-war
    if (followsUserLocation) return;
    try {
      mapRef.fitToCoordinates(staticPolyline, {
        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
        animated: true,
      });
    } catch {}
  }, [recenterToRouteTrigger, staticPolyline, mapRef, followsUserLocation]);

  if (!isGuest && locationPermission !== "granted") {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.guestButton}
          onPress={() => setIsGuest(true)}
        >
          <Text style={styles.buttonText}>Continue as Guest</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={setMapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={showsUserLocation}
        rotateEnabled={alterMapEnabled}
        zoomEnabled={alterMapEnabled}
        followsUserLocation={followsUserLocation}
        scrollEnabled={alterMapEnabled}
        pitchEnabled={alterMapEnabled}
      >
        {staticPolyline && staticPolyline.length > 1 && (
          <Polyline
            coordinates={staticPolyline}
            strokeColor={routeColor}
            strokeWidth={4}
            lineJoin="round"
            lineCap="round"
          />
        )}
        {staticPolyline &&
          arrowMarkers &&
          arrowMarkers.map((m, idx) => (
            <Marker
              key={`static-arrow-${idx}`}
              coordinate={m.coordinate}
              anchor={{ x: 0.5, y: 0.5 }}
              flat
              rotation={(m.bearing - 90 + 360) % 360}
            >
              <View
                style={{
                  transform: [{ rotate: `${(m.bearing - 90 + 360) % 360}deg` }],
                }}
              >
                <Ionicons
                  name="caret-forward-outline"
                  size={14}
                  color={routeColor}
                />
              </View>
            </Marker>
          ))}
        {staticPolyline && !arrowMarkers && staticPolyline.length > 1 && (
          <>
            <Marker
              coordinate={staticPolyline[0]}
              pinColor="green"
              tracksViewChanges={false}
            />
            <Marker
              coordinate={staticPolyline[staticPolyline.length - 1]}
              pinColor={theme.colors.accent}
              tracksViewChanges={false}
            />
          </>
        )}
        {movingPolyline && movingPolyline.length > 1 && (
          <Polyline
            coordinates={movingPolyline}
            strokeColor={routeColor}
            strokeWidth={4}
            lineJoin="round"
            lineCap="round"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  guestButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
