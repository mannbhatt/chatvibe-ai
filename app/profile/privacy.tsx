import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../contexts/AlertContext';

export default function PrivacyScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const getAuthToken = async () => {
    const { data: session } = await supabase.auth.getSession();
    return session?.session?.access_token;
  };

  const handleDownloadData = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/account/export`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Export failed');

      const data = await response.json();
      const file = new FileSystem.File(FileSystem.Paths.cache, 'chatvibe_data.json');

      file.write(JSON.stringify(data, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri);
      } else {
        showAlert('Download failed', 'Sharing is not available on this device.', [{ text: 'OK' }], 'error');
      }
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Failed to download data.', [{ text: 'OK' }], 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear History",
      "This will delete all your creations. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const token = await getAuthToken();
              if (!token) throw new Error('Not authenticated');

              const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
              const response = await fetch(`${baseUrl}/api/account/clear-history`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (!response.ok) throw new Error('Clear history failed');

              showAlert('Success', 'Your history has been cleared.', [{ text: 'OK' }], 'success');
              router.replace('/(tabs)');
            } catch (e) {
              console.error(e);
              showAlert('Error', 'Failed to clear history.', [{ text: 'OK' }], 'error');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showAlert('Error', 'Please type DELETE exactly to confirm.', [{ text: 'OK' }], 'error');
      return;
    }

    try {
      setDeleteModalVisible(false);
      setLoading(true);
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/account/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Delete account failed');

      await supabase.auth.signOut();
      router.replace('/(auth)/login');
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Failed to delete account.', [{ text: 'OK' }], 'error');
      setLoading(false);
    }
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://app.notion.com/p/PRIVACY-POLICY-3a599e446166804eb648c83d7f4564f8?source=copy_link'); // Placeholder URL
  };

  const openTermsOfService = () => {
    Linking.openURL('https://app.notion.com/p/TERMS-OF-SERVICE-3a599e44616680c3976acebce6e8b1f6?source=copy_link'); // Placeholder URL
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#cff5e1' }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b-2 border-black ">
        <TouchableOpacity onPress={() => router.back()} className="p-2 w-12 items-start">
          <Feather name="arrow-left" size={24} color="black" />
        </TouchableOpacity>
        <Text className="flex-1 text-[20px] font-extrabold text-black text-center tracking-tight mr-12">
          Privacy & Data
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Section 1 - How your data is used */}
        <View className="px-6 pt-6 pb-2">
          <Text className="text-[18px] font-extrabold text-black mb-3">How your data is used</Text>
          <View className="bg-neo-purple p-5 rounded-[24px] mb-6 border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <Text className="text-[15px] text-white leading-6 mb-4">
              Your chats and photos are processed to generate your creations, then stored so you can find them again in your History. Chat and photo content you upload is sent to Google's Gemini AI to generate results — it is not used to train AI models, and is not shared with other users unless you choose to share your own results.
            </Text>
            <Text className="text-[15px] text-white leading-6">
              If you import a WhatsApp chat, phone numbers are automatically removed before anything is sent for analysis. Only import chats you have permission to share.
            </Text>
          </View>
        </View>

        {/* Section 2 - Your controls */}
        <View className="px-6 py-4">
          <Text className="text-[18px] font-extrabold text-black mb-3">Your controls</Text>

          <TouchableOpacity onPress={handleDownloadData} disabled={loading} className="bg-neo-blue p-5 rounded-[24px] mb-4 border-[3px] border-black flex-row items-center" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <View className="flex-1 mr-4">
              <Text className="text-[16px] font-extrabold text-white mb-1">Download my data</Text>
              <Text className="text-[13px] text-white/80">Get a copy of everything you've created and saved.</Text>
            </View>
            <View className="bg-black/20 w-12 h-12 rounded-xl items-center justify-center border-2 border-black">
              <Feather name="download" size={20} color="white" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleClearHistory} disabled={loading} className="bg-neo-pink p-5 rounded-[24px] mb-4 border-[3px] border-black flex-row items-center" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <View className="flex-1 mr-4">
              <Text className="text-[16px] font-extrabold text-white mb-1">Clear my history</Text>
              <Text className="text-[13px] text-white/80">Delete all your past creations. Your account stays active.</Text>
            </View>
            <View className="bg-black/20 w-12 h-12 rounded-xl items-center justify-center border-2 border-black">
              <Feather name="trash-2" size={20} color="white" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setDeleteConfirmText(''); setDeleteModalVisible(true); }} disabled={loading} className="bg-neo-orange p-5 rounded-[24px] mb-6 border-[3px] border-black flex-row items-center" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <View className="flex-1 mr-4">
              <Text className="text-[16px] font-bold text-white mb-1">Delete my account</Text>
              <Text className="text-[13px] text-white/80">Permanently delete your account and everything in it. This can't be undone.</Text>
            </View>
            <View className="bg-black/20 w-12 h-12 rounded-xl items-center justify-center border-2 border-black">
              <Feather name="x-circle" size={20} color="white" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 3 - Legal */}
        <View className="px-6 py-4">
          <Text className="text-[18px] font-extrabold text-black mb-3">Legal</Text>
          <View className="bg-white rounded-[24px] border-[3px] border-black overflow-hidden" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <TouchableOpacity onPress={openPrivacyPolicy} className="p-5 flex-row items-center border-b-[3px] border-black">
              <Text className="flex-1 text-[16px] font-extrabold text-black">Privacy Policy</Text>
              <Feather name="external-link" size={18} color="#8E8E93" />
            </TouchableOpacity>
            <TouchableOpacity onPress={openTermsOfService} className="p-5 flex-row items-center">
              <Text className="flex-1 text-[16px] font-extrabold text-black">Terms of Service</Text>
              <Feather name="external-link" size={18} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4 - Third-party services */}
        <View className="px-6 py-4 mb-8">
          <Text className="text-[18px] font-extrabold text-black mb-3">Third-party services</Text>
          <View className="bg-neo-yellow p-5 rounded-[24px] border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <Text className="text-[14px] text-[#4A4A52] leading-6">
              This app uses Google Gemini for AI generation, and Supabase for account and data storage. Learn more in our full Privacy Policy above.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center px-6 bg-black/40">
          <View className="bg-white rounded-[32px] w-full p-8 items-center border-[4px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 8, height: 8 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <View className="w-16 h-16 bg-[#FF4B72] rounded-2xl items-center justify-center mb-6 border-[3px] border-black">
              <Feather name="alert-triangle" size={28} color="white" />
            </View>
            <Text className="text-[20px] font-extrabold text-black mb-2 text-center">Delete Account</Text>
            <Text className="text-[15px] text-[#8E8E93] mb-6 text-center leading-5">
              This will permanently delete your account and everything in it. This cannot be undone.{'\n\n'}
              Type "DELETE" to confirm.
            </Text>

            <TextInput
              className="w-full bg-white rounded-[16px] px-4 py-4 mb-6 font-bold text-[16px] text-center border-[3px] border-black"
              placeholder="DELETE"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
            />

            <View className="flex-row w-full space-x-3">
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                className="flex-1 bg-white py-4 rounded-[16px] items-center justify-center mr-2 border-[3px] border-black"
              >
                <Text className="font-extrabold text-[15px] text-black">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteAccount}
                className="flex-1 bg-[#FF4B72] py-4 rounded-[16px] items-center justify-center ml-2 border-[3px] border-black"
                style={{ opacity: deleteConfirmText === 'DELETE' ? 1 : 0.5 }}
                disabled={deleteConfirmText !== 'DELETE'}
              >
                <Text className="font-bold text-[15px] text-white">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading && (
        <View className="absolute inset-0 bg-white/80 justify-center items-center z-50">
          <View className="bg-neo-yellow p-6 rounded-3xl border-[4px] border-black items-center shadow-neo">
            <Feather name="loader" size={40} color="black" className="animate-spin mb-4" />
            <Text className="font-extrabold text-[16px]">Processing...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
