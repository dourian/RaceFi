import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Polyline, Marker } from "react-native-maps";
import { colors, spacing, typography, shadows } from "../app/theme";

const { width } = Dimensions.get("window");

interface RoutePoint {
  latitude: number;
  longitude: number;
  id: string;
}

interface RouteCreationPreviewProps {
  routePoints: RoutePoint[];
  distance: number;
  onEdit: () => void;
  onClear: () => void;
  style?: any;
}

export default function RouteCreationPreview({
  routePoints,
  distance,
  onEdit,
  onClear,
  style,
}: RouteCreationPreviewProps) {
  if (routePoints.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Route Created</Text>
          <Text style={styles.emptySubtitle}>
            Tap "Create Route" to design your challenge path
          </Text>
          <Pressable style={styles.createButton} onPress={onEdit}>
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.createButtonText}>Create Route</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Calculate map region to fit all points
  const getMapRegion = () => {
    if (routePoints.length === 0) return null;

    let minLat = routePoints[0].latitude;
    let maxLat = routePoints[0].latitude;
    let minLng = routePoints[0].longitude;
    let maxLng = routePoints[0].longitude;

    routePoints.forEach((point) => {
      minLat = Math.min(minLat, point.latitude);
      maxLat = Math.max(maxLat, point.latitude);
      minLng = Math.min(minLng, point.longitude);
      maxLng = Math.max(maxLng, point.longitude);
    });

    const padding = 0.001;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat + padding, 0.005),
      longitudeDelta: Math.max(maxLng - minLng + padding, 0.005),
    };
  };

  const region = getMapRegion();

  // Calculate directional markers - simplified approach
  const getDirectionalMarkers = () => {
    if (routePoints.length === 0) return [];
    
    const markers = [];
    
    // For routes with few points, show all points with numbers
    if (routePoints.length <= 5) {
      routePoints.forEach((point, index) => {
        markers.push({
          coordinate: point,
          number: index === 0 ? 1 : index === routePoints.length - 1 ? 'F' : index + 1,
          isStart: index === 0,
          isEnd: index === routePoints.length - 1 && index > 0,
          id: `marker-${index}`,
        });
      });
      return markers;
    }
    
    // For longer routes, show start, some middle points, and finish
    const step = Math.max(1, Math.floor(routePoints.length / 5));
    
    // Always add start
    markers.push({
      coordinate: routePoints[0],
      number: 1,
      isStart: true,
      isEnd: false,
      id: 'marker-start',
    });
    
    // Add middle markers
    for (let i = step; i < routePoints.length - 1; i += step) {
      markers.push({
        coordinate: routePoints[i],
        number: Math.floor(i / step) + 1,
        isStart: false,
        isEnd: false,
        id: `marker-${i}`,
      });
    }
    
    // Always add finish if more than 1 point
    if (routePoints.length > 1) {
      markers.push({
        coordinate: routePoints[routePoints.length - 1],
        number: 'F',
        isStart: false,
        isEnd: true,
        id: 'marker-finish',
      });
    }
    
    return markers;
  };
  
  const directionalMarkers = getDirectionalMarkers();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Route Preview</Text>
          <Text style={styles.subtitle}>
            {routePoints.length} points • {distance.toFixed(2)} km
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.actionButton} onPress={onEdit}>
            <Ionicons name="pencil" size={16} color={colors.accent} />
          </Pressable>
          <Pressable style={styles.actionButton} onPress={onClear}>
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </Pressable>
        </View>
      </View>

      <View style={styles.mapContainer}>
        {region && (
          <MapView
            style={styles.map}
            region={region}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            {/* Route polyline */}
            {routePoints.length > 1 && (
              <Polyline
                coordinates={routePoints}
                strokeColor={colors.accent}
                strokeWidth={3}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* Directional markers every 1km for preview */}
            {directionalMarkers.map((marker) => (
              <Marker
                key={marker.id}
                coordinate={marker.coordinate}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={[
                    styles.directionMarker,
                    marker.isStart && styles.startDirectionMarker,
                    marker.isEnd && styles.endDirectionMarker,
                  ]}
                >
                  <Text style={styles.directionMarkerText}>
                    {marker.number}
                  </Text>
                </View>
              </Marker>
            ))}
          </MapView>
        )}

        <Pressable style={styles.mapOverlay} onPress={onEdit}>
          <View style={styles.editPrompt}>
            <Ionicons name="pencil" size={16} color={colors.accent} />
            <Text style={styles.editPromptText}>Tap to edit route</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    ...typography.meta,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapContainer: {
    height: 200,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
  },
  editPrompt: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.xs,
    ...shadows.button,
  },
  editPromptText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.accent,
  },
  directionMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "white",
    ...shadows.button,
  },
  startDirectionMarker: {
    backgroundColor: "#22c55e",
    borderColor: "#16a34a",
  },
  endDirectionMarker: {
    backgroundColor: "#ef4444",
    borderColor: "#dc2626",
  },
  directionMarkerText: {
    color: "white",
    fontSize: 12,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    minHeight: 200,
  },
  emptyTitle: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: "600",
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.meta,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 20,
    gap: spacing.xs,
  },
  createButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
