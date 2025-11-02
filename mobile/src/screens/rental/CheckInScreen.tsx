import React, { useState } from 'react';
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
import Icon from 'react-native-vector-icons/MaterialIcons';

import { reservationService } from '../../services/firestore';
import { Reservation, RootStackParamList } from '@shared/types';
import { formatDate, formatTime } from '@shared/utils';

type CheckInScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CheckIn'>;

interface Props {
  navigation: CheckInScreenNavigationProp;
  route: {
    params: {
      reservationId: string;
    };
  };
}

const CheckInScreen: React.FC<Props> = ({ navigation, route }) => {
  const { reservationId } = route.params;
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const steps = [
    {
      id: 1,
      title: 'Najděte přívěs',
      description: 'Použijte navigaci v aplikaci k nalezení přívěsu',
      icon: 'location-on',
    },
    {
      id: 2,
      title: 'Zadejte PIN kód',
      description: 'Zadejte PIN kód do chytrého zámku Igloohome',
      icon: 'lock',
    },
    {
      id: 3,
      title: 'Odemkněte přívěs',
      description: 'Po zadání PINu se přívěs automaticky odemkne',
      icon: 'lock-open',
    },
    {
      id: 4,
      title: 'Zkontrolujte stav',
      description: 'Ověřte, že je přívěs v pořádku a čistý',
      icon: 'check-circle',
    },
  ];

  const handleGetDirections = () => {
    // This would get the trailer location and open navigation
    Linking.openURL('https://maps.google.com/maps?q=50.0755,14.4378');
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

  const handleConfirmStep = () => {
    if (step < steps.length) {
      setStep(step + 1);
    } else {
      completeCheckIn();
    }
  };

  const completeCheckIn = async () => {
    setLoading(true);

    try {
      await reservationService.updateReservation(reservationId, {
        status: 'active',
        checkInCompletedAt: new Date(),
      });

      Alert.alert(
        'Převzetí dokončeno',
        'Přívěs byl úspěšně převzat. Užijte si bezpečnou jízdu!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('ActiveRental', { reservationId });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error completing check-in:', error);
      Alert.alert('Chyba', 'Nepodařilo se dokončit převzetí. Kontaktujte podporu.');
    } finally {
      setLoading(false);
    }
  };

  const handleProblem = () => {
    Alert.alert(
      'Problém s přívěsem',
      'Máte nějaký problém s přívěsem nebo zámkem?',
      [
        { text: 'Zrušit', style: 'cancel' },
        { text: 'Kontaktovat podporu', onPress: handleContactSupport },
      ]
    );
  };

  const currentStep = steps[step - 1];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Převzetí přívěsu</Text>
        <Text style={styles.subtitle}>
          Postupujte podle pokynů pro bezpečné převzetí
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(step / steps.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Krok {step} z {steps.length}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step Content */}
        <View style={styles.stepContainer}>
          <View style={styles.stepIconContainer}>
            <Icon name={currentStep.icon} size={48} color="#3b82f6" />
          </View>
          <Text style={styles.stepTitle}>{currentStep.title}</Text>
          <Text style={styles.stepDescription}>{currentStep.description}</Text>

          {/* Specific step content */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <TouchableOpacity style={styles.directionsButton} onPress={handleGetDirections}>
                <Icon name="directions" size={20} color="#3b82f6" />
                <Text style={styles.directionsButtonText}>Navigovat k přívěsu</Text>
              </TouchableOpacity>
              <Text style={styles.tipText}>
                💡 Tip: Přívěs by měl být viditelný a snadno přístupný
              </Text>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <View style={styles.pinDemo}>
                <Text style={styles.pinDemoLabel}>Váš PIN kód:</Text>
                <Text style={styles.pinDemoCode}>1234</Text>
                <Text style={styles.pinDemoNote}>
                  Zadejte tento kód na klávesnici zámku
                </Text>
              </View>
              <Text style={styles.tipText}>
                💡 Tip: PIN je platný po celou dobu vašeho pronájmu
              </Text>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              <View style={styles.unlockAnimation}>
                <Icon name="lock-open" size={64} color="#22c55e" />
              </View>
              <Text style={styles.successText}>
                Přívěs je odemčený a připraven k použití
              </Text>
            </View>
          )}

          {step === 4 && (
            <View style={styles.stepContent}>
              <View style={styles.checklist}>
                <View style={styles.checklistItem}>
                  <Icon name="check-box" size={20} color="#22c55e" />
                  <Text style={styles.checklistText}>Zkontrolujte plachtu a karoserii</Text>
                </View>
                <View style={styles.checklistItem}>
                  <Icon name="check-box" size={20} color="#22c55e" />
                  <Text style={styles.checklistText}>Ověřte funkčnost světel</Text>
                </View>
                <View style={styles.checklistItem}>
                  <Icon name="check-box" size={20} color="#22c55e" />
                  <Text style={styles.checklistText}>Zkontrolujte střešní konstrukci</Text>
                </View>
                <View style={styles.checklistItem}>
                  <Icon name="check-box" size={20} color="#22c55e" />
                  <Text style={styles.checklistText}>Ověřte čistotu interiéru</Text>
                </View>
              </View>
              <Text style={styles.warningText}>
                ⚠️ Pokud zjistíte nějaké poškození, kontaktujte prosím podporu
              </Text>
            </View>
          )}
        </View>

        {/* Important Information */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Důležité informace</Text>
          <View style={styles.infoItems}>
            <View style={styles.infoItem}>
              <Icon name="schedule" size={16} color="#3b82f6" />
              <Text style={styles.infoText}>
                Vrácení je naplánováno na {formatDate(new Date())} ve 24:00
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="local-offer" size={16} color="#3b82f6" />
              <Text style={styles.infoText}>
                Pronájem se automaticky prodlouží při pozdním vrácení
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="security" size={16} color="#3b82f6" />
              <Text style={styles.infoText}>
                Přívěs je pojištěn proti základním rizikům
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={styles.problemButton}
            onPress={handleProblem}
            disabled={loading}
          >
            <Icon name="help" size={20} color="#ef4444" />
            <Text style={styles.problemButtonText}>Problém?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.continueButton, loading && styles.disabledButton]}
            onPress={handleConfirmStep}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text style={styles.continueButtonText}>
                  {step === steps.length ? 'Dokončit převzetí' : 'Pokračovat'}
                </Text>
                <Icon name="arrow-forward" size={20} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
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
  },
  progressContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 32,
    alignItems: 'center',
  },
  stepIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  stepContent: {
    width: '100%',
    marginTop: 24,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  directionsButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3b82f6',
    marginLeft: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  pinDemo: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  pinDemoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  pinDemoCode: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1f2937',
    letterSpacing: 4,
    marginBottom: 8,
  },
  pinDemoNote: {
    fontSize: 14,
    color: '#6b7280',
  },
  unlockAnimation: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successText: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: '500',
    textAlign: 'center',
  },
  checklist: {
    width: '100%',
    marginBottom: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checklistText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
  },
  infoSection: {
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  infoItems: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  problemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flex: 1,
  },
  problemButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
    marginLeft: 6,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flex: 2,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default CheckInScreen;