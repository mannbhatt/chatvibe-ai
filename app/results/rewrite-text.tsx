import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Share, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { AnimatedPressable } from '../../components/ui';

export default function RewriteTextResultScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { resultData, original_text, generation_id, is_favorite, tone } = useLocalSearchParams();
  const [isFavorited, setIsFavorited] = useState(is_favorite === 'true');

  let data = { rewrittenText: '' } as any;
  try {
    data = JSON.parse(resultData as string);
  } catch (e) {
    console.error('Failed to parse resultData', e);
  }



  const handleCopy = async () => {
    if (data.rewrittenText) {
      await Clipboard.setStringAsync(data.rewrittenText);
      showAlert('Copied!', 'Text copied to your clipboard ✨', [], 'success');
    }
  };

  const handleShare = async () => {
    try {
      if (data.rewrittenText) {
        await Share.share({
          message: `Rewritten Text (${tone} tone):\n${data.rewrittenText}`,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#3b82f6' }} edges={['top', 'left', 'right', 'bottom']}>
      <View className="flex-row justify-between items-center px-6 pt-4 pb-4">
        <AnimatedPressable onPress={() => router.back()} className="w-12 h-12 bg-white border-[3px] border-black rounded-full items-center justify-center" style={{ shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }}>
          <Feather name="arrow-left" size={24} color="black" />
        </AnimatedPressable>
        <Text className="text-[18px] font-extrabold text-white tracking-tight">Rewrite Text</Text>
        <View className="w-12 h-12" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6">
        <View className="bg-white border-[4px] border-black rounded-[32px] p-8 mb-6" style={{ shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0 }}>
          <View className="bg-neo-yellow border-[3px] border-black self-start px-4 py-1.5 rounded-xl mb-6" style={{ shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <Text className="text-black font-extrabold text-[12px] uppercase tracking-wider">{tone} TONE</Text>
          </View>

          <Text className="text-[20px] text-black font-extrabold leading-8 mb-8">{data.rewrittenText}</Text>

          <View className="bg-white border-[3px] border-black rounded-2xl p-4" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <Text className="text-black font-extrabold text-[13px] uppercase tracking-wider mb-2">Original Text</Text>
            <Text className="text-black font-bold text-[15px] leading-6">{original_text}</Text>
          </View>
        </View>


        <Text className="text-center text-white text-[12px] mb-6 px-4">
          For entertainment purposes only. AI can make mistakes.
        </Text>

        <View className="flex-row flex-wrap justify-between mb-12">
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
      </ScrollView>
    </SafeAreaView>
  );
}
