import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';

export default function DeleteAccountWebPage() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#cff5e1' }}>
      <Stack.Screen options={{ title: 'Account Deletion', headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60, maxWidth: 800, alignSelf: 'center' }}>
        
        <View className="items-center mb-8 mt-4">
          <View className="bg-[#FF4B72] w-16 h-16 rounded-2xl items-center justify-center border-4 border-black mb-4 shadow-sm" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <Feather name="trash-2" size={32} color="white" />
          </View>
          <Text className="text-[32px] font-extrabold text-black text-center tracking-tight">
            Delete Your ChatVibe AI Account
          </Text>
        </View>

        <View className="bg-white rounded-3xl border-[3px] border-black p-6 mb-8" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
          
          <Text className="text-[20px] font-extrabold text-black mb-3">
            How to initiate deletion
          </Text>
          <Text className="text-[16px] text-black/80 font-semibold leading-6 mb-6">
            You can securely delete your ChatVibe AI account and all associated data directly from within the app. 
            To do this, open the app, log in to your account, and navigate to:
          </Text>
          
          <View className="bg-[#FFF0F3] p-4 rounded-xl border-2 border-black mb-8 flex-row items-center">
             <Feather name="settings" size={20} color="black" />
             <Text className="font-extrabold text-black text-[16px] ml-3">Profile Tab → Settings → Delete Account</Text>
          </View>

          <Text className="text-[20px] font-extrabold text-black mb-3">
            What data is deleted?
          </Text>
          <Text className="text-[16px] text-black/80 font-semibold leading-6 mb-6">
            When you confirm account deletion, the following data is immediately and permanently removed from our servers:
          </Text>
          
          <View className="mb-6">
            <View className="flex-row items-center mb-2">
              <Feather name="check" size={18} color="#FF4B72" />
              <Text className="ml-2 font-bold text-black text-[15px]">Your profile information (Name, Avatar, Preferences)</Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Feather name="check" size={18} color="#FF4B72" />
              <Text className="ml-2 font-bold text-black text-[15px]">All your AI chat generations and saved results</Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Feather name="check" size={18} color="#FF4B72" />
              <Text className="ml-2 font-bold text-black text-[15px]">Your daily streaks and unlocked achievements</Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Feather name="check" size={18} color="#FF4B72" />
              <Text className="ml-2 font-bold text-black text-[15px]">Your custom folders and organization data</Text>
            </View>
            <View className="flex-row items-center">
              <Feather name="check" size={18} color="#FF4B72" />
              <Text className="ml-2 font-bold text-black text-[15px]">Your linked authentication identities</Text>
            </View>
          </View>

          <Text className="text-[20px] font-extrabold text-black mb-3">
            What data is retained?
          </Text>
          <Text className="text-[16px] text-black/80 font-semibold leading-6 mb-6">
            We do not retain any of your personal data or generations. Anonymized, aggregated usage metrics (which cannot be linked back to you) may be kept for internal analytics. If you have an active premium subscription, please note that deleting your account does not cancel your subscription with Apple or Google; you must cancel it through your device settings.
          </Text>

          <Text className="text-[20px] font-extrabold text-[#FF4B72] mb-3">
            Permanent Action
          </Text>
          <Text className="text-[16px] text-black/80 font-semibold leading-6 mb-6">
            Account deletion is immediate and permanent. Once processed, your account cannot be recovered.
          </Text>

          <View className="h-[2px] bg-black/10 my-4" />
          
          <Text className="text-[14px] text-black/60 font-bold mt-2">
            Need help? Contact our support team at support@chatvibeai.app
          </Text>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
