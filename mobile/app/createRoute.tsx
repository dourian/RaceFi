import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Polyline, Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { colors, spacing, typography, shadows } from "./theme";
import { RouteStorage } from "../utils/routeStorage";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface RoutePoint {
  latitude: number;
  longitude: number;
  id: string;
}

export default function CreateRouteScreen() {
  const params = useLocalSearchParams();
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [region, setRegion] = useState<Region>({
    latitude: 37.3318,
    longitude: -122.0312,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [routeDistance, setRouteDistance] = useState(0);
  const mapRef = useRef<MapView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Load existing route points and set initial map region
  useEffect(() => {
    const initializeMap = async () => {
      // First, try to load existing route points
      if (params.existingPoints && typeof params.existingPoints === 'string') {
        try {
          const points = JSON.parse(params.existingPoints);
          if (Array.isArray(points) && points.length > 0) {
            setRoutePoints(points);
            updateRouteDistance(points);
            
            // Center map on existing route
            const bounds = getRouteBounds(points);
            if (bounds) {
              setRegion(bounds);
              return; // Exit early if we have route data
            }
          }
        } catch (error) {
          console.error('Error parsing existing points:', error);
        }
      }
      
      // If no route exists, center on user's current location
      await getCurrentLocation();
    };
    
    initializeMap();
  }, [params.existingPoints]);
  
  // Calculate bounds for existing route
  const getRouteBounds = (points: RoutePoint[]) => {
    if (points.length === 0) return null;
    
    let minLat = points[0].latitude;
    let maxLat = points[0].latitude;
    let minLng = points[0].longitude;
    let maxLng = points[0].longitude;
    
    points.forEach(point => {
      minLat = Math.min(minLat, point.latitude);
      maxLat = Math.max(maxLat, point.latitude);
      minLng = Math.min(minLng, point.longitude);
      maxLng = Math.max(maxLng, point.longitude);
    });
    
    const padding = 0.005; // Add some padding around the route
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat + padding, 0.01),
      longitudeDelta: Math.max(maxLng - minLng + padding, 0.01),
    };
  };

  // Get user's current location
  const getCurrentLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Location permission denied, using default location");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      console.error("Error getting location:", error);
      // Keep default region if location fails
    }
  }, []);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Update total route distance
  const updateRouteDistance = useCallback((points: RoutePoint[]) => {
    if (points.length < 2) {
      setRouteDistance(0);
      return;
    }

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += calculateDistance(
        points[i - 1].latitude,
        points[i - 1].longitude,
        points[i].latitude,
        points[i].longitude
      );
    }
    setRouteDistance(totalDistance);
  }, [calculateDistance]);


  // Handle map tap to add route points
  const handleMapPress = useCallback((event: any) => {
    if (!isCreatingRoute) return;

    const { latitude, longitude } = event.nativeEvent.coordinate;
    const newPoint: RoutePoint = {
      latitude,
      longitude,
      id: Date.now().toString(),
    };

    const updatedPoints = [...routePoints, newPoint];
    setRoutePoints(updatedPoints);
    updateRouteDistance(updatedPoints);

    // Animate new point appearance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isCreatingRoute, routePoints, updateRouteDistance, fadeAnim, scaleAnim]);

  // Start creating route
  const startCreatingRoute = useCallback(() => {
    setIsCreatingRoute(true);
    setRoutePoints([]);
    setRouteDistance(0);
  }, []);

  // Stop creating route
  const stopCreatingRoute = useCallback(() => {
    setIsCreatingRoute(false);
  }, []);

  // Undo last point
  const undoLastPoint = useCallback(() => {
    if (routePoints.length === 0) return;
    
    const updatedPoints = routePoints.slice(0, -1);
    setRoutePoints(updatedPoints);
    updateRouteDistance(updatedPoints);
  }, [routePoints, updateRouteDistance]);

  // Clear all points
  const clearRoute = useCallback(() => {
    Alert.alert(
      "Clear Route",
      "Are you sure you want to clear all points?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            setRoutePoints([]);
            setRouteDistance(0);
            setIsCreatingRoute(false);
          },
        },
      ]
    );
  }, []);

  // Save route and return to challenge creation
  const saveRoute = useCallback(async () => {
    if (routePoints.length < 2) {
      Alert.alert("Incomplete Route", "Please add at least 2 points to create a route");
      return;
    }

    try {
      // Get location information for the route
      let locationString: string | undefined;
      try {
        const LocationService = require('../services/locationService').LocationService;
        const locationInfo = await LocationService.getLocationFromRoute(routePoints);
        if (locationInfo) {
          locationString = LocationService.getSimplifiedLocation(locationInfo);
        }
      } catch (locationError) {
        console.warn('Could not get location for route:', locationError);
        // Continue without location - it's optional
      }

      // Create route data with proper polyline encoding
      const routeData = {
        points: routePoints,
        distance: routeDistance,
        polyline: RouteStorage.encodePolyline(routePoints),
        createdAt: new Date().toISOString(),
        location: locationString,
      };

      // Save route data temporarily
      await RouteStorage.saveTemporaryRoute(routeData);
      
      console.log('Route saved:', {
        pointCount: routePoints.length,
        distance: routeDistance,
        polyline: routeData.polyline,
        location: locationString
      });

      // Return to challenge creation
      router.back();
    } catch (error) {
      console.error('Error saving route:', error);
      Alert.alert('Error', 'Failed to save route. Please try again.');
    }
  }, [routePoints, routeDistance]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <View style={styles.container}>
        {/* Map */}
        <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton={false}
          mapType="standard"
        >
          {/* Route polyline */}
          {routePoints.length > 1 && (
            <Polyline
              coordinates={routePoints}
              strokeColor={colors.accent}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* Route markers */}
          {routePoints.map((point, index) => (
            <Marker
              key={point.id}
              coordinate={point}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[
                styles.markerContainer,
                index === 0 && styles.startMarker,
                index === routePoints.length - 1 && index > 0 && styles.endMarker,
              ]}>
                <View style={styles.markerInner}>
                  <Text style={styles.markerText}>
                    {index === 0 ? "S" : index === routePoints.length - 1 && index > 0 ? "F" : index + 1}
                  </Text>
                </View>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Header */}
        <SafeAreaView style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Create Route</Text>
            <Text style={styles.headerSubtitle}>
              {isCreatingRoute ? "Tap to add points" : "Design your challenge route"}
            </Text>
          </View>

          <Pressable style={styles.locationButton} onPress={getCurrentLocation}>
            <Ionicons name="locate" size={20} color={colors.accent} />
          </Pressable>
        </SafeAreaView>

        {/* Route Info Panel */}
        {routePoints.length > 0 && (
          <View style={styles.routeInfoPanel}>
            <View style={styles.routeStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{routePoints.length}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{routeDistance.toFixed(2)} km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
            </View>
          </View>
        )}

        {/* Control Panel */}
        <View style={styles.controlPanel}>
          {!isCreatingRoute ? (
            <Pressable style={styles.primaryButton} onPress={startCreatingRoute}>
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.primaryButtonText}>Start Creating Route</Text>
            </Pressable>
          ) : (
            <View style={styles.editingControls}>
              <View style={styles.editingButtonsRow}>
                <Pressable 
                  style={[styles.controlButton, styles.undoButton]} 
                  onPress={undoLastPoint}
                  disabled={routePoints.length === 0}
                >
                  <Ionicons name="arrow-undo" size={18} color={routePoints.length === 0 ? colors.textMuted : colors.accent} />
                  <Text style={[styles.controlButtonText, routePoints.length === 0 && styles.disabledText]}>
                    Undo
                  </Text>
                </Pressable>

                <Pressable style={[styles.controlButton, styles.clearButton]} onPress={clearRoute}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={[styles.controlButtonText, { color: "#ef4444" }]}>Clear</Text>
                </Pressable>

                <Pressable style={[styles.controlButton, styles.stopButton]} onPress={stopCreatingRoute}>
                  <Ionicons name="stop" size={18} color={colors.accent} />
                  <Text style={styles.controlButtonText}>Stop</Text>
                </Pressable>
              </View>

              {routePoints.length >= 2 && (
                <Pressable style={styles.saveButton} onPress={saveRoute}>
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.saveButtonText}>Save Route</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Instructions overlay */}
        {isCreatingRoute && routePoints.length === 0 && (
          <View style={styles.instructionsOverlay}>
            <View style={styles.instructionsBubble}>
              <Ionicons name="hand-left" size={24} color={colors.accent} />
              <Text style={styles.instructionsText}>Tap on the map to add your first point</Text>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    ...shadows.card,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.button,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    ...typography.meta,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.button,
  },
  routeInfoPanel: {
    position: "absolute",
    top: 120,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    padding: spacing.md,
    ...shadows.card,
  },
  routeStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    ...typography.h2,
    fontSize: 20,
    fontWeight: "800",
    color: colors.accent,
  },
  statLabel: {
    ...typography.meta,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  controlPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    gap: spacing.sm,
    ...shadows.button,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  editingControls: {
    gap: spacing.md,
  },
  editingButtonsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  controlButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  disabledText: {
    color: colors.textMuted,
  },
  undoButton: {
    borderColor: colors.accent,
  },
  clearButton: {
    borderColor: "#ef4444",
  },
  stopButton: {
    borderColor: colors.accent,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    gap: spacing.sm,
    ...shadows.button,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "white",
    ...shadows.button,
  },
  startMarker: {
    backgroundColor: "#22c55e",
  },
  endMarker: {
    backgroundColor: "#ef4444",
  },
  markerInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  markerText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  instructionsOverlay: {
    position: "absolute",
    top: "50%",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
    transform: [{ translateY: -50 }],
  },
  instructionsBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(252, 82, 0, 0.95)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 25,
    gap: spacing.sm,
    ...shadows.medium,
  },
  instructionsText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
});
