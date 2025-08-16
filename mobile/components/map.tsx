import { useEffect, useState } from 'react';
import MapView, { Polyline } from 'react-native-maps';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { useLocation } from '../app/contexts/locationContext';

export default function Map({ showsUserLocation, followsUserLocation, initialZoom = 0.01, alterMapEnabled, polylineCoordinates }: { 
    showsUserLocation?: boolean, 
    followsUserLocation?: boolean, 
    alterMapEnabled?: boolean,
    initialZoom?: number,
    polylineCoordinates?: Array<{ latitude: number, longitude: number }>,
}) {
    const [isGuest, setIsGuest] = useState(false);
    const { currentLocation, getCurrentLocation, locationPermission } = useLocation();
    const [mapRef, setMapRef] = useState<MapView | null>(null);

    const getInitialRegion = () => {
        if (polylineCoordinates && polylineCoordinates.length > 0) {
            const lats = polylineCoordinates.map(coord => coord.latitude);
            const lngs = polylineCoordinates.map(coord => coord.longitude);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);
            
            const centerLat = (minLat + maxLat) / 2;
            const centerLng = (minLng + maxLng) / 2;
            const deltaLat = (maxLat - minLat) * 1.2; 
            const deltaLng = (maxLng - minLng) * 1.2;
            
            return {
                latitude: centerLat,
                longitude: centerLng,
                latitudeDelta: Math.max(deltaLat, 0.01), 
                longitudeDelta: Math.max(deltaLng, 0.01),
            };
        }
        
        return {
            latitude: currentLocation?.latitude || 37.78825,
            longitude: currentLocation?.longitude || -122.4324,
            latitudeDelta: initialZoom,
            longitudeDelta: initialZoom,
        };
    };

    const initialRegion = getInitialRegion();

    useEffect(() => {
        const getLocation = async () => {
            await getCurrentLocation();
        };
        getLocation();
    }, []);

    if (!isGuest && locationPermission !== 'granted') {
        return (
            <View style={styles.container}>
                <TouchableOpacity 
                    style={styles.guestButton}
                    onPress={() => setIsGuest(true)}
                >
                    <Text style={styles.buttonText}>Continue as Guest</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {(currentLocation || polylineCoordinates) && (
            <MapView
                ref={setMapRef}
                style={styles.map}
                initialRegion={initialRegion}
                showsUserLocation={showsUserLocation}
                showsMyLocationButton={showsUserLocation}
                rotateEnabled={alterMapEnabled} 
                zoomEnabled={alterMapEnabled}
                followsUserLocation={followsUserLocation}
                scrollEnabled={alterMapEnabled}
                pitchEnabled={alterMapEnabled}
            >
                {/* Render polyline if coordinates are provided */}
                {polylineCoordinates && polylineCoordinates.length > 1 && (
                    <Polyline
                        coordinates={polylineCoordinates}
                        strokeColor="#e64a00" // Orange color for the route
                        strokeWidth={4}
                        lineJoin="round"
                        lineCap="round"
                    />
                )}
            </MapView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  guestButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
