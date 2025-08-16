import React from 'react';
import { View, StyleSheet } from 'react-native';
import Map from './map';
import { decodePolyline } from '../app/helpers/polyline';

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
  routeColor = '#e64a00', 
  width = 280, 
  height = 120, 
  style 
}: StaticRoutePreviewProps) {
  
  // Decode the polyline if provided
  const polylineCoordinates = polyline ? decodePolyline(polyline) : [];

  return (
    <View style={[styles.container, { width, height }, style]}>
      {polylineCoordinates.length > 0 && (
        <Map 
          showsUserLocation={false} 
          followsUserLocation={false} 
          alterMapEnabled={false} 
          polylineCoordinates={polylineCoordinates}
          routeColor={routeColor}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
  },
});
