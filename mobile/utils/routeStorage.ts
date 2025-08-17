import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RoutePoint {
  latitude: number;
  longitude: number;
  id: string;
}

export interface RouteData {
  points: RoutePoint[];
  distance: number;
  polyline: string;
  createdAt: string;
}

const ROUTE_STORAGE_KEY = 'temp_route_data';

export const RouteStorage = {
  // Save route data temporarily during creation flow
  async saveTemporaryRoute(routeData: RouteData): Promise<void> {
    try {
      const dataWithTimestamp = {
        ...routeData,
        createdAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(dataWithTimestamp));
    } catch (error) {
      console.error('Error saving temporary route:', error);
      throw error;
    }
  },

  // Get temporarily saved route data
  async getTemporaryRoute(): Promise<RouteData | null> {
    try {
      const data = await AsyncStorage.getItem(ROUTE_STORAGE_KEY);
      if (!data) return null;
      
      const routeData = JSON.parse(data);
      
      // Check if data is not too old (1 hour)
      const createdAt = new Date(routeData.createdAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 1) {
        await this.clearTemporaryRoute();
        return null;
      }
      
      return routeData;
    } catch (error) {
      console.error('Error getting temporary route:', error);
      return null;
    }
  },

  // Clear temporary route data
  async clearTemporaryRoute(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ROUTE_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing temporary route:', error);
    }
  },

  // Encode route points to polyline string (simplified version)
  encodePolyline(points: RoutePoint[]): string {
    // This is a simplified encoding - in production, use a proper polyline encoding library
    return points
      .map(point => `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`)
      .join(';');
  },

  // Decode polyline string to route points (simplified version)
  decodePolyline(polyline: string): RoutePoint[] {
    if (!polyline) return [];
    
    try {
      return polyline.split(';').map((coord, index) => {
        const [lat, lng] = coord.split(',').map(Number);
        return {
          latitude: lat,
          longitude: lng,
          id: `point_${index}_${Date.now()}`,
        };
      });
    } catch (error) {
      console.error('Error decoding polyline:', error);
      return [];
    }
  },

  // Calculate total distance of route
  calculateRouteDistance(points: RoutePoint[]): number {
    if (points.length < 2) return 0;

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Earth's radius in kilometers
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += calculateDistance(
        points[i - 1].latitude,
        points[i - 1].longitude,
        points[i].latitude,
        points[i].longitude
      );
    }
    return totalDistance;
  },

  // Validate route data
  validateRoute(routeData: RouteData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!routeData.points || routeData.points.length < 2) {
      errors.push('Route must have at least 2 points');
    }

    if (routeData.distance <= 0) {
      errors.push('Route distance must be greater than 0');
    }

    if (routeData.distance > 100) {
      errors.push('Route distance cannot exceed 100km');
    }

    // Check for valid coordinates
    const invalidPoints = routeData.points.filter(point => 
      !point.latitude || !point.longitude ||
      Math.abs(point.latitude) > 90 ||
      Math.abs(point.longitude) > 180
    );

    if (invalidPoints.length > 0) {
      errors.push('Route contains invalid coordinates');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};
