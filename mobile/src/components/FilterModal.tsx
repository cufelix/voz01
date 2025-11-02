import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { TrailerStatus } from '@shared/types';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: {
    status: TrailerStatus[];
    priceRange: [number, number];
    types: string[];
  };
  onFiltersChange: (filters: any) => void;
  trailerTypes: string[];
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filters,
  onFiltersChange,
  trailerTypes,
}) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const statusOptions = [
    { key: 'available', label: 'Dostupný', color: '#22c55e' },
    { key: 'reserved', label: 'Rezervován', color: '#f59e0b' },
    { key: 'maintenance', label: 'V údržbě', color: '#ef4444' },
  ];

  const handleStatusToggle = (status: TrailerStatus) => {
    const newStatus = localFilters.status.includes(status)
      ? localFilters.status.filter(s => s !== status)
      : [...localFilters.status, status];

    setLocalFilters({ ...localFilters, status: newStatus });
  };

  const handleTypeToggle = (type: string) => {
    const newTypes = localFilters.types.includes(type)
      ? localFilters.types.filter(t => t !== type)
      : [...localFilters.types, type];

    setLocalFilters({ ...localFilters, types: newTypes });
  };

  const handlePriceChange = (min: number, max: number) => {
    setLocalFilters({
      ...localFilters,
      priceRange: [min, max],
    });
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const resetFilters = () => {
    const defaultFilters = {
      status: ['available'],
      priceRange: [0, 5000],
      types: [],
    };
    setLocalFilters(defaultFilters);
  };

  const PriceRangeSlider = () => {
    const [minPrice, maxPrice] = localFilters.priceRange;
    const maxPossiblePrice = 5000;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cenové rozpětí</Text>

        <View style={styles.priceRangeContainer}>
          <View style={styles.priceInput}>
            <Text style={styles.priceLabel}>Od</Text>
            <Text style={styles.priceValue}>{minPrice} Kč</Text>
          </View>

          <View style={styles.priceSlider}>
            <Text style={styles.priceRangeText}>
              {minPrice} - {maxPrice} Kč
            </Text>
          </View>

          <View style={styles.priceInput}>
            <Text style={styles.priceLabel}>Do</Text>
            <Text style={styles.priceValue}>{maxPrice} Kč</Text>
          </View>
        </View>

        {/* Simple price range selectors */}
        <View style={styles.quickPriceFilters}>
          {[
            { label: 'Do 1000 Kč', max: 1000 },
            { label: 'Do 2000 Kč', max: 2000 },
            { label: 'Do 3000 Kč', max: 3000 },
            { label: 'Jakékoliv', max: 5000 },
          ].map((option) => (
            <TouchableOpacity
              key={option.label}
              style={[
                styles.priceFilterChip,
                maxPrice === option.max && styles.selectedChip,
              ]}
              onPress={() => handlePriceChange(0, option.max)}
            >
              <Text
                style={[
                  styles.priceFilterText,
                  maxPrice === option.max && styles.selectedChipText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Filtry</Text>
          <TouchableOpacity onPress={resetFilters} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stav</Text>
            <View style={styles.statusContainer}>
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: localFilters.status.includes(option.key)
                        ? option.color
                        : '#f3f4f6',
                    },
                  ]}
                  onPress={() => handleStatusToggle(option.key as TrailerStatus)}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: localFilters.status.includes(option.key)
                          ? '#ffffff'
                          : '#374151',
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Range Filter */}
          <PriceRangeSlider />

          {/* Type Filter */}
          {trailerTypes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Typ přívěsu</Text>
              <View style={styles.typeContainer}>
                {trailerTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeChip,
                      localFilters.types.includes(type) && styles.selectedChip,
                    ]}
                    onPress={() => handleTypeToggle(type)}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        localFilters.types.includes(type) && styles.selectedChipText,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
            <Text style={styles.applyButtonText}>Použít filtry</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  resetButton: {
    padding: 4,
  },
  resetText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceInput: {
    flex: 1,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  priceSlider: {
    flex: 2,
    alignItems: 'center',
  },
  priceRangeText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  quickPriceFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  priceFilterText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  selectedChip: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  selectedChipText: {
    color: '#ffffff',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  applyButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default FilterModal;