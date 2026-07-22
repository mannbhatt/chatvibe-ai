import React, { useEffect } from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  color?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height = 20,
  borderRadius = 12,
  style,
  className,
  color = '#E5E5EA', // Light grey for the skeleton base
}) => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className={className}
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: color,
          borderWidth: 3,
          borderColor: 'black', // Neobrutalist border
        },
        animatedStyle,
        style,
      ]}
    />
  );
};
