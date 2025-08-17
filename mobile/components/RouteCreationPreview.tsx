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

            {/* Route markers */}
            {routePoints.map((point, index) => (
              <Marker
                key={point.id}
                coordinate={point}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={[
                    styles.markerContainer,
                    index === 0 && styles.startMarker,
                    index === routePoints.length - 1 &&
                      index > 0 &&
                      styles.endMarker,
                  ]}
                >
                  <Text style={styles.markerText}>
                    {index === 0
                      ? "S"
                      : index === routePoints.length - 1 && index > 0
                        ? "F"
                        : index + 1}
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
  markerContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  startMarker: {
    backgroundColor: "#22c55e",
  },
  endMarker: {
    backgroundColor: "#ef4444",
  },
  markerText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
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
