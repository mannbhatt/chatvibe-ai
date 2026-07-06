import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({
    generationsCount: 0,
    achievementsCount: 0,
    streakCount: 0,
  });

  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'User';
  const handle = `@${fullName.replace(/\s+/g, '').toLowerCase()}${user?.id?.substring(0, 4) || ''}`;

  useEffect(() => {
    async function fetchProfileData() {
      if (!user) return;

      // 1. Total Generations
      const { count: genCount } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // 2. Total Achievements
      const { count: achCount } = await supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // 3. User info (streak)
      const { data: userData } = await supabase
        .from('users')
        .select('daily_streak_count, is_premium')
        .eq('id', user.id)
        .single();

      setStats({
        generationsCount: genCount || 0,
        achievementsCount: achCount || 0,
        streakCount: userData?.daily_streak_count || 0,
      });
    }

    fetchProfileData();
  }, [user]);

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFBFF' }} edges={['top', 'left', 'right']}>

      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-4 pb-4 border-b border-gray-100 mb-4">
        <View className="w-10 h-10" />
        <Text className="text-[24px] font-extrabold text-[#5D5FEF] tracking-tight text-center">Profile</Text>
        <Image 
          source={{ uri: user?.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + fullName.split(' ')[0] }} 
          className="w-10 h-10 rounded-full"
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* User Info */}
        <View className="items-center px-6 pt-6 pb-8">
          <View className="mb-4">
            <Image
              source={{ uri: user?.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + fullName }}
              className="w-24 h-24 rounded-full"
            />
          </View>
          <Text className="text-[24px] font-extrabold text-[#111] mb-1">{fullName}</Text>
          <Text className="text-[#8E8E93] text-[15px] mb-3">{handle}</Text>

        </View>




        {/* Favorite Generators */}
        <View className="mb-8">
          <Text className="px-6 text-[18px] font-bold text-[#111] mb-4">Favorite Generators</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>

            <View className="bg-[#FFF0F3] rounded-[20px] p-4 mr-4 w-32 items-center">
              <View className="bg-white w-12 h-12 rounded-full items-center justify-center mb-3 shadow-sm" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 }}>
                <Feather name="zap" size={20} color="#FF4B72" />
              </View>
              <Text className="font-semibold text-[#111] text-[14px]">Roast Chat</Text>
            </View>

            <View className="bg-[#FFFAFA] border border-orange-50 rounded-[20px] p-4 mr-4 w-32 items-center">
              <View className="bg-white w-12 h-12 rounded-full items-center justify-center mb-3 shadow-sm" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 }}>
                <Feather name="image" size={20} color="#FF8C00" />
              </View>
              <Text className="font-semibold text-[#111] text-[14px]">Meme Gen</Text>
            </View>

            <View className="bg-[#F8F9FA] rounded-[20px] p-4 mr-4 w-32 items-center">
              <View className="bg-white w-12 h-12 rounded-full items-center justify-center mb-3 shadow-sm" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 }}>
                <Feather name="edit-3" size={20} color="#111" />
              </View>
              <Text className="font-semibold text-[#111] text-[14px]">Rewrite</Text>
            </View>

          </ScrollView>
        </View>

        {/* Pro Banner */}
        <View className="px-6 mb-8">
          <TouchableOpacity className="bg-[#5D5FEF] rounded-[24px] p-5 flex-row items-center justify-between shadow-lg" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}>
            <View className="flex-1 mr-4">
              <Text className="text-white text-[18px] font-bold mb-1">Unlock Pro Features</Text>
              <Text className="text-white/70 text-[13px]">Get infinite remixes & advanced styles</Text>
            </View>
            <View className="bg-white w-10 h-10 rounded-full items-center justify-center">
              <Feather name="arrow-right" size={20} color="#5D5FEF" />
            </View>
          </TouchableOpacity>
        </View>
        {/* Settings Links */}
        <View className="px-6 mb-8">
          <TouchableOpacity className="bg-white rounded-t-[20px] p-4 flex-row items-center border-b border-gray-50">
            <View className="bg-[#F8F9FA] w-10 h-10 rounded-full items-center justify-center mr-4">
              <Feather name="bell" size={18} color="#111" />
            </View>
            <Text className="flex-1 font-semibold text-[#111] text-[16px]">Notifications & Alerts</Text>
            <Feather name="chevron-right" size={20} color="#D4D4EB" />
          </TouchableOpacity>

          <TouchableOpacity className="bg-white p-4 flex-row items-center border-b border-gray-50">
            <View className="bg-[#F8F9FA] w-10 h-10 rounded-full items-center justify-center mr-4">
              <Feather name="lock" size={18} color="#111" />
            </View>
            <Text className="flex-1 font-semibold text-[#111] text-[16px]">Privacy & Data</Text>
            <Feather name="chevron-right" size={20} color="#D4D4EB" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogout} className="bg-white rounded-b-[20px] p-4 flex-row items-center">
            <View className="bg-[#FFF0F3] w-10 h-10 rounded-full items-center justify-center mr-4">
              <Feather name="log-out" size={18} color="#FF4B72" />
            </View>
            <Text className="flex-1 font-semibold text-[#FF4B72] text-[16px]">Log Out</Text>
            <Feather name="chevron-right" size={20} color="#D4D4EB" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
