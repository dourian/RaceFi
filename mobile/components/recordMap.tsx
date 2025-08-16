import { useEffect, useRef, useState } from "react";
import MapView, { Polyline, Marker } from "react-native-maps";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";
import { useLocation } from "../contexts/locationContext";

interface RecordMapProps {
  coords: { latitude: number; longitude: number; timestamp: number }[];
  watching: boolean;
  style?: any;
}

export default function RecordMap({ coords, watching, style }: RecordMapProps) {
  const [isGuest, setIsGuest] = useState(false);
  const [followUser, setFollowUser] = useState(false);
  const followTimeoutRef = useRef<number | null>(null);
  const [manualInteraction, setManualInteraction] = useState(false);
  const { currentLocation, location, getCurrentLocation, locationPermission } =
    useLocation();
  const mapRef = useRef<MapView>(null);
  const interactionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentLocation) {
      const getLocation = async () => {
        await getCurrentLocation();
      };
      getLocation();
    }
  }, [currentLocation, getCurrentLocation]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
      if (followTimeoutRef.current) {
        clearTimeout(followTimeoutRef.current);
      }
    };
  }, []);

  // Only auto-zoom to fit path when run starts (first few coordinates) or when explicitly requested
  useEffect(() => {
    // Only auto-fit when:
    // 1. We have a few initial coordinates (run just started)
    // 2. No manual interaction has occurred
    // 3. Not currently following user
    if (
      coords.length >= 2 &&
      coords.length <= 5 &&
      mapRef.current &&
      !manualInteraction &&
      !followUser
    ) {
      const coordinates = coords.map((coord) => ({
        latitude: coord.latitude,
        longitude: coord.longitude,
      }));

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 100,
          right: 100,
          bottom: 100,
          left: 100,
        },
        animated: true,
      });
    }
  }, [coords.length, manualInteraction, followUser]);

  // Helper function to mark manual interaction
  const markManualInteraction = (duration = 15000) => {
    setManualInteraction(true);

    // Stop following user when they manually interact
    setFollowUser(false);
    if (followTimeoutRef.current) {
      clearTimeout(followTimeoutRef.current);
      followTimeoutRef.current = null;
    }

    // Clear any existing timeout
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }

    // Set new timeout to allow auto-zoom again after duration
    interactionTimeoutRef.current = window.setTimeout(() => {
      setManualInteraction(false);
    }, duration);
  };

  // Toggle location tracking
  const toggleLocationTracking = () => {
    if (followUser) {
      // Stop following
      setFollowUser(false);
      if (followTimeoutRef.current) {
        clearTimeout(followTimeoutRef.current);
        followTimeoutRef.current = null;
      }
    } else {
      // Start following
      if (mapRef.current && (currentLocation || location)) {
        const userLocation = currentLocation || location;
        if (userLocation) {
          setFollowUser(true);
          mapRef.current.animateToRegion(
            {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            },
            1000,
          );

          // Set a long timeout as a fallback (5 minutes) in case user forgets to turn it off
          followTimeoutRef.current = window.setTimeout(() => {
            setFollowUser(false);
            followTimeoutRef.current = null;
          }, 300000); // 5 minutes
        }
      }
    }
  };

  const zoomIn = async () => {
    if (mapRef.current) {
      try {
        // Mark manual interaction - prevent auto-zoom for longer
        markManualInteraction(20000); // 20 seconds

        // Get current region
        const region = await mapRef.current.getMapBoundaries();
        const currentRegion = {
          latitude: (region.northEast.latitude + region.southWest.latitude) / 2,
          longitude:
            (region.northEast.longitude + region.southWest.longitude) / 2,
          latitudeDelta: Math.abs(
            region.northEast.latitude - region.southWest.latitude,
          ),
          longitudeDelta: Math.abs(
            region.northEast.longitude - region.southWest.longitude,
          ),
        };

        // Zoom in by reducing the deltas
        mapRef.current.animateToRegion(
          {
            ...currentRegion,
            latitudeDelta: currentRegion.latitudeDelta * 0.5,
            longitudeDelta: currentRegion.longitudeDelta * 0.5,
          },
          300,
        );
      } catch (error) {
        console.log("Zoom in error:", error);
      }
    }
  };

  const zoomOut = async () => {
    if (mapRef.current) {
      try {
        // Mark manual interaction - prevent auto-zoom for longer
        markManualInteraction(20000); // 20 seconds

        // Get current region
        const region = await mapRef.current.getMapBoundaries();
        const currentRegion = {
          latitude: (region.northEast.latitude + region.southWest.latitude) / 2,
          longitude:
            (region.northEast.longitude + region.southWest.longitude) / 2,
          latitudeDelta: Math.abs(
            region.northEast.latitude - region.southWest.latitude,
          ),
          longitudeDelta: Math.abs(
            region.northEast.longitude - region.southWest.longitude,
          ),
        };

        // Zoom out by increasing the deltas (with limit)
        const newLatDelta = Math.min(currentRegion.latitudeDelta * 2, 1); // Max zoom out
        const newLngDelta = Math.min(currentRegion.longitudeDelta * 2, 1);

        mapRef.current.animateToRegion(
          {
            ...currentRegion,
            latitudeDelta: newLatDelta,
            longitudeDelta: newLngDelta,
          },
          300,
        );
      } catch (error) {
        console.log("Zoom out error:", error);
      }
    }
  };

  if (!isGuest && locationPermission !== "granted") {
    return (
      <View style={[styles.container, style]}>
        <TouchableOpacity
          style={styles.guestButton}
          onPress={() => setIsGuest(true)}
        >
          <Text style={styles.buttonText}>Continue as Guest</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Use current location or first coordinate as initial region
  const initialLocation =
    currentLocation || location || (coords.length > 0 ? coords[0] : null);

  if (!initialLocation && !isGuest) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: initialLocation?.latitude || 37.78825,
          longitude: initialLocation?.longitude || -122.4324,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        showsUserLocation={!isGuest && watching}
        showsMyLocationButton={false} // We'll use our custom button
        rotateEnabled={false}
        zoomEnabled={true}
        followsUserLocation={followUser || (watching && coords.length === 0)} // Follow when button pressed or starting
        onTouchStart={() => {
          // Mark manual interaction when user starts touching the map
          markManualInteraction(15000); // 15 seconds
        }}
      >
        {/* Show the recorded path */}
        {coords.length > 1 && (
          <Polyline
            coordinates={coords.map((coord) => ({
              latitude: coord.latitude,
              longitude: coord.longitude,
            }))}
            strokeColor="#e64a00" // Orange color matching the theme
            strokeWidth={4}
            lineJoin="round"
            lineCap="round"
          />
        )}
      </MapView>

      {/* Control buttons */}
      {!isGuest && locationPermission === "granted" && (
        <View style={styles.controlsContainer}>
          {/* Zoom buttons */}
          <View style={styles.zoomButtonsContainer}>
            <TouchableOpacity
              style={[styles.zoomButton, styles.zoomButtonTop]}
              onPress={zoomIn}
              activeOpacity={0.7}
            >
              <Text style={styles.zoomButtonText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.zoomButton, styles.zoomButtonBottom]}
              onPress={zoomOut}
              activeOpacity={0.7}
            >
              <Text style={styles.zoomButtonText}>−</Text>
            </TouchableOpacity>
          </View>

          {/* Location tracking button - only show when actively recording */}
          {watching && (
            <TouchableOpacity
              style={styles.locationButton}
              onPress={toggleLocationTracking}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.locationButtonInner,
                  followUser && styles.locationButtonActive,
                ]}
              >
                <Text style={styles.locationButtonIcon}>
                  {followUser ? "📍" : "🎯"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Recording indicator */}
      {watching && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording</Text>
        </View>
      )}

      {/* Stats overlay */}
      {coords.length > 0 && watching && (
        <View style={styles.statsOverlay}>
          {coords.length > 1 && (
            <>
              <Text style={styles.statsText}>
                Distance: {(calculateDistance(coords) / 1000).toFixed(2)}km
              </Text>
              <Text style={styles.statsText}>
                Pace: {calculatePace(coords)}
              </Text>
            </>
          )}
          {coords.length === 1 && (
            <Text style={styles.statsText}>Starting...</Text>
          )}
        </View>
      )}
    </View>
  );
}

// Helper function to calculate approximate distance
function calculateDistance(
  coords: { latitude: number; longitude: number }[],
): number {
  if (coords.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];

    // Simple distance calculation (Haversine formula approximation)
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = (prev.latitude * Math.PI) / 180;
    const lat2Rad = (curr.latitude * Math.PI) / 180;
    const deltaLatRad = ((curr.latitude - prev.latitude) * Math.PI) / 180;
    const deltaLngRad = ((curr.longitude - prev.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLngRad / 2) *
        Math.sin(deltaLngRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    totalDistance += R * c;
  }

  return totalDistance;
}

// Helper function to calculate current pace per kilometer
function calculatePace(
  coords: { latitude: number; longitude: number; timestamp: number }[],
): string {
  if (coords.length < 2) return "--:--";

  // Calculate total distance in kilometers
  const totalDistance = calculateDistance(coords) / 1000;

  // Calculate total time in minutes
  const startTime = coords[0].timestamp;
  const endTime = coords[coords.length - 1].timestamp;
  const totalTimeMinutes = (endTime - startTime) / (1000 * 60);

  // If distance is too small or time is too short, return waiting message
  if (totalDistance < 0.01 || totalTimeMinutes < 0.1) {
    return "--:--";
  }

  // Calculate pace in minutes per kilometer
  const paceMinutesPerKm = totalTimeMinutes / totalDistance;

  // Convert to minutes and seconds
  const minutes = Math.floor(paceMinutesPerKm);
  const seconds = Math.round((paceMinutesPerKm - minutes) * 60);

  // Handle edge cases for very slow or very fast paces
  if (minutes > 30) return "30:00+";
  if (minutes < 0) return "--:--";

  // Format as MM:SS
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
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
    alignSelf: "center",
    marginTop: "50%",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
    marginTop: "50%",
  },
  recordingIndicator: {
    position: "absolute",
    top: 20,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  recordingDot: {
    width: 8,
    height: 8,
    backgroundColor: "#ff4444",
    borderRadius: 4,
    marginRight: 8,
  },
  recordingText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  statsOverlay: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statsText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  locationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  locationButtonInner: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  locationButtonActive: {
    backgroundColor: "#e3f2fd",
  },
  locationButtonIcon: {
    fontSize: 18,
  },
  controlsContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
    alignItems: "center",
  },
  zoomButtonsContainer: {
    marginBottom: 12,
  },
  zoomButton: {
    width: 44,
    height: 44,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomButtonTop: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  zoomButtonBottom: {
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  zoomButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
});
