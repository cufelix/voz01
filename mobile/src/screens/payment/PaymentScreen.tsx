import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useStripe } from '@stripe/stripe-react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { reservationService } from '../../services/firestore';
import { Reservation, RootStackParamList } from '@shared/types';
import { formatCzk, formatDate, getErrorMessage } from '@shared/utils';

type PaymentScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Payment'>;

interface Props {
  navigation: PaymentScreenNavigationProp;
  route: {
    params: {
      reservationId: string;
    };
  };
}

const PaymentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { reservationId } = route.params;
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentSheetReady, setPaymentSheetReady] = useState(false);

  useEffect(() => {
    loadReservation();
  }, [reservationId]);

  const loadReservation = async () => {
    try {
      setLoading(true);
      const reservationData = await reservationService.getReservation(reservationId);
      if (reservationData) {
        setReservation(reservationData);
        initializePaymentSheet(reservationData);
      } else {
        Alert.alert('Chyba', 'Rezervace nebyla nalezena');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading reservation:', error);
      Alert.alert('Chyba', 'Nepodařilo se načíst rezervaci');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const initializePaymentSheet = async (reservationData: Reservation) => {
    try {
      // Create payment intent on backend
      const { paymentIntent, ephemeralKey, customer } = await createPaymentIntent(reservationData);

      const { error } = await initPaymentSheet({
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: paymentIntent,
        merchantDisplayName: 'Pripoj.to',
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: `${reservationData.userId}`, // Will be filled with actual user data
        },
      });

      if (error) {
        console.error('Error initializing payment sheet:', error);
        Alert.alert('Chyba', 'Nepodařilo se inicializovat platbu');
        return;
      }

      setPaymentSheetReady(true);
    } catch (error) {
      console.error('Error setting up payment sheet:', error);
      Alert.alert('Chyba', 'Nepodařilo se nastavit platbu');
    }
  };

  const createPaymentIntent = async (reservationData: Reservation) => {
    // Call your backend to create the payment intent
    // For this example, we'll simulate it
    const response = await fetch('https://your-backend.com/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 0, // 0 CZK for authorization
        currency: 'czk',
        reservationId: reservationData.id,
        userId: reservationData.userId,
        customer: reservationData.userId, // Will be Stripe customer ID
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }

    return await response.json();
  };

  const handlePayment = async () => {
    if (!paymentSheetReady) {
      Alert.alert('Chyba', 'Platební brána není připravena');
      return;
    }

    setProcessing(true);

    try {
      const { error } = await presentPaymentSheet();

      if (error) {
        console.error('Payment error:', error);

        let errorMessage = 'Platba selhala';
        if (error.code === 'Canceled') {
          errorMessage = 'Platba byla zrušena';
        } else if (error.code === 'Failed') {
          errorMessage = 'Platba selhala. Zkuste to znovu.';
        } else if (error.code === 'Timeout') {
          errorMessage = 'Platba vypršela. Zkuste to znovu.';
        }

        Alert.alert('Chyba platby', errorMessage);
      } else {
        // Payment successful
        Alert.alert(
          'Platba úspěšná',
          'Rezervace byla potvrzena. Obdržíte PIN kód pro přístup k přívěsu.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('Main', { screen: 'History' });
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Chyba', 'Nepodařilo se zpracovat platbu');
    } finally {
      setProcessing(false);
    }
  };

  const handleTermsPress = () => {
    Linking.openURL('https://pripoj.to/terms');
  };

  const handlePrivacyPress = () => {
    Linking.openURL('https://pripoj.to/privacy');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Načítám platbu...</Text>
      </View>
    );
  }

  if (!reservation) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Rezervace nebyla nalezena</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name="payment" size={32} color="#3b82f6" />
          </View>
          <Text style={styles.title}>Potvrzení platby</Text>
          <Text style={styles.subtitle}>
            Potvrďte rezervaci autorizační platbou 0 Kč
          </Text>
        </View>

        {/* Reservation Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Souhrn rezervace</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Rezervace č.:</Text>
              <Text style={styles.summaryValue}>#{reservation.id.slice(-6)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Datum převzetí:</Text>
              <Text style={styles.summaryValue}>{formatDate(reservation.startDate)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Datum vrácení:</Text>
              <Text style={styles.summaryValue}>{formatDate(reservation.endDate)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Celková cena:</Text>
              <Text style={styles.summaryValue}>{formatCzk(reservation.totalPrice)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informace o platbě</Text>
          <View style={styles.paymentInfoContainer}>
            <View style={styles.paymentInfoItem}>
              <Icon name="security" size={20} color="#22c55e" />
              <View style={styles.paymentInfoContent}>
                <Text style={styles.paymentInfoTitle}>Bezpečná platba</Text>
                <Text style={styles.paymentInfoDescription}>
          Vaše platba je zabezpečena přes Stripe s 3D Secure ověřením
                </Text>
              </View>
            </View>

            <View style={styles.paymentInfoItem}>
              <Icon name="schedule" size={20} color="#3b82f6" />
              <View style={styles.paymentInfoContent}>
                <Text style={styles.paymentInfoTitle}>Platba po použití</Text>
                <Text style={styles.paymentInfoDescription}>
          Dnes je stržena pouze autorizační částka 0 Kč. Skutečná platba bude stržena po ukončení pronájmu
                </Text>
              </View>
            </View>

            <View style={styles.paymentInfoItem}>
              <Icon name="lock" size={20} color="#f59e0b" />
              <View style={styles.paymentInfoContent}>
                <Text style={styles.paymentInfoTitle}>PIN kód</Text>
                <Text style={styles.paymentInfoDescription}>
          Po úspěšné platbě obdržíte PIN kód pro odemčení přívěsu
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Akceptované platební metody</Text>
          <View style={styles.paymentMethodsContainer}>
            <View style={styles.paymentMethod}>
              <Icon name="credit-card" size={24} color="#6b7280" />
              <Text style={styles.paymentMethodText}>Kreditní karty</Text>
            </View>
            <View style={styles.paymentMethod}>
              <Icon name="apple" size={24} color="#6b7280" />
              <Text style={styles.paymentMethodText}>Apple Pay</Text>
            </View>
            <View style={styles.paymentMethod}>
              <Icon name="android" size={24} color="#6b7280" />
              <Text style={styles.paymentMethodText}>Google Pay</Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.section}>
          <Text style={styles.termsText}>
            Potvrzením platby souhlasíte s našimi{' '}
            <Text style={styles.link} onPress={handleTermsPress}>
              obchodními podmínkami
            </Text>{' '}
            a{' '}
            <Text style={styles.link} onPress={handlePrivacyPress}>
              zásadami ochrany osobních údajů
            </Text>
            .
          </Text>
        </View>
      </ScrollView>

      {/* Payment Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, paymentSheetReady && styles.payButtonEnabled]}
          onPress={handlePayment}
          disabled={!paymentSheetReady || processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Icon name="lock" size={20} color="#ffffff" />
              <Text style={styles.payButtonText}>
                Zaplatit 0 Kč (autorizace)
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={processing}
        >
          <Text style={styles.cancelButtonText}>Zrušit</Text>
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
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
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
  header: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f9fafb',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
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
  summaryContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  paymentInfoContainer: {
    gap: 16,
  },
  paymentInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  paymentInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  paymentInfoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  paymentInfoDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  paymentMethod: {
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  termsText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  link: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  payButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonEnabled: {
    backgroundColor: '#3b82f6',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
});

export default PaymentScreen;