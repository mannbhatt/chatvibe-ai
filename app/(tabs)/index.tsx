import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, Image, ActivityIndicator, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { AnimatedPressable, Skeleton } from '../../components/ui';

const getFeatureIcon = (type: string) => {
  switch (type) {
    case 'chat-detective':
    case 'chat_detective': return { name: 'search', color: '#5D5FEF', bg: '#EAE4FE', iconBg: '#D3C7FE' };
    case 'roast-my-chat':
    case 'roast_my_chat': return { name: 'frown', color: '#FF4B72', bg: '#FFF0F3', iconBg: '#FFD1DA' };
    case 'meme-generator':
    case 'meme_generator': return { name: 'smile', color: '#FF8C00', bg: '#FFFAFA', iconBg: '#FFE4C4' };
    case 'text-to-emoji':
    case 'text_to_emoji': return { name: 'type', color: 'black', bg: '#FFFAF0', iconBg: 'white' };
    case 'rewrite-text':
    case 'rewrite_text': return { name: 'edit-3', color: 'black', bg: '#F8F9FA', iconBg: '#B4C4FF' };
    case 'vibe-check':
    case 'vibe_check': return { name: 'activity', color: '#22C55E', bg: '#F0FDF4', iconBg: '#DCFCE7' };
    default: return { name: 'zap', color: 'black', bg: '#F8F9FA', iconBg: '#EAE4FE' };
  }
};

const formatFeatureName = (type: string) => {
  if (!type) return 'Creation';
  return type.replace(/-/g, '_').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [recentCreations, setRecentCreations] = useState<any[]>([]);
  const [stats, setStats] = useState({ tokens_used_today: 0, daily_token_limit: 20 });
  const [universalInput, setUniversalInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0] || 'Creator';

  useFocusEffect(
    useCallback(() => {
      async function fetchData() {
        if (!user) {
          setStats({ tokens_used_today: 0, daily_token_limit: 20 });
          setRecentCreations([]);
          setIsLoading(false);
          return;
        }
        try {
          const { data: tokenStatusData, error: rpcError } = await supabase
            .rpc('get_token_status', { p_user_id: user.id });
          const tokenStatus = Array.isArray(tokenStatusData) ? tokenStatusData[0] : tokenStatusData;
          if (tokenStatus && !rpcError) {
            const used = tokenStatus.tokens_used !== undefined ? tokenStatus.tokens_used : tokenStatus.tokens_used_today;
            const limit = tokenStatus.daily_limit !== undefined ? tokenStatus.daily_limit : tokenStatus.daily_token_limit;
            if (used !== undefined && limit !== undefined) {
              setStats({
                tokens_used_today: Number(used),
                daily_token_limit: Number(limit)
              });
            }
          } else {
            // Fallback: fetch from users table and check date
            const { data: userData } = await supabase.from('users').select('tokens_used_today, daily_token_limit, generations_reset_at').eq('id', user.id).single();
            if (userData) {
              let used = userData.tokens_used_today || 0;
              if (userData.generations_reset_at) {
                const resetDate = new Date(userData.generations_reset_at);
                const today = new Date();
                if (resetDate.getUTCFullYear() !== today.getUTCFullYear() || resetDate.getUTCMonth() !== today.getUTCMonth() || resetDate.getUTCDate() !== today.getUTCDate()) {
                  used = 0; // New day!
                }
              }
              setStats({ tokens_used_today: used, daily_token_limit: userData.daily_token_limit || 20 });
            } else {
              setStats({ tokens_used_today: 0, daily_token_limit: 20 });
            }
          }

          const { data: gens } = await supabase
            .from('generations')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);
          if (gens) setRecentCreations(gens);
          else setRecentCreations([]);
        } finally {
          setIsLoading(false);
        }
      }
      fetchData();
    }, [user])
  );

  const getPreviewText = (item: any) => {
    let previewText = 'Generated content...';
    try {
      if (typeof item.output_data === 'string') previewText = item.output_data;
      else if (item.output_data) {
        const out = item.output_data;
        previewText = out.emoji || out.rewrittenText || out.overallVibe || out.aiSummary || out.summary || (out.captions && out.captions[0]) || previewText;
      }
    } catch (e) { }
    return previewText;
  };

  const handleUniversalSubmit = () => {
    if (!universalInput.trim()) return;
    const text = universalInput.trim();

    let route = 'rewrite-text';
    const lowerText = text.toLowerCase();
    if (lowerText.includes('whatsapp') || text.includes(':')) {
      route = 'chat-detective';
    } else if (text.length < 50) {
      route = 'text-to-emoji';
    }

    router.push({ pathname: `/create/${route}`, params: { initialText: text } });
    setUniversalInput('');
  };

  const todaysDate = new Date().toDateString();
  const todaysCreations = recentCreations.filter(c => new Date(c.created_at).toDateString() === todaysDate);

  const navigateToResult = (item: any) => {
    let path = '/result';
    if (item.feature_type === 'chat_detective') path = '/results/chat-detective';
    else if (item.feature_type === 'roast_my_chat') path = '/results/roast-my-chat';
    else if (item.feature_type === 'meme_generator') path = '/results/meme-generator';
    else if (item.feature_type === 'rewrite_text') path = '/results/rewrite-text';
    else if (item.feature_type === 'vibe_check') path = '/results/vibe-check';

    router.push({
      pathname: path as any,
      params: {
        resultData: typeof item.output_data === 'string' ? item.output_data : JSON.stringify({ ...item.output_data, image: undefined }),
        generation_id: item.id,
        emojis: typeof item.output_data === 'string' ? item.output_data : (item.output_data?.emoji || item.output_data?.result || ''),
        original_text: item.feature_type === 'meme_generator' ? '' : (item.input_data || ''),
        tone: item.mode || 'Default'
      }
    });
  };

  return (
    <View className="flex-1 bg-neo-bg">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

          {/* Header (Greeting + Avatar + Settings) */}
          <View className="flex-row justify-between items-center px-6 pt-4 pb-4 mb-2">
            <View>
              <Text className="text-[24px] tracking-tight">
                <Text className="font-extrabold text-black">{greeting},</Text>{'\n'}
                <Text className="font-extrabold text-black">{firstName}</Text>
                <Text className="text-[24px]"> ✨</Text>
              </Text>
            </View>
            <AnimatedPressable onPress={() => router.push('/profile')}>
              <Image
                source={{ uri: user?.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + firstName }}
                className="w-12 h-12 rounded-xl border-[3px] border-black"
                style={{ shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }}
              />
            </AnimatedPressable>
          </View>

          {/* Token Balance */}
          <View className="px-6 mb-8 mt-2">
            <AnimatedPressable onPress={() => { }} style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 }}>
              <View
                className="bg-white rounded-3xl p-6 flex-row justify-between items-center border-[3px] border-black"
              >
                <View>
                  <Text className="text-black font-bold text-[12px] uppercase tracking-widest mb-1">Tokens Used</Text>
                  {isLoading ? (
                    <Skeleton width={120} height={40} borderRadius={8} className="mt-1" />
                  ) : (
                    <Text className="text-black font-extrabold text-[36px] tracking-tighter leading-[40px]">
                      {stats.tokens_used_today}
                      <Text className="text-black/60 text-[16px] font-medium tracking-normal"> / {stats.daily_token_limit}</Text>
                    </Text>
                  )}
                </View>
                <View className="bg-neo-yellow px-5 py-3 rounded-xl border-2 border-black">
                  <Text className="text-black font-bold text-[14px]">Upgrade</Text>
                </View>
              </View>
            </AnimatedPressable>
          </View>

          {/* Feature Grid */}
          <View className="px-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="font-extrabold text-black text-[20px] tracking-tight">Explore Magic</Text>
            </View>

            <View className="flex-row flex-wrap justify-between">
              {/* Chat Detective */}
              <View className="w-[48%] mb-4">
                <AnimatedPressable onPress={() => router.push('/create/chat-detective')} className="aspect-[4/5] bg-neo-purple p-5 rounded-3xl border-[3px] border-black flex-col" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 }}>
                  <View className="bg-black/20 w-12 h-12 rounded-xl items-center justify-center mb-auto border-2 border-black">
                    <Feather name="search" size={24} color="white" />
                  </View>
                  <Text className="font-extrabold text-white text-[16px] mt-4 tracking-tight">Chat Detective</Text>
                  <Text className="text-white/90 text-[12px] mt-1 font-medium leading-tight">Decode hidden meanings</Text>
                </AnimatedPressable>
              </View>

              {/* Roast Chat */}
              <View className="w-[48%] mb-4">
                <AnimatedPressable onPress={() => router.push('/create/roast-my-chat')} className="aspect-[4/5] bg-neo-orange p-5 rounded-3xl border-[3px] border-black flex-col" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 }}>
                  <View className="bg-black/20 w-12 h-12 rounded-xl items-center justify-center mb-auto border-2 border-black">
                    <FontAwesome5 name="fire" size={24} color="white" />
                  </View>
                  <Text className="font-extrabold text-white text-[16px] mt-4 tracking-tight">Roast Chat</Text>
                  <Text className="text-white/90 text-[12px] mt-1 font-medium leading-tight">Get absolutely destroyed</Text>
                </AnimatedPressable>
              </View>

              {/* Meme Generator */}
              <View className="w-full mb-4">
                <AnimatedPressable onPress={() => router.push('/create/meme-generator')} className="bg-neo-pink p-6 rounded-3xl border-[3px] border-black flex-row items-center" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 }}>
                  <View className="flex-1 mr-4">
                    <Text className="font-extrabold text-black text-[18px] mb-1 tracking-tight">Meme Generator</Text>
                    <Text className="text-black/80 text-[13px] font-bold leading-tight">Turn text into viral humor</Text>
                  </View>
                  <View className="bg-black/20 w-14 h-14 rounded-xl items-center justify-center border-2 border-black">
                    <Feather name="image" size={28} color="black" />
                  </View>
                </AnimatedPressable>
              </View>

              {/* Text to Emoji */}
              <View className="w-[48%] mb-4">
                <AnimatedPressable onPress={() => router.push('/create/text-to-emoji')} className="aspect-[4/5] bg-neo-green p-5 rounded-3xl border-[3px] border-black flex-col" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 }}>
                  <View className="bg-black/20 w-12 h-12 rounded-xl items-center justify-center mb-auto border-2 border-black">
                    <Feather name="smile" size={24} color="black" />
                  </View>
                  <Text className="font-extrabold text-black text-[16px] mt-4 tracking-tight">Text → Emoji</Text>
                  <Text className="text-black/80 text-[12px] mt-1 font-bold leading-tight">Translate to Gen Z</Text>
                </AnimatedPressable>
              </View>

              {/* Vibe Check */}
              <View className="w-[48%] mb-4">
                <AnimatedPressable onPress={() => router.push('/create/vibe-check')} className="aspect-[4/5] bg-neo-yellow p-5 rounded-3xl border-[3px] border-black flex-col" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 }}>
                  <View className="bg-black/20 w-12 h-12 rounded-xl items-center justify-center mb-auto border-2 border-black">
                    <Feather name="activity" size={24} color="black" />
                  </View>
                  <Text className="font-extrabold text-black text-[16px] mt-4 tracking-tight">Vibe Check</Text>
                  <Text className="text-black/80 text-[12px] mt-1 font-bold leading-tight">Analyze the mood</Text>
                </AnimatedPressable>
              </View>

              {/* Rewrite */}
              <View className="w-full mb-4">
                <AnimatedPressable onPress={() => router.push('/create/rewrite-text')} className="bg-neo-blue p-6 rounded-3xl border-[3px] border-black flex-row items-center" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 }}>
                  <View className="flex-1 mr-4">
                    <Text className="font-extrabold text-white text-[18px] mb-1 tracking-tight">Rewrite Text</Text>
                    <Text className="text-white/90 text-[13px] font-bold leading-tight">Sound professional or chill</Text>
                  </View>
                  <View className="bg-black/20 w-14 h-14 rounded-xl items-center justify-center border-2 border-black">
                    <Feather name="edit-3" size={28} color="white" />
                  </View>

                </AnimatedPressable>
              </View>

            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
