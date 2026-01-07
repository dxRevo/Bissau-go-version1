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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

export default function LoginScreen({ navigation }: any) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

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
      
      if (response.accessToken) {
        // Vérifier que c'est bien un driver, pas un client
        if (!response.driver && response.user) {
          Alert.alert(
            'Compte non trouvé',
            'Aucun compte conducteur trouvé pour ce numéro de téléphone. Veuillez contacter l\'administrateur pour créer un compte conducteur via le dashboard.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }

        // Pour les drivers, utiliser driver si disponible
        const userData = response.driver;
        if (userData) {
          // Mapper les données pour correspondre à l'interface User
          // S'assurer que le rôle est toujours défini (DRIVER par défaut pour mobile-driver)
          const userRole = userData.role || 'DRIVER';
          const user = {
            id: userData.id,
            phoneNumber: userData.phoneNumber || phoneNumber,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            role: userRole as 'DRIVER' | 'DELIVERY',
            isOnline: userData.isOnline || false,
          };
          await setAuth(user, response.accessToken);
          console.log('✅ Auth store updated with driver:', user);
          console.log('✅ Driver role:', user.role);
        } else {
          // Si pas de driver dans la réponse, afficher une erreur
          Alert.alert(
            'Erreur',
            'Aucun compte conducteur trouvé pour ce numéro. Veuillez contacter l\'administrateur pour créer un compte via le dashboard.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
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
            <View style={styles.iconContainer}>
              <Ionicons name="car-outline" size={64} color={colors.primary} />
            </View>
            <Text style={styles.title}>Bissau Go</Text>
            <Text style={styles.subtitle}>Conducteur</Text>
          </View>

          <View style={styles.form}>
            {step === 'phone' ? (
              <>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Numéro de téléphone</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="call-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
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
                    <>
                      <Ionicons name="arrow-forward-outline" size={20} color={colors.textInverse} />
                      <Text style={styles.buttonText}>Continuer</Text>
                    </>
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
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
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
                    <>
                      <Ionicons name="checkmark-outline" size={20} color={colors.textInverse} />
                      <Text style={styles.buttonText}>Vérifier</Text>
                    </>
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
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginBottom: spacing.xxl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.smallBold,
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputHelper: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    ...typography.body,
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
  linkButton: {
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  linkText: {
    ...typography.body,
    color: colors.primary,
  },
});
