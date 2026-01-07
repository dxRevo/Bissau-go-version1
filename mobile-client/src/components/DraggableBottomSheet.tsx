import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_HEIGHT = 120; // Hauteur minimale (collapsed) - style Uber
const MAX_HEIGHT = SCREEN_HEIGHT * 0.85; // Hauteur maximale (expanded)

interface DraggableBottomSheetProps {
  children: React.ReactNode;
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  onHeightChange?: (height: number) => void;
  snapPoints?: number[]; // Points d'ancrage (ex: [120, 400, 600])
}

export default function DraggableBottomSheet({
  children,
  initialHeight = SCREEN_HEIGHT * 0.4,
  minHeight = MIN_HEIGHT,
  maxHeight = MAX_HEIGHT,
  onHeightChange,
  snapPoints,
}: DraggableBottomSheetProps) {
  const panY = useRef(new Animated.Value(0)).current;
  const [currentHeight, setCurrentHeight] = useState(initialHeight);
  const startY = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    panY.setValue(0);
    setCurrentHeight(initialHeight);
  }, [initialHeight]);

  // Calculer les snap points si non fournis
  const getSnapPoints = () => {
    if (snapPoints && snapPoints.length > 0) {
      return snapPoints.sort((a, b) => a - b);
    }
    return [minHeight, (minHeight + maxHeight) / 2, maxHeight];
  };

  const snapToNearest = (height: number, velocity: number = 0) => {
    const points = getSnapPoints();
    
    // Si vitesse importante, aller vers le point suivant/précédent
    if (Math.abs(velocity) > 0.3) {
      if (velocity < 0) {
        // Glisser vers le haut
        const nextPoint = points.find(p => p > height) || points[points.length - 1];
        return nextPoint;
      } else {
        // Glisser vers le bas
        const prevPoint = [...points].reverse().find(p => p < height) || points[0];
        return prevPoint;
      }
    }
    
    // Trouver le point le plus proche
    let nearest = points[0];
    let minDistance = Math.abs(height - points[0]);
    
    for (const point of points) {
      const distance = Math.abs(height - point);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = point;
      }
    }
    
    return nearest;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: (_, gestureState) => {
        startY.current = gestureState.y0;
        isDragging.current = true;
      },
      onPanResponderMove: (_, gestureState) => {
        const deltaY = gestureState.y0 - gestureState.moveY;
        const newHeight = currentHeight + deltaY;
        const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
        panY.setValue(deltaY);
      },
      onPanResponderRelease: (_, gestureState) => {
        isDragging.current = false;
        const deltaY = gestureState.y0 - gestureState.moveY;
        const newHeight = currentHeight + deltaY;
        const targetHeight = snapToNearest(newHeight, gestureState.vy);
        
        setCurrentHeight(targetHeight);
        
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: false,
          tension: 50,
          friction: 7,
        }).start(() => {
          if (onHeightChange) {
            onHeightChange(targetHeight);
          }
        });
      },
    })
  ).current;

  const translateY = panY.interpolate({
    inputRange: [-maxHeight, 0, maxHeight],
    outputRange: [-maxHeight, 0, maxHeight],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: currentHeight,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.handleContainer} {...panResponder.panHandlers}>
        <View style={styles.handle} />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={currentHeight >= maxHeight}
      >
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: spacing.xl,
    borderTopRightRadius: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  handleContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
});


