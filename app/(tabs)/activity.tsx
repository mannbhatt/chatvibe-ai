import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, SectionList, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { AnimatedPressable, Skeleton } from '../../components/ui';
import { useRouter, useFocusEffect } from 'expo-router';

type Generation = {
  id: string;
  feature_type: string;
  style_mode: string;
  input_data?: string;
  output_data: any;
  created_at: string;
  is_favorite?: boolean;
};

type UserStats = {
  daily_streak_count: number;
  tokens_used_today: number;
  daily_token_limit: number;
};

export default function ActivityScreen() {
  const { user, userProfile } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const firstName = user?.user_metadata?.name?.split(' ')[0] || userProfile?.display_name?.split(' ')[0] || 'Creator';

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<UserStats>({ daily_streak_count: 0, tokens_used_today: 0, daily_token_limit: 20 });
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);

  const [activeFilter, setActiveFilter] = useState<'All' | 'Favorites'>('All');

  const fetchActivityData = async () => {
    if (!user) {
      setStats({ daily_streak_count: 0, tokens_used_today: 0, daily_token_limit: 20 });
      setGenerations([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      // 1. Fetch Stats
      const { data: userData } = await supabase
        .from('users')
        .select('daily_streak_count, tokens_used_today, daily_token_limit, generations_reset_at')
        .eq('id', user.id)
        .single();

      // Fetch Token Status
      const { data: tokenStatusData } = await supabase
        .rpc('get_token_status', { p_user_id: user.id });
      const tokenStatus = Array.isArray(tokenStatusData) ? tokenStatusData[0] : tokenStatusData;

      if (tokenStatus && (tokenStatus.tokens_used !== undefined || tokenStatus.tokens_used_today !== undefined)) {
        const used = tokenStatus?.tokens_used !== undefined ? tokenStatus.tokens_used : tokenStatus?.tokens_used_today;
        const limit = tokenStatus?.daily_limit !== undefined ? tokenStatus.daily_limit : tokenStatus?.daily_token_limit;
        setStats({ 
          daily_streak_count: userData?.daily_streak_count || 0, 
          tokens_used_today: used !== undefined ? Number(used) : 0, 
          daily_token_limit: limit !== undefined ? Number(limit) : 20 
        });
      } else if (userData) {
        // Fallback: check date
        let used = userData.tokens_used_today || 0;
        if (userData.generations_reset_at) {
          const resetDate = new Date(userData.generations_reset_at);
          const today = new Date();
          if (resetDate.getUTCFullYear() !== today.getUTCFullYear() || resetDate.getUTCMonth() !== today.getUTCMonth() || resetDate.getUTCDate() !== today.getUTCDate()) {
            used = 0; // New day!
          }
        }
        setStats({
          daily_streak_count: userData.daily_streak_count || 0,
          tokens_used_today: used,
          daily_token_limit: userData.daily_token_limit || 20
        });
      } else {
        setStats({ daily_streak_count: 0, tokens_used_today: 0, daily_token_limit: 20 });
      }

      // 2. Fetch Generations
      const { data: genData } = await supabase
        .from('generations')
        .select('id, feature_type, style_mode, output_data, input_data, created_at, is_favorite')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (genData) setGenerations(genData);
      else setGenerations([]);

      // 5. Fetch Achievements
      const { data: achData } = await supabase
        .from('user_achievements')
        .select(`
          unlocked_at,
          achievements ( title, description, icon )
        `)
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });
      if (achData) setAchievements(achData);

    } catch (err) {
      console.error('Error fetching activity data:', err);
      setError('Failed to load activity. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchActivityData();
    }, [user])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchActivityData();
  }, [user]);

  const toggleFavorite = async (generationId: string) => {
    if (!user) return;
    const gen = generations.find(g => g.id === generationId);
    if (!gen) return;
    const newStatus = !gen.is_favorite;

    try {
      setGenerations(prev => prev.map(g => g.id === generationId ? { ...g, is_favorite: newStatus } : g));

      const { error } = await supabase
        .from('generations')
        .update({ is_favorite: newStatus })
        .eq('id', generationId);

      if (error) throw error;
    } catch (err) {
      setGenerations(prev => prev.map(g => g.id === generationId ? { ...g, is_favorite: !newStatus } : g));
      showAlert('Oops!', 'We couldn\'t update your favorite status.', [], 'error');
    }
  };

  const getFeatureIcon = (type: string) => {
    switch (type) {
      case 'chat-detective':
      case 'chat_detective': return { name: 'search', color: '#5D5FEF', bg: '#F8F9FA' };
      case 'roast-my-chat':
      case 'roast_my_chat': return { name: 'frown', color: '#FF4B72', bg: '#FFF0F3' };
      case 'meme-generator':
      case 'meme_generator': return { name: 'smile', color: '#FF8C00', bg: '#FFFAF0' };
      case 'text-to-emoji':
      case 'text_to_emoji': return { name: 'type', color: '#8B5CF6', bg: '#F5F3FF' };
      case 'rewrite-text':
      case 'rewrite_text': return { name: 'edit-3', color: '#3B82F6', bg: '#EFF6FF' };
      case 'vibe-check':
      case 'vibe_check': return { name: 'activity', color: '#22C55E', bg: '#F0FDF4' };
      default: return { name: 'zap', color: 'black', bg: '#F8F9FA' };
    }
  };

  const formatFeatureName = (type: string) => {
    return type.replace(/-/g, '_').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // 1. Filter the generations
  const filteredGenerations = generations.filter(gen => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Favorites') {
      return gen.is_favorite;
    }

    return true;
  });

  // 2. Group by Date
  const groupedData: { title: string, data: Generation[] }[] = [];
  filteredGenerations.forEach(gen => {
    const d = new Date(gen.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let title = d.toLocaleDateString();
    if (d.toDateString() === today.toDateString()) title = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) title = 'Yesterday';

    const existingGroup = groupedData.find(g => g.title === title);
    if (existingGroup) {
      existingGroup.data.push(gen);
    } else {
      groupedData.push({ title, data: [gen] });
    }
  });

  const renderRecentItem = (gen: Generation) => {
    const iconData = getFeatureIcon(gen.feature_type);
    let previewText = 'Generated content...';

    if (gen.output_data) {
      const out = gen.output_data;
      if (gen.feature_type === 'meme_generator' || gen.feature_type === 'meme-generator') {
        let captions = Array.isArray(out.captions) ? out.captions : (out.captions ? [out.captions] : []);
        previewText = captions.length > 0 ? captions.join(' • ') : 'Meme Generation';
      } else {
        previewText = typeof out === 'string' ? out : (out.emoji || out.rewrittenText || out.overallVibe || out.aiSummary || out.summary || previewText);
      }
    }

    const isFavorited = gen.is_favorite;

    return (
      <View key={gen.id} className="bg-white rounded-3xl p-4 mb-4 border-[3px] border-black flex-row items-center" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 }}>
        <TouchableOpacity
          activeOpacity={0.7}
          className="flex-1 flex-row items-center"
          onPress={() => {
            let path = '/result';
            if (gen.feature_type === 'chat_detective') path = '/results/chat-detective';
            else if (gen.feature_type === 'roast_my_chat') path = '/results/roast-my-chat';
            else if (gen.feature_type === 'meme_generator') path = '/results/meme-generator';
            else if (gen.feature_type === 'rewrite_text') path = '/results/rewrite-text';
            else if (gen.feature_type === 'vibe_check') path = '/results/vibe-check';

            router.push({
              pathname: path as any,
              params: {
                resultData: typeof gen.output_data === 'string' ? gen.output_data : JSON.stringify({ ...gen.output_data, image: undefined }),
                generation_id: gen.id,
                emojis: typeof gen.output_data === 'string' ? gen.output_data : (gen.output_data?.emoji || gen.output_data?.result || ''),
                original_text: gen.feature_type === 'meme_generator' ? '' : (gen.input_data || ''),
                tone: gen.style_mode || 'Default',
                is_favorite: gen.is_favorite ? 'true' : 'false'
              }
            });
          }}
        >
          <View className="w-12 h-12 rounded-xl items-center justify-center mr-4 border-2 border-black" style={{ backgroundColor: iconData.bg }}>
            <Feather name={iconData.name as any} size={20} color={iconData.color} />
          </View>
          <View className="flex-1 mr-2">
            <Text className="font-bold text-black text-[15px]">{formatFeatureName(gen.feature_type)}</Text>
            <Text className="text-[#8E8E93] text-[13px] mt-1" numberOfLines={1}>{previewText}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => toggleFavorite(gen.id)}
          className="p-2 ml-1"
        >
          <Feather name="star" size={20} color={isFavorited ? "#FFD700" : "#D1D1D6"} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#cff5e1' }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-4 pb-4 border-b-2 border-black mb-4">
        <View className="w-10 h-10" />
        <Text className="text-[24px] font-extrabold text-black tracking-tight text-center">History</Text>
        <Image
          source={{ uri: user?.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + firstName }}
          className="w-10 h-10 rounded-full border-2 border-black"
        />
      </View>

      {isLoading && !refreshing ? (
        <ScrollView className="flex-1 px-6 pt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} className="flex-row items-center mb-4 bg-white p-4 rounded-[24px] border-[3px] border-black">
              <Skeleton width={48} height={48} borderRadius={16} />
              <View className="ml-4 flex-1">
                <Skeleton width="60%" height={16} borderRadius={8} className="mb-2" />
                <Skeleton width="40%" height={12} borderRadius={6} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-6">
          <Feather name="alert-triangle" size={32} color="#FF4B72" />
          <Text className="font-bold text-black text-[16px] mt-4 mb-2">Oops!</Text>
          <Text className="text-[#8E8E93] text-[14px] text-center mb-6">{error}</Text>
          <TouchableOpacity onPress={fetchActivityData} className="bg-[#5D5FEF] px-6 py-2 rounded-full">
            <Text className="text-white font-bold">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={groupedData}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <View className="px-6">{renderRecentItem(item)}</View>}
          renderSectionHeader={({ section: { title } }) => (
            <View className="px-6 pt-2 pb-3" style={{ backgroundColor: '#cff5e1' }}>
              <Text className="font-extrabold text-black text-[15px] uppercase tracking-wider">{title}</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5D5FEF" />
          }
          ListHeaderComponent={
            <>
              {/* Stats Hero Section */}
              <View className="px-6 mb-6">
                <View className="flex-row justify-between">
                  <View className="w-[48%] bg-neo-orange rounded-3xl p-5 border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 }}>
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-black font-extrabold text-[13px] uppercase tracking-wider">Streak</Text>
                      <FontAwesome5 name="fire" size={16} color="black" />
                    </View>
                    <Text className="text-black font-extrabold text-[32px] mb-1">{stats.daily_streak_count}</Text>
                    <Text className="text-black/80 font-bold text-[13px]">Days in a row</Text>
                  </View>

                  <View className="w-[48%] bg-neo-blue rounded-3xl p-5 border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 }}>
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-black font-extrabold text-[13px] uppercase tracking-wider">Today</Text>
                      <Feather name="zap" size={16} color="black" />
                    </View>
                    <Text className="text-black font-extrabold text-[32px] mb-1">{stats.tokens_used_today}<Text className="text-[16px] text-black/70">/{stats.daily_token_limit}</Text></Text>
                    <Text className="text-black/80 font-bold text-[13px]">Tokens Used</Text>
                  </View>
                </View>
              </View>

              {/* Achievements (only if they have any) */}
              {achievements.length > 0 && (
                <View className="mb-6">
                  <View className="px-6 mb-3">
                    <Text className="font-bold text-black text-[16px]">Achievements</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                    {achievements.map((ach, idx) => (
                      <View key={idx} className="mr-4 w-32 bg-neo-yellow rounded-3xl p-4 items-center border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 }}>
                        <Text className="text-[32px] mb-2">{ach.achievements.icon || '🏆'}</Text>
                        <Text className="font-bold text-black text-[13px] text-center" numberOfLines={2}>{ach.achievements.title}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Filter Row */}
              <View className="mb-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                  <TouchableOpacity
                    onPress={() => setActiveFilter('All')}
                    className={`mr-3 px-5 py-2.5 rounded-full flex-row items-center border-2 ${activeFilter === 'All' ? 'bg-black border-black' : 'bg-white border-black'}`}
                    style={activeFilter === 'All' ? {} : { shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6 }}
                  >
                    <Text className={`font-extrabold text-[14px] ${activeFilter === 'All' ? 'text-white' : 'text-black'}`}>All</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveFilter('Favorites')}
                    className={`mr-3 px-5 py-2.5 rounded-full flex-row items-center border-2 ${activeFilter === 'Favorites' ? 'bg-neo-purple border-black' : 'bg-white border-black'}`}
                    style={activeFilter === 'Favorites' ? {} : { shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6 }}
                  >
                    <Feather name="star" size={14} color={activeFilter === 'Favorites' ? 'black' : 'black'} style={{ marginRight: 6 }} />
                    <Text className={`font-extrabold text-[14px] text-black`}>Favorites</Text>
                  </TouchableOpacity>

                </ScrollView>
              </View>
            </>
          }
          ListEmptyComponent={
            <View className="px-6 mt-10">
              <View className="bg-neo-yellow rounded-3xl p-8 items-center justify-center border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 12 }}>
                <View className="flex-row mb-5 items-center justify-center">
                  <View className="w-12 h-12 bg-white rounded-xl items-center justify-center border-2 border-black transform -rotate-12 z-20">
                    <Feather name="file-text" size={20} color="black" />
                  </View>
                  <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center border-[3px] border-black z-30 mx-[-10px]">
                    <Feather name="inbox" size={28} color="black" />
                  </View>
                  <View className="w-12 h-12 bg-white rounded-xl items-center justify-center border-2 border-black transform rotate-12 z-20">
                    <Feather name="clock" size={20} color="black" />
                  </View>
                </View>
                <Text className="font-extrabold text-black text-[20px] mb-2 tracking-tight">It's quiet here</Text>
                <Text className="text-black font-bold text-[14px] text-center leading-5 px-4 mb-6">No history matches your current view. Your creative journey starts here!</Text>
                {activeFilter !== 'All' ? (
                  <TouchableOpacity
                    onPress={() => setActiveFilter('All')}
                    className="bg-black px-6 py-3 rounded-full border-2 border-black"
                  >
                    <Text className="text-white font-extrabold">View All History</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => router.push('/')}
                    className="bg-black px-6 py-3 rounded-full flex-row items-center border-2 border-black"
                  >
                    <Text className="text-white font-extrabold mr-2">Start Creating</Text>
                    <Feather name="zap" size={16} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          }
        />
      )}

    </SafeAreaView>
  );
}
