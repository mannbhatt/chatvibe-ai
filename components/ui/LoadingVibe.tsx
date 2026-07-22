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
    <View className="absolute inset-0 bg-white/95 z-50 items-center justify-center">
      <View className="items-center">
        {/* Animated Icon Container */}
        <Animated.View 
          style={{ transform: [{ scale: pulseValue }], shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0 }}
          className="w-32 h-32 bg-neo-yellow rounded-[32px] border-[4px] border-black items-center justify-center mb-8"
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Feather name="loader" size={48} color="black" />
          </Animated.View>
        </Animated.View>

        {/* Rotating Text */}
        <Text className="text-[28px] font-extrabold text-black tracking-tight mb-2 text-center">
          Decoding the Vibe
        </Text>
        <Text className="text-[16px] font-bold text-black/70 text-center">
          {MESSAGES[messageIndex]}
        </Text>

        {/* Fake progress bar */}
        <View className="w-48 h-4 bg-white border-[3px] border-black rounded-full mt-8 overflow-hidden">
          <Animated.View 
            className="h-full bg-neo-pink border-r-[3px] border-black"
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
