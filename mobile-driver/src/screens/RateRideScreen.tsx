import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { ridesService } from '../services/ridesService';

export default function RateRideScreen({ navigation, route }: any) {
  const { rideId, client } = route.params || {};
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner une note');
      return;
    }

    setLoading(true);
    try {
      await ridesService.rateRide(rideId, rating, comment);
      Alert.alert('Succès', 'Merci pour votre évaluation !', [
        { text: 'OK', onPress: () => navigation.navigate('MainTabs') },
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.message || 'Erreur lors de l\'évaluation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Noter le client" />
      
      <View style={styles.content}>
        {client && (
          <View style={styles.clientInfo}>
            <Ionicons name="person-circle-outline" size={64} color={colors.primary} />
            <Text style={styles.clientName}>
              {client.firstName} {client.lastName}
            </Text>
          </View>
        )}

        <Text style={styles.title}>Comment était ce trajet ?</Text>

        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <Ionicons
                name={star <= rating ? "star" : "star-outline"}
                size={48}
                color={star <= rating ? colors.warning : colors.border}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.commentContainer}>
          <Text style={styles.label}>Commentaire (optionnel)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Partagez votre expérience..."
            placeholderTextColor={colors.textTertiary}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={24} color={colors.textInverse} />
              <Text style={styles.buttonText}>Envoyer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    padding: spacing.xl,
  },
  clientInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  clientName: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  starButton: {
    padding: spacing.sm,
  },
  commentContainer: {
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.smallBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  commentInput: {
    ...typography.body,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    padding: spacing.md,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
});
