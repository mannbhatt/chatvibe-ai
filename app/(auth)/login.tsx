import { useState } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter, Redirect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
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
  const { showAlert } = useAlert();

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
      showAlert('Oops!', error.message || 'We couldn\'t sign you in. Please check your details and try again.', [], 'error');
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#cff5e1' }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>

        {/* Title Area */}
        <View className="items-center mb-10">
          <Image source={require('../../assets/icon.png')} className="w-20 h-20 mb-4 rounded-3xl border-[3px] border-black" resizeMode="contain" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }} />
          <Text className="text-[36px] font-extrabold mb-4 tracking-tight text-black">ChatVibe <Text className="text-black">AI</Text></Text>
          <View className="h-2 w-12 bg-black rounded-full" />
        </View>

        {/* Floating Auth Card */}
        <View className="bg-neo-yellow rounded-3xl p-8 mb-10 border-[4px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5 }}>
          <View className="items-center mb-8">
            <Text className="text-[26px] font-extrabold text-black mb-2 tracking-tight">Welcome</Text>
            <Text className="text-black/80 text-[15px] text-center font-bold">Sign in to continue your journey</Text>
          </View>

          <TouchableOpacity
            onPress={signInWithGoogle}
            disabled={loading}
            className={`w-full flex-row items-center justify-center h-14 bg-white border-[3px] border-black rounded-2xl mb-4 ${loading ? 'opacity-50' : ''}`}
            style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5 }}
          >
            <FontAwesome5 name="google" size={20} color="black" />
            <Text className="ml-3 font-extrabold text-black text-[16px]">{loading ? 'Connecting...' : 'Continue with Google'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={signInWithApple}
            disabled={loading}
            className={`w-full flex-row items-center justify-center h-14 bg-neo-purple border-[3px] border-black rounded-2xl mb-8 ${loading ? 'opacity-50' : ''}`}
            style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5 }}
          >
            <FontAwesome5 name="apple" size={22} color="white" />
            <Text className="ml-3 font-extrabold text-white text-[16px]">Continue with Apple</Text>
          </TouchableOpacity>

          <Text className="text-center text-black/70 font-bold text-[13px] leading-5 px-2">
            By continuing, you agree to our <Text className="text-black font-extrabold">Terms of Service</Text> and <Text className="text-black font-extrabold">Privacy Policy</Text>.
          </Text>
        </View>

        {/* Footer Area */}
        <View className="flex-row justify-center items-center">
          <Feather name="lock" size={14} color="black" />
          <Text className="ml-2 text-black/80 text-[14px] font-bold">Your chats are private and encrypted</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
