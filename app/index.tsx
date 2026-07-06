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
      <View className="flex-1 bg-[#FCFBFF] items-center justify-center p-6">
         <View className="w-24 h-24 bg-white rounded-3xl shadow-sm items-center justify-center mb-6" style={{ shadowColor: '#5D5FEF', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
           <Image source={require('../assets/icon.png')} className="w-16 h-16 rounded-2xl" resizeMode="contain" />
         </View>
         <Text className="text-3xl font-extrabold mb-2 tracking-tight"><Text className="text-[#5D5FEF]">ChatVibe</Text> <Text className="text-[#FF4B72]">AI</Text></Text>
         <Text className="text-[#666] text-base text-center font-medium">Premium intelligence,{"\n"}playfully connected.</Text>

         <View className="absolute bottom-16 items-center w-full">
           <View className="w-48 h-1 bg-gray-200 rounded-full mb-4 overflow-hidden">
              <View className="w-1/2 h-full bg-[#FF4B72] rounded-full" />
           </View>
           <Text className="text-[#888] text-xs font-bold tracking-widest mb-6">SYNCING VIBE</Text>
           <Text className="text-[#AAA] text-xs font-medium">Powered by <Text className="text-[#5D5FEF]">ChatVibe</Text> Engine 4.0</Text>
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
