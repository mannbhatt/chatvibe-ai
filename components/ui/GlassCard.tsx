import React from 'react';
import { View, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { AnimatedPressable } from './AnimatedPressable';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  className?: string;
  onPress?: () => void;
  animated?: boolean;
}

export function GlassCard({ 
  children, 
  intensity = 50, 
  tint = 'light',
  className = '',
  onPress,
  animated = false,
  ...props 
}: GlassCardProps) {
  
  const CardContent = (
    <View className={`rounded-[24px] overflow-hidden border border-white/40 ${className}`} {...props}>
      <BlurView intensity={intensity} tint={tint} className="p-5 flex-1 w-full bg-white/40">
        {children}
      </BlurView>
    </View>
  );

  if (onPress && animated) {
    return (
      <AnimatedPressable onPress={onPress} className="w-full">
        {CardContent}
      </AnimatedPressable>
    );
  }

  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress} scaleAmount={0.98} className="w-full">
         {CardContent}
      </AnimatedPressable>
    );
  }

  return CardContent;
}
