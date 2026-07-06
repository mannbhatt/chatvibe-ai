import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Share, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function RewriteTextResultScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { resultData, original_text, generation_id, tone } = useLocalSearchParams();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  let data = { rewrittenText: '' } as any;
  try {
    data = JSON.parse(resultData as string);
  } catch (e) {
    console.error('Failed to parse resultData', e);
  }

  const handleCopy = async () => {
    if (data.rewrittenText) {
      await Clipboard.setStringAsync(data.rewrittenText);
      Alert.alert('Copied!', 'Text copied to clipboard ✨');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${data.rewrittenText}\n\nGenerated with ChatVibe AI`,
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
        <Text className="text-[18px] font-extrabold text-[#111] tracking-tight">Rewrite Text</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6">
        <View className="bg-white rounded-[32px] p-8 shadow-sm mb-6 border border-[#EFF6FF]">
          <View className="bg-[#EFF6FF] self-start px-4 py-1.5 rounded-full mb-6 flex-row items-center">
            <Text className="text-[#3B82F6] font-bold text-[12px] uppercase tracking-wider">{tone} TONE</Text>
          </View>

          <Text className="text-[20px] text-[#111] font-medium leading-8 mb-8">{data.rewrittenText}</Text>

          <View className="bg-[#F8F9FA] rounded-2xl p-4 border border-gray-100">
            <Text className="text-[#8E8E93] font-medium text-[13px] uppercase tracking-wider mb-2">Original Text</Text>
            <Text className="text-[#111] text-[15px] leading-6">{original_text}</Text>
          </View>
        </View>

        <Text className="text-center text-[#8E8E93] text-[12px] mb-6 px-4">
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
          <TouchableOpacity onPress={() => router.back()} className="w-[48%] bg-[#3B82F6] rounded-[20px] p-4 shadow-sm items-center justify-center flex-row">
            <Feather name="refresh-cw" size={20} color="white" />
            <Text className="font-bold text-white ml-2">Remix</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
