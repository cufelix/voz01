import React, { useState, useEffect, useRef } from 'react';
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
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList } from '@shared/types';

type OTPScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OTP'>;

interface Props {
  navigation: OTPScreenNavigationProp;
  route: {
    params: {
      confirmation: any;
    };
  };
}

const OTPScreen: React.FC<Props> = ({ navigation, route }) => {
  const { confirmation } = route.params;
  const { login } = useAuth();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Auto-focus first input
    inputRefs.current[0]?.focus();
  }, []);

  const handleCodeChange = (value: string, index: number) => {
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (newCode.every(digit => digit !== '')) {
      handleVerifyCode(newCode.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      // Focus previous input on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (otpCode?: string) => {
    const verificationCode = otpCode || code.join('');

    if (verificationCode.length !== 6) {
      setError('Zadejte kompletní 6místný kód');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await confirmation.confirm(verificationCode);

      if (result.user) {
        await login(result.user);

        // Check if user exists in database
        // This will be handled by AuthContext redirect logic
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);

      let errorMessage = 'Neplatný ověřovací kód';

      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Neplatný ověřovací kód';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'Kód vypršel. Požádejte o nový.';
      } else if (error.code === 'auth/missing-verification-code') {
        errorMessage = 'Chybí ověřovací kód';
      }

      setError(errorMessage);

      // Clear all inputs on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendSMS = async () => {
    if (!canResend) return;

    setLoading(true);
    setError('');

    try {
      // This would need to be implemented to resend SMS
      // For now, just navigate back to phone screen
      navigation.goBack();
    } catch (error: any) {
      setError('Nepodařilo se znovu odeslat SMS');
    } finally {
      setLoading(false);
    }
  };

  const isCodeComplete = code.every(digit => digit !== '') && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>Ověření kódu</Text>
          <Text style={styles.subtitle}>
            Zadejte 6místný kód z SMS
          </Text>

          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[styles.codeInput, error && styles.codeInputError]}
                value={digit}
                onChangeText={(value) => handleCodeChange(value.replace(/[^0-9]/g, ''), index)}
                onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(key, index)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                secureTextEntry
                editable={!loading}
                selectTextOnFocus
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, isCodeComplete && styles.buttonEnabled]}
            onPress={() => handleVerifyCode()}
            disabled={!isCodeComplete}
          >
            <Text style={[styles.buttonText, isCodeComplete && styles.buttonTextEnabled]}>
              {loading ? 'Ověřuji...' : 'Ověřit kód'}
            </Text>
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            {canResend ? (
              <TouchableOpacity onPress={handleResendSMS} disabled={loading}>
                <Text style={styles.resendLink}>Odeslat kód znovu</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendTimer}>
                Odeslat kód znovu za {resendTimer}s
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelText}>Zpět</Text>
          </TouchableOpacity>
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
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 8,
    fontSize: 20,
    fontWeight: '600',
    backgroundColor: '#f9fafb',
    color: '#1f2937',
  },
  codeInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
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
  resendContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  resendLink: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  resendTimer: {
    fontSize: 16,
    color: '#6b7280',
  },
  cancelButton: {
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
});

export default OTPScreen;