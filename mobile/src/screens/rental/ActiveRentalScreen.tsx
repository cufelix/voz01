import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { reservationService, trailerService } from '../../services/firestore';
import { Reservation, Trailer, RootStackParamList } from '@shared/types';
import {
  formatCzk,
  formatDate,
  formatTime,
  isReservationActive,
  isPinValid,
  calculateRentalDays,
} from '@shared/utils';

type ActiveRentalScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ActiveRental'>;

interface Props {
  navigation: ActiveRentalScreenNavigationProp;
  route: {
    params: {
      reservationId: string;
    };
  };
}

const ActiveRentalScreen: React.FC<Props> = ({ navigation, route }) => {
  const { reservationId } = route.params;
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [trailer, setTrailer] = useState<Trailer | null>(null);
  const [loading, setLoading] = useState(true);
  const [extending, setExtending] = useState(false);
  const [remainingTime, setRemainingTime] = useState<string>('');

  useEffect(() => {
    loadRentalData();
    const interval = updateRemainingTime();
    return () => clearInterval(interval);
  }, [reservationId]);

  const loadRentalData = async () => {
    try {
      setLoading(true);
      const [reservationData, trailerData] = await Promise.all([
        reservationService.getReservation(reservationId),
        // We need to get trailer from reservation data
      ]);

      if (reservationData) {
        setReservation(reservationData);
        const trailerData = await trailerService.getTrailer(reservationData.trailerId);
        setTrailer(trailerData || null);
      } else {
        Alert.alert('Chyba', 'Rezervace nebyla nalezena');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading rental data:', error);
      Alert.alert('Chyba', 'Nepodařilo se načíst data o pronájmu');
    } finally {
      setLoading(false);
    }
  };

  const updateRemainingTime = () => {
    const interval = setInterval(() => {
      if (reservation) {
        const now = new Date();
        const end = new Date(reservation.endDate);
        const diff = end.getTime() - now.getTime();

        if (diff <= 0) {
          setRemainingTime('Pronájem skončil');
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setRemainingTime(`${hours}h ${minutes}m`);
        }
      }
    }, 60000); // Update every minute

    return interval;
  };

  const handleCheckIn = () => {
    navigation.navigate('CheckIn', { reservationId });
  };

  const handleCheckOut = () => {
    navigation.navigate('CheckOut', { reservationId });
  };

  const handleExtendRental = async () => {
    if (!reservation || !trailer) return;

    setExtending(true);

    try {
      // Calculate new end date (extend by 1 day)
      const newEndDate = new Date(reservation.endDate.getTime() + 24 * 60 * 60 * 1000);
      const additionalDays = calculateRentalDays(reservation.endDate, newEndDate);
      const additionalPrice = additionalDays * trailer.pricing.additionalDays;

      Alert.alert(
        'Prodloužení pronájmu',
        `Chcete prodloužit pronájem o 1 den za ${formatCzk(additionalPrice)}?`,
        [
          { text: 'Zrušit', style: 'cancel' },
          {
            text: 'Prodloužit',
            onPress: async () => {
              try {
                await reservationService.updateReservation(reservationId, {
                  endDate: newEndDate,
                  totalPrice: reservation.totalPrice + additionalPrice,
                });

                Alert.alert(
                  'Úspěch',
                  'Pronájem byl prodloužen o 1 den.'
                );
                loadRentalData();
              } catch (error) {
                Alert.alert('Chyba', 'Nepodařilo se prodloužit pronájem');
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Chyba', 'Nepodařilo se vypočítat cenu prodloužení');
    } finally {
      setExtending(false);
    }
  };

  const handleGetDirections = () => {
    if (trailer) {
      const url = `https://maps.google.com/maps?q=${trailer.location.lat},${trailer.location.lng}`;
      Linking.openURL(url);
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Kontakt na podporu',
      'Tel: +420 123 456 789\nEmail: podpora@pripoj.to',
      [
        { text: 'Zavřít', style: 'cancel' },
        { text: 'Volat', onPress: () => Linking.openURL('tel:+420123456789') },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!reservation || !trailer) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Data nebyla nalezena</Text>
      </View>
    );
  }

  const isActive = isReservationActive(reservation);
  const pinValid = isPinValid(reservation.pinExpiry);
  const needsCheckIn = reservation.status === 'confirmed' && !reservation.checkInCompletedAt;
  const needsCheckOut = reservation.status === 'active' && !reservation.checkOutCompletedAt;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: isActive ? '#22c55e' : '#f59e0b' }]} />
          <Text style={styles.statusText}>
            {isActive ? 'Aktivní pronájem' : 'Připraven k převzetí'}
          </Text>
        </View>
        <Text style={styles.remainingTime}>{remainingTime}</Text>
      </View>

      {/* Trailer Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Přívěs</Text>
        <View style={styles.trailerInfo}>
          <Text style={styles.trailerName}>{trailer.name}</Text>
          <Text style={styles.trailerType}>{trailer.type}</Text>
          <View style={styles.locationRow}>
            <Icon name="location-on" size={16} color="#ef4444" />
            <Text style={styles.locationText}>{trailer.location.address}</Text>
            <TouchableOpacity onPress={handleGetDirections}>
              <Text style={styles.directionsLink}>Navigovat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* PIN Code */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Přístupový kód</Text>
        <View style={[styles.pinContainer, !pinValid && styles.pinExpired]}>
          <Text style={styles.pinLabel}>PIN kód:</Text>
          <Text style={[styles.pinCode, !pinValid && styles.pinExpiredText]}>
            {pinValid ? reservation.pinCode : 'EXPIROVÁNO'}
          </Text>
          <Text style={styles.pinValidity}>
            Platnost do: {formatTime(reservation.pinExpiry)}
          </Text>
        </View>
        {!pinValid && (
          <View style={styles.pinWarning}>
            <Icon name="warning" size={20} color="#f59e0b" />
            <Text style={styles.pinWarningText}>
              PIN kód expiroval. Kontaktujte podporu pro nový kód.
            </Text>
          </View>
        )}
      </View>

      {/* Rental Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detaily pronájmu</Text>
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Převzetí:</Text>
            <Text style={styles.detailValue}>
              {formatDate(reservation.startDate)} {formatTime(reservation.startDate)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Vrácení:</Text>
            <Text style={styles.detailValue}>
              {formatDate(reservation.endDate)} {formatTime(reservation.endDate)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Celková cena:</Text>
            <Text style={styles.detailValue}>{formatCzk(reservation.totalPrice)}</Text>
          </View>
        </View>
      </View>

      {/* Instructions */}
      {needsCheckIn && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pokyny k převzetí</Text>
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                Najděte přívěs na adrese uvedené výše
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                Zadejte PIN kód do chytrého zámku Igloohome
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                Odemkněte přívěs a zkontrolujte jeho stav
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Return Instructions */}
      {needsCheckOut && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pokyny k vrácení</Text>
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                Pořiďte 3 fotografie vráceného přívěsu
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                Ujistěte se, že přívěs je čistý a nepoškozený
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                Zamkněte přívěs a potvrďte vrácení v aplikaci
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Akce</Text>

        {needsCheckIn && (
          <TouchableOpacity style={styles.actionButton} onPress={handleCheckIn}>
            <Icon name="login" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>Převzít přívěs</Text>
          </TouchableOpacity>
        )}

        {needsCheckOut && (
          <TouchableOpacity style={styles.actionButton} onPress={handleCheckOut}>
            <Icon name="logout" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>Vrátit přívěs</Text>
          </TouchableOpacity>
        )}

        {isActive && (
          <TouchableOpacity
            style={[styles.secondaryButton, styles.extendButton]}
            onPress={handleExtendRental}
            disabled={extending}
          >
            {extending ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <>
                <Icon name="schedule" size={20} color="#3b82f6" />
                <Text style={styles.secondaryButtonText}>Prodloužit pronájem</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.secondaryButton, styles.supportButton]}
          onPress={handleContactSupport}
        >
          <Icon name="support-agent" size={20} color="#3b82f6" />
          <Text style={styles.secondaryButtonText}>Kontaktovat podporu</Text>
        </TouchableOpacity>
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
  header: {
    padding: 20,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  remainingTime: {
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
  trailerInfo: {
    gap: 8,
  },
  trailerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  trailerType: {
    fontSize: 16,
    color: '#6b7280',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  directionsLink: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  pinContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  pinExpired: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  pinLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  pinCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    letterSpacing: 4,
  },
  pinExpiredText: {
    color: '#9ca3af',
  },
  pinValidity: {
    fontSize: 12,
    color: '#6b7280',
  },
  pinWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
  },
  pinWarningText: {
    fontSize: 14,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  detailsGrid: {
    gap: 16,
  },
  detailItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  instructionsContainer: {
    gap: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  extendButton: {
    marginBottom: 8,
  },
  supportButton: {
    marginBottom: 0,
  },
});

export default ActiveRentalScreen;