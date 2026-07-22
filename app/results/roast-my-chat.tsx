import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Share, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { AnimatedPressable } from '../../components/ui';

export default function RoastMyChatResultScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { resultData, original_text, generation_id, is_favorite } = useLocalSearchParams();
  const [isFavorited, setIsFavorited] = useState(is_favorite === 'true');

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
      showAlert('Copied!', 'Roasts copied to your clipboard 🔥', [], 'success');
    }
  };

  const handleShare = async () => {
    try {
      if (data.roasts) {
        await Share.share({
          message: `Roast My Chat:\n${data.overallVibe}\n${data.roasts.map((r: any) => r.participant + ': ' + r.roast).join('\n')}`,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FF4B72' }} edges={['top', 'left', 'right', 'bottom']}>
      <View className="flex-row justify-between items-center px-6 pt-4 pb-4">
        <AnimatedPressable onPress={() => router.back()} className="w-12 h-12 bg-white border-[3px] border-black rounded-full items-center justify-center" style={{ shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }}>
          <Feather name="arrow-left" size={24} color="black" />
        </AnimatedPressable>
        <Text className="text-[18px] font-extrabold text-white tracking-tight">Roast My Chat</Text>
        <View className="w-12 h-12" />
      </View>

      {!data.roasts || data.roasts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Feather name="alert-triangle" size={32} color="#FF4B72" />
          <Text className="font-bold text-black text-[16px] mt-4 mb-2">Generation Failed</Text>
          <Text className="text-[#8E8E93] text-[14px] text-center mb-6">We couldn't generate a roast. Please try a different chat snippet.</Text>
          <TouchableOpacity onPress={() => router.back()} className="bg-[#FF4B72] px-6 py-3 rounded-full flex-row items-center">
            <Feather name="refresh-cw" size={16} color="white" />
            <Text className="text-white font-bold ml-2">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6">
          {typeof original_text === 'string' && original_text.includes('[WhatsApp Chat') && (
            <View className="bg-[#25D366]/10 self-center px-4 py-1.5 rounded-full mb-6 flex-row items-center border border-[#25D366]/20">
              <FontAwesome5 name="whatsapp" size={14} color="#25D366" />
              <Text className="text-[#25D366] font-bold text-[12px] ml-2">{original_text.replace('[', '').replace(']', '')}</Text>
            </View>
          )}


          <View className="bg-white border-[4px] border-black rounded-[32px] p-8 mb-6" style={{ shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <View className="flex-row items-center justify-center mb-6">
              <View className="bg-neo-orange border-[3px] border-black rounded-full p-4" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
                <FontAwesome5 name="fire" size={32} color="white" />
              </View>
            </View>
            <View className="bg-neo-pink border-[3px] border-black self-center px-4 py-1.5 rounded-xl mb-6" style={{ shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }}>
              <Text className="text-white font-extrabold text-[13px] uppercase tracking-wider text-center">Overall Vibe</Text>
            </View>
            <Text className="text-[18px] text-black font-extrabold text-center leading-7">{data.overallVibe}</Text>
          </View>

          {data.roasts?.map((roastData: any, idx: number) => (
            <View key={idx} className="bg-white border-[3px] border-black rounded-[24px] p-5 mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
              <Text className="font-extrabold text-black text-[16px] mb-2">{roastData.participant}</Text>
              <Text className="text-black font-bold text-[15px] leading-6">{roastData.roast}</Text>
            </View>
          ))}


          <Text className="text-center text-white text-[12px] my-4 px-4">
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
      )}
    </SafeAreaView>
  );
}
