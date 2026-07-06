import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

type Generation = {
  id: string;
  feature_type: string;
  style_mode: string;
  input_data?: string;
  output_data: any;
  created_at: string;
};

type MemeTemplate = {
  id: string;
  name: string;
  image_url: string;
};

type UserStats = {
  daily_streak_count: number;
  generations_today: number;
};

export default function ActivityScreen() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const firstName = user?.user_metadata?.name?.split(' ')[0] || userProfile?.display_name?.split(' ')[0] || 'Creator';

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<UserStats>({ daily_streak_count: 0, generations_today: 0 });
  const [recentGenerations, setRecentGenerations] = useState<Generation[]>([]);
  const [templates, setTemplates] = useState<MemeTemplate[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);

  const fetchActivityData = async () => {
    if (!user) return;

    try {
      setError(null);
      // 1. Fetch Stats
      const { data: userData } = await supabase
        .from('users')
        .select('daily_streak_count, generations_today')
        .eq('id', user.id)
        .single();

      if (userData) {
        setStats(userData);
      }

      // 2. Fetch Recent Generations
      const { data: genData } = await supabase
        .from('generations')
        .select('id, feature_type, style_mode, output_data, input_data, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (genData) {
        setRecentGenerations(genData);
      }

      // 3. Fetch Achievements (Join)
      const { data: achData } = await supabase
        .from('user_achievements')
        .select(`
          unlocked_at,
          achievements (
            title, description, icon
          )
        `)
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (achData) {
        setAchievements(achData);
      }

      // 4. Fetch Popular Templates
      const { data: tmpData } = await supabase
        .from('meme_templates')
        .select('id, name, image_url')
        .limit(5);

      if (tmpData) {
        setTemplates(tmpData);
      }

    } catch (error) {
      console.error('Error fetching activity data:', error);
      setError('Failed to load activity. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivityData();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchActivityData();
  }, [user]);

  const getFeatureIcon = (type: string) => {
    switch (type) {
      case 'chat_detective': return { name: 'search', color: '#5D5FEF', bg: '#F8F9FA' };
      case 'roast_my_chat': return { name: 'frown', color: '#FF4B72', bg: '#FFF0F3' };
      case 'meme_generator': return { name: 'smile', color: '#FF8C00', bg: '#FFFAF0' };
      case 'text_to_emoji': return { name: 'type', color: '#8B5CF6', bg: '#F5F3FF' };
      case 'rewrite_text': return { name: 'edit-3', color: '#3B82F6', bg: '#EFF6FF' };
      case 'vibe_check': return { name: 'activity', color: '#22C55E', bg: '#F0FDF4' };
      default: return { name: 'zap', color: '#111', bg: '#F8F9FA' };
    }
  };

  const formatFeatureName = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const renderRecentItem = (gen: Generation) => {
    const iconData = getFeatureIcon(gen.feature_type);
    let previewText = 'Generated content...';

    if (gen.output_data) {
      if (gen.feature_type === 'text_to_emoji') previewText = gen.output_data.emoji || previewText;
      if (gen.feature_type === 'chat_detective') previewText = gen.output_data.aiSummary || previewText;
      if (gen.feature_type === 'roast_my_chat') previewText = gen.output_data.overallVibe || previewText;
      if (gen.feature_type === 'rewrite_text') previewText = gen.output_data.rewrittenText || previewText;
      if (gen.feature_type === 'vibe_check') previewText = gen.output_data.summary || previewText;
      if (gen.feature_type === 'meme_generator') previewText = gen.output_data.captions?.[0] || previewText;
    }

    return (
      <TouchableOpacity 
        key={gen.id} 
        activeOpacity={0.7}
        className="bg-white rounded-2xl p-4 mb-3 flex-row items-center border border-gray-50 shadow-sm"
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
              resultData: typeof gen.output_data === 'string' ? gen.output_data : JSON.stringify(gen.output_data),
              generation_id: gen.id,
              emojis: typeof gen.output_data === 'string' ? gen.output_data : (gen.output_data?.emoji || gen.output_data?.result || JSON.stringify(gen.output_data)),
              original_text: gen.input_data || '',
              tone: gen.style_mode || 'Default'
            }
          });
        }}
      >
        <View className="w-12 h-12 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: iconData.bg }}>
          <Feather name={iconData.name as any} size={20} color={iconData.color} />
        </View>
        <View className="flex-1">
          <Text className="font-bold text-[#111] text-[15px]">{formatFeatureName(gen.feature_type)}</Text>
          <Text className="text-[#8E8E93] text-[13px] mt-1" numberOfLines={1}>{previewText}</Text>
        </View>
        <View className="ml-2">
          <Text className="text-[#8E8E93] text-[11px] font-medium">{new Date(gen.created_at).toLocaleDateString()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFBFF' }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-4 pb-4 border-b border-gray-100 mb-4">
        <View className="w-10 h-10" />
        <Text className="text-[24px] font-extrabold text-[#5D5FEF] tracking-tight text-center">Activity</Text>
        <Image 
          source={{ uri: user?.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + firstName }} 
          className="w-10 h-10 rounded-full"
        />
      </View>

      {isLoading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5D5FEF" />
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-6">
          <Feather name="alert-triangle" size={32} color="#FF4B72" />
          <Text className="font-bold text-[#111] text-[16px] mt-4 mb-2">Oops!</Text>
          <Text className="text-[#8E8E93] text-[14px] text-center mb-6">{error}</Text>
          <TouchableOpacity onPress={fetchActivityData} className="bg-[#5D5FEF] px-6 py-2 rounded-full">
            <Text className="text-white font-bold">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={recentGenerations}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <View className="px-6">{renderRecentItem(item)}</View>}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5D5FEF" />
          }
          ListHeaderComponent={
            <>
              {/* Stats Hero Section */}
              <View className="px-6 mb-8">
                <View className="flex-row justify-between">
                  <View className="w-[48%] bg-[#FF8C00] rounded-[24px] p-5 shadow-sm" style={{ shadowColor: '#FF8C00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}>
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-white/80 font-bold text-[13px] uppercase tracking-wider">Streak</Text>
                      <FontAwesome5 name="fire" size={16} color="white" />
                    </View>
                    <Text className="text-white font-extrabold text-[32px] mb-1">{stats.daily_streak_count}</Text>
                    <Text className="text-white/80 text-[13px]">Days in a row</Text>
                  </View>
    
                  <View className="w-[48%] bg-[#5D5FEF] rounded-[24px] p-5 shadow-sm" style={{ shadowColor: '#5D5FEF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}>
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-white/80 font-bold text-[13px] uppercase tracking-wider">Today</Text>
                      <Feather name="zap" size={16} color="white" />
                    </View>
                    <Text className="text-white font-extrabold text-[32px] mb-1">{stats.generations_today}<Text className="text-[16px] text-white/70">/10</Text></Text>
                    <Text className="text-white/80 text-[13px]">Generations</Text>
                  </View>
                </View>
              </View>
    
              {/* Popular Templates (only if templates exist) */}
              {templates.length > 0 && (
                <View className="mb-8">
                  <View className="px-6 mb-3 flex-row justify-between items-center">
                    <Text className="font-bold text-[#111] text-[16px]">Popular Templates</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                    {templates.map(tmp => (
                      <TouchableOpacity key={tmp.id} className="mr-4 w-32">
                        <Image source={{ uri: tmp.image_url }} className="w-32 h-32 rounded-[20px] bg-gray-100 mb-2" resizeMode="cover" />
                        <Text className="font-bold text-[#111] text-[13px]" numberOfLines={1}>{tmp.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
    
              {/* Achievements (only if they have any) */}
              {achievements.length > 0 && (
                <View className="mb-8">
                  <View className="px-6 mb-3">
                    <Text className="font-bold text-[#111] text-[16px]">Achievements</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                    {achievements.map((ach, idx) => (
                      <View key={idx} className="mr-4 w-32 bg-white rounded-[20px] p-4 items-center border border-gray-50 shadow-sm">
                        <Text className="text-[32px] mb-2">{ach.achievements.icon || '🏆'}</Text>
                        <Text className="font-bold text-[#111] text-[13px] text-center" numberOfLines={2}>{ach.achievements.title}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
              
              <View className="px-6 mb-4 flex-row justify-between items-center">
                <Text className="font-bold text-[#111] text-[16px]">Recent Magic</Text>
                {recentGenerations.length > 0 && (
                  <TouchableOpacity onPress={() => router.push('/saved')}>
                    <Text className="text-[#5D5FEF] font-bold text-[13px]">View Saved</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          }
          ListEmptyComponent={
            <View className="px-6">
              <View className="bg-white rounded-2xl p-6 items-center justify-center border border-gray-50 shadow-sm">
                <View className="w-16 h-16 bg-[#F8F5FF] rounded-full items-center justify-center mb-3">
                  <Feather name="wind" size={24} color="#5D5FEF" />
                </View>
                <Text className="font-bold text-[#111] text-[15px] mb-1">It's quiet here</Text>
                <Text className="text-[#8E8E93] text-[13px] text-center">Go to Create Magic to start generating your first AI vibes!</Text>
                <TouchableOpacity
                  onPress={() => router.push('/create')}
                  className="mt-4 bg-[#5D5FEF] px-6 py-2 rounded-full"
                >
                  <Text className="text-white font-bold">Create Magic</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
