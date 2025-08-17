import * as Location from 'expo-location';

export interface LocationInfo {
  address: string;
  city: string;
  region: string;
  country: string;
  formattedAddress: string;
}

export class LocationService {
  /**
   * Get location information from coordinates using reverse geocoding
   */
  static async getLocationFromCoordinates(
    latitude: number,
    longitude: number
  ): Promise<LocationInfo | null> {
    try {
      // Use Expo Location's reverse geocoding
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode.length === 0) {
        return null;
      }

      const location = reverseGeocode[0];
      
      // Format the address components
      const addressParts: string[] = [];
      
      if (location.streetNumber) {
        addressParts.push(location.streetNumber);
      }
      if (location.street) {
        addressParts.push(location.street);
      }
      
      const address = addressParts.join(' ') || '';
      const city = location.city || location.subregion || '';
      const region = location.region || '';
      const country = location.country || '';
      
      // Create a formatted address for display
      const formattedParts: string[] = [];
      
      if (city) formattedParts.push(city);
      if (region && region !== city) formattedParts.push(region);
      if (country) formattedParts.push(country);
      
      const formattedAddress = formattedParts.join(', ');

      return {
        address,
        city,
        region,
        country,
        formattedAddress,
      };
    } catch (error) {
      console.error('Error getting location from coordinates:', error);
      return null;
    }
  }

  /**
   * Get location from the center point of a route
   */
  static async getLocationFromRoute(routePoints: Array<{ latitude: number; longitude: number }>): Promise<LocationInfo | null> {
    if (routePoints.length === 0) {
      return null;
    }

    // Calculate the center point of the route
    const centerPoint = this.calculateRouteCenter(routePoints);
    
    // Get location information from the center point
    return this.getLocationFromCoordinates(centerPoint.latitude, centerPoint.longitude);
  }

  /**
   * Calculate the geographic center of a route
   */
  static calculateRouteCenter(routePoints: Array<{ latitude: number; longitude: number }>): { latitude: number; longitude: number } {
    if (routePoints.length === 0) {
      throw new Error('Route points array is empty');
    }

    if (routePoints.length === 1) {
      return routePoints[0];
    }

    // Calculate the centroid of the route points
    const totalLat = routePoints.reduce((sum, point) => sum + point.latitude, 0);
    const totalLng = routePoints.reduce((sum, point) => sum + point.longitude, 0);

    return {
      latitude: totalLat / routePoints.length,
      longitude: totalLng / routePoints.length,
    };
  }

  /**
   * Get a simplified location string suitable for form fields
   */
  static getSimplifiedLocation(locationInfo: LocationInfo): string {
    // Prioritize city and region for a clean, simple location string
    const parts: string[] = [];
    
    if (locationInfo.city) {
      parts.push(locationInfo.city);
    }
    
    if (locationInfo.region && locationInfo.region !== locationInfo.city) {
      parts.push(locationInfo.region);
    }
    
    return parts.join(', ') || locationInfo.formattedAddress || 'Unknown Location';
  }

  /**
   * Check if location permissions are granted
   */
  static async checkLocationPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return false;
    }
  }

  /**
   * Request location permissions if not already granted
   */
  static async requestLocationPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }
}
