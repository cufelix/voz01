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
import { validateCzechPhoneNumber, formatCzechPhoneNumber } from '@shared/utils';
import { RootStackParamList } from '@shared/types';

type PhoneScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PhoneAuth'>;

interface Props {
  navigation: PhoneScreenNavigationProp;
}

const PhoneScreen: React.FC<Props> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, '');

    // Auto-add country code if not present
    if (cleaned.length === 9 && !text.includes('+')) {
      return `+420 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }

    // Format with country code
    if (cleaned.startsWith('420') && cleaned.length === 12) {
      return `+420 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
    }

    return text;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhone(formatted);
    setError('');
  };

  const validatePhone = (phoneNumber: string): boolean => {
    const cleaned = phoneNumber.replace(/\D/g, '');

    if (cleaned.startsWith('420')) {
      return cleaned.length === 12;
    }

    return cleaned.length === 9;
  };

  const handleSendSMS = async () => {
    if (!validatePhone(phone)) {
      setError('Zadejte platné telefonní číslo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Format phone number for Firebase (remove spaces, keep +)
      const formattedPhone = phone.replace(/\s/g, '');

      const confirmation = await firebaseAuth.signInWithPhoneNumber(formattedPhone, true);

      navigation.navigate('OTP', { confirmation });
    } catch (error: any) {
      console.error('Error sending SMS:', error);

      let errorMessage = 'Nepodařilo se odeslat SMS kód';

      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Příliš mnoho pokusů. Zkuste to znovu později.';
      } else if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Neplatné telefonní číslo';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = 'Limit SMS byl překročen. Kontaktujte podporu.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isValid = validatePhone(phone) && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>Vítejte v Pripoj.to</Text>
          <Text style={styles.subtitle}>
            Zapůjčte si přívěs jednoduše a rychle
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Telefonní číslo</Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder="+420 123 456 789"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={16}
              editable={!loading}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, isValid && styles.buttonEnabled]}
              onPress={handleSendSMS}
              disabled={!isValid}
            >
              <Text style={[styles.buttonText, isValid && styles.buttonTextEnabled]}>
                {loading ? 'Odesílám...' : 'Odeslat SMS kód'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.infoText}>
            Na vaše číslo bude odeslána SMS s 6místným ověřovacím kódem
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
    marginBottom: 48,
  },
  form: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 8,
  },
  button: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
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
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default PhoneScreen;