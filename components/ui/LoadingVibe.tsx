import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';

const MESSAGES = [
  "Finding the drama...",
  "Searching for memes...",
  "Translating to Gen Z...",
  "Consulting the vibe council...",
  "Decoding the subtext..."
];

export function LoadingVibe() {
  const [messageIndex, setMessageIndex] = useState(0);
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Spin animation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();

    // Message rotation
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View className="absolute inset-0 bg-white/90 z-50 items-center justify-center">
      <View className="items-center">
        {/* Animated Icon Container */}
        <Animated.View 
          style={{ transform: [{ scale: pulseValue }] }}
          className="w-32 h-32 bg-[#F8F5FF] rounded-[40px] items-center justify-center mb-8 shadow-sm"
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <View className="w-16 h-16 bg-[#5D5FEF] rounded-full items-center justify-center opacity-20 absolute" />
            <Feather name="loader" size={40} color="#5D5FEF" />
          </Animated.View>
        </Animated.View>

        {/* Rotating Text */}
        <Text className="text-[24px] font-extrabold text-[#111] tracking-tight mb-2 text-center">
          Decoding the Vibe
        </Text>
        <Text className="text-[16px] font-medium text-[#8E8E93] text-center">
          {MESSAGES[messageIndex]}
        </Text>

        {/* Fake progress bar */}
        <View className="w-48 h-1.5 bg-gray-100 rounded-full mt-8 overflow-hidden">
          <Animated.View 
            className="h-full bg-[#5D5FEF] rounded-full"
            style={{
              width: '100%',
              transform: [{
                translateX: spinValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-200, 200]
                })
              }]
            }}
          />
        </View>
      </View>
    </View>
  );
}
