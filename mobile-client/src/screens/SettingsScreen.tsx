import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { useLanguage } from '../i18n/LanguageContext';

export default function SettingsScreen({ navigation }: any) {
  const { language, setLanguage, t } = useLanguage();

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Paramètres" onBack={() => navigation.goBack()} />
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Langue</Text>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.option,
                language === lang.code && styles.optionActive,
              ]}
              onPress={() => setLanguage(lang.code as 'fr' | 'en' | 'pt')}
            >
              <Text style={styles.optionFlag}>{lang.flag}</Text>
              <Text style={styles.optionText}>{lang.name}</Text>
              {language === lang.code && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.md,
    marginBottom: spacing.md,
  },
  optionActive: {
    backgroundColor: colors.primary + '20',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  optionFlag: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  optionText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  checkmark: {
    ...typography.bodyBold,
    color: colors.primary,
    fontSize: 20,
  },
});
