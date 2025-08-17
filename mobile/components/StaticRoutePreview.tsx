import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Modal, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Map from "./map";
import { decodePolyline } from "../helpers/polyline";

interface StaticRoutePreviewProps {
  challengeId: string;
  polyline?: string;
  routeColor?: string;
  width?: number;
  height?: number;
  style?: any;
}

export default function StaticRoutePreview({
  challengeId,
  polyline,
  routeColor = "#e64a00",
  width = 280,
  height = 120,
  style,
}: StaticRoutePreviewProps) {
  const [isInteractive, setIsInteractive] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  // Decode the polyline if provided
  const polylineCoordinates = polyline ? decodePolyline(polyline) : [];

  const handleMapPress = () => {
    setIsInteractive(true);
  };

  const handleCloseInteractive = () => {
    setIsInteractive(false);
  };

  const handleRecenter = () => {
    setRecenterTrigger(prev => prev + 1);
  };

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  return (
    <>
      <TouchableOpacity 
        style={[styles.container, { width, height }, style]}
        onPress={handleMapPress}
        activeOpacity={0.8}
      >
        {polylineCoordinates.length > 0 && (
          <>
            <Map
              showsUserLocation={false}
              followsUserLocation={false}
              alterMapEnabled={false}
              staticPolyline={polylineCoordinates}
              routeColor={routeColor}
            />
            <View style={styles.clickIndicator}>
              <Ionicons name="expand" size={16} color="white" />
              <Text style={styles.clickText}>Tap to explore</Text>
            </View>
          </>
        )}
      </TouchableOpacity>

      <Modal
        visible={isInteractive}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseInteractive}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseInteractive}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Route Map</Text>
            <TouchableOpacity
              style={styles.recenterButton}
              onPress={handleRecenter}
            >
              <Ionicons name="locate" size={20} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.interactiveMapContainer}>
            {polylineCoordinates.length > 0 && (
              <Map
                showsUserLocation={false}
                followsUserLocation={false}
                alterMapEnabled={true}
                staticPolyline={polylineCoordinates}
                routeColor={routeColor}
                recenterToRouteTrigger={recenterTrigger}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  clickIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  clickText: {
    color: "white",
    fontSize: 10,
    marginLeft: 4,
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    zIndex: 10,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  recenterButton: {
    padding: 8,
  },
  interactiveMapContainer: {
    flex: 1,
  },
});
