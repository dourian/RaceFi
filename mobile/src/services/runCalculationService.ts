export interface Coordinate {
  latitude: number;
  longitude: number;
  timestamp?: number;
}

export interface RunMetrics {
  distance: number; // in meters
  pace: string; // formatted as MM:SS
  duration: number; // in seconds
}

/**
 * Service for calculating run-related metrics and formatting
 */
export class RunCalculationService {
  /**
   * Calculate total distance using Haversine formula
   * @param coords Array of coordinates
   * @returns Distance in meters
   */
  static calculateDistance(coords: Coordinate[]): number {
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

      const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) *
        Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      
      totalDistance += R * c;
    }
    
    return totalDistance;
  }

  /**
   * Calculate pace per kilometer
   * @param coords Array of coordinates with timestamps
   * @returns Formatted pace string (MM:SS)
   */
  static calculatePace(coords: (Coordinate & { timestamp: number })[]): string {
    if (coords.length < 2) return "--:--";
    
    // Calculate total distance in kilometers
    const totalDistance = this.calculateDistance(coords) / 1000;
    
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
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Format duration from seconds to MM:SS
   * @param seconds Duration in seconds
   * @returns Formatted duration string
   */
  static formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format distance for display
   * @param meters Distance in meters
   * @returns Formatted distance string with appropriate units
   */
  static formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(0)} m`;
  }

  /**
   * Calculate all run metrics at once
   * @param coords Array of coordinates with timestamps
   * @param durationSeconds Duration in seconds
   * @returns Complete run metrics
   */
  static calculateRunMetrics(
    coords: (Coordinate & { timestamp: number })[], 
    durationSeconds: number
  ): RunMetrics {
    const distance = this.calculateDistance(coords);
    const pace = this.calculatePace(coords);
    
    return {
      distance,
      pace,
      duration: durationSeconds,
    };
  }
}
