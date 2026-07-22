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

export default function ChatDetectiveResultScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { resultData, original_text, generation_id, is_favorite } = useLocalSearchParams();
  const [isFavorited, setIsFavorited] = useState(is_favorite === 'true');

  let data = {} as any;
  try {
    data = JSON.parse(resultData as string);
  } catch (e) {
    console.error('Failed to parse resultData', e);
  }



  const handleCopy = async () => {
    if (data.aiSummary) {
      await Clipboard.setStringAsync(`Chat Detective Analysis:\n${data.aiSummary}\nFriendship: ${data.friendshipScore}/100\nComedy: ${data.comedyLevel}/100`);
      showAlert('Copied!', 'Summary copied to your clipboard ✨', [], 'success');
    }
  };

  const handleShare = async () => {
    try {
      if (data.aiSummary) {
        await Share.share({
          message: `Chat Detective Analysis:\n${data.aiSummary}\nFriendship: ${data.friendshipScore}/100\nComedy: ${data.comedyLevel}/100`,
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




  const StatBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <View className="mb-4">
      <View className="flex-row justify-between mb-2">
        <Text className="text-[14px] font-extrabold text-black">{label}</Text>
        <Text className="text-[14px] font-extrabold text-black">{value}/100</Text>
      </View>
      <View className="w-full h-4 bg-white border-[3px] border-black rounded-full overflow-hidden">
        <View className="h-full border-r-[3px] border-black" style={{ width: `${value}%`, backgroundColor: color }} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#cff5e1' }} edges={['top', 'left', 'right', 'bottom']}>
      <View className="flex-row justify-between items-center px-6 pt-4 pb-4">
        <AnimatedPressable onPress={() => router.back()} className="w-12 h-12 bg-white border-[3px] border-black rounded-full items-center justify-center" style={{ shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }}>
          <Feather name="arrow-left" size={24} color="black" />
        </AnimatedPressable>
        <Text className="text-[18px] font-extrabold text-black tracking-tight">Chat Detective</Text>
        <View className="w-10 h-10" />
      </View>

      {!data.aiSummary ? (
        <View className="flex-1 items-center justify-center px-6">
          <Feather name="alert-triangle" size={32} color="#5D5FEF" />
          <Text className="font-bold text-black text-[16px] mt-4 mb-2">Generation Failed</Text>
          <Text className="text-[#8E8E93] text-[14px] text-center mb-6">We couldn't analyze the chat. Please try a different chat snippet.</Text>
          <TouchableOpacity onPress={() => router.back()} className="bg-[#5D5FEF] px-6 py-3 rounded-full flex-row items-center">
            <Feather name="refresh-cw" size={16} color="white" />
            <Text className="text-white font-bold ml-2">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, paddingHorizontal: 24 }}>
          {typeof original_text === 'string' && original_text.includes('[WhatsApp Chat') && (
            <View className="bg-[#25D366]/10 self-center px-4 py-1.5 rounded-full mb-6 flex-row items-center border border-[#25D366]/20">
              <FontAwesome5 name="whatsapp" size={14} color="#25D366" />
              <Text className="text-[#25D366] font-bold text-[12px] ml-2">{original_text.replace('[', '').replace(']', '')}</Text>
            </View>
          )}


          <View className="bg-white border-[4px] border-black rounded-[32px] p-6 mb-8" style={{ shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <View className="bg-neo-blue border-[3px] border-black self-start px-4 py-1.5 rounded-xl mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }}>
              <Text className="text-white font-extrabold text-[13px] uppercase tracking-wider">AI Summary</Text>
            </View>
            <Text className="text-[18px] text-black font-extrabold leading-7 mb-6">{data.aiSummary}</Text>

            <View className="flex-row justify-between mb-8 mt-2">
              <View className="bg-neo-yellow border-[3px] border-black p-4 rounded-2xl flex-1 mr-2" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
                <Text className="text-black text-[12px] font-extrabold uppercase tracking-wider mb-1">Main Character</Text>
                <Text className="text-black font-extrabold text-[16px]">{data.mainCharacter}</Text>
              </View>
              <View className="bg-neo-purple border-[3px] border-black p-4 rounded-2xl flex-1 ml-2" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
                <Text className="text-white text-[12px] font-extrabold uppercase tracking-wider mb-1">Overall Mood</Text>
                <Text className="text-white font-extrabold text-[16px]">{data.mood}</Text>
              </View>
            </View>

            <StatBar label="Friendship Score" value={data.friendshipScore} color="#00C49A" />
            <StatBar label="Comedy Level" value={data.comedyLevel} color="#FFD23F" />
            <StatBar label="Drama Level" value={data.dramaLevel} color="#EE4266" />
            <StatBar label="Ghosting Risk" value={data.ghostingRisk} color="#3b82f6" />

            {/* HARD STATS BLOCK */}
            {data.computedStats && Object.keys(data.computedStats).length > 0 && (
              <View className="mt-4 mb-2 pt-6 border-t-[3px] border-black">
                <View className="bg-black self-start px-4 py-1.5 rounded-xl mb-6">
                  <Text className="text-white font-extrabold text-[13px] uppercase tracking-wider">Hard Stats</Text>
                </View>

                <View className="mb-6">
                  <Text className="text-black font-extrabold text-[16px] mb-4">Message Volume</Text>
                  {Object.entries(data.computedStats).sort((a: any, b: any) => b[1].messagePercentage - a[1].messagePercentage).map(([participant, stats]: any) => (
                    <View key={participant} className="mb-3">
                      <View className="flex-row justify-between mb-2">
                        <Text className="text-[14px] text-black font-extrabold" numberOfLines={1} style={{ maxWidth: '80%' }}>{participant}</Text>
                        <Text className="text-[14px] text-black font-extrabold">{stats.messagePercentage}%</Text>
                      </View>
                      <View className="w-full h-4 bg-white border-[3px] border-black rounded-full overflow-hidden">
                        <View className="h-full border-r-[3px] border-black bg-neo-pink" style={{ width: `${stats.messagePercentage}%` }} />
                      </View>
                    </View>
                  ))}
                </View>

                <View className="flex-row flex-wrap justify-between">
                  {(() => {
                    let maxGhoster = '';
                    let maxGhostGap = 0;
                    let maxEmojiUser = '';
                    let maxEmojis = 0;

                    Object.entries(data.computedStats).forEach(([p, s]: any) => {
                      if (s.longestResponseGapMins > maxGhostGap) { maxGhostGap = s.longestResponseGapMins; maxGhoster = p; }
                      if (s.totalEmojis > maxEmojis) { maxEmojis = s.totalEmojis; maxEmojiUser = p; }
                    });

                    return (
                      <>
                        {maxGhoster ? (
                          <View className="bg-neo-orange border-[3px] border-black p-4 rounded-2xl w-[48%] mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
                            <Text className="text-white text-[11px] uppercase font-extrabold tracking-wider mb-2">Biggest Ghoster</Text>
                            <Text className="text-white font-extrabold text-[14px]" numberOfLines={1}>{maxGhoster}</Text>
                            <Text className="text-white font-bold text-[12px] mt-1">{maxGhostGap > 60 ? Math.round(maxGhostGap / 60) + ' hrs' : maxGhostGap + ' mins'} gap</Text>
                          </View>
                        ) : null}
                        {maxEmojiUser ? (
                          <View className="bg-neo-green border-[3px] border-black p-4 rounded-2xl w-[48%] mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
                            <Text className="text-white text-[11px] uppercase font-extrabold tracking-wider mb-2">Most Emojis</Text>
                            <Text className="text-white font-extrabold text-[14px]" numberOfLines={1}>{maxEmojiUser}</Text>
                            <Text className="text-white font-bold text-[12px] mt-1">{maxEmojis} emojis sent</Text>
                          </View>
                        ) : null}
                      </>
                    );
                  })()}
                </View>
              </View>
            )}

            {data.funnyObservations && data.funnyObservations.length > 0 && (
              <View className="mt-4 pt-6 border-t-[3px] border-black">
                <View className="bg-neo-purple border-[3px] border-black self-start px-4 py-1.5 rounded-xl mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }}>
                  <Text className="text-white font-extrabold text-[13px] uppercase tracking-wider">Observations</Text>
                </View>
                {data.funnyObservations.map((obs: string, idx: number) => (
                  <View key={idx} className="flex-row items-start mb-4 bg-white border-[3px] border-black p-4 rounded-xl" style={{ shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }}>
                    <Text className="text-[18px] mr-3">🎯</Text>
                    <Text className="text-[15px] text-black font-bold flex-1">{obs}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>


          <Text className="text-center text-[#8E8E93] text-[12px] mb-6 px-4">
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
