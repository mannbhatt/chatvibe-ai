import { useState, useRef } from 'react';
import { View, Text, ScrollView, Dimensions, Alert, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { router, Redirect } from 'expo-router';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen() {
  const { user, refreshProfile, session, isLoading, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const insets = useSafeAreaInsets();

  if (!isLoading && session && userProfile?.onboarding_completed) {
    return <Redirect href="/(tabs)" />;
  }

  const completeOnboarding = async () => {
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('users')
      .update({ onboarding_completed: true })
      .eq('id', user.id);

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }
    await refreshProfile();
    setLoading(false);
  };

  const nextSlide = () => {
    if (currentIndex < 2) {
      scrollViewRef.current?.scrollTo({ x: (currentIndex + 1) * SCREEN_WIDTH, animated: true });
    } else {
      completeOnboarding();
    }
  };

  const handleScroll = (event: any) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(slide);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFBFF' }} edges={['top', 'left', 'right']}>
      {/* Header - Added pt-4 and pb-2 for more top space */}
      <View className="flex-row justify-between items-center px-6 pt-6 pb-2">
        <View className="flex-row items-center">
          <Image source={require('../assets/icon.png')} className="w-8 h-8 mr-2 rounded-lg" resizeMode="contain" />
          <Text className="text-xl font-extrabold"><Text className="text-[#5D5FEF]">ChatVibe</Text> <Text className="text-[#FF4B72]">AI</Text></Text>
        </View>
        {currentIndex < 2 ? (
          <TouchableOpacity onPress={completeOnboarding} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text className="text-[#8E8E93] font-semibold">Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 30 }} /> // Spacer to keep logo left-aligned when no Skip button
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        className="flex-1"
      >
        {/* Slide 1: Uncover the Subtext */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center px-6 py-10">
          <View className="w-full max-w-[360px] aspect-square bg-white rounded-[40px] shadow-sm items-center justify-center p-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 }}>
            <View className="w-full h-full bg-[#FCFBFF] rounded-[24px] relative overflow-hidden justify-center py-4">
              {/* Chat bubbles */}
              <View className="w-full px-4 items-end mb-4 relative z-10">
                <View className="bg-[#5D5FEF] p-4 py-3 rounded-2xl rounded-tr-sm">
                  <Text className="text-white text-[15px] leading-5">hey, just checking in{'\n'}on that thing! 😶</Text>
                </View>
                <View className="absolute -bottom-3 right-8 bg-[#FF4B72] px-3 py-1 rounded-full shadow-sm">
                  <Text className="text-white text-[10px] font-bold tracking-wider">FLIRTY</Text>
                </View>
              </View>

              <View className="w-full px-4 items-start mb-6">
                <View className="bg-white border border-gray-100 p-4 py-3 rounded-2xl rounded-tl-sm shadow-sm" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 }}>
                  <Text className="text-gray-800 text-[15px] leading-5">oh hey... yeah{'\n'}almost done with it.</Text>
                </View>
              </View>

              <View className="w-full px-4 items-end relative z-0">
                <View className="bg-[#5D5FEF] p-4 py-3 rounded-2xl rounded-tr-sm w-[85%]">
                  <Text className="text-white text-[15px] leading-5">sounds good. can't{'\n'}wait to see it!</Text>
                </View>
              </View>

              {/* Magnifying Glass overlay */}
              <View className="absolute top-[40%] left-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[5px] border-[#5D5FEF] bg-white/70 items-center justify-center z-20" style={{ shadowColor: '#5D5FEF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 }}>
                <Feather name="search" size={40} color="#5D5FEF" style={{ transform: [{ scaleX: -1 }] }} />
              </View>
              {/* Tag for Magnifying glass */}
              <View className="absolute top-[68%] left-8 bg-[#FFE4C4] px-3 py-1 rounded-full z-30 shadow-sm">
                <Text className="text-orange-900 text-[10px] font-bold tracking-wider">CHILL VIBE</Text>
              </View>

              {/* Decorative dots */}
              <View className="absolute top-4 left-6 w-2 h-2 rounded-full bg-pink-200" />
              <View className="absolute bottom-8 right-6 w-3 h-3 rounded-full bg-purple-200" />
            </View>
          </View>
          <View className="w-full max-w-[400px] mt-8">
            <Text className="text-[32px] font-extrabold text-[#111] mb-3 text-center tracking-tight">Uncover the Subtext</Text>
            <Text className="text-[#666] text-[16px] text-center px-4 leading-6">Analyze your conversations to find hidden vibes, flirting levels, and more.</Text>
          </View>
        </View>

        {/* Slide 2: Meme Your Friends */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center px-6 py-10">
          <View className="w-full max-w-[360px] aspect-square bg-white rounded-[40px] shadow-sm items-center justify-center p-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 }}>
            <View className="bg-[#EAE4FE] w-full h-full rounded-[24px] items-center justify-center relative">
              <Feather name="camera" size={80} color="#5D5FEF" />
              <View className="absolute top-1/2 left-1/2 -mt-4 -ml-4 w-8 h-8 bg-white/30 rounded-full" />

              {/* Floating emojis */}
              <View className="absolute top-[10%] left-[5%] bg-white p-3 rounded-2xl shadow-md" style={{ transform: [{ rotate: '-10deg' }] }}><Text className="text-2xl sm:text-3xl">😂</Text></View>
              <View className="absolute bottom-[10%] right-[5%] bg-white p-3 rounded-2xl shadow-md" style={{ transform: [{ rotate: '15deg' }] }}><Text className="text-2xl sm:text-3xl">😎</Text></View>
              <View className="absolute top-[20%] right-[5%] bg-white p-2 rounded-2xl shadow-md"><Text className="text-xl sm:text-2xl">🔥</Text></View>
              <View className="absolute bottom-[20%] left-[5%] bg-white p-2 rounded-2xl shadow-md"><Text className="text-lg sm:text-xl">📸</Text></View>
            </View>
          </View>
          <View className="w-full max-w-[400px] mt-8">
            <Text className="text-[32px] font-extrabold text-[#111] mb-3 text-center tracking-tight">Meme Your Friends</Text>
            <Text className="text-[#666] text-[16px] text-center px-4 leading-6">Turn any photo or text into viral-worthy memes with one tap. Our AI captures the vibe perfectly.</Text>
          </View>
        </View>

        {/* Slide 3: Share the Vibe */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center px-6 py-10">
          <View className="w-full max-w-[360px] aspect-square bg-white rounded-[40px] shadow-sm items-center justify-center relative p-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 }}>
            <View className="w-full h-full bg-[#F8F5FF] rounded-[24px] pt-12 px-6 items-end relative overflow-hidden">
              <View className="bg-gray-200 w-[50%] max-w-[120px] h-4 rounded-full mb-6 self-start" />
              <View className="bg-gray-200 w-12 h-12 rounded-full absolute top-8 -left-6" />

              <View className="bg-[#5D5FEF] px-4 py-3 rounded-full mb-4 shadow-sm max-w-full">
                <Text className="text-white text-[12px] sm:text-[13px] font-bold" numberOfLines={1}>Vibe Check: Passed! ✨</Text>
              </View>
              <View className="bg-[#FF4B72] px-4 py-3 rounded-full shadow-sm max-w-full">
                <Text className="text-white text-[12px] sm:text-[13px] font-bold" numberOfLines={1}>Sharing the energy... 🚀</Text>
              </View>
            </View>

            {/* Floating cards */}
            <View className="absolute top-[5%] right-[5%] bg-white p-2 rounded-2xl shadow-md" style={{ transform: [{ rotate: '15deg' }] }}>
              <View className="w-12 h-16 sm:w-14 sm:h-20 bg-[#F0F0F0] rounded-lg items-center pt-2">
                <View className="w-6 h-8 sm:w-8 sm:h-10 bg-white rounded-md" />
                <View className="w-8 h-1 sm:w-10 sm:h-2 bg-[#5D5FEF] rounded-full mt-2" />
              </View>
            </View>
            <View className="absolute top-[35%] -left-[5%] bg-white p-2 rounded-2xl shadow-md" style={{ transform: [{ rotate: '-12deg' }] }}>
              <View className="w-10 h-14 sm:w-12 sm:h-16 bg-[#F0F0F0] rounded-lg items-center pt-2">
                <View className="w-5 h-5 sm:w-6 sm:h-6 bg-[#FF4B72] rounded-full" />
                <View className="w-6 h-1 sm:w-8 sm:h-2 bg-gray-300 rounded-full mt-2" />
              </View>
            </View>
            <View className="absolute bottom-[10%] -right-[5%] bg-white p-2 rounded-2xl shadow-md" style={{ transform: [{ rotate: '-5deg' }] }}>
              <View className="w-14 h-10 sm:w-16 sm:h-12 bg-[#F0F0F0] rounded-lg flex-row items-center justify-center space-x-1">
                <View className="w-3 h-3 sm:w-4 sm:h-4 bg-black rounded-full" />
                <View className="w-3 h-3 sm:w-4 sm:h-4 bg-[#FF4B72] rounded-full" />
              </View>
            </View>

            {/* Sparkles */}
            <Text className="absolute top-[10%] left-[10%] text-2xl sm:text-3xl">🔥</Text>
            <Text className="absolute bottom-[20%] left-[5%] text-2xl sm:text-3xl">✨</Text>
            <Text className="absolute top-[50%] -right-[5%] text-3xl sm:text-4xl">🎉</Text>
          </View>
          <View className="w-full max-w-[400px] mt-8">
            <Text className="text-[32px] font-extrabold text-[#111] mb-3 text-center tracking-tight">Share the Vibe</Text>
            <Text className="text-[#666] text-[16px] text-center px-4 leading-6">Export your results directly to Instagram, Snapchat, and TikTok.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Pagination & Controls - Increased base bottom padding from 24 to 48 */}
      <View style={{ paddingBottom: Math.max(insets.bottom, 24) + 40 }} className="px-8 pt-6 ">
        <View className="flex-row justify-center gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className={`h-2 rounded-full ${currentIndex === i ? 'w-8 bg-[#5D5FEF]' : 'w-2 bg-[#D4D4EB]'}`}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={nextSlide}
          disabled={loading}
          activeOpacity={0.8}
          className="bg-[#5D5FEF] h-14 rounded-full flex-row items-center justify-center shadow-lg "
          style={{ shadowColor: '#5D5FEF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
        >
          <Text className="text-white text-lg font-bold mr-2">
            {loading ? "Getting ready..." : (currentIndex === 2 ? "Get Started" : "Next")}
          </Text>
          {!loading && <Feather name="arrow-right" size={20} color="white" />}
        </TouchableOpacity>


      </View>
    </SafeAreaView>
  );
}
