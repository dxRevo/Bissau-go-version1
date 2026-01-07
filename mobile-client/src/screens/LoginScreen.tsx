import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { colors } from '../theme/colors';

export default function LoginScreen({ navigation }: any) {
  console.log('LoginScreen component rendered');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!phoneNumber) {
      Alert.alert('Erreur', 'Veuillez entrer votre numéro de téléphone');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.requestOtp(phoneNumber);
      setStep('otp');
      const otpMessage = response.otp 
        ? `Code OTP envoyé !\n\nCode: ${response.otp}\n(En développement seulement)`
        : 'Code OTP envoyé';
      Alert.alert('Succès', otpMessage);
    } catch (error: any) {
      console.error('OTP Error:', error);
      const errorMessage = error.response?.data?.message 
        || error.message 
        || 'Erreur lors de l\'envoi du code';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Erreur', 'Veuillez entrer un code OTP valide');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyOtp(phoneNumber, otp);
      
      // Save token to AsyncStorage
      if (response.accessToken) {
        await AsyncStorage.setItem('authToken', response.accessToken);
      }
      
      // Navigation will happen automatically when isAuthenticated changes
      // No need to navigate manually
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.message || 'Code OTP invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Bissau Go</Text>
            <Text style={styles.subtitle}>Votre transport en un clic</Text>
          </View>

          <View style={styles.form}>
            {step === 'phone' ? (
              <>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Numéro de téléphone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+221 XX XXX XX XX"
                    placeholderTextColor={colors.textTertiary}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleRequestOtp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.buttonText}>Continuer</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Code de vérification</Text>
                  <Text style={styles.inputHelper}>
                    Entrez le code à 6 chiffres envoyé au {phoneNumber}
                  </Text>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    placeholder="000000"
                    placeholderTextColor={colors.textTertiary}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    textAlign="center"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.buttonText}>Vérifier</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => setStep('phone')}
                  activeOpacity={0.6}
                >
                  <Text style={styles.linkText}>Changer de numéro</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'phone' && (
              <View style={styles.registerLink}>
                <Text style={styles.registerLinkText}>Pas encore de compte ? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Register')}
                  activeOpacity={0.6}
                >
                  <Text style={styles.registerLinkButton}>S'inscrire</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputHelper: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    color: colors.text,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textInverse,
  },
  linkButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  linkText: {
    fontSize: 16,
    color: colors.primary,
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  registerLinkText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  registerLinkButton: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});
