import React, { useState, useEffect, useCallback } from 'react';
import { View, TextInput, StyleSheet, FlatList, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { googleMapsService, PlacePrediction } from '../services/googleMapsService';
import { Ionicons } from '@expo/vector-icons';

interface AddressAutocompleteProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelectAddress?: (address: string, location?: { latitude: number; longitude: number }) => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function AddressAutocomplete({
  placeholder = 'Entrez une adresse',
  value,
  onChangeText,
  onSelectAddress,
  icon = 'location-outline',
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value.length >= 3) {
      const timeoutId = setTimeout(() => {
        fetchSuggestions(value);
      }, 300); // Debounce 300ms

      return () => clearTimeout(timeoutId);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value]);

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const predictions = await googleMapsService.getPlacePredictions(query);
      console.log('Suggestions received:', predictions.length);
      setSuggestions(predictions);
      setShowSuggestions(predictions.length > 0);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (prediction: PlacePrediction) => {
    onChangeText(prediction.description);
    setShowSuggestions(false);
    setSuggestions([]);

    if (onSelectAddress) {
      try {
        const details = await googleMapsService.getPlaceDetails(prediction.place_id);
        if (details) {
          onSelectAddress(details.formatted_address, {
            latitude: details.geometry.location.lat,
            longitude: details.geometry.location.lng,
          });
        } else {
          onSelectAddress(prediction.description);
        }
      } catch (error) {
        console.error('Error getting place details:', error);
        onSelectAddress(prediction.description);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Ionicons name={icon} size={20} color={colors.textSecondary} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
          }}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {loading && (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        )}
      </View>
      
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={20} color={colors.primary} style={styles.suggestionIcon} />
                <View style={styles.suggestionTextContainer}>
                  <Text style={styles.suggestionMainText} numberOfLines={1}>
                    {item.structured_formatting.main_text}
                  </Text>
                  {item.structured_formatting.secondary_text && (
                    <Text style={styles.suggestionSecondaryText} numberOfLines={1}>
                      {item.structured_formatting.secondary_text}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  loader: {
    marginLeft: spacing.sm,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderRadius: spacing.md,
    marginTop: spacing.xs,
    maxHeight: 300,
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 1000,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionIcon: {
    marginRight: spacing.md,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionMainText: {
    ...typography.body,
    color: colors.text,
    marginBottom: 2,
  },
  suggestionSecondaryText: {
    ...typography.small,
    color: colors.textSecondary,
  },
});
