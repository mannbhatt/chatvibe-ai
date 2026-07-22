import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Alert, Modal, LogBox } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { supabase } from '../../lib/supabase';
import { LoadingVibe, AnimatedPressable } from '../../components/ui';
import { extractZipAndParse, parseWhatsAppText, ParseResult } from '../../lib/whatsapp-parser';
import { apiFetch, ApiError } from '../../lib/api';
import { getFeatureCost } from '../../lib/token-costs';

LogBox.ignoreLogs(['Method readAsStringAsync imported from "expo-file-system" is deprecated']);

const TONES_TEXT_TO_EMOJI = ['Minimal', 'Funny', 'Chaotic', 'Gen Z', 'Emoji Only'];
const TONES_ROAST_MY_CHAT = ['Friendly', 'Savage', 'Gen Z', 'Corporate', 'Gujarati', 'Bollywood Drama', 'Sarcastic Bestie', 'Roast Battle'];
const TONES_MEME_GENERATOR = ['Gen Z', 'Corporate', 'Dark', 'Gujarati', 'Anime', 'Cute', 'Savage', 'Bollywood'];
const TONES_REWRITE_TEXT = ['Gen Z', 'Corporate', 'Gujarati', 'Romantic', 'Passive Aggressive', 'Savage', 'Anime', 'Bollywood', 'Funny'];

type Feature = 'chat-detective' | 'roast-my-chat' | 'meme-generator' | 'rewrite-text' | 'text-to-emoji' | 'vibe-check';

export default function DynamicCreateScreen() {
  const { user, userProfile, refreshProfile } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
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

  const [inputText, setInputText] = useState(params.initialText ? String(params.initialText) : '');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [parsedChat, setParsedChat] = useState<ParseResult | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const [selectedTone, setSelectedTone] = useState(tones[0] || 'Gen Z');
  const [messageCountLimit, setMessageCountLimit] = useState<number>(150);
  const [isGenerating, setIsGenerating] = useState(false);

  const remainingTokens = userProfile?.is_premium ? 9999 : Math.max(0, (userProfile?.daily_token_limit ?? 20) - (userProfile?.tokens_used_today ?? userProfile?.generations_today ?? 0));
  const featureCostKey = featureParam.replace(/-/g, '_');
  const currentCost = (featureParam === 'roast-my-chat' || featureParam === 'chat-detective' || featureParam === 'vibe-check') ? getFeatureCost(featureCostKey, messageCountLimit) : getFeatureCost(featureCostKey, 1);
  const canAfford = currentCost <= remainingTokens;

  // Refresh profile on focus to get accurate token counts across midnight
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [])
  );

  // Initialize tone correctly if feature changes
  useEffect(() => {
    if (tones.length > 0 && !tones.includes(selectedTone)) {
      setSelectedTone(tones[0]);
    }
  }, [featureParam]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0].uri) {
      setSelectedImage(result.assets[0].uri);
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
          showAlert('File too big!', 'Your file is a bit too large. Please upload one smaller than 10MB.', [], 'error');
          return;
        }

        const isZip = file.name.toLowerCase().endsWith('.zip') ||
          file.mimeType === 'application/zip' ||
          file.mimeType === 'application/x-zip-compressed';
        const isTxt = file.name.toLowerCase().endsWith('.txt') || file.mimeType === 'text/plain';

        if (!isZip && !isTxt) {
          showAlert('Invalid Format', 'We only support .txt and .zip files for WhatsApp exports right now.', [], 'error');
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
      showAlert('Error', `Failed to parse WhatsApp file: ${error?.message || 'Unknown error'}`, [], 'error');
    }
  };

  const handleGenerate = async () => {
    if (isImage && !selectedImage) {
      showAlert('Hold up!', 'Looks like you forgot to pick an image!', [], 'info');
      return;
    }

    if (!isImage && !inputText.trim()) {
      showAlert('Hold up!', 'Please type or paste some text for us to work with!', [], 'info');
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        showAlert('Session Expired', 'Your session has timed out. Let\'s get you logged back in.', [], 'info');
        router.replace('/(auth)/login');
        return;
      }

      let finalPrompt = isImage ? selectedImage : (parsedChat ? parsedChat : inputText);

      if ((featureParam === 'roast-my-chat' || featureParam === 'chat-detective' || featureParam === 'vibe-check') && parsedChat && typeof parsedChat === 'object') {
        const slicedMessages = parsedChat.messages.slice(-messageCountLimit);
        finalPrompt = { ...parsedChat, messages: slicedMessages };
      } else if ((featureParam === 'roast-my-chat' || featureParam === 'chat-detective' || featureParam === 'vibe-check') && !isImage && !parsedChat && typeof inputText === 'string') {
        const lines = inputText.split('\n');
        finalPrompt = lines.slice(-messageCountLimit).join('\n');
      }

      let data;
      if (isImage && selectedImage) {
        const { data: { session } } = await supabase.auth.getSession();
        const uploadResult = await FileSystem.uploadAsync(
          `${process.env.EXPO_PUBLIC_API_BASE_URL || ''}/api/generate/${featureParam}`,
          selectedImage,
          {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'prompt',
            mimeType: 'image/jpeg',
            parameters: {
              mode: selectedTone,
            },
            headers: {
              Authorization: `Bearer ${session?.access_token}`
            }
          }
        );

        if (uploadResult.status >= 400) {
          try {
            const errorData = JSON.parse(uploadResult.body);
            throw new ApiError(errorData.error || 'Upload failed', uploadResult.status, `/api/generate/${featureParam}`);
          } catch {
            throw new ApiError('Upload failed', uploadResult.status, `/api/generate/${featureParam}`);
          }
        }

        data = JSON.parse(uploadResult.body);
      } else {
        const payload = {
          prompt: finalPrompt,
          mode: selectedTone,
          isWhatsApp: !!parsedChat
        };

        data = await apiFetch<any>(`/api/generate/${featureParam}`, {
          body: JSON.stringify(payload)
        });
      }

      if (data.success) {
        let resultPath = `/results/${featureParam}`;
        if (featureParam === 'text-to-emoji') resultPath = '/result';

        router.replace({
          pathname: resultPath as any,
          params: {
            resultData: JSON.stringify(data.result),
            original_text: isImage ? selectedImage : inputText,
            tone: selectedTone,
            generation_id: data.generation?.id,
            emojis: typeof data.result === 'string' ? data.result : undefined
          }
        });
      }
    } catch (error: any) {
      if (error instanceof ApiError) {
        if (error.status === 402 || error.status === 429) {
          showAlert(
            'Not Enough Tokens 🪙',
            error.message || 'You have reached your daily limit. Upgrade to Pro for unlimited vibes.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Upgrade to Pro' }
            ],
            'info'
          );
        } else {
          showAlert('Oops!', error.message || 'Something went wrong on our end. Please try again.', [], 'error');
        }
      } else {
        showAlert('Oops!', 'Failed to connect to the AI server.', [], 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View className="flex-1 bg-neo-bg">
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        {/* Header */}
        <View className="flex-row items-center px-6 pb-4" style={{ paddingTop: Math.max(insets.top + 16, 24) }}>
          <AnimatedPressable onPress={() => router.back()} className="mr-4 w-12 h-12 bg-white rounded-xl items-center justify-center border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <Feather name="arrow-left" size={24} color="black" />
          </AnimatedPressable>
          <Text className="text-[28px] font-extrabold text-black tracking-tighter">{featureName}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 140, 140) }}>
          <View className="px-6 animate-fade-in">
            {isImage ? (
              <View className="bg-white rounded-3xl p-2 border-[4px] border-black mb-6 items-center justify-center min-h-[280px]" style={{ shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5 }}>
                {selectedImage ? (
                  <View className="w-full relative">
                    <Image source={{ uri: selectedImage }} className="w-full h-[240px] rounded-2xl border-2 border-black" resizeMode="cover" />
                    <AnimatedPressable
                      onPress={pickImage}
                      className="absolute bottom-4 right-4 bg-black px-5 py-3 rounded-xl flex-row items-center border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}
                    >
                      <Feather name="edit-2" size={14} color="white" />
                      <Text className="text-white font-extrabold text-[13px] ml-2 tracking-wide">Change</Text>
                    </AnimatedPressable>
                  </View>
                ) : (
                  <AnimatedPressable onPress={pickImage} className="items-center py-10">
                    <View className="w-20 h-20 bg-neo-yellow rounded-xl items-center justify-center mb-4 border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
                      <Feather name="image" size={32} color="black" />
                    </View>
                    <Text className="font-extrabold text-black text-[18px] tracking-tight mb-1">Upload an Image</Text>
                    <Text className="text-black/70 text-[14px] font-bold">We'll generate viral captions for it</Text>
                  </AnimatedPressable>
                )}
              </View>
            ) : (
              <View className="bg-white rounded-3xl p-6 border-[4px] border-black mb-6" style={{ shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5 }}>
                <Text className="font-extrabold text-black text-[18px] tracking-tight mb-4">
                  {isChat ? 'Paste Chat Snippet or Upload' : 'What\'s on your mind?'}
                </Text>
                <TextInput
                  multiline
                  numberOfLines={isText ? 12 : 6}
                  maxLength={1000}
                  placeholder={isChat ? "Me: Hey\nThem: K" : "Type or paste text here..."}
                  placeholderTextColor="rgba(0,0,0,0.4)"
                  value={inputText}
                  onChangeText={(text) => {
                    setInputText(text);
                    if (parsedChat) setParsedChat(null);
                  }}
                  className={`bg-[#f8f9fa] rounded-2xl p-5 text-[16px] text-black font-semibold border-[3px] border-black ${isText ? 'min-h-[240px]' : 'min-h-[140px]'}`}
                  style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}
                  textAlignVertical="top"
                />
                {isChat && (
                  <AnimatedPressable onPress={pickWhatsAppFile} className="mt-6 bg-[#25D366] p-4 rounded-2xl flex-row items-center justify-center border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
                    <FontAwesome5 name="whatsapp" size={24} color="black" />
                    <Text className="font-extrabold text-black ml-3 text-[15px]">Upload WhatsApp Export</Text>
                  </AnimatedPressable>
                )}
              </View>
            )}

            {tones.length > 0 && (
              <View className="mb-6">
                <Text className="font-extrabold text-black text-[18px] tracking-tight mb-4 mt-2">Choose Tone</Text>
                <View className="flex-row flex-wrap">
                  {tones.map(tone => {
                    const isSelected = selectedTone === tone;
                    return (
                      <AnimatedPressable
                        key={tone}
                        onPress={() => setSelectedTone(tone)}
                        className={`px-5 py-3 rounded-xl mr-3 mb-4 border-[3px] border-black ${isSelected ? 'bg-black' : 'bg-white'}`}
                        style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}
                      >
                        <Text className={`font-extrabold text-[14px] ${isSelected ? 'text-white' : 'text-black'}`}>{tone}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>
            )}

            {(featureParam === 'roast-my-chat' || featureParam === 'chat-detective' || featureParam === 'vibe-check') && (
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="font-extrabold text-black text-[18px] tracking-tight">Messages to Analyze</Text>
                  <View className="bg-neo-purple px-3 py-1.5 rounded-xl flex-row items-center border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
                    <Feather name="zap" size={14} color="white" style={{ marginRight: 4 }} />
                    <Text className="text-white font-extrabold text-[12px] uppercase tracking-wider">{userProfile?.is_premium ? 'Unlimited' : `${remainingTokens} left`}</Text>
                  </View>
                </View>
                <View className="flex-row flex-wrap">
                  {[50, 150, 300, 500].map(count => {
                    const cost = getFeatureCost(featureCostKey, count);
                    const isSelected = messageCountLimit === count;
                    const isTooExpensive = cost > remainingTokens;

                    return (
                      <AnimatedPressable
                        key={count}
                        disabled={isTooExpensive}
                        onPress={() => setMessageCountLimit(count)}
                        className={`px-5 py-4 rounded-xl mr-3 mb-4 border-[3px] border-black ${isSelected ? 'bg-black' : isTooExpensive ? 'bg-gray-200 opacity-50' : 'bg-white'}`}
                        style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}
                      >
                        <Text className={`font-extrabold text-[15px] tracking-tight ${isSelected ? 'text-white' : isTooExpensive ? 'text-gray-500' : 'text-black'}`}>{count}</Text>
                        <View className="flex-row items-center mt-1">
                          <Text className={`text-[12px] font-bold ${isSelected ? 'text-white/80' : isTooExpensive ? 'text-gray-500' : 'text-black/70'}`}>{cost} tokens</Text>
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Sticky Initiate Creation Button */}
        <View className="absolute left-6 right-6" style={{ bottom: Math.max(insets.bottom + 24, 24) }}>
          {!canAfford && (
            <View className="bg-neo-pink p-4 rounded-2xl mb-4 flex-row items-center justify-center border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
              <Feather name="alert-circle" size={20} color="black" />
              <Text className="text-black font-extrabold text-[13px] ml-2">Not enough tokens. Try a lower count or upgrade.</Text>
            </View>
          )}
          <AnimatedPressable
            disabled={!canAfford}
            onPress={handleGenerate}
            className={`w-full overflow-hidden rounded-[24px] border-[4px] border-black`}
            style={{ shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 10 }}
          >
            {canAfford ? (
              <View className="bg-neo-purple h-16 flex-row items-center justify-center">
                <Feather name="zap" size={28} color="white" />
                <Text className="text-white font-extrabold text-[20px] ml-3 tracking-tight">Initiate Creation</Text>
              </View>
            ) : (
              <View className="h-16 bg-gray-300 flex-row items-center justify-center">
                <Feather name="zap-off" size={28} color="black" />
                <Text className="text-black font-extrabold text-[20px] ml-3 tracking-tight">Initiate Creation</Text>
              </View>
            )}
          </AnimatedPressable>
        </View>

        {isGenerating && <LoadingVibe />}

        {/* Disclaimer Modal */}
        <Modal visible={showDisclaimer} transparent animationType="fade">
          <View className="flex-1 bg-black/60 justify-center items-center p-6 backdrop-blur-sm">
            <View className="bg-neo-yellow w-full rounded-[32px] overflow-hidden p-8 items-center border-[4px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 8, height: 8 }, shadowOpacity: 1, shadowRadius: 0, elevation: 20 }}>
              <View className="w-24 h-24 bg-white rounded-3xl items-center justify-center mb-6 border-[4px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
                <FontAwesome5 name="shield-alt" size={40} color="black" />
              </View>
              <Text className="text-[28px] font-extrabold text-black mb-3 text-center tracking-tight">Privacy Notice</Text>
              <Text className="text-[16px] text-black/80 mb-8 text-center leading-6 font-bold">
                This chat will be analyzed by AI. Only import chats you have permission to share. Phone numbers are automatically redacted before processing.
              </Text>

              <AnimatedPressable
                onPress={async () => {
                  await AsyncStorage.setItem('hasSeenWhatsAppDisclaimer', 'true');
                  setShowDisclaimer(false);
                }}
                className="bg-black w-full py-4 rounded-2xl items-center border-[3px] border-black"
                style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}
              >
                <Text className="font-extrabold text-white text-[18px] tracking-tight">I Understand</Text>
              </AnimatedPressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
