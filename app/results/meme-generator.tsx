import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Share, Alert, Image, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function MemeGeneratorResultScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { resultData, original_text, generation_id } = useLocalSearchParams();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  let data = { captions: [] } as any;
  try {
    data = JSON.parse(resultData as string);
  } catch (e) {
    console.error('Failed to parse resultData', e);
  }

  const handleCopy = async () => {
    if (data.captions && data.captions[activeIndex]) {
      await Clipboard.setStringAsync(data.captions[activeIndex]);
      Alert.alert('Copied!', 'Caption copied to clipboard ✨');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${data.captions[activeIndex]}\n\nGenerated with ChatVibe AI`,
      });
    } catch (error: any) {
      Alert.alert('Error sharing', error.message);
    }
  };

  const handleFavorite = async () => {
    if (!generation_id || !user || isFavorited) return;
    setIsSaving(true);
    const { error } = await supabase.from('saved_results').insert({
      user_id: user.id,
      generation_id: generation_id,
    });
    setIsSaving(false);
    if (error && error.code !== '23505') Alert.alert('Error', 'Could not save result.');
    else setIsFavorited(true);
  };

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveIndex(Math.round(index));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFBFF' }} edges={['top', 'left', 'right', 'bottom']}>
      <View className="flex-row justify-between items-center px-6 pt-4 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
          <Feather name="arrow-left" size={20} color="#111" />
        </TouchableOpacity>
        <Text className="text-[18px] font-extrabold text-[#111] tracking-tight">Meme Generator</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-6 mb-4">
          <View className="w-full h-[300px] bg-black rounded-[24px] overflow-hidden items-center justify-center">
            {original_text && original_text.toString().startsWith('data:image') ? (
              <Image source={{ uri: original_text as string }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Text className="text-white">Image Preview</Text>
            )}
          </View>
        </View>

        <Text className="px-6 font-bold text-[#111] text-[16px] mb-2">Swipe for captions</Text>

        <View>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            className="w-full"
          >
            {data.captions?.map((caption: string, idx: number) => (
              <View key={idx} style={{ width: width, paddingHorizontal: 24 }}>
                <View className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 min-h-[120px] justify-center">
                  <Text className="text-[20px] text-[#111] font-bold text-center leading-8">{caption}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="flex-row justify-center mt-4">
            {data.captions?.map((_: any, idx: number) => (
              <View key={idx} className={`w-2 h-2 rounded-full mx-1 ${idx === activeIndex ? 'bg-[#FF8C00]' : 'bg-gray-200'}`} />
            ))}
          </View>
        </View>

        <Text className="text-center text-[#8E8E93] text-[12px] my-6 px-4">
          For entertainment purposes only. AI can make mistakes.
        </Text>

        <View className="flex-row flex-wrap justify-between mb-12 px-6">
          <TouchableOpacity onPress={handleCopy} className="w-[48%] bg-white rounded-[20px] p-4 mb-4 shadow-sm items-center justify-center flex-row">
            <Feather name="copy" size={20} color="#111" />
            <Text className="font-bold text-[#111] ml-2">Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} className="w-[48%] bg-white rounded-[20px] p-4 mb-4 shadow-sm items-center justify-center flex-row">
            <Feather name="share" size={20} color="#111" />
            <Text className="font-bold text-[#111] ml-2">Share</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFavorite} disabled={isSaving || isFavorited} className={`w-[48%] bg-white rounded-[20px] p-4 shadow-sm items-center justify-center flex-row ${(isSaving || isFavorited) ? 'opacity-50' : ''}`}>
            <FontAwesome5 name="star" size={18} color={isFavorited ? "#FFC107" : "#111"} solid={isFavorited} />
            <Text className="font-bold text-[#111] ml-2">{isFavorited ? 'Saved' : 'Favorite'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} className="w-[48%] bg-[#FF8C00] rounded-[20px] p-4 shadow-sm items-center justify-center flex-row">
            <Feather name="refresh-cw" size={20} color="white" />
            <Text className="font-bold text-white ml-2">Remix</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
