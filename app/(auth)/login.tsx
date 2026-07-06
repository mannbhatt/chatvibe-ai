import { useState } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter, Redirect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

// Required for web browser flow
WebBrowser.maybeCompleteAuthSession();
const redirectTo = makeRedirectUri({ scheme: 'chatvibeai' });
export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { session, isLoading } = useAuth();

  if (!isLoading && session) {
    return <Redirect href="/(tabs)" />;
  }

  const createSessionFromUrl = async (url: string) => {
    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (errorCode) throw new Error(errorCode);

    const { access_token, refresh_token } = params;
    if (!access_token) return null;

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) throw error;

    return data.session;
  };

  async function performOAuth(provider: 'google' | 'apple') {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

        if (res.type === 'success') {
          const session = await createSessionFromUrl(res.url);

          if (session) {
            const { error: dbError } = await supabase.from('users').upsert({
              id: session.user.id,
              email: session.user.email || '',
              display_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
              auth_provider: provider,
            }, { onConflict: 'id', ignoreDuplicates: true });

            if (dbError) {
              // Optionally report error to monitoring service
            }

            router.replace('/(tabs)');
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Authentication Error', error.message || 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  }

  function signInWithGoogle() {
    performOAuth('google');
  }

  function signInWithApple() {
    performOAuth('apple');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFBFF' }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>

        {/* Title Area */}
        <View className="items-center mb-10">
          <Image source={require('../../assets/icon.png')} className="w-20 h-20 mb-4 rounded-3xl" resizeMode="contain" />
          <Text className="text-[36px] font-extrabold mb-4 tracking-tight"><Text className="text-[#5D5FEF]">ChatVibe</Text> <Text className="text-[#FF4B72]">AI</Text></Text>
          <View className="h-1 w-10 bg-[#5D5FEF] rounded-full" />
        </View>

        {/* Floating Auth Card */}
        <View className="bg-white rounded-[32px] p-8 shadow-sm mb-10" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 }}>
          <View className="items-center mb-8">
            <Text className="text-[26px] font-extrabold text-[#5D5FEF] mb-2 tracking-tight">Welcome</Text>
            <Text className="text-[#666] text-[15px] text-center">Sign in to continue your journey</Text>
          </View>

          <TouchableOpacity
            onPress={signInWithGoogle}
            disabled={loading}
            className={`w-full flex-row items-center justify-center h-14 bg-white border border-gray-200 rounded-[16px] mb-4 shadow-sm ${loading ? 'opacity-50' : ''}`}
          >
            <FontAwesome5 name="google" size={20} color="#FF4B72" />
            <Text className="ml-3 font-semibold text-[#5D5FEF] text-[16px]">{loading ? 'Connecting...' : 'Continue with Google'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={signInWithApple}
            disabled={loading}
            className={`w-full flex-row items-center justify-center h-14 bg-[#5D5FEF] rounded-[16px] shadow-sm mb-8 ${loading ? 'opacity-50' : ''}`}
          >
            <FontAwesome5 name="apple" size={22} color="white" />
            <Text className="ml-3 font-semibold text-white text-[16px]">Continue with Apple</Text>
          </TouchableOpacity>

          <Text className="text-center text-[#8E8E93] text-[13px] leading-5 px-2">
            By continuing, you agree to our <Text className="text-[#5D5FEF]">Terms of Service</Text> and <Text className="text-[#5D5FEF]">Privacy Policy</Text>.
          </Text>
        </View>

        {/* Footer Area */}
        <View className="flex-row justify-center items-center">
          <Feather name="lock" size={14} color="#8E8E93" />
          <Text className="ml-2 text-[#8E8E93] text-[14px] font-medium">Your chats are private and encrypted</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
