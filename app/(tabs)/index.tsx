import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

const getFeatureIcon = (type: string) => {
  switch (type) {
    case 'chat_detective': return { name: 'search', color: '#5D5FEF', bg: '#F8F9FA' };
    case 'roast_my_chat': return { name: 'fire', color: '#FF4B72', bg: '#FFF0F3' };
    case 'meme_generator': return { name: 'smile', color: '#FF8C00', bg: '#FFFAF0' };
    case 'text_to_emoji': return { name: 'type', color: '#8B5CF6', bg: '#F5F3FF' };
    case 'text_emoji': return { name: 'type', color: '#8B5CF6', bg: '#F5F3FF' }; // For fallback
    case 'rewrite_text': return { name: 'edit-3', color: '#3B82F6', bg: '#EFF6FF' };
    case 'rewrite': return { name: 'edit-3', color: '#3B82F6', bg: '#EFF6FF' }; // For fallback
    case 'vibe_check': return { name: 'activity', color: '#22C55E', bg: '#F0FDF4' };
    default: return { name: 'zap', color: '#111', bg: '#F8F9FA' };
  }
};

const formatFeatureName = (type: string) => {
  if (!type) return 'Creation';
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [recentCreations, setRecentCreations] = useState<any[]>([]);
  const router = useRouter();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0] || 'There';

  useEffect(() => {
    async function fetchRecent() {
      if (!user) return;
      const { data } = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) setRecentCreations(data);
    }
    fetchRecent();
  }, [user]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFBFF' }} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <View className="flex-row justify-between items-center px-6 pt-4 pb-4 border-b border-gray-100 mb-4">
          <View className="w-10 h-10" />
          <Text className="text-[24px] font-extrabold text-[#5D5FEF] tracking-tight text-center">Home</Text>
          <Image
            source={{ uri: user?.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + firstName }}
            className="w-10 h-10 rounded-full"
          />
        </View>

        {/* Headline */}
        <View className="px-6 mb-6">
          <Text className="text-[32px] font-extrabold text-[#111] leading-10 tracking-tight">
            What do you want to{'\n'}create today?
          </Text>
        </View>

        {/* Search Input 
        <View className="px-6 mb-8">
          <View className="flex-row items-center bg-white border border-gray-100 rounded-full h-14 px-4 shadow-sm" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
            <Feather name="search" size={20} color="#8E8E93" />
            <TextInput
              placeholder="Paste a chat, upload an image"
              className="flex-1 ml-3 text-[15px] text-[#111]"
              placeholderTextColor="#8E8E93"
            />
            <TouchableOpacity className="bg-[#5D5FEF] w-9 h-9 rounded-full items-center justify-center">
              <Feather name="arrow-up" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
*/}
        {/* Quick Actions Grid */}
        <View className="px-6 flex-row flex-wrap justify-between">
          <TouchableOpacity className="w-[48%] bg-[#EAE4FE] rounded-[24px] p-4 mb-4 items-center justify-center aspect-square" onPress={() => router.push({ pathname: '/create', params: { feature: 'ChatDetective' } })}>
            <View className="bg-[#D3C7FE] w-12 h-12 rounded-2xl items-center justify-center mb-3">
              <Feather name="search" size={24} color="#5D5FEF" />
            </View>
            <Text className="font-semibold text-[#111]">Chat Detective</Text>
          </TouchableOpacity>

          <TouchableOpacity className="w-[48%] bg-[#FFF0F3] rounded-[24px] p-4 mb-4 items-center justify-center aspect-square" onPress={() => router.push({ pathname: '/create', params: { feature: 'RoastMyChat' } })}>
            <View className="bg-[#FFD1DA] w-12 h-12 rounded-2xl items-center justify-center mb-3">
              <Feather name="frown" size={24} color="#FF4B72" />
            </View>
            <Text className="font-semibold text-[#111]">Roast Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity className="w-full bg-[#FFFAFA] border border-orange-50 rounded-[24px] p-4 mb-4 flex-row items-center justify-between" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10 }} onPress={() => router.push({ pathname: '/create', params: { feature: 'MemeGenerator' } })}>
            <View>
              <Text className="font-semibold text-[#111] text-[16px] mb-1">Meme Generator</Text>
              <Text className="text-[#8E8E93] text-[13px]">Turn text into viral humor</Text>
            </View>
            <View className="bg-[#FFE4C4] w-14 h-14 rounded-2xl items-center justify-center">
              <Feather name="image" size={24} color="#FF8C00" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="w-[48%] bg-[#FFFAF0] border border-orange-50 rounded-[24px] p-4 mb-4 items-center justify-center aspect-square" onPress={() => router.push({ pathname: '/create', params: { feature: 'TextToEmoji' } })}>
            <View className="bg-white w-12 h-12 rounded-2xl items-center justify-center mb-3 shadow-sm" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 }}>
              <Feather name="smile" size={24} color="#111" />
            </View>
            <Text className="font-semibold text-[#111]">Text → Emoji</Text>
          </TouchableOpacity>

          <TouchableOpacity className="w-[48%] bg-[#FFF0F5] border border-pink-50 rounded-[24px] p-4 mb-4 items-center justify-center aspect-square" onPress={() => router.push({ pathname: '/create', params: { feature: 'VibeCheck' } })}>
            <View className="bg-[#FFD1DA] w-12 h-12 rounded-2xl items-center justify-center mb-3">
              <Feather name="heart" size={24} color="#FF4B72" />
            </View>
            <Text className="font-semibold text-[#111]">Vibe Check</Text>
          </TouchableOpacity>

          <TouchableOpacity className="w-full bg-[#F8F9FA] rounded-[24px] p-4 flex-row items-center justify-between" onPress={() => router.push({ pathname: '/create', params: { feature: 'RewriteText' } })}>
            <View>
              <Text className="font-semibold text-[#111] text-[16px] mb-1">Rewrite</Text>
              <Text className="text-[#8E8E93] text-[13px]">Sound more professional or chill</Text>
            </View>
            <View className="bg-[#B4C4FF] w-14 h-14 rounded-2xl items-center justify-center">
              <Feather name="edit-3" size={24} color="#111" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Magic */}
        <View className="px-6 -mt-2">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[18px] font-bold text-[#111]">Recent Magic</Text>
            {recentCreations.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/activity')}>
                <Text className="text-[#5D5FEF] font-bold text-[13px]">See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentCreations.length > 0 ? (
            recentCreations.map((item, idx) => {
              const iconData = getFeatureIcon(item.feature_type);

              let previewText = 'Generated content...';
              try {
                if (typeof item.output_data === 'string') {
                  previewText = item.output_data;
                } else if (item.output_data) {
                  const out = item.output_data;
                  let text = out.emoji || out.rewrittenText || out.overallVibe || out.aiSummary;
                  if (!text && out.captions && out.captions.length > 0) text = out.captions[0];
                  if (!text && out.result && typeof out.result === 'string') text = out.result;
                  if (!text) text = JSON.stringify(out).replace(/[{}"\\]/g, ' ').trim();
                  if (text) previewText = text;
                }
              } catch (e) { }

              previewText = previewText.substring(0, 45) + (previewText.length > 45 ? '...' : '');

              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  className="bg-white rounded-2xl p-4 mb-3 flex-row items-center border border-gray-50 shadow-sm"
                  onPress={() => {
                    let path = '/result';
                    if (item.feature_type === 'chat_detective') path = '/results/chat-detective';
                    else if (item.feature_type === 'roast_my_chat') path = '/results/roast-my-chat';
                    else if (item.feature_type === 'meme_generator') path = '/results/meme-generator';
                    else if (item.feature_type === 'rewrite_text') path = '/results/rewrite-text';
                    else if (item.feature_type === 'vibe_check') path = '/results/vibe-check';

                    router.push({
                      pathname: path as any,
                      params: {
                        resultData: typeof item.output_data === 'string' ? item.output_data : JSON.stringify(item.output_data),
                        generation_id: item.id,
                        emojis: typeof item.output_data === 'string' ? item.output_data : (item.output_data?.emoji || item.output_data?.result || JSON.stringify(item.output_data)),
                        original_text: item.input_data || '',
                        tone: item.mode || 'Default'
                      }
                    });
                  }}
                >
                  <View className="w-12 h-12 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: iconData.bg }}>
                    <Feather name={iconData.name as any} size={20} color={iconData.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-[#111] text-[15px]">{formatFeatureName(item.feature_type)}</Text>
                    <Text className="text-[#8E8E93] text-[13px] mt-1" numberOfLines={1}>{previewText}</Text>
                  </View>
                  <View className="ml-2">
                    <Text className="text-[#8E8E93] text-[11px] font-medium">{new Date(item.created_at).toLocaleDateString()}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View className="bg-[#F8F9FA] border border-dashed border-gray-300 rounded-[24px] p-8 items-center justify-center my-2">
              <View className="bg-white w-16 h-16 rounded-full items-center justify-center mb-4 shadow-sm" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}>
                <Feather name="inbox" size={28} color="#D4D4EB" />
              </View>
              <Text className="text-[#111] font-semibold text-[16px] mb-1">No recent creations</Text>
              <Text className="text-[#8E8E93] text-[14px] text-center px-4">Tap one of the tools above to start creating magic!</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
