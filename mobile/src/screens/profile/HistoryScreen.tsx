import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { reservationService, trailerService } from '../../services/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Reservation, Trailer, MainTabParamList } from '@shared/types';
import {
  formatCzk,
  formatDate,
  isReservationActive,
  isReservationUpcoming,
  isReservationCompleted,
} from '@shared/utils';

type HistoryScreenNavigationProp = StackNavigationProp<MainTabParamList, 'History'>;

interface Props {
  navigation: HistoryScreenNavigationProp;
}

interface ReservationWithTrailer extends Reservation {
  trailer?: Trailer;
}

const HistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<ReservationWithTrailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed' | 'upcoming'>('all');

  useEffect(() => {
    if (user) {
      loadReservations();
    }
  }, [user, activeFilter]);

  const loadReservations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userReservations = await reservationService.getUserReservations(user.uid);

      // Load trailer data for each reservation
      const reservationsWithTrailers = await Promise.all(
        userReservations.map(async (reservation) => {
          const trailer = await trailerService.getTrailer(reservation.trailerId);
          return { ...reservation, trailer };
        })
      );

      // Apply filter
      let filtered = reservationsWithTrailers;
      if (activeFilter !== 'all') {
        filtered = reservationsWithTrailers.filter((reservation) => {
          switch (activeFilter) {
            case 'active':
              return isReservationActive(reservation);
            case 'upcoming':
              return isReservationUpcoming(reservation);
            case 'completed':
              return isReservationCompleted(reservation);
            default:
              return true;
          }
        });
      }

      setReservations(filtered);
    } catch (error) {
      console.error('Error loading reservations:', error);
      Alert.alert('Chyba', 'Nepodařilo se načíst historii rezervací');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReservations();
    setRefreshing(false);
  };

  const handleViewDetails = (reservation: ReservationWithTrailer) => {
    if (isReservationActive(reservation)) {
      navigation.navigate('ActiveRental', { reservationId: reservation.id });
    }
  };

  const handleGetDirections = (trailer: Trailer) => {
    const url = `https://maps.google.com/maps?q=${trailer.location.lat},${trailer.location.lng}`;
    Linking.openURL(url);
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

  const handleDownloadInvoice = (reservation: Reservation) => {
    if (reservation.stripeInvoiceId) {
      Alert.alert('Faktura', 'Faktura bude odeslána na Váš e-mail.');
    } else {
      Alert.alert('Faktura', 'Faktura ještě není k dispozici. Bude vytvořena po dokončení pronájmu.');
    }
  };

  const getStatusInfo = (reservation: Reservation) => {
    if (isReservationActive(reservation)) {
      return {
        text: 'Aktivní',
        color: '#22c55e',
        icon: 'play-circle',
      };
    } else if (isReservationUpcoming(reservation)) {
      return {
        text: 'Nadcházející',
        color: '#3b82f6',
        icon: 'schedule',
      };
    } else if (reservation.status === 'completed') {
      return {
        text: 'Dokončeno',
        color: '#6b7280',
        icon: 'check-circle',
      };
    } else if (reservation.status === 'cancelled') {
      return {
        text: 'Zrušeno',
        color: '#ef4444',
        icon: 'cancel',
      };
    } else {
      return {
        text: reservation.status,
        color: '#6b7280',
        icon: 'help',
      };
    }
  };

  const ReservationCard: React.FC<{ reservation: ReservationWithTrailer }> = ({ reservation }) => {
    const statusInfo = getStatusInfo(reservation);
    const isActive = isReservationActive(reservation);

    return (
      <View style={styles.reservationCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <Text style={styles.trailerName}>
              {reservation.trailer?.name || 'Neznámý přívěs'}
            </Text>
            <Text style={styles.trailerType}>
              {reservation.trailer?.type || ''}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Icon name={statusInfo.icon} size={12} color="#ffffff" />
            <Text style={styles.statusText}>{statusInfo.text}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.dateInfo}>
            <View style={styles.dateItem}>
              <Icon name="event" size={16} color="#6b7280" />
              <Text style={styles.dateLabel}>Převzetí:</Text>
              <Text style={styles.dateValue}>
                {formatDate(reservation.startDate)}
              </Text>
            </View>
            <View style={styles.dateItem}>
              <Icon name="event-available" size={16} color="#6b7280" />
              <Text style={styles.dateLabel}>Vrácení:</Text>
              <Text style={styles.dateValue}>
                {formatDate(reservation.endDate)}
              </Text>
            </View>
          </View>

          <View style={styles.priceInfo}>
            <Text style={styles.priceLabel}>Cena:</Text>
            <Text style={styles.priceValue}>{formatCzk(reservation.totalPrice)}</Text>
          </View>
        </View>

        {/* Active reservation specific info */}
        {isActive && reservation.pinCode && (
          <View style={styles.activeInfo}>
            <View style={styles.pinInfo}>
              <Icon name="lock" size={16} color="#f59e0b" />
              <Text style={styles.pinLabel}>PIN kód:</Text>
              <Text style={styles.pinValue}>{reservation.pinCode}</Text>
            </View>
          </View>
        )}

        <View style={styles.cardActions}>
          {isActive && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleViewDetails(reservation)}
            >
              <Icon name="visibility" size={16} color="#3b82f6" />
              <Text style={styles.actionButtonText}>Spravovat</Text>
            </TouchableOpacity>
          )}

          {reservation.trailer && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleGetDirections(reservation.trailer!)}
            >
              <Icon name="directions" size={16} color="#3b82f6" />
              <Text style={styles.actionButtonText}>Navigovat</Text>
            </TouchableOpacity>
          )}

          {reservation.status === 'completed' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDownloadInvoice(reservation)}
            >
              <Icon name="receipt" size={16} color="#3b82f6" />
              <Text style={styles.actionButtonText}>Faktura</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Historie výpůjček</Text>
        <Text style={styles.subtitle}>
          {reservations.length} {reservations.length === 1 ? 'výpůjčka' : reservations.length < 4 ? 'výpůjčky' : 'výpůjček'}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: 'Vše', icon: 'apps' },
            { key: 'active', label: 'Aktivní', icon: 'play-circle' },
            { key: 'upcoming', label: 'Nadcházející', icon: 'schedule' },
            { key: 'completed', label: 'Dokončené', icon: 'check-circle' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                activeFilter === filter.key && styles.activeFilter,
              ]}
              onPress={() => setActiveFilter(filter.key as any)}
            >
              <Icon
                name={filter.icon}
                size={16}
                color={activeFilter === filter.key ? '#3b82f6' : '#6b7280'}
              />
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter.key && styles.activeFilterText,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Reservations List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {reservations.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="history" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>
              {activeFilter === 'all' ? 'Žádné výpůjčky' : `Žádné ${activeFilter === 'active' ? 'aktivní' : activeFilter === 'upcoming' ? 'nadcházející' : 'dokončené'} výpůjčky`}
            </Text>
            <Text style={styles.emptyText}>
              {activeFilter === 'all'
                ? 'Ještě jste si nepůjčili žádný přívěs. Prohlédněte si naši nabídku na mapě!'
                : 'Zkuste změnit filtr pro zobrazení jiných výpůjček.'}
            </Text>
            {activeFilter === 'all' && (
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate('Map')}
              >
                <Icon name="map" size={20} color="#ffffff" />
                <Text style={styles.browseButtonText}>Procházet přívěsy</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.reservationsList}>
            {reservations.map((reservation) => (
              <ReservationCard key={reservation.id} reservation={reservation} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Contact Support */}
      <View style={styles.supportContainer}>
        <TouchableOpacity style={styles.supportButton} onPress={handleContactSupport}>
          <Icon name="support-agent" size={20} color="#3b82f6" />
          <Text style={styles.supportButtonText}>Potřebujete pomoc?</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    padding: 20,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  filterContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    marginVertical: 12,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeFilter: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  filterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginLeft: 6,
  },
  activeFilterText: {
    color: '#3b82f6',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  browseButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  reservationsList: {
    padding: 16,
    gap: 12,
  },
  reservationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cardTitle: {
    flex: 1,
  },
  trailerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  trailerType: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#ffffff',
  },
  cardContent: {
    padding: 16,
  },
  dateInfo: {
    marginBottom: 12,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
    width: 60,
  },
  dateValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    flex: 1,
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  activeInfo: {
    backgroundColor: '#fffbeb',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
    marginRight: 8,
  },
  pinValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  supportContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  supportButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
});

export default HistoryScreen;