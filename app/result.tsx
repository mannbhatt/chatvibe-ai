import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { AnimatedPressable } from '../components/ui';

export default function ResultScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { emojis, original_text, tone, generation_id, is_favorite } = useLocalSearchParams();
  const [isFavorited, setIsFavorited] = useState(is_favorite === 'true');



  const handleCopy = async () => {
    if (typeof emojis === 'string') {
      await Clipboard.setStringAsync(emojis as string);
      showAlert('Copied!', 'Emojis copied to your clipboard ✨', [], 'success');
    }
  };

  const handleShare = async () => {
    try {
      if (typeof emojis === 'string') {
        await Share.share({
          message: emojis,
        });
      }
    } catch (error: any) {
      showAlert('Error sharing', 'We couldn\'t open the share menu.', [], 'error');
    }
  };

  const handleFavorite = async () => {
    if (!generation_id) return;
    const newStatus = !isFavorited;
    const { error } = await supabase.from('generations').update({ is_favorite: newStatus }).eq('id', generation_id);
    if (!error) {
      setIsFavorited(newStatus);
    }
  };



  return (
    <View className="flex-1 bg-neo-bg">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 pt-4 pb-4">
          <AnimatedPressable onPress={() => router.back()} className="w-12 h-12 bg-white rounded-xl items-center justify-center border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <Feather name="arrow-left" size={24} color="black" />
          </AnimatedPressable>
          <Text className="text-[20px] font-extrabold text-black tracking-tight">The Result</Text>
          <View className="w-12 h-12" />
        </View>

        <View className="flex-1 px-6 justify-center">
          {/* Main Card */}

            <View className="bg-white border-[4px] border-black rounded-[32px] p-8 mb-8" style={{ shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 10 }}>
            <View className="bg-neo-yellow border-[3px] border-black self-start px-4 py-2 rounded-xl mb-8 flex-row items-center" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
              <Text className="text-black font-extrabold text-[12px] uppercase tracking-wider">{tone} VIBE</Text>
            </View>

            <Text className="text-[48px] text-center mb-8 leading-[60px] tracking-tight text-black">{emojis}</Text>

            <View className="bg-[#f8f9fa] rounded-2xl p-5 border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
              <Text className="text-black/80 font-extrabold text-[12px] uppercase tracking-widest mb-3">Original Text</Text>
              <Text className="text-black text-[16px] leading-6 font-bold">{original_text}</Text>
            </View>
            </View>


          {/* Action Buttons Stack */}
          <View className="flex-row flex-wrap justify-between">
            <AnimatedPressable onPress={handleCopy} className="w-[48%] bg-white border-[3px] border-black rounded-2xl p-4 mb-4 items-center justify-center flex-row" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
              <Feather name="copy" size={20} color="black" />
              <Text className="font-extrabold text-black ml-2 text-[14px]">Copy</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={handleShare} className="w-[48%] bg-white border-[3px] border-black rounded-2xl p-4 mb-4 items-center justify-center flex-row" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
              <Feather name="share" size={20} color="black" />
              <Text className="font-extrabold text-black ml-2 text-[14px]">Share</Text>
            </AnimatedPressable>
            
            <AnimatedPressable onPress={handleFavorite} className="w-[100%] bg-white border-[3px] border-black rounded-2xl p-3 mb-4 items-center justify-center flex-row" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
              <FontAwesome5 name="star" size={14} color={isFavorited ? "#FFC107" : "black"} solid={isFavorited} />
              <Text className="font-extrabold text-black ml-1 text-[12px]">Star</Text>
            </AnimatedPressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
