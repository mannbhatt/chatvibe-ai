import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Share, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function RoastMyChatResultScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { resultData, original_text, generation_id } = useLocalSearchParams();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  let data = { roasts: [], overallVibe: '' } as any;
  try {
    data = JSON.parse(resultData as string);
  } catch (e) {
    console.error('Failed to parse resultData', e);
  }

  const handleCopy = async () => {
    if (data.overallVibe) {
      const roastsText = data.roasts?.map((r: any) => `${r.participant}: ${r.roast}`).join('\n\n');
      await Clipboard.setStringAsync(`Roast My Chat 🔥\n\n${data.overallVibe}\n\n${roastsText}`);
      Alert.alert('Copied!', 'Roasts copied to clipboard 🔥');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Roast My Chat 🔥\n\nVibe: ${data.overallVibe}\n\nGenerated with ChatVibe AI`,
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFBFF' }} edges={['top', 'left', 'right', 'bottom']}>
      <View className="flex-row justify-between items-center px-6 pt-4 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
          <Feather name="arrow-left" size={20} color="#111" />
        </TouchableOpacity>
        <Text className="text-[18px] font-extrabold text-[#111] tracking-tight">Roast My Chat</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6">
        {typeof original_text === 'string' && original_text.includes('[WhatsApp Chat') && (
          <View className="bg-[#25D366]/10 self-center px-4 py-1.5 rounded-full mb-6 flex-row items-center border border-[#25D366]/20">
            <FontAwesome5 name="whatsapp" size={14} color="#25D366" />
            <Text className="text-[#25D366] font-bold text-[12px] ml-2">{original_text.replace('[', '').replace(']', '')}</Text>
          </View>
        )}

        <View className="bg-[#FFF0F3] rounded-[32px] p-6 mb-6">
          <View className="flex-row items-center justify-center mb-4">
            <FontAwesome5 name="fire" size={24} color="#FF4B72" />
          </View>
          <Text className="text-[#FF4B72] font-bold text-[13px] uppercase tracking-wider text-center mb-2">Overall Vibe</Text>
          <Text className="text-[18px] text-[#111] font-bold text-center leading-7">{data.overallVibe}</Text>
        </View>

        {data.roasts?.map((roastData: any, idx: number) => (
          <View key={idx} className="bg-white rounded-[24px] p-5 shadow-sm mb-4 border border-gray-50">
            <Text className="font-extrabold text-[#111] text-[16px] mb-2">{roastData.participant}</Text>
            <Text className="text-[#111] text-[15px] leading-6">{roastData.roast}</Text>
          </View>
        ))}

        <Text className="text-center text-[#8E8E93] text-[12px] my-4 px-4">
          For entertainment purposes only. AI can make mistakes.
        </Text>

        <View className="flex-row flex-wrap justify-between mb-12">
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
          <TouchableOpacity onPress={() => router.back()} className="w-[48%] bg-[#FF4B72] rounded-[20px] p-4 shadow-sm items-center justify-center flex-row">
            <Feather name="refresh-cw" size={20} color="white" />
            <Text className="font-bold text-white ml-2">Remix</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
