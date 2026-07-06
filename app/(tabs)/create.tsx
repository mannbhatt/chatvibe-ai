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

type Feature = 'ChatDetective' | 'RoastMyChat' | 'MemeGenerator' | 'RewriteText' | 'TextToEmoji' | 'VibeCheck';

export default function CreateScreen() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [activeTab, setActiveTab] = useState<'Chat' | 'Image' | 'Text'>('Chat');
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  useEffect(() => {
    if (params.feature) {
      const feat = params.feature as Feature;
      setSelectedFeature(feat);
      if (['ChatDetective', 'RoastMyChat', 'VibeCheck'].includes(feat)) setActiveTab('Chat');
      if (feat === 'MemeGenerator') setActiveTab('Image');
      if (['RewriteText', 'TextToEmoji'].includes(feat)) setActiveTab('Text');
    }
  }, [params.feature]);
  
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [parsedChat, setParsedChat] = useState<ParseResult | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  
  const [selectedTone, setSelectedTone] = useState('Gen Z');
  const [isGenerating, setIsGenerating] = useState(false);

  const firstName = user?.user_metadata?.name?.split(' ')[0] || userProfile?.display_name?.split(' ')[0] || 'Creator';

  // Handle Tab Switch (clears selected feature)
  const handleTabSwitch = (tab: 'Chat' | 'Image' | 'Text') => {
    setActiveTab(tab);
    setSelectedFeature(null);
    setInputText('');
    setSelectedImage(null);
    setParsedChat(null);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5, // Optimize base64 size
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
        
        // Check disclaimer
        const hasSeenDisclaimer = await AsyncStorage.getItem('hasSeenWhatsAppDisclaimer');
        if (!hasSeenDisclaimer) {
          setShowDisclaimer(true);
        }

        let parsed: ParseResult;
        const isZip = file.name.toLowerCase().endsWith('.zip') || 
                      file.mimeType === 'application/zip' || 
                      file.mimeType === 'application/x-zip-compressed';

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
      console.error('WhatsApp parse error:', error);
      Alert.alert('Error', `Failed to parse WhatsApp file: ${error?.message || 'Unknown error'}`);
    }
  };

  const getApiEndpoint = (feature: Feature) => {
    switch (feature) {
      case 'ChatDetective': return `/api/generate/chat-detective`;
      case 'RoastMyChat': return `/api/generate/roast-my-chat`;
      case 'MemeGenerator': return `/api/generate/meme-generator`;
      case 'RewriteText': return `/api/generate/rewrite-text`;
      case 'TextToEmoji': return `/api/generate/text-to-emoji`;
      case 'VibeCheck': return `/api/generate/vibe-check`;
    }
  };

  const handleGenerate = async () => {
    if (!selectedFeature) return;

    if (selectedFeature === 'MemeGenerator' && !selectedImage) {
      Alert.alert('Hold up!', 'Please select an image first.');
      return;
    }

    if (selectedFeature !== 'MemeGenerator' && !inputText.trim()) {
      Alert.alert('Hold up!', 'Please enter some text first.');
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const payload = {
        prompt: selectedFeature === 'MemeGenerator' 
                ? selectedImage 
                : (parsedChat ? parsedChat : inputText),
        mode: selectedTone,
        userId: user?.id,
        isWhatsApp: !!parsedChat
      };

      const endpoint = getApiEndpoint(selectedFeature);
      
      const data = await apiFetch<any>(endpoint, {
        body: JSON.stringify(payload)
      });

      if (data.success) {
        // Navigate to the specific result screen
        let resultPath = '/result';
        if (selectedFeature === 'ChatDetective') resultPath = '/results/chat-detective';
        else if (selectedFeature === 'RoastMyChat') resultPath = '/results/roast-my-chat';
        else if (selectedFeature === 'MemeGenerator') resultPath = '/results/meme-generator';
        else if (selectedFeature === 'RewriteText') resultPath = '/results/rewrite-text';
        else if (selectedFeature === 'VibeCheck') resultPath = '/results/vibe-check';
        // text-to-emoji stays on /result for now as implemented

        router.push({
          pathname: resultPath as any,
          params: {
            resultData: JSON.stringify(data.result),
            original_text: inputText,
            tone: selectedTone,
            generation_id: data.generation?.id,
            // Fallbacks for text-to-emoji compatibility
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
              { text: 'Upgrade to Pro', onPress: () => console.log('Upgrade Pressed') }
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

  const renderToneSelector = (tones: string[]) => (
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
  );

  const renderInputView = () => {
    return (
      <View className="px-6 animate-fade-in">
        <TouchableOpacity 
          onPress={() => {
            setSelectedFeature(null);
            router.setParams({ feature: '' });
          }} 
          className="flex-row items-center mb-6 bg-white self-start px-4 py-2 rounded-full shadow-sm border border-gray-100"
        >
          <Feather name="arrow-left" size={16} color="#111" />
          <Text className="font-bold ml-2">Back to Features</Text>
        </TouchableOpacity>

        {selectedFeature === 'MemeGenerator' ? (
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
              {activeTab === 'Chat' ? 'Paste Chat Snippet or Upload' : 'What\'s on your mind?'}
            </Text>
            <TextInput 
              multiline
              numberOfLines={6}
              maxLength={1000}
              placeholder={activeTab === 'Chat' ? "Me: Hey\nThem: K" : "Type or paste text here..."}
              placeholderTextColor="#8E8E93"
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                if (parsedChat) setParsedChat(null);
              }}
              className="bg-[#F8F9FA] rounded-[16px] p-4 text-[15px] text-[#111] min-h-[120px]"
              textAlignVertical="top"
            />
            {activeTab === 'Chat' && (
              <TouchableOpacity onPress={pickWhatsAppFile} className="mt-4 bg-[#F8F5FF] p-4 rounded-[16px] flex-row items-center justify-center border border-[#5D5FEF]/20">
                <FontAwesome5 name="whatsapp" size={20} color="#25D366" />
                <Text className="font-bold text-[#5D5FEF] ml-2">Upload WhatsApp Export</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {selectedFeature === 'TextToEmoji' && renderToneSelector(TONES_TEXT_TO_EMOJI)}
        {selectedFeature === 'RoastMyChat' && renderToneSelector(TONES_ROAST_MY_CHAT)}
        {selectedFeature === 'MemeGenerator' && renderToneSelector(TONES_MEME_GENERATOR)}
        {selectedFeature === 'RewriteText' && renderToneSelector(TONES_REWRITE_TEXT)}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFBFF' }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-4 pb-4 border-b border-gray-100 mb-4">
        <View className="w-10 h-10" />
        <Text className="text-[24px] font-extrabold text-[#5D5FEF] tracking-tight text-center">Create Magic</Text>
        <Image 
          source={{ uri: user?.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + firstName }} 
          className="w-10 h-10 rounded-full"
        />
      </View>

      {/* Segmented Control */}
      {!selectedFeature && (
        <View className="px-6 mb-6">
          <View className="flex-row bg-[#F8F9FA] rounded-[24px] p-1">
            {(['Chat', 'Image', 'Text'] as const).map((tab) => (
              <TouchableOpacity 
                key={tab}
                onPress={() => handleTabSwitch(tab)}
                className={`flex-1 py-3 items-center justify-center rounded-[20px] ${activeTab === tab ? 'bg-white shadow-sm' : ''}`}
                style={activeTab === tab ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 } : {}}
              >
                <Text className={`font-bold ${activeTab === tab ? 'text-[#111]' : 'text-[#8E8E93]'}`}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Pro Banner (only show when no feature selected) */}
        {!selectedFeature && (
          <View className="px-6 mb-6">
            <View className="bg-[#3D38D9] rounded-[32px] p-6 justify-center">
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-white font-extrabold text-[20px] mb-1">Unlock Pro Vibes</Text>
                  <Text className="text-white/80 text-[14px]">Unlimited generations</Text>
                </View>
                <View className="bg-white px-4 py-2 rounded-full">
                  <Text className="text-[#3D38D9] font-bold text-[14px]">Upgrade</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Feature selection grid */}
        {!selectedFeature && activeTab === 'Chat' && (
          <View className="px-6 flex-row flex-wrap justify-between">
            <TouchableOpacity onPress={() => setSelectedFeature('ChatDetective')} className="w-[48%] bg-white rounded-[24px] p-5 mb-4 shadow-sm items-start" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}>
              <View className="w-12 h-12 bg-[#F8F9FA] rounded-2xl items-center justify-center mb-4">
                <Feather name="search" size={24} color="#5D5FEF" />
              </View>
              <Text className="font-bold text-[#111] text-[16px] mb-1">Chat Detective</Text>
              <Text className="text-[#8E8E93] text-[12px]">Analyze vibes & subtext</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSelectedFeature('RoastMyChat')} className="w-[48%] bg-white rounded-[24px] p-5 mb-4 shadow-sm items-start" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}>
              <View className="w-12 h-12 bg-[#FFF0F3] rounded-2xl items-center justify-center mb-4">
                <FontAwesome5 name="fire" size={24} color="#FF4B72" />
              </View>
              <Text className="font-bold text-[#111] text-[16px] mb-1">Roast My Chat</Text>
              <Text className="text-[#8E8E93] text-[12px]">Zero chill, max damage</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSelectedFeature('VibeCheck')} className="w-full bg-white rounded-[24px] p-5 mb-4 shadow-sm flex-row items-center" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}>
              <View className="w-12 h-12 bg-[#F0FDF4] rounded-2xl items-center justify-center mr-4">
                <Feather name="activity" size={24} color="#22C55E" />
              </View>
              <View>
                <Text className="font-bold text-[#111] text-[16px] mb-1">Vibe Check</Text>
                <Text className="text-[#8E8E93] text-[12px]">Check friendship & drama levels</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {!selectedFeature && activeTab === 'Image' && (
          <View className="px-6 flex-row flex-wrap justify-between">
            <TouchableOpacity onPress={() => setSelectedFeature('MemeGenerator')} className="w-full bg-white rounded-[24px] p-5 mb-4 shadow-sm" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}>
              <View className="flex-row items-center mb-4">
                <View className="w-12 h-12 bg-[#FFFAF0] border border-orange-50 rounded-2xl items-center justify-center mr-4">
                  <Feather name="smile" size={24} color="#FF8C00" />
                </View>
                <View>
                  <Text className="font-bold text-[#111] text-[16px] mb-1">Meme Generator</Text>
                  <Text className="text-[#8E8E93] text-[12px]">Upload pics to make viral memes</Text>
                </View>
              </View>
              <View className="w-full h-32 bg-[#F8F9FA] rounded-2xl items-center justify-center overflow-hidden">
                <Image source={{ uri: 'https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=600&auto=format&fit=crop' }} className="w-full h-full opacity-80" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {!selectedFeature && activeTab === 'Text' && (
          <View className="px-6 flex-row flex-wrap justify-between">
            <TouchableOpacity onPress={() => setSelectedFeature('RewriteText')} className="w-full bg-white rounded-[24px] p-5 mb-4 shadow-sm flex-row items-center" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}>
              <View className="w-12 h-12 bg-[#EFF6FF] rounded-2xl items-center justify-center mr-4">
                <Feather name="edit-3" size={24} color="#3B82F6" />
              </View>
              <View>
                <Text className="font-bold text-[#111] text-[16px] mb-1">Rewrite Text</Text>
                <Text className="text-[#8E8E93] text-[12px]">Change the tone of your message</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setSelectedFeature('TextToEmoji')} className="w-full bg-white rounded-[24px] p-5 mb-4 shadow-sm flex-row items-center" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}>
              <View className="w-12 h-12 bg-[#F5F3FF] rounded-2xl items-center justify-center mr-4">
                <Feather name="type" size={24} color="#8B5CF6" />
              </View>
              <View>
                <Text className="font-bold text-[#111] text-[16px] mb-1">Text → Emoji</Text>
                <Text className="text-[#8E8E93] text-[12px]">Turn boring words into pure vibes</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {selectedFeature && renderInputView()}

      </ScrollView>

      {/* Sticky Initiate Creation Button */}
      {selectedFeature && (
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
      )}

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
