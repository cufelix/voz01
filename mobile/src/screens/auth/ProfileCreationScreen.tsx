import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { firebaseAuth } from '../../services/firebase';
import { createUserDocument } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  validateName,
  validateEmail,
  validateAddress,
  validateCzechICO,
  formatCzechPostalCode,
} from '@shared/utils';
import { RootStackParamList, UserProfileForm } from '@shared/types';

type ProfileCreationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ProfileCreation'
>;

interface Props {
  navigation: ProfileCreationScreenNavigationProp;
}

const ProfileCreationScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  const [formData, setFormData] = useState<UserProfileForm>({
    firstName: '',
    lastName: '',
    email: '',
    street: '',
    city: '',
    postalCode: '',
    ico: '',
  });

  const [errors, setErrors] = useState<Partial<UserProfileForm>>({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: keyof UserProfileForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Auto-format postal code
    if (field === 'postalCode') {
      const formatted = formatCzechPostalCode(value);
      if (formatted !== value) {
        setFormData(prev => ({ ...prev, postalCode: formatted }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<UserProfileForm> = {};

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Jméno je povinné';
    } else if (!validateName(formData.firstName)) {
      newErrors.firstName = 'Jméno musí mít 2-50 znaků';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Příjmení je povinné';
    } else if (!validateName(formData.lastName)) {
      newErrors.lastName = 'Příjmení musí mít 2-50 znaků';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'E-mail je povinný';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Neplatný formát e-mailu';
    }

    // Address validation
    if (!formData.street.trim()) {
      newErrors.street = 'Ulice je povinná';
    } else if (formData.street.length < 3) {
      newErrors.street = 'Ulice musí mít alespoň 3 znaky';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Město je povinné';
    } else if (formData.city.length < 2) {
      newErrors.city = 'Město musí mít alespoň 2 znaky';
    }

    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'PSČ je povinné';
    }

    // ICO validation (optional)
    if (formData.ico.trim() && !validateCzechICO(formData.ico)) {
      newErrors.ico = 'Neplatné IČO';
    }

    // Full address validation
    if (!validateAddress(formData.street, formData.city, formData.postalCode)) {
      if (!newErrors.street) newErrors.street = '';
      if (!newErrors.city) newErrors.city = '';
      if (!newErrors.postalCode) newErrors.postalCode = '';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user) {
      Alert.alert('Chyba', 'Uživatel není přihlášen');
      return;
    }

    setLoading(true);

    try {
      const address = {
        street: formData.street.trim(),
        city: formData.city.trim(),
        postalCode: formData.postalCode.trim(),
      };

      const userData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        address,
        ico: formData.ico.trim() || undefined,
        phone: user.phoneNumber || '',
        isActive: true,
        role: 'user' as const,
        stripeCustomerId: '', // Will be created by Cloud Function
      };

      await createUserDocument(user, userData);

      // Navigation will be handled by AuthContext automatically
      // when it detects the user document exists
    } catch (error: any) {
      console.error('Error creating profile:', error);

      let errorMessage = 'Nepodařilo se vytvořit profil';

      if (error.code === 'permission-denied') {
        errorMessage = 'Nemáte oprávnění vytvořit profil';
      } else if (error.code === 'already-exists') {
        errorMessage = 'Profil již existuje';
      }

      Alert.alert('Chyba', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (field: keyof UserProfileForm) => {
    return errors[field];
  };

  const isFormValid = () => {
    return (
      formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.email.trim() &&
      formData.street.trim() &&
      formData.city.trim() &&
      formData.postalCode.trim() &&
      !loading
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>Vytvořit profil</Text>
          <Text style={styles.subtitle}>
            Vyplňte své údaje pro dokončení registrace
          </Text>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Jméno *</Text>
                <TextInput
                  style={[styles.input, getFieldError('firstName') && styles.inputError]}
                  value={formData.firstName}
                  onChangeText={(value) => handleInputChange('firstName', value)}
                  placeholder="Jan"
                  autoCapitalize="words"
                  editable={!loading}
                />
                {getFieldError('firstName') && (
                  <Text style={styles.errorText}>{getFieldError('firstName')}</Text>
                )}
              </View>

              <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Příjmení *</Text>
                <TextInput
                  style={[styles.input, getFieldError('lastName') && styles.inputError]}
                  value={formData.lastName}
                  onChangeText={(value) => handleInputChange('lastName', value)}
                  placeholder="Novák"
                  autoCapitalize="words"
                  editable={!loading}
                />
                {getFieldError('lastName') && (
                  <Text style={styles.errorText}>{getFieldError('lastName')}</Text>
                )}
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>E-mail *</Text>
              <TextInput
                style={[styles.input, getFieldError('email') && styles.inputError]}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="jan.novak@email.cz"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
              {getFieldError('email') && (
                <Text style={styles.errorText}>{getFieldError('email')}</Text>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Ulice a číslo *</Text>
              <TextInput
                style={[styles.input, getFieldError('street') && styles.inputError]}
                value={formData.street}
                onChangeText={(value) => handleInputChange('street', value)}
                placeholder="Hlavní 123"
                editable={!loading}
              />
              {getFieldError('street') && (
                <Text style={styles.errorText}>{getFieldError('street')}</Text>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Město *</Text>
                <TextInput
                  style={[styles.input, getFieldError('city') && styles.inputError]}
                  value={formData.city}
                  onChangeText={(value) => handleInputChange('city', value)}
                  placeholder="Praha"
                  autoCapitalize="words"
                  editable={!loading}
                />
                {getFieldError('city') && (
                  <Text style={styles.errorText}>{getFieldError('city')}</Text>
                )}
              </View>

              <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>PSČ *</Text>
                <TextInput
                  style={[styles.input, getFieldError('postalCode') && styles.inputError]}
                  value={formData.postalCode}
                  onChangeText={(value) => handleInputChange('postalCode', value)}
                  placeholder="110 00"
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading}
                />
                {getFieldError('postalCode') && (
                  <Text style={styles.errorText}>{getFieldError('postalCode')}</Text>
                )}
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>IČO (volitelné)</Text>
              <TextInput
                style={[styles.input, getFieldError('ico') && styles.inputError]}
                value={formData.ico}
                onChangeText={(value) => handleInputChange('ico', value)}
                placeholder="12345678"
                keyboardType="number-pad"
                maxLength={8}
                editable={!loading}
              />
              {getFieldError('ico') && (
                <Text style={styles.errorText}>{getFieldError('ico')}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isFormValid() && styles.buttonEnabled]}
            onPress={handleSubmit}
            disabled={!isFormValid()}
          >
            <Text style={[styles.buttonText, isFormValid() && styles.buttonTextEnabled]}>
              {loading ? 'Vytvářím...' : 'Vytvořit profil'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.requiredText}>
            Pole označená hvězdičkou (*) jsou povinná
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonEnabled: {
    backgroundColor: '#3b82f6',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  buttonTextEnabled: {
    color: '#ffffff',
  },
  requiredText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ProfileCreationScreen;