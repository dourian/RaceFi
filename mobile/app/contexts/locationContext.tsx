import  { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

// Location data interface
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

// Location context interface
interface LocationContextType {
  // State
  location: LocationData | null;
  currentLocation: LocationData | null;
  locationPermission: Location.PermissionStatus | null;
  isLocationEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Methods
  requestLocationPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<LocationData | null>;
  startLocationUpdates: () => Promise<void>;
  stopLocationUpdates: () => void;
  checkLocationServices: () => Promise<boolean>;
  resetLocation: () => void;
}

// Create the context
const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Provider component
interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  // Check if location services are enabled
  const checkLocationServices = async (): Promise<boolean> => {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      setIsLocationEnabled(enabled);
      return enabled;
    } catch (err) {
      console.error('Error checking location services:', err);
      setIsLocationEnabled(false);
      return false;
    }
  };

  // Request location permissions
  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if location services are enabled
      const servicesEnabled = await checkLocationServices();
      if (!servicesEnabled) {
        setError('Location services are disabled. Please enable them in Settings.');
        return false;
      }

      // Request foreground location permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(foregroundStatus);

      if (foregroundStatus !== 'granted') {
        setError('Location permission denied. Please grant location access in Settings.');
        return false;
      }

      // For iOS, also request background location permission if needed
      if (Platform.OS === 'ios') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.warn('Background location permission not granted. Some features may be limited.');
        }
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Error requesting location permission: ${errorMessage}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Get current location once
  const getCurrentLocation = async (): Promise<LocationData | null> => {
    try {
      setIsLoading(true);
      setError(null);

      if (locationPermission !== 'granted') {
        const permissionGranted = await requestLocationPermission();
        if (!permissionGranted) {
          return null;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        speed: location.coords.speed,
        heading: location.coords.heading,
        timestamp: location.timestamp,
      };

      setCurrentLocation(locationData);
      setLocation(locationData);
      return locationData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Error getting current location: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Start continuous location updates
  const startLocationUpdates = async (): Promise<void> => {
    try {
      console.log('Starting location updates, current permission:', locationPermission);
      
      if (locationPermission !== 'granted') {
        console.log('Permission not granted, requesting...');
        const permissionGranted = await requestLocationPermission();
        if (!permissionGranted) {
          console.log('Permission denied, cannot start location updates');
          return;
        }
      }

      // Stop any existing subscription
      if (locationSubscription) {
        console.log('Stopping existing location subscription');
        locationSubscription.remove();
      }

      console.log('Starting location watcher...');
      // Start location updates
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 1000, // Update every second
          distanceInterval: 1, // Update every meter for testing
          // iOS-specific options
          ...(Platform.OS === 'ios' && {
            activityType: Location.ActivityType.Fitness,
            allowsBackgroundLocationUpdates: false, // Disable for testing
            showsBackgroundLocationIndicator: true,
          }),
        },
        (newLocation) => {
          console.log('Location update received:', {
            lat: newLocation.coords.latitude,
            lng: newLocation.coords.longitude,
            accuracy: newLocation.coords.accuracy,
            timestamp: newLocation.timestamp
          });
          
          const locationData: LocationData = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            accuracy: newLocation.coords.accuracy,
            altitude: newLocation.coords.altitude,
            speed: newLocation.coords.speed,
            heading: newLocation.coords.heading,
            timestamp: newLocation.timestamp,
          };

          setLocation(locationData);
          
          // Update current location if it's been more than 5 seconds
          if (!currentLocation || (newLocation.timestamp - currentLocation.timestamp) > 5000) {
            setCurrentLocation(locationData);
          }
        }
      );

      console.log('Location watcher started successfully');
      setLocationSubscription(subscription);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error starting location updates:', err);
      setError(`Error starting location updates: ${errorMessage}`);
    }
  };

  // Stop location updates
  const stopLocationUpdates = (): void => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
  };

  // Reset location data to get fresh starting point
  const resetLocation = (): void => {
    console.log('Resetting location context for new run');
    setLocation(null);
    setCurrentLocation(null);
    setError(null);
  };

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        setLocationPermission(status);
        
        if (status === 'granted') {
          await checkLocationServices();
        }
      } catch (err) {
        console.error('Error checking permissions:', err);
      }
    };

    checkPermissions();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [locationSubscription]);

  const contextValue: LocationContextType = {
    location,
    currentLocation,
    locationPermission,
    isLocationEnabled,
    isLoading,
    error,
    requestLocationPermission,
    getCurrentLocation,
    startLocationUpdates,
    stopLocationUpdates,
    checkLocationServices,
    resetLocation,
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
};

// Custom hook to use the location context
export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export default LocationContext;
