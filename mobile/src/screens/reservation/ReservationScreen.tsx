import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { trailerService, reservationService } from '../../services/firestore';
import { Trailer, ReservationForm, RootStackParamList } from '@shared/types';
import { formatCzk, calculateRentalDays, calculateRentalPrice, formatDate } from '@shared/utils';

type ReservationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Reservation'>;

interface Props {
  navigation: ReservationScreenNavigationProp;
  route: {
    params: {
      trailerId: string;
    };
  };
}

const ReservationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { trailerId } = route.params;
  const [trailer, setTrailer] = useState<Trailer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ReservationForm>({
    trailerId,
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    ico: '',
  });

  // UI state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [priceCalculation, setPriceCalculation] = useState<{
    days: number;
    totalPrice: number;
    breakdown: { period: string; days: number; price: number }[];
  } | null>(null);
  const [availabilityCheck, setAvailabilityCheck] = useState<{
    available: boolean;
    message: string;
  } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    loadTrailer();
  }, [trailerId]);

  useEffect(() => {
    if (formData.startDate && formData.endDate && formData.startDate < formData.endDate) {
      calculatePrice();
      checkAvailability();
    }
  }, [formData.startDate, formData.endDate]);

  const loadTrailer = async () => {
    try {
      setLoading(true);
      const trailerData = await trailerService.getTrailer(trailerId);
      if (trailerData) {
        setTrailer(trailerData);
        navigation.setOptions({ title: `Rezervace: ${trailerData.name}` });
      } else {
        Alert.alert('Chyba', 'Přívěs nebyl nalezen');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading trailer:', error);
      Alert.alert('Chyba', 'Nepodařilo se načíst přívěs');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = () => {
    if (!trailer) return;

    const days = calculateRentalDays(formData.startDate, formData.endDate);
    const totalPrice = calculateRentalPrice(trailer.pricing, days);

    // Create breakdown
    const breakdown = [];
    if (days === 1) {
      breakdown.push({ period: '1. den', days: 1, price: trailer.pricing.oneDay });
    } else if (days === 2) {
      breakdown.push({ period: '2 dny', days: 2, price: trailer.pricing.twoDays });
    } else {
      breakdown.push({ period: 'První 2 dny', days: 2, price: trailer.pricing.twoDays });
      if (days > 2) {
        breakdown.push({
          period: `Další ${days - 2} dní`,
          days: days - 2,
          price: (days - 2) * trailer.pricing.additionalDays,
        });
      }
    }

    setPriceCalculation({ days, totalPrice, breakdown });
  };

  const checkAvailability = async () => {
    if (!trailer) return;

    setCheckingAvailability(true);
    try {
      const available = await reservationService.checkTrailerAvailability(
        trailer.id,
        formData.startDate,
        formData.endDate
      );

      setAvailabilityCheck({
        available,
        message: available
          ? 'Přívěs je v tomto termínu k dispozici'
          : 'Přívěs je v tomto termínu již rezervován',
      });
    } catch (error) {
      console.error('Error checking availability:', error);
      setAvailabilityCheck({
        available: false,
        message: 'Nepodařilo se ověřit dostupnost',
      });
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      const newEndDate = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000);
      setFormData(prev => ({
        ...prev,
        startDate: selectedDate,
        endDate: prev.endDate <= selectedDate ? newEndDate : prev.endDate,
      }));
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate && selectedDate > formData.startDate) {
      setFormData(prev => ({
        ...prev,
        endDate: selectedDate,
      }));
    } else if (selectedDate) {
      Alert.alert('Chyba', 'Datum konce musí být později než datum začátku');
    }
  };

  const handleSubmit = async () => {
    if (!trailer || !availabilityCheck?.available) {
      Alert.alert('Chyba', 'Přívěs není v tomto termínu k dispozici');
      return;
    }

    setSubmitting(true);

    try {
      const reservationData = {
        ...formData,
        userId: '', // Will be filled by context
        status: 'pending_payment' as const,
        totalPrice: priceCalculation!.totalPrice,
        pinCode: '', // Will be generated by Cloud Function
        pinExpiry: new Date(formData.endDate.getTime() + 24 * 60 * 60 * 1000), // End of return day
        stripePaymentIntentId: '', // Will be created in payment screen
      };

      const reservationId = await reservationService.createReservation(reservationData);

      // Navigate to payment
      navigation.navigate('Payment', { reservationId });
    } catch (error: any) {
      console.error('Error creating reservation:', error);

      let errorMessage = 'Nepodařilo se vytvořit rezervaci';
      if (error.code === 'permission-denied') {
        errorMessage = 'Nemáte oprávnění vytvořit rezervaci';
      } else if (error.code === 'already-exists') {
        errorMessage = 'Tato rezervace již existuje';
      }

      Alert.alert('Chyba', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = () => {
    return (
      trailer &&
      availabilityCheck?.available &&
      priceCalculation &&
      formData.startDate < formData.endDate &&
      !submitting
    );
  };

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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Trailer Info */}
        <View style={styles.trailerInfo}>
          <Text style={styles.trailerName}>{trailer.name}</Text>
          <Text style={styles.trailerType}>{trailer.type}</Text>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vyberte termín</Text>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Icon name="event" size={20} color="#3b82f6" />
            <View style={styles.dateContent}>
              <Text style={styles.dateLabel}>Datum převzetí</Text>
              <Text style={styles.dateValue}>{formatDate(formData.startDate)}</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndDatePicker(false)}
          >
            <Icon name="event-available" size={20} color="#3b82f6" />
            <View style={styles.dateContent}>
              <Text style={styles.dateLabel}>Datum vrácení</Text>
              <Text style={styles.dateValue}>{formatDate(formData.endDate)}</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Availability Check */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dostupnost</Text>
          {checkingAvailability ? (
            <View style={styles.checkingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.checkingText}>Ověřuji dostupnost...</Text>
            </View>
          ) : availabilityCheck ? (
            <View style={[
              styles.availabilityContainer,
              { backgroundColor: availabilityCheck.available ? '#dcfce7' : '#fef2f2' }
            ]}>
              <Icon
                name={availabilityCheck.available ? 'check-circle' : 'error'}
                size={20}
                color={availabilityCheck.available ? '#22c55e' : '#ef4444'}
              />
              <Text style={[
                styles.availabilityText,
                { color: availabilityCheck.available ? '#16a34a' : '#dc2626' }
              ]}>
                {availabilityCheck.message}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ICO Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fakturační údaje (volitelné)</Text>
          <View style={styles.inputContainer}>
            <Icon name="business" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={formData.ico}
              onChangeText={(value) => setFormData(prev => ({ ...prev, ico: value }))}
              placeholder="IČO (pro firemní fakturu)"
              keyboardType="number-pad"
              maxLength={8}
            />
          </View>
        </View>

        {/* Price Calculation */}
        {priceCalculation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cena pronájmu</Text>
            <View style={styles.priceSummary}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Počet dní:</Text>
                <Text style={styles.priceValue}>{priceCalculation.days}</Text>
              </View>
              <View style={styles.priceBreakdown}>
                {priceCalculation.breakdown.map((item, index) => (
                  <View key={index} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{item.period}</Text>
                    <Text style={styles.breakdownPrice}>{formatCzk(item.price)}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Celková cena:</Text>
                <Text style={styles.totalValue}>{formatCzk(priceCalculation.totalPrice)}</Text>
              </View>
            </View>
            <Text style={styles.priceNote}>
              Při rezervaci je blokována částka 0 Kč. Platba bude stržena po ukončení pronájmu.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isFormValid() && styles.submitButtonEnabled]}
          onPress={handleSubmit}
          disabled={!isFormValid()}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Icon name="payment" size={20} color="#ffffff" />
              <Text style={styles.submitButtonText}>
                Pokračovat k platbě
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={formData.startDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={handleStartDateChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={formData.endDate}
          mode="date"
          display="default"
          minimumDate={new Date(formData.startDate.getTime() + 24 * 60 * 60 * 1000)}
          onChange={handleEndDateChange}
        />
      )}
    </View>
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
  content: {
    flex: 1,
  },
  trailerInfo: {
    padding: 20,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  trailerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  trailerType: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  dateContent: {
    flex: 1,
    marginLeft: 12,
  },
  dateLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  checkingText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
    color: '#1f2937',
  },
  priceSummary: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  priceBreakdown: {
    marginVertical: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  breakdownPrice: {
    fontSize: 12,
    color: '#1f2937',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  priceNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 12,
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonEnabled: {
    backgroundColor: '#3b82f6',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ReservationScreen;