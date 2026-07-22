import { useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { Redirect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { session, userProfile, isLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    // Artificial delay to ensure routing logic runs and to show off the splash screen
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Show splash screen while loading or during artificial delay
  if (isLoading || !isReady) {
    return (
      <View className="flex-1 bg-neo-bg items-center justify-center p-6">
        <View className="w-28 h-28 bg-white rounded-3xl items-center justify-center mb-8 border-[4px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 10 }}>
          <Image source={require('../assets/icon.png')} className="w-20 h-20 rounded-2xl border-2 border-black" resizeMode="contain" />
        </View>
        <Text className="text-4xl font-extrabold mb-2 tracking-tight text-black">ChatVibe <Text className="text-black">AI</Text></Text>
        <Text className="text-black/80 text-lg text-center font-bold">Premium intelligence,{"\n"}playfully connected.</Text>

        <View className="absolute bottom-16 items-center w-full">
          <View className="w-48 h-2 bg-white rounded-full mb-4 overflow-hidden border-2 border-black" style={{ shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <View className="w-1/2 h-full bg-neo-purple rounded-full border-r-2 border-black" />
          </View>
          <Text className="text-black text-xs font-extrabold tracking-widest mb-6">SYNCING VIBE</Text>
          <Text className="text-black/70 text-xs font-bold">Powered by <Text className="text-black font-extrabold">ChatVibe</Text> Engine 4.0</Text>
        </View>
      </View>
    );
  }

  // Handle routing based on session and onboarding status
  if (!session) {
    return <Redirect href="/onboarding" />;
  }

  if (session && userProfile && !userProfile.onboarding_completed) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
