import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors } from '../app/theme';

interface RoutePreviewProps {
  challengeId: string;
  width?: number;
  height?: number;
  style?: any;
}

// Mock route paths for different challenges
const ROUTE_PATHS = {
  'waterfront-5k': {
    path: 'M10,80 Q30,20 60,40 Q90,60 120,30 Q150,10 180,50',
    startPoint: { cx: 10, cy: 80 },
    endPoint: { cx: 180, cy: 50 },
    color: '#3b82f6', // Blue for waterfront
    landmarks: [
      { cx: 60, cy: 40, label: '🌊' },
      { cx: 120, cy: 30, label: '🏛️' },
    ]
  },
  'uptown-10k': {
    path: 'M15,70 Q40,30 70,45 Q100,20 130,60 Q160,35 185,55 Q210,75 235,40',
    startPoint: { cx: 15, cy: 70 },
    endPoint: { cx: 235, cy: 40 },
    color: '#ef4444', // Red for uptown
    landmarks: [
      { cx: 70, cy: 45, label: '🏢' },
      { cx: 160, cy: 35, label: '⛰️' },
      { cx: 210, cy: 75, label: '🏙️' },
    ]
  }
};

export default function RoutePreview({ challengeId, width = 200, height = 100, style }: RoutePreviewProps) {
  const route = ROUTE_PATHS[challengeId as keyof typeof ROUTE_PATHS] || ROUTE_PATHS['waterfront-5k'];
  
  return (
    <View style={[styles.container, { width, height }, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width + 50} ${height}`}>
        {/* Background grid */}
        <Path
          d={`M0,25 L${width + 50},25 M0,50 L${width + 50},50 M0,75 L${width + 50},75`}
          stroke="#f3f4f6"
          strokeWidth="0.5"
        />
        
        {/* Route path */}
        <Path
          d={route.path}
          stroke={route.color}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Start point */}
        <Circle
          cx={route.startPoint.cx}
          cy={route.startPoint.cy}
          r="4"
          fill="#22c55e"
          stroke="white"
          strokeWidth="2"
        />
        
        {/* End point */}
        <Circle
          cx={route.endPoint.cx}
          cy={route.endPoint.cy}
          r="4"
          fill="#dc2626"
          stroke="white"
          strokeWidth="2"
        />
        
        {/* Landmarks */}
        {route.landmarks.map((landmark, index) => (
          <Circle
            key={index}
            cx={landmark.cx}
            cy={landmark.cy}
            r="2"
            fill="#fbbf24"
            opacity="0.8"
          />
        ))}
      </Svg>
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.legendText}>Start</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#dc2626' }]} />
          <Text style={styles.legendText}>Finish</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    position: 'relative',
  },
  legend: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 8,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
