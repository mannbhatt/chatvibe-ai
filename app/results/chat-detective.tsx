import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Share, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function ChatDetectiveResultScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { resultData, original_text, generation_id } = useLocalSearchParams();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  let data = {} as any;
  try {
    data = JSON.parse(resultData as string);
  } catch (e) {
    console.error('Failed to parse resultData', e);
  }

  const handleCopy = async () => {
    if (data.aiSummary) {
      await Clipboard.setStringAsync(`Chat Detective Analysis:\n${data.aiSummary}\nFriendship: ${data.friendshipScore}/100\nComedy: ${data.comedyLevel}/100`);
      Alert.alert('Copied!', 'Summary copied to clipboard ✨');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Chat Detective Results 🔍\n\nSummary: ${data.aiSummary}\nDrama Level: ${data.dramaLevel}/100\nMain Character: ${data.mainCharacter}\n\nGenerated with ChatVibe AI`,
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

  const StatBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <View className="mb-4">
      <View className="flex-row justify-between mb-1">
        <Text className="text-[14px] font-bold text-[#111]">{label}</Text>
        <Text className="text-[14px] font-bold text-[#8E8E93]">{value}/100</Text>
      </View>
      <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <View className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFBFF' }} edges={['top', 'left', 'right', 'bottom']}>
      <View className="flex-row justify-between items-center px-6 pt-4 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 }}>
          <Feather name="arrow-left" size={20} color="#111" />
        </TouchableOpacity>
        <Text className="text-[18px] font-extrabold text-[#111] tracking-tight">Chat Detective</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, paddingHorizontal: 24 }}>
        {typeof original_text === 'string' && original_text.includes('[WhatsApp Chat') && (
          <View className="bg-[#25D366]/10 self-center px-4 py-1.5 rounded-full mb-6 flex-row items-center border border-[#25D366]/20">
            <FontAwesome5 name="whatsapp" size={14} color="#25D366" />
            <Text className="text-[#25D366] font-bold text-[12px] ml-2">{original_text.replace('[', '').replace(']', '')}</Text>
          </View>
        )}

        <View className="bg-white rounded-[32px] p-6 shadow-sm mb-6" style={{ shadowColor: '#5D5FEF', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 }}>
          <Text className="text-[#5D5FEF] font-bold text-[13px] uppercase tracking-wider mb-2">AI Summary</Text>
          <Text className="text-[18px] text-[#111] font-medium leading-7 mb-6">{data.aiSummary}</Text>
          
          <View className="flex-row justify-between mb-6">
            <View className="bg-[#F8F9FA] p-4 rounded-2xl flex-1 mr-2">
              <Text className="text-[#8E8E93] text-[12px] uppercase tracking-wider mb-1">Main Character</Text>
              <Text className="text-[#111] font-bold text-[16px]">{data.mainCharacter}</Text>
            </View>
            <View className="bg-[#F8F9FA] p-4 rounded-2xl flex-1 ml-2">
              <Text className="text-[#8E8E93] text-[12px] uppercase tracking-wider mb-1">Overall Mood</Text>
              <Text className="text-[#111] font-bold text-[16px]">{data.mood}</Text>
            </View>
          </View>

          <StatBar label="Friendship Score" value={data.friendshipScore} color="#22C55E" />
          <StatBar label="Comedy Level" value={data.comedyLevel} color="#EAB308" />
          <StatBar label="Drama Level" value={data.dramaLevel} color="#FF4B72" />
          <StatBar label="Ghosting Risk" value={data.ghostingRisk} color="#94A3B8" />

          {data.funnyObservations && data.funnyObservations.length > 0 && (
            <View className="mt-4">
              <Text className="text-[#5D5FEF] font-bold text-[13px] uppercase tracking-wider mb-3">Observations</Text>
              {data.funnyObservations.map((obs: string, idx: number) => (
                <View key={idx} className="flex-row items-start mb-2">
                  <Text className="text-[16px] mr-2">🎯</Text>
                  <Text className="text-[15px] text-[#111] flex-1">{obs}</Text>
                </View>
              ))}
            </View>
          )}
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
          <TouchableOpacity onPress={() => router.back()} className="w-[48%] bg-[#5D5FEF] rounded-[20px] p-4 shadow-sm items-center justify-center flex-row">
            <Feather name="refresh-cw" size={20} color="white" />
            <Text className="font-bold text-white ml-2">Remix</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
