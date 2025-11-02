import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Trailer, TrailerStatus } from '@shared/types';
import { getTrailerStatusColor } from '@shared/utils';

interface TrailerMarkerProps {
  trailer: Trailer;
  size?: number;
}

const TrailerMarker: React.FC<TrailerMarkerProps> = ({ trailer, size = 40 }) => {
  const statusColor = getTrailerStatusColor(trailer.status);
  const isAvailable = trailer.status === 'available';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Main marker circle */}
      <View
        style={[
          styles.marker,
          {
            backgroundColor: isAvailable ? statusColor : '#9ca3af',
            borderColor: isAvailable ? statusColor : '#6b7280',
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Icon
          name="local-shipping"
          size={size * 0.5}
          color="#ffffff"
        />
      </View>

      {/* Status indicator */}
      {!isAvailable && (
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
      )}

      {/* Price badge for available trailers */}
      {isAvailable && (
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>
            {Math.round(trailer.pricing.oneDay)} Kč
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  statusIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  priceBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#1f2937',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  priceText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default TrailerMarker;