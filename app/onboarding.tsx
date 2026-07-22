import { useState, useRef } from 'react';
import { View, Text, ScrollView, Dimensions, Alert, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { router, Redirect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAlert } from '../contexts/AlertContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen() {
  const { user, refreshProfile, session, isLoading, userProfile } = useAuth();
  const { showAlert } = useAlert();
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
      showAlert('Oops!', error.message || 'We hit a snag setting up your profile.', [], 'error');
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

  const getBackgroundColor = (index: number) => {
    switch (index) {
      case 0: return '#cff5e1'; // neo-bg
      case 1: return '#FFE261'; // neo-yellow
      case 2: return '#FFA6C9'; // neo-pink
      default: return '#cff5e1';
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: getBackgroundColor(currentIndex) }} edges={['top', 'left', 'right']}>
      {/* Header - Added pt-4 and pb-2 for more top space */}
      <View className="flex-row justify-between items-center px-6 pt-6 pb-2">
        <View className="flex-row items-center">
          <Image source={require('../assets/icon.png')} className="w-8 h-8 mr-2 rounded-lg border-2 border-black" resizeMode="contain" />
          <Text className="text-xl font-extrabold text-black">ChatVibe <Text className="text-black">AI</Text></Text>
        </View>
        {currentIndex < 2 ? (
          <TouchableOpacity onPress={completeOnboarding} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text className="text-black font-extrabold text-base">Skip</Text>
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
          <View className="w-full max-w-[360px] aspect-square bg-white rounded-[40px] items-center justify-center p-4 border-[4px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 10 }}>
            <View className="w-full h-full bg-[#f8f9fa] rounded-[24px] relative overflow-hidden justify-center py-4 border-2 border-black">
              {/* Chat bubbles */}
              <View className="w-full px-4 items-end mb-4 relative z-10">
                <View className="bg-neo-purple p-4 py-3 rounded-2xl rounded-tr-sm border-2 border-black" style={{ shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 }}>
                  <Text className="text-white font-bold text-[15px] leading-5">hey, just checking in{'\n'}on that thing! 😶</Text>
                </View>
                <View className="absolute -bottom-3 right-8 bg-neo-pink px-3 py-1 rounded-full border-2 border-black" style={{ shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 }}>
                  <Text className="text-white text-[10px] font-extrabold tracking-wider">FLIRTY</Text>
                </View>
              </View>

              <View className="w-full px-4 items-start mb-6">
                <View className="bg-white p-4 py-3 rounded-2xl rounded-tl-sm border-2 border-black" style={{ shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 }}>
                  <Text className="text-black font-bold text-[15px] leading-5">oh hey... yeah{'\n'}almost done with it.</Text>
                </View>
              </View>

              <View className="w-full px-4 items-end relative z-0">
                <View className="bg-neo-purple p-4 py-3 rounded-2xl rounded-tr-sm w-[85%] border-2 border-black" style={{ shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 }}>
                  <Text className="text-white font-bold text-[15px] leading-5">sounds good. can't{'\n'}wait to see it!</Text>
                </View>
              </View>

              {/* Magnifying Glass overlay */}
              <View className="absolute top-[40%] left-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[4px] border-black bg-white items-center justify-center z-20" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 10 }}>
                <Feather name="search" size={40} color="black" style={{ transform: [{ scaleX: -1 }] }} />
              </View>
              {/* Tag for Magnifying glass */}
              <View className="absolute top-[68%] left-8 bg-neo-orange px-3 py-1 rounded-full z-30 border-2 border-black" style={{ shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 }}>
                <Text className="text-white text-[10px] font-extrabold tracking-wider">CHILL VIBE</Text>
              </View>

              {/* Decorative dots */}
              <View className="absolute top-4 left-6 w-3 h-3 rounded-full bg-black" />
              <View className="absolute bottom-8 right-6 w-4 h-4 rounded-full bg-black" />
            </View>
          </View>
          <View className="w-full max-w-[400px] mt-8">
            <Text className="text-[32px] font-extrabold text-black mb-3 text-center tracking-tight">Uncover the Subtext</Text>
            <Text className="text-black/80 font-bold text-[16px] text-center px-4 leading-6">Analyze your conversations to find hidden vibes, flirting levels, and more.</Text>
          </View>
        </View>

        {/* Slide 2: Meme Your Friends */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center px-6 py-10">
          <View className="w-full max-w-[360px] aspect-square bg-white rounded-[40px] items-center justify-center p-4 border-[4px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5 }}>
            <View className="bg-neo-blue w-full h-full rounded-[24px] items-center justify-center relative border-2 border-black">
              <Feather name="camera" size={80} color="black" />
              <View className="absolute top-1/2 left-1/2 -mt-4 -ml-4 w-8 h-8 bg-white rounded-full border-2 border-black" />

              {/* Floating emojis */}
              <View className="absolute top-[10%] left-[5%] bg-white p-3 rounded-2xl border-2 border-black" style={{ transform: [{ rotate: '-10deg' }], shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}><Text className="text-2xl sm:text-3xl">😂</Text></View>
              <View className="absolute bottom-[10%] right-[5%] bg-white p-3 rounded-2xl border-2 border-black" style={{ transform: [{ rotate: '15deg' }], shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}><Text className="text-2xl sm:text-3xl">😎</Text></View>
              <View className="absolute top-[20%] right-[5%] bg-white p-2 rounded-2xl border-2 border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}><Text className="text-xl sm:text-2xl">🔥</Text></View>
              <View className="absolute bottom-[20%] left-[5%] bg-white p-2 rounded-2xl border-2 border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}><Text className="text-lg sm:text-xl">📸</Text></View>
            </View>
          </View>
          <View className="w-full max-w-[400px] mt-8">
            <Text className="text-[32px] font-extrabold text-black mb-3 text-center tracking-tight">Meme Your Friends</Text>
            <Text className="text-black/80 font-bold text-[16px] text-center px-4 leading-6">Turn any photo or text into viral-worthy memes with one tap. Our AI captures the vibe perfectly.</Text>
          </View>
        </View>

        {/* Slide 3: Share the Vibe */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center px-6 py-10">
          <View className="w-full max-w-[360px] aspect-square bg-white rounded-[40px] items-center justify-center relative p-4 border-[4px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5 }}>
            <View className="w-full h-full bg-neo-yellow rounded-[24px] pt-12 px-6 items-end relative overflow-hidden border-2 border-black">
              <View className="bg-black w-[50%] max-w-[120px] h-4 rounded-full mb-6 self-start" />
              <View className="bg-black w-12 h-12 rounded-full absolute top-8 -left-6" />

              <View className="bg-white border-2 border-black px-4 py-3 rounded-full mb-4 max-w-full" style={{ shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 }}>
                <Text className="text-black text-[12px] sm:text-[13px] font-extrabold" numberOfLines={1}>Vibe Check: Passed! ✨</Text>
              </View>
              <View className="bg-white border-2 border-black px-4 py-3 rounded-full max-w-full" style={{ shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 }}>
                <Text className="text-black text-[12px] sm:text-[13px] font-extrabold" numberOfLines={1}>Sharing the energy... 🚀</Text>
              </View>
            </View>

            {/* Floating cards */}
            <View className="absolute top-[5%] right-[5%] bg-white p-2 rounded-2xl border-2 border-black" style={{ transform: [{ rotate: '15deg' }], shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
              <View className="w-12 h-16 sm:w-14 sm:h-20 bg-neo-purple rounded-lg items-center pt-2 border-2 border-black">
                <View className="w-6 h-8 sm:w-8 sm:h-10 bg-white rounded-md border-2 border-black" />
                <View className="w-8 h-1 sm:w-10 sm:h-2 bg-black rounded-full mt-2" />
              </View>
            </View>
            <View className="absolute top-[35%] -left-[5%] bg-white p-2 rounded-2xl border-2 border-black" style={{ transform: [{ rotate: '-12deg' }], shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
              <View className="w-10 h-14 sm:w-12 sm:h-16 bg-neo-pink rounded-lg items-center pt-2 border-2 border-black">
                <View className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full border-2 border-black" />
                <View className="w-6 h-1 sm:w-8 sm:h-2 bg-black rounded-full mt-2" />
              </View>
            </View>
            <View className="absolute bottom-[10%] -right-[5%] bg-white p-2 rounded-2xl border-2 border-black" style={{ transform: [{ rotate: '-5deg' }], shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
              <View className="w-14 h-10 sm:w-16 sm:h-12 bg-neo-orange rounded-lg flex-row items-center justify-center space-x-1 border-2 border-black">
                <View className="w-3 h-3 sm:w-4 sm:h-4 bg-black rounded-full" />
                <View className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full border border-black" />
              </View>
            </View>

            {/* Sparkles */}
            <Text className="absolute top-[10%] left-[10%] text-2xl sm:text-3xl">🔥</Text>
            <Text className="absolute bottom-[20%] left-[5%] text-2xl sm:text-3xl">✨</Text>
            <Text className="absolute top-[50%] -right-[5%] text-3xl sm:text-4xl">🎉</Text>
          </View>
          <View className="w-full max-w-[400px] mt-8">
            <Text className="text-[32px] font-extrabold text-black mb-3 text-center tracking-tight">Share the Vibe</Text>
            <Text className="text-black/80 font-bold text-[16px] text-center px-4 leading-6">Export your results directly to Instagram, Snapchat, and TikTok.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Pagination & Controls - Increased base bottom padding from 24 to 48 */}
      <View style={{ paddingBottom: Math.max(insets.bottom, 24) + 40 }} className="px-8 pt-6 ">
        <View className="flex-row justify-center gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className={`h-3 rounded-full border-2 border-black ${currentIndex === i ? 'w-10 bg-black' : 'w-3 bg-white'}`}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={nextSlide}
          disabled={loading}
          activeOpacity={0.8}
          className="bg-neo-purple h-14 rounded-3xl flex-row items-center justify-center border-[3px] border-black"
          style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5 }}
        >
          <Text className="text-white text-lg font-extrabold mr-2">
            {loading ? "Getting ready..." : (currentIndex === 2 ? "Get Started" : "Next")}
          </Text>
          {!loading && <Feather name="arrow-right" size={24} color="white" />}
        </TouchableOpacity>


      </View>
    </SafeAreaView>
  );
}
