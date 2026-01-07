import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

export default function HelpSupportScreen({ navigation }: any) {
  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Aide et Support" onBack={() => navigation.goBack()} />
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contactez-nous</Text>
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handleCall('+221771234567')}
          >
            <Text style={styles.contactIcon}>📞</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Téléphone</Text>
              <Text style={styles.contactValue}>+221 77 123 45 67</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => Linking.openURL('mailto:support@bissaugo.com')}
          >
            <Text style={styles.contactIcon}>✉️</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>support@bissaugo.com</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FAQ</Text>
          <Text style={styles.faqText}>
            • Comment réserver un trajet ?{'\n'}
            • Comment suivre mon trajet en temps réel ?{'\n'}
            • Comment annuler une réservation ?{'\n'}
            • Comment contacter le conducteur ?
          </Text>
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
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.md,
    marginBottom: spacing.md,
  },
  contactIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  contactValue: {
    ...typography.body,
    color: colors.text,
  },
  faqText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
});
