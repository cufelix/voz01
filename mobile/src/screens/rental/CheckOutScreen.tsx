import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';

import { reservationService } from '../../services/firestore';
import { Reservation, RootStackParamList } from '@shared/types';
import { formatDate, formatTime } from '@shared/utils';

type CheckOutScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CheckOut'>;

interface Props {
  navigation: CheckOutScreenNavigationProp;
  route: {
    params: {
      reservationId: string;
    };
  };
}

const CheckOutScreen: React.FC<Props> = ({ navigation, route }) => {
  const { reservationId } = route.params;
  const [loading, setLoading] = useState(false);
  const [returnPhotos, setReturnPhotos] = useState<string[]>([]);
  const [step, setStep] = useState(1);

  const steps = [
    {
      id: 1,
      title: 'Pořiďte fotografie',
      description: 'Pořiďte 3 fotografie vráceného přívěsu',
      icon: 'photo-camera',
    },
    {
      id: 2,
      title: 'Zkontrolujte stav',
      description: 'Ujistěte se, že je přívěs čistý a nepoškozený',
      icon: 'checklist',
    },
    {
      id: 3,
      title: 'Zamkněte přívěs',
      description: 'Zamkněte přívěs pomocí stejného PIN kódu',
      icon: 'lock',
    },
    {
      id: 4,
      title: 'Potvrďte vrácení',
      description: 'Dokončete proces vrácení v aplikaci',
      icon: 'task-alt',
    },
  ];

  const handleTakePhoto = () => {
    const options = {
      mediaType: 'photo' as const,
      quality: 0.8,
      includeBase64: false,
    };

    launchImageLibrary(options, (response) => {
      if (response.assets && response.assets[0]) {
        const photoUri = response.assets[0].uri;
        if (photoUri && returnPhotos.length < 3) {
          setReturnPhotos([...returnPhotos, photoUri]);
        } else if (returnPhotos.length >= 3) {
          Alert.alert('Maximum fotek', 'Již jste nahrál 3 fotografie.');
        }
      }
    });
  };

  const handleRemovePhoto = (index: number) => {
    setReturnPhotos(returnPhotos.filter((_, i) => i !== index));
  };

  const handleProceedToNext = () => {
    if (step === 1 && returnPhotos.length < 3) {
      Alert.alert('Chybí fotografie', 'Musíte pořídit přesně 3 fotografie přívěsu.');
      return;
    }
    if (step < steps.length) {
      setStep(step + 1);
    } else {
      completeCheckOut();
    }
  };

  const completeCheckOut = async () => {
    setLoading(true);

    try {
      await reservationService.updateReservation(reservationId, {
        status: 'completed',
        checkOutCompletedAt: new Date(),
        actualEndDate: new Date(),
        returnPhotos,
      });

      Alert.alert(
        'Vrácení dokončeno',
        'Děkujeme za vrácení přívěsu. Faktura bude zaslána na Váš e-mail.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('Main', { screen: 'History' });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error completing check-out:', error);
      Alert.alert('Chyba', 'Nepodařilo se dokončit vrácení. Kontaktujte podporu.');
    } finally {
      setLoading(false);
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

  const currentStep = steps[step - 1];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Vrácení přívěsu</Text>
        <Text style={styles.subtitle}>
          Postupujte podle pokynů pro správné vrácení
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

          {/* Step-specific content */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.photoInstruction}>
                Pořiďte fotografie z následujících úhlů:
              </Text>
              <View style={styles.photoRequirements}>
                <View style={styles.photoRequirement}>
                  <Icon name="looks-one" size={20} color="#3b82f6" />
                  <Text style={styles.photoRequirementText}>
                    Přední strana přívěsu
                  </Text>
                </View>
                <View style={styles.photoRequirement}>
                  <Icon name="looks-two" size={20} color="#3b82f6" />
                  <Text style={styles.photoRequirementText}>
                    Zadní strana s plachtou
                  </Text>
                </View>
                <View style={styles.photoRequirement}>
                  <Icon name="looks_3" size={20} color="#3b82f6" />
                  <Text style={styles.photoRequirementText}>
                    Vnitřek nákladového prostoru
                  </Text>
                </View>
              </View>

              {/* Photo Upload Area */}
              <View style={styles.photoUploadArea}>
                <Text style={styles.photoUploadTitle}>
                  Nahrané fotografie ({returnPhotos.length}/3)
                </Text>
                <View style={styles.photoGrid}>
                  {returnPhotos.map((photo, index) => (
                    <View key={index} style={styles.photoContainer}>
                      <Image source={{ uri: photo }} style={styles.photo} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => handleRemovePhoto(index)}
                      >
                        <Icon name="close" size={20} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {returnPhotos.length < 3 &&
                    Array.from({ length: 3 - returnPhotos.length }).map((_, index) => (
                      <TouchableOpacity
                        key={`empty-${index}`}
                        style={styles.addPhotoButton}
                        onPress={handleTakePhoto}
                      >
                        <Icon name="add-a-photo" size={32} color="#9ca3af" />
                        <Text style={styles.addPhotoText}>Přidat fotku</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <View style={styles.checklist}>
                <View style={styles.checklistItem}>
                  <Icon name="check-box-outline-blank" size={20} color="#6b7280" />
                  <Text style={styles.checklistText}>
                    Přívěs je vyčištěn od nákladu a nečistot
                  </Text>
                </View>
                <View style={styles.checklistItem}>
                  <Icon name="check-box-outline-blank" size={20} color="#6b7280" />
                  <Text style={styles.checklistText}>
                    Žádné nové poškození oproti převzetí
                  </Text>
                </View>
                <View style={styles.checklistItem}>
                  <Icon name="check-box-outline-blank" size={20} color="#6b7280" />
                  <Text style={styles.checklistText}>
                    Všechny doklady a výbava jsou na místě
                  </Text>
                </View>
                <View style={styles.checklistItem}>
                  <Icon name="check-box-outline-blank" size={20} color="#6b7280" />
                  <Text style={styles.checklistText}>
                    Palivová nádrž je ve stejném stavu
                  </Text>
                </View>
              </View>
              <Text style={styles.tipText}>
                💡 Pokud zjistíte problémy, vyfoťte je a kontaktujte podporu
              </Text>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              <View style={styles.lockInstructions}>
                <Icon name="lock" size={64} color="#f59e0b" />
                <Text style={styles.lockTitle}>
                  Zamkněte přívěs stejným PIN kódem
                </Text>
                <Text style={styles.lockDescription}>
                  1. Najděte klávesnici na chytrém zámku
                  {'\n'}
                  2. Zadejte Váš PIN kód
                  {'\n'}
                  3. Počkejte na potvrzovací zvuk
                  {'\n'}
                  4. Zkontrolujte, že je přívěs zamčený
                </Text>
              </View>
              <Text style={styles.warningText}>
                ⚠️ Nezavírejte klíče uvnitř přívěsu!
              </Text>
            </View>
          )}

          {step === 4 && (
            <View style={styles.stepContent}>
              <View style={styles.summaryContainer}>
                <Icon name="task-alt" size={64} color="#22c55e" />
                <Text style={styles.summaryTitle}>
                  Jste připraveni dokončit vrácení
                </Text>
                <View style={styles.summaryList}>
                  <View style={styles.summaryItem}>
                    <Icon name="check" size={16} color="#22c55e" />
                    <Text style={styles.summaryText}>3 fotografie pořízeny</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Icon name="check" size={16} color="#22c55e" />
                    <Text style={styles.summaryText}>Přívěs zkontrolován</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Icon name="check" size={16} color="#22c55e" />
                    <Text style={styles.summaryText}>Přívěs zamčen</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Return Information */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Informace o vrácení</Text>
          <View style={styles.infoItems}>
            <View style={styles.infoItem}>
              <Icon name="schedule" size={16} color="#3b82f6" />
              <Text style={styles.infoText}>
                Čas vrácení: {formatTime(new Date())}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="payment" size={16} color="#3b82f6" />
              <Text style={styles.infoText}>
                Finální platba bude zpracována do 24 hodin
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="receipt" size={16} color="#3b82f6" />
              <Text style={styles.infoText}>
                Faktura bude odeslána na Váš e-mail
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={styles.supportButton}
            onPress={handleContactSupport}
            disabled={loading}
          >
            <Icon name="support-agent" size={20} color="#3b82f6" />
            <Text style={styles.supportButtonText}>Podpora</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.completeButton, loading && styles.disabledButton]}
            onPress={handleProceedToNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text style={styles.completeButtonText}>
                  {step === steps.length ? 'Dokončit vrácení' : 'Pokračovat'}
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
  photoInstruction: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  photoRequirements: {
    marginBottom: 24,
  },
  photoRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoRequirementText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  photoUploadArea: {
    width: '100%',
  },
  photoUploadTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  photoContainer: {
    width: '30%',
    aspectRatio: 1,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  checklist: {
    width: '100%',
    marginBottom: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checklistText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  tipText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  lockInstructions: {
    alignItems: 'center',
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginVertical: 16,
    textAlign: 'center',
  },
  lockDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
  },
  summaryContainer: {
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginVertical: 16,
    textAlign: 'center',
  },
  summaryList: {
    width: '100%',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
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
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flex: 1,
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
    marginLeft: 6,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flex: 2,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default CheckOutScreen;