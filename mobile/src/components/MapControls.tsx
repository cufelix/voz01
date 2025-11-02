import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface MapControlsProps {
  onCenterUser: () => void;
  onToggleMapType: () => void;
  mapType: 'standard' | 'satellite';
  style?: ViewStyle;
}

const MapControls: React.FC<MapControlsProps> = ({
  onCenterUser,
  onToggleMapType,
  mapType,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Center on user location */}
      <TouchableOpacity style={styles.controlButton} onPress={onCenterUser}>
        <Icon name="my-location" size={20} color="#3b82f6" />
      </TouchableOpacity>

      {/* Toggle map type */}
      <TouchableOpacity style={styles.controlButton} onPress={onToggleMapType}>
        <Icon
          name={mapType === 'standard' ? 'satellite' : 'map'}
          size={20}
          color="#3b82f6"
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  controlButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default MapControls;