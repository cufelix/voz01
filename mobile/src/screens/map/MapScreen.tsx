import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { trailerService } from '../../services/firestore';
import { Trailer, TrailerStatus, MainTabParamList } from '@shared/types';
import TrailerMarker from '../../components/TrailerMarker';
import SearchBar from '../../components/SearchBar';
import FilterModal from '../../components/FilterModal';
import MapControls from '../../components/MapControls';

type MapScreenNavigationProp = StackNavigationProp<MainTabParamList, 'Map'>;

interface Props {
  navigation: MapScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const MapScreen: React.FC<Props> = ({ navigation }) => {
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [filteredTrailers, setFilteredTrailers] = useState<Trailer[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 50.0755, // Prague center
    longitude: 14.4378,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    status: ['available'] as TrailerStatus[],
    priceRange: [0, 5000] as [number, number],
    types: [] as string[],
  });
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');

  const mapRef = useRef<MapView>(null);

  // Request location permission
  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      return auth === 'granted';
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return false;
  };

  // Get user's current location
  const getCurrentLocation = useCallback(async () => {
    const hasPermission = await requestLocationPermission();

    if (!hasPermission) {
      Alert.alert(
        'Povolení polohy',
        'Pro zobrazení vaší polohy na mapě je potřeba povolit přístup k poloze.'
      );
      return;
    }

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        };

        setUserLocation({ latitude, longitude });
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
      },
      (error) => {
        console.error('Error getting location:', error);
        Alert.alert('Chyba', 'Nepodařilo se získat vaši polohu');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  }, []);

  // Load trailers
  const loadTrailers = useCallback(async () => {
    try {
      setLoading(true);
      const allTrailers = await trailerService.getAllTrailers();
      setTrailers(allTrailers);
      setFilteredTrailers(allTrailers);
    } catch (error) {
      console.error('Error loading trailers:', error);
      Alert.alert('Chyba', 'Nepodařilo se načíst seznam přívěsů');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trailers in visible area
  const loadTrailersInBounds = useCallback(async (currentRegion: Region) => {
    try {
      const northEast = {
        lat: currentRegion.latitude + currentRegion.latitudeDelta / 2,
        lng: currentRegion.longitude + currentRegion.longitudeDelta / 2,
      };
      const southWest = {
        lat: currentRegion.latitude - currentRegion.latitudeDelta / 2,
        lng: currentRegion.longitude - currentRegion.longitudeDelta / 2,
      };

      const trailersInBounds = await trailerService.getAvailableTrailersInBounds(northEast, southWest);
      setTrailers(trailersInBounds);
      applyFilters(trailersInBounds);
    } catch (error) {
      console.error('Error loading trailers in bounds:', error);
    }
  }, []);

  // Apply filters to trailers
  const applyFilters = useCallback((trailersList: Trailer[] = trailers) => {
    let filtered = trailersList;

    // Apply status filter
    if (selectedFilters.status.length > 0) {
      filtered = filtered.filter(trailer =>
        selectedFilters.status.includes(trailer.status)
      );
    }

    // Apply price filter
    filtered = filtered.filter(trailer => {
      const dailyPrice = trailer.pricing.oneDay;
      return dailyPrice >= selectedFilters.priceRange[0] && dailyPrice <= selectedFilters.priceRange[1];
    });

    // Apply type filter
    if (selectedFilters.types.length > 0) {
      filtered = filtered.filter(trailer =>
        selectedFilters.types.some(type =>
          trailer.type.toLowerCase().includes(type.toLowerCase())
        )
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(trailer =>
        trailer.name.toLowerCase().includes(query) ||
        trailer.type.toLowerCase().includes(query) ||
        trailer.location.address.toLowerCase().includes(query)
      );
    }

    setFilteredTrailers(filtered);
  }, [trailers, selectedFilters, searchQuery]);

  // Handle map region change
  const handleRegionChange = useCallback((newRegion: Region) => {
    setRegion(newRegion);
    // Load trailers in new bounds (with debounce)
    loadTrailersInBounds(newRegion);
  }, [loadTrailersInBounds]);

  // Handle marker press
  const handleMarkerPress = useCallback((trailer: Trailer) => {
    navigation.navigate('TrailerDetail', { trailerId: trailer.id });
  }, [navigation]);

  // Center map on user location
  const centerOnUser = useCallback(() => {
    if (userLocation) {
      mapRef.current?.animateToRegion({
        ...region,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      }, 1000);
    } else {
      getCurrentLocation();
    }
  }, [userLocation, region, getCurrentLocation]);

  // Toggle map type
  const toggleMapType = useCallback(() => {
    setMapType(prev => prev === 'standard' ? 'satellite' : 'standard');
  }, []);

  // Initialize
  useEffect(() => {
    loadTrailers();
    getCurrentLocation();
  }, [loadTrailers, getCurrentLocation]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  if (loading && trailers.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        onRegionChangeComplete={handleRegionChange}
        mapType={mapType}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsTraffic={false}
        showsIndoors={false}
        showsIndoorLevelPicker={false}
        toolbarEnabled={false}
      >
        {/* User location marker (custom) */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={1000}
          >
            <View style={styles.userLocationMarker}>
              <Icon name="my-location" size={20} color="#3b82f6" />
            </View>
          </Marker>
        )}

        {/* Trailer markers */}
        {filteredTrailers.map((trailer) => (
          <Marker
            key={trailer.id}
            coordinate={{
              latitude: trailer.location.lat,
              longitude: trailer.location.lng,
            }}
            onPress={() => handleMarkerPress(trailer)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <TrailerMarker trailer={trailer} />
          </Marker>
        ))}
      </MapView>

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onFilterPress={() => setShowFilters(true)}
        style={styles.searchBar}
      />

      {/* Map Controls */}
      <MapControls
        onCenterUser={centerOnUser}
        onToggleMapType={toggleMapType}
        mapType={mapType}
        style={styles.mapControls}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={selectedFilters}
        onFiltersChange={setSelectedFilters}
        trailerTypes={Array.from(new Set(trailers.map(t => t.type)))}
      />

      {/* Results count */}
      <View style={styles.resultsContainer}>
        <View style={styles.resultsBadge}>
          <Icon name="local-shipping" size={16} color="#ffffff" />
          <Text style={styles.resultsText}>
            {filteredTrailers.length} přívěsů
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  map: {
    flex: 1,
  },
  userLocationMarker: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    zIndex: 100,
  },
  resultsContainer: {
    position: 'absolute',
    top: 110,
    left: 16,
    zIndex: 100,
  },
  resultsBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultsText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default MapScreen;