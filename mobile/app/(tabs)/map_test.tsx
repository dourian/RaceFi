import { StyleSheet, Text, View } from 'react-native';
import Map from '../../components/map';
import { useLocation } from '../contexts/locationContext';

export default function MapTest() {
//   const { 
//     currentLocation, 
//     locationPermission, 
//     requestLocationPermission, 
//     getCurrentLocation,
//   } = useLocation();

//   useEffect(() => {
//     const getLocation = async () => {
//       if (locationPermission !== 'granted') {
//         const granted = await requestLocationPermission();
//         if (granted) {
//           await getCurrentLocation();
//         }
//       } else {
//         await getCurrentLocation();
//       }
//     };
    
//     setTimeout(() => {
//       getLocation();
//     }, 1000);
//   }, [locationPermission, requestLocationPermission, getCurrentLocation]);

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <Map showsUserLocation={true} followsUserLocation={true} alterMapEnabled={true} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
    width: '100%',
    paddingHorizontal: 10,
    paddingTop: 100,
  },
  mapContainer: {
    height: '40%',
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  debugContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  debugText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: '#333',
  },
  locationText: {
    fontSize: 14,
    marginBottom: 3,
    color: '#444',
  },
  noLocationText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});


