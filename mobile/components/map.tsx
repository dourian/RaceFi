import { useEffect, useState } from 'react';
import MapView from 'react-native-maps';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { useLocation } from '../app/contexts/locationContext';

export default function Map() {
    const [isGuest, setIsGuest] = useState(false);
    const { currentLocation, getCurrentLocation, locationPermission } = useLocation();

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
            {currentLocation && (
            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: currentLocation?.latitude,
                    longitude: currentLocation?.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
                rotateEnabled={false}
                zoomEnabled={true}
                followsUserLocation={true}
            />
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
