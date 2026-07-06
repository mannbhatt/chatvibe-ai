import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { LoadingVibe } from '../../components/ui';
import { extractZipAndParse, parseWhatsAppText, ParseResult } from '../../lib/whatsapp-parser';
import { apiFetch, ApiError } from '../../lib/api';

const TONES_TEXT_TO_EMOJI = ['Minimal', 'Funny', 'Chaotic', 'Gen Z', 'Emoji Only'];
const TONES_ROAST_MY_CHAT = ['Friendly', 'Savage', 'Gen Z', 'Corporate', 'Gujarati'];
const TONES_MEME_GENERATOR = ['Gen Z', 'Corporate', 'Dark', 'Gujarati', 'Anime', 'Cute', 'Savage', 'Bollywood'];
const TONES_REWRITE_TEXT = ['Gen Z', 'Corporate', 'Gujarati', 'Romantic', 'Passive Aggressive', 'Savage', 'Anime', 'Bollywood', 'Funny'];

type Feature = 'chat-detective' | 'roast-my-chat' | 'meme-generator' | 'rewrite-text' | 'text-to-emoji' | 'vibe-check';

export default function DynamicCreateScreen() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const featureParam = params.feature as Feature;
  
  // Provide a friendly name and base tone
  let featureName = 'Create Magic';
  let isChat = false;
  let isImage = false;
  let isText = false;
  let tones: string[] = [];
  
  switch (featureParam) {
    case 'chat-detective':
      featureName = 'Chat Detective';
      isChat = true;
      break;
    case 'roast-my-chat':
      featureName = 'Roast My Chat';
      isChat = true;
      tones = TONES_ROAST_MY_CHAT;
      break;
    case 'vibe-check':
      featureName = 'Vibe Check';
      isChat = true;
      break;
    case 'meme-generator':
      featureName = 'Meme Generator';
      isImage = true;
      tones = TONES_MEME_GENERATOR;
      break;
    case 'rewrite-text':
      featureName = 'Rewrite Text';
      isText = true;
      tones = TONES_REWRITE_TEXT;
      break;
    case 'text-to-emoji':
      featureName = 'Text → Emoji';
      isText = true;
      tones = TONES_TEXT_TO_EMOJI;
      break;
  }

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [parsedChat, setParsedChat] = useState<ParseResult | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  
  const [selectedTone, setSelectedTone] = useState(tones[0] || 'Gen Z');
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize tone correctly if feature changes
  useEffect(() => {
    if (tones.length > 0 && !tones.includes(selectedTone)) {
      setSelectedTone(tones[0]);
    }
  }, [featureParam]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const pickWhatsAppFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/zip', 'application/x-zip-compressed', '*/*'],
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];

        if (file.size && file.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please upload a file smaller than 10MB.');
          return;
        }

        const isZip = file.name.toLowerCase().endsWith('.zip') || 
                      file.mimeType === 'application/zip' || 
                      file.mimeType === 'application/x-zip-compressed';
        const isTxt = file.name.toLowerCase().endsWith('.txt') || file.mimeType === 'text/plain';

        if (!isZip && !isTxt) {
          Alert.alert('Invalid Format', 'Only .txt and .zip files are supported for WhatsApp exports.');
          return;
        }
        
        const hasSeenDisclaimer = await AsyncStorage.getItem('hasSeenWhatsAppDisclaimer');
        if (!hasSeenDisclaimer) {
          setShowDisclaimer(true);
        }

        let parsed: ParseResult;

        if (isZip) {
          parsed = await extractZipAndParse(file.uri);
        } else {
          const text = await FileSystem.readAsStringAsync(file.uri);
          parsed = parseWhatsAppText(text);
        }

        setParsedChat(parsed);
        setInputText(`[WhatsApp Chat: ${parsed.participants.length} participants, ${parsed.messages.length} messages]`);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to parse WhatsApp file: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleGenerate = async () => {
    if (isImage && !selectedImage) {
      Alert.alert('Hold up!', 'Please select an image first.');
      return;
    }

    if (!isImage && !inputText.trim()) {
      Alert.alert('Hold up!', 'Please enter some text first.');
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        Alert.alert('Session Expired', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      const payload = {
        prompt: isImage ? selectedImage : (parsedChat ? parsedChat : inputText),
        mode: selectedTone,
        isWhatsApp: !!parsedChat
      };

      const data = await apiFetch<any>(`/api/generate/${featureParam}`, {
        body: JSON.stringify(payload)
      });

      if (data.success) {
        let resultPath = `/results/${featureParam}`;
        if (featureParam === 'text-to-emoji') resultPath = '/result';

        router.replace({
          pathname: resultPath as any,
          params: {
            resultData: JSON.stringify(data.result),
            original_text: inputText,
            tone: selectedTone,
            generation_id: data.generation?.id,
            emojis: typeof data.result === 'string' ? data.result : undefined
          }
        });
      }
    } catch (error: any) {
      if (error instanceof ApiError) {
        if (error.status === 402 || error.status === 429) {
          Alert.alert(
            'Daily Limit Reached 🚀',
            'You have used all 10 free generations for today! Upgrade to Pro for unlimited vibes.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Upgrade to Pro', onPress: () => {} }
            ]
          );
        } else {
          Alert.alert('Error', error.message || 'Something went wrong while generating.');
        }
      } else {
        Alert.alert('Error', 'Failed to connect to the AI server.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFBFF' }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row items-center px-6 pt-4 pb-6">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-gray-100">
          <Feather name="arrow-left" size={20} color="#111" />
        </TouchableOpacity>
        <Text className="text-[20px] font-extrabold text-[#111] tracking-tight">{featureName}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-6 animate-fade-in">
          {isImage ? (
            <View className="bg-white rounded-[24px] p-5 mb-6 shadow-sm border border-gray-50 items-center justify-center min-h-[250px]">
              {selectedImage ? (
                <View className="w-full relative">
                  <Image source={{ uri: selectedImage }} className="w-full h-[200px] rounded-2xl" resizeMode="cover" />
                  <TouchableOpacity 
                    onPress={pickImage}
                    className="absolute bottom-4 right-4 bg-[#111] px-4 py-2 rounded-full flex-row items-center"
                  >
                    <Feather name="edit-2" size={14} color="white" />
                    <Text className="text-white font-bold text-xs ml-2">Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={pickImage} className="items-center">
                  <View className="w-16 h-16 bg-[#F8F5FF] rounded-full items-center justify-center mb-4">
                    <Feather name="image" size={24} color="#5D5FEF" />
                  </View>
                  <Text className="font-bold text-[#111] mb-1">Upload an Image</Text>
                  <Text className="text-[#8E8E93] text-[13px]">We'll generate viral captions for it</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View className="bg-white rounded-[24px] p-5 mb-6 shadow-sm border border-gray-50">
              <Text className="font-bold text-[#111] text-[16px] mb-4">
                {isChat ? 'Paste Chat Snippet or Upload' : 'What\'s on your mind?'}
              </Text>
              <TextInput 
                multiline
                numberOfLines={6}
                maxLength={1000}
                placeholder={isChat ? "Me: Hey\nThem: K" : "Type or paste text here..."}
                placeholderTextColor="#8E8E93"
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  if (parsedChat) setParsedChat(null);
                }}
                className="bg-[#F8F9FA] rounded-[16px] p-4 text-[15px] text-[#111] min-h-[120px]"
                textAlignVertical="top"
              />
              {isChat && (
                <TouchableOpacity onPress={pickWhatsAppFile} className="mt-4 bg-[#F8F5FF] p-4 rounded-[16px] flex-row items-center justify-center border border-[#5D5FEF]/20">
                  <FontAwesome5 name="whatsapp" size={20} color="#25D366" />
                  <Text className="font-bold text-[#5D5FEF] ml-2">Upload WhatsApp Export</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {tones.length > 0 && (
            <View>
              <Text className="font-bold text-[#111] text-[16px] mb-4 mt-2">Choose Tone</Text>
              <View className="flex-row flex-wrap">
                {tones.map(tone => (
                  <TouchableOpacity 
                    key={tone}
                    onPress={() => setSelectedTone(tone)}
                    className={`px-4 py-2 rounded-full mr-3 mb-3 border ${selectedTone === tone ? 'bg-[#5D5FEF] border-[#5D5FEF]' : 'bg-white border-gray-200'}`}
                  >
                    <Text className={`font-bold text-[14px] ${selectedTone === tone ? 'text-white' : 'text-[#111]'}`}>{tone}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Initiate Creation Button */}
      <View className="absolute bottom-6 left-6 right-6">
        <TouchableOpacity 
          onPress={handleGenerate}
          className="bg-[#5D5FEF] h-14 rounded-full flex-row items-center justify-center shadow-lg"
          style={{ shadowColor: '#5D5FEF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
        >
          <Feather name="zap" size={20} color="white" />
          <Text className="text-white font-extrabold text-[16px] ml-2">Initiate Creation</Text>
        </TouchableOpacity>
      </View>

      {isGenerating && <LoadingVibe />}

      {/* Disclaimer Modal */}
      <Modal visible={showDisclaimer} transparent animationType="fade">
        <View className="flex-1 bg-black/40 justify-center items-center p-6">
          <View className="bg-white rounded-3xl w-full p-6 shadow-lg items-center">
            <View className="w-16 h-16 bg-[#FFF0F3] rounded-full items-center justify-center mb-4">
              <FontAwesome5 name="shield-alt" size={24} color="#FF4B72" />
            </View>
            <Text className="text-[20px] font-bold text-[#111] mb-2 text-center">Privacy Notice</Text>
            <Text className="text-[14px] text-[#8E8E93] mb-6 text-center leading-5">
              This chat will be analyzed by AI. Only import chats you have permission to share. Phone numbers are automatically redacted before processing.
            </Text>
            
            <TouchableOpacity 
              onPress={async () => {
                await AsyncStorage.setItem('hasSeenWhatsAppDisclaimer', 'true');
                setShowDisclaimer(false);
              }} 
              className="bg-[#5D5FEF] w-full py-4 rounded-full items-center shadow-sm"
            >
              <Text className="font-bold text-white text-[16px]">I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
