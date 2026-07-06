import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function ResultScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { emojis, original_text, generation_id, tone } = useLocalSearchParams();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleCopy = async () => {
    if (typeof emojis === 'string') {
      await Clipboard.setStringAsync(emojis);
      Alert.alert('Copied!', 'Emojis copied to clipboard ✨');
    }
  };

  const handleShare = async () => {
    if (typeof emojis === 'string') {
      try {
        await Share.share({
          message: `${emojis}\n\nGenerated with ChatVibe AI`,
        });
      } catch (error: any) {
        Alert.alert('Error sharing', error.message);
      }
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
    
    if (error) {
      if (error.code === '23505') { // Unique violation
        setIsFavorited(true);
      } else {
        Alert.alert('Error', 'Could not save result.');
      }
    } else {
      setIsFavorited(true);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFBFF' }} edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-4 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 }}>
          <Feather name="arrow-left" size={20} color="#111" />
        </TouchableOpacity>
        <Text className="text-[18px] font-extrabold text-[#111] tracking-tight">Result</Text>
        <View className="w-10 h-10" />
      </View>

      <View className="flex-1 px-6 justify-center">
        {/* Main Card */}
        <View className="bg-white rounded-[32px] p-8 shadow-sm mb-8" style={{ shadowColor: '#5D5FEF', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.08, shadowRadius: 30, elevation: 10 }}>
          
          <View className="bg-[#F8F5FF] self-start px-4 py-1.5 rounded-full mb-6 flex-row items-center">
            <Text className="text-[#5D5FEF] font-bold text-[12px] uppercase tracking-wider">{tone} VIBE</Text>
          </View>

          <Text className="text-[48px] text-center mb-8 leading-[60px]">{emojis}</Text>

          <View className="bg-[#F8F9FA] rounded-2xl p-4 border border-gray-100">
            <Text className="text-[#8E8E93] font-medium text-[13px] uppercase tracking-wider mb-2">Original Text</Text>
            <Text className="text-[#111] text-[15px] leading-6">{original_text}</Text>
          </View>
        </View>

        {/* Action Buttons Stack */}
        <View className="flex-row flex-wrap justify-between">
          
          <TouchableOpacity 
            onPress={handleCopy}
            className="w-[48%] bg-white rounded-[20px] p-4 mb-4 shadow-sm items-center justify-center flex-row" 
            style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}
          >
            <Feather name="copy" size={20} color="#111" />
            <Text className="font-bold text-[#111] ml-2">Copy</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleShare}
            className="w-[48%] bg-white rounded-[20px] p-4 mb-4 shadow-sm items-center justify-center flex-row" 
            style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}
          >
            <Feather name="share" size={20} color="#111" />
            <Text className="font-bold text-[#111] ml-2">Share</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleFavorite}
            disabled={isSaving || isFavorited}
            className={`w-[48%] bg-white rounded-[20px] p-4 shadow-sm items-center justify-center flex-row ${(isSaving || isFavorited) ? 'opacity-50' : ''}`}
            style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}
          >
            <FontAwesome5 name="star" size={18} color={isFavorited ? "#FFC107" : "#111"} solid={isFavorited} />
            <Text className="font-bold text-[#111] ml-2">{isFavorited ? 'Saved' : 'Favorite'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-[48%] bg-[#5D5FEF] rounded-[20px] p-4 shadow-sm items-center justify-center flex-row" 
            style={{ shadowColor: '#5D5FEF', shadowOpacity: 0.3, shadowRadius: 10 }}
          >
            <Feather name="refresh-cw" size={20} color="white" />
            <Text className="font-bold text-white ml-2">Remix</Text>
          </TouchableOpacity>

        </View>
      </View>
    </SafeAreaView>
  );
}
