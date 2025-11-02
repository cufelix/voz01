import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { trailerService } from '../../services/firestore';
import { Trailer, RootStackParamList } from '@shared/types';
import { formatCzk, formatDate, getTrailerStatusText, getTrailerStatusColor } from '@shared/utils';

type TrailerDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TrailerDetail'>;

interface Props {
  navigation: TrailerDetailScreenNavigationProp;
  route: {
    params: {
      trailerId: string;
    };
  };
}

const { width } = Dimensions.get('window');

const TrailerDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { trailerId } = route.params;
  const [trailer, setTrailer] = useState<Trailer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    loadTrailer();
  }, [trailerId]);

  const loadTrailer = async () => {
    try {
      setLoading(true);
      const trailerData = await trailerService.getTrailer(trailerId);
      if (trailerData) {
        setTrailer(trailerData);
        navigation.setOptions({ title: trailerData.name });
      } else {
        Alert.alert('Chyba', 'Přívěs nebyl nalezen');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading trailer:', error);
      Alert.alert('Chyba', 'Nepodařilo se načíst detail přívěsu');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleReservation = () => {
    if (trailer) {
      navigation.navigate('Reservation', { trailerId: trailer.id });
    }
  };

  const handleGetDirections = () => {
    if (trailer) {
      const url = `https://maps.google.com/maps?q=${trailer.location.lat},${trailer.location.lng}`;
      Linking.openURL(url);
    }
  };

  const handleViewDocuments = () => {
    if (trailer?.documentsLink) {
      Linking.openURL(trailer.documentsLink);
    }
  };

  const SpecItem: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
    <View style={styles.specItem}>
      <Icon name={icon} size={20} color="#3b82f6" style={styles.specIcon} />
      <View style={styles.specContent}>
        <Text style={styles.specLabel}>{label}</Text>
        <Text style={styles.specValue}>{value}</Text>
      </View>
    </View>
  );

  const PricingCard: React.FC<{ title: string; price: number; description?: string }> = ({
    title,
    price,
    description,
  }) => (
    <View style={styles.pricingCard}>
      <Text style={styles.pricingTitle}>{title}</Text>
      <Text style={styles.pricingPrice}>{formatCzk(price)}</Text>
      {description && <Text style={styles.pricingDescription}>{description}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!trailer) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Přívěs nebyl nalezen</Text>
      </View>
    );
  }

  const isAvailable = trailer.status === 'available';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Images */}
      <View style={styles.imageContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.floor(e.nativeEvent.contentOffset.x / width);
            setActiveImageIndex(index);
          }}
        >
          {[1, 2, 3].map((_, index) => (
            <View key={index} style={styles.imageSlide}>
              <Image
                source={{ uri: `https://picsum.photos/seed/trailer${trailer.id}-${index}/800/400.jpg` }}
                style={styles.image}
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>

        {/* Image indicators */}
        <View style={styles.imageIndicators}>
          {[1, 2, 3].map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                activeImageIndex === index && styles.activeIndicator,
              ]}
            />
          ))}
        </View>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: getTrailerStatusColor(trailer.status) }]}>
          <Text style={styles.statusText}>{getTrailerStatusText(trailer.status)}</Text>
        </View>
      </View>

      {/* Basic Info */}
      <View style={styles.section}>
        <Text style={styles.title}>{trailer.name}</Text>
        <View style={styles.typeContainer}>
          <Text style={styles.type}>{trailer.type}</Text>
          <Text style={styles.manufacturer}>Výrobce: {trailer.manufacturer}</Text>
        </View>
        <View style={styles.licensePlate}>
          <Icon name="credit-card" size={16} color="#6b7280" />
          <Text style={styles.licensePlateText}>SPZ: {trailer.licensePlate}</Text>
        </View>
      </View>

      {/* Specifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Technické parametry</Text>
        <View style={styles.specsContainer}>
          <SpecItem
            icon="straighten"
            label="Ložná plocha"
            value={trailer.specs.loadArea}
          />
          <SpecItem
            icon="height"
            label="Výška pod plachtou"
            value={trailer.specs.height}
          />
          <SpecItem
            icon="weight"
            label="Max. povolená hmotnost"
            value={`${trailer.specs.maxWeight} kg`}
          />
          <SpecItem
            icon="monitor-weight"
            label="Provozní hmotnost"
            value={`${trailer.specs.operatingWeight} kg`}
          />
        </View>
      </View>

      {/* Pricing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ceník</Text>
        <View style={styles.pricingContainer}>
          <PricingCard title="1 den" price={trailer.pricing.oneDay} />
          <PricingCard title="2 dny" price={trailer.pricing.twoDays} />
          <PricingCard
            title="Každý další den"
            price={trailer.pricing.additionalDays}
            description="po 2. dni"
          />
        </View>
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lokace</Text>
        <View style={styles.locationContainer}>
          <View style={styles.addressContainer}>
            <Icon name="location-on" size={20} color="#ef4444" />
            <Text style={styles.address}>{trailer.location.address}</Text>
          </View>
          <TouchableOpacity style={styles.directionsButton} onPress={handleGetDirections}>
            <Icon name="directions" size={20} color="#3b82f6" />
            <Text style={styles.directionsText}>Navigovat</Text>
          </TouchableOpacity>
        </View>

        {/* Mini Map */}
        <View style={styles.miniMapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.miniMap}
            initialRegion={{
              latitude: trailer.location.lat,
              longitude: trailer.location.lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Marker
              coordinate={{
                latitude: trailer.location.lat,
                longitude: trailer.location.lng,
              }}
            >
              <View style={styles.mapMarker}>
                <Icon name="local-shipping" size={16} color="#ffffff" />
              </View>
            </Marker>
          </MapView>
        </View>
      </View>

      {/* Documents */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dokumenty</Text>
          <TouchableOpacity onPress={handleViewDocuments}>
            <Text style={styles.viewDocumentsText}>Zobrazit dokumenty</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.documentsDescription}>
          Zelená karta a další potřebné dokumenty jsou k dispozici online.
        </Text>
      </View>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, isAvailable && styles.actionButtonEnabled]}
          onPress={handleReservation}
          disabled={!isAvailable}
        >
          <Icon name="event-available" size={20} color={isAvailable ? '#ffffff' : '#9ca3af'} />
          <Text style={[styles.actionButtonText, isAvailable && styles.actionButtonTextEnabled]}>
            {isAvailable ? 'Zapůjčit' : getTrailerStatusText(trailer.status)}
          </Text>
        </TouchableOpacity>

        {!isAvailable && (
          <Text style={styles.unavailableText}>
            Tento přívěs není v současné době k dispozici.
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginTop: 16,
    fontWeight: '500',
  },
  imageContainer: {
    position: 'relative',
    height: 250,
  },
  imageSlide: {
    width,
    height: 250,
  },
  image: {
    width,
    height: 250,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeIndicator: {
    backgroundColor: '#ffffff',
    width: 24,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  typeContainer: {
    marginBottom: 12,
  },
  type: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '500',
  },
  manufacturer: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  licensePlate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  licensePlateText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewDocumentsText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  specsContainer: {
    gap: 16,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specIcon: {
    marginRight: 12,
  },
  specContent: {
    flex: 1,
  },
  specLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  specValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  pricingContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pricingTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  pricingPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  pricingDescription: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  locationContainer: {
    gap: 12,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  address: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  directionsText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
    marginLeft: 6,
  },
  miniMapContainer: {
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  miniMap: {
    flex: 1,
  },
  mapMarker: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  documentsDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  actionContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  actionButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonEnabled: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  actionButtonTextEnabled: {
    color: '#ffffff',
  },
  unavailableText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});

export default TrailerDetailScreen;