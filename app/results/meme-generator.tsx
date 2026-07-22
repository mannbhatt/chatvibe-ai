import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Share, Alert, ScrollView, Dimensions, Image, LogBox } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library/legacy';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import MemeCanvas from '../../components/MemeCanvas';

LogBox.ignoreLogs(['Method readAsStringAsync imported from "expo-file-system" is deprecated']);

const { width } = Dimensions.get('window');
const CHATVIBE_MEMES_DIR = FileSystem.documentDirectory + 'ChatVibe_Memes/';

export default function MemeGeneratorResultScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { resultData, original_text, generation_id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<any>(() => {
    try {
      return resultData ? JSON.parse(resultData as string) : { captions: [] };
    } catch (e) {
      return { captions: [] };
    }
  });

  const [originalText, setOriginalText] = useState<string>(original_text as string || '');
  const [activeIndex, setActiveIndex] = useState(0);
  const [finalMemeUri, setFinalMemeUri] = useState<string | null>(null);
  
  const viewShotRef = useRef<any>(null);

  useEffect(() => {
    const ensureDirAndCheckLocal = async () => {
      try {
        const dirInfo = await FileSystem.getInfoAsync(CHATVIBE_MEMES_DIR);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(CHATVIBE_MEMES_DIR, { intermediates: true });
        }
        
        if (generation_id) {
          const localUri = `${CHATVIBE_MEMES_DIR}${generation_id}.jpeg`;
          const fileInfo = await FileSystem.getInfoAsync(localUri);
          if (fileInfo.exists) {
            setFinalMemeUri(localUri);
          }
        }
      } catch (e) {
        console.error('Local FS error:', e);
      }
    };

    ensureDirAndCheckLocal();

    if ((!originalText || !data.captions?.length) && generation_id) {
      supabase.from('generations').select('input_data, output_data').eq('id', generation_id).single().then(({ data: genData }) => {
        if (genData) {
          if (!originalText) setOriginalText(genData.input_data);
          if (!data.captions?.length) {
            setData(genData.output_data);
          }
        }
      });
    }
  }, [generation_id, originalText, data]);

  // Background auto-save whenever they stop on a caption
  useEffect(() => {
    if (finalMemeUri || !generation_id) return;
    const timeout = setTimeout(async () => {
      try {
        if (viewShotRef.current?.capture) {
          const uri = await viewShotRef.current.capture();
          const localUri = `${CHATVIBE_MEMES_DIR}${generation_id}.jpeg`;
          if (uri.startsWith('data:image')) {
            const base64Data = uri.split(',')[1];
            await FileSystem.writeAsStringAsync(localUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
          } else if (uri !== localUri && uri.startsWith('file:')) {
            await FileSystem.copyAsync({ from: uri, to: localUri });
          }
        }
      } catch (e) {
        console.log('Background auto-save failed', e);
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [activeIndex, finalMemeUri, generation_id]);

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveIndex(Math.round(index));
  };

  const handleRegenerate = () => {
    router.back();
  };

  const captureMeme = async () => {
    if (viewShotRef.current?.capture) {
      try {
        const uri = await viewShotRef.current.capture();
        return uri;
      } catch (e) {
        console.error('Failed to capture view', e);
        showAlert('Oops!', 'We failed to generate the final meme image.', [], 'error');
        return null;
      }
    }
    return null;
  };

  const handleSaveToGallery = async () => {
    try {
      let uri = finalMemeUri;
      if (!uri) uri = await captureMeme();
      if (!uri) return;

      const localUri = `${CHATVIBE_MEMES_DIR}${generation_id || Date.now()}.jpeg`;
      
      if (uri.startsWith('data:image')) {
        const base64Data = uri.split(',')[1];
        await FileSystem.writeAsStringAsync(localUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
      } else if (uri !== localUri && uri.startsWith('file:')) {
        await FileSystem.copyAsync({ from: uri, to: localUri });
      }
      
      setFinalMemeUri(localUri);

      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
      if (status === 'granted') {
        const asset = await MediaLibrary.createAssetAsync(localUri);
        await MediaLibrary.createAlbumAsync('ChatVibe', asset, false);
        showAlert('Saved!', 'Saved to Gallery ✨', [], 'success');
      } else {
        showAlert('Permission needed', 'Enable gallery access to save to photos.', [], 'error');
      }
    } catch (e: any) {
      console.error(e);
      showAlert('Oops!', 'We hit a snag saving this.', [], 'error');
    }
  };

  const handleShare = async () => {
    try {
      let uri = finalMemeUri;
      if (!uri) uri = await captureMeme();
      if (!uri) return;

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        showAlert('Error sharing', 'Sharing is not available on this device.', [], 'error');
        return;
      }

      let fileUri = uri;
      if (uri.startsWith('data:image')) {
        fileUri = FileSystem.cacheDirectory + 'chatvibe_share.jpeg';
        const base64Data = uri.split(',')[1];
        await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
      }

      await Sharing.shareAsync(fileUri, {
        dialogTitle: 'Share your meme',
        mimeType: 'image/jpeg',
        UTI: 'public.jpeg',
      });
    } catch (error: any) {
      showAlert('Error sharing', 'We couldn\'t open the share menu.', [], 'error');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#cff5e1' }} edges={['left', 'right']}>
      <View className="flex-row justify-between items-center px-6 pb-4" style={{ paddingTop: Math.max(insets.top + 16, 24) }}>
        <TouchableOpacity onPress={handleRegenerate} className="w-12 h-12 bg-white rounded-xl items-center justify-center border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
          <Feather name="arrow-left" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-[20px] font-extrabold text-black tracking-tight">Your Meme</Text>
        <View className="w-12 h-12" />
      </View>

      {!data.captions || data.captions.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Feather name="alert-triangle" size={32} color="black" />
          <Text className="font-extrabold text-black text-[18px] mt-4 mb-2">Generation Failed</Text>
          <Text className="text-black/80 text-[14px] text-center mb-6 font-bold">We couldn't generate meme captions. Please try a different image.</Text>
          <TouchableOpacity onPress={handleRegenerate} className="bg-neo-purple px-6 py-3 rounded-2xl flex-row items-center border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <Feather name="refresh-cw" size={16} color="black" />
            <Text className="text-black font-extrabold ml-2">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 80) }}>
          
          {(finalMemeUri || originalText) && (
            <View className="px-6 mb-8 mt-4">
              <View className="w-full bg-black rounded-[32px] overflow-hidden items-center justify-center border-[4px] border-black" style={{ minHeight: 300, shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0 }}>
                {finalMemeUri ? (
                  <Image source={{ uri: finalMemeUri }} style={{ width: width - 48, height: width - 48, resizeMode: 'contain' }} />
                ) : (
                  originalText && (originalText.toString().startsWith('data:image') || originalText.toString().startsWith('file:')) ? (
                    <MemeCanvas
                      ref={viewShotRef}
                      imageUri={originalText as string}
                      caption={data.captions?.[activeIndex] || ''}
                      width={width - 48}
                    />
                  ) : (
                    <View className="items-center justify-center p-6 z-20">
                      <Feather name="image" size={40} color="white" style={{ marginBottom: 12, opacity: 0.8 }} />
                      <Text className="text-white font-extrabold text-center">Original image not found.</Text>
                    </View>
                  )
                )}
              </View>
            </View>
          )}

          {!finalMemeUri && data.captions && data.captions.length > 0 && (
            <View>
              <Text className="px-6 font-extrabold text-black text-[16px] mb-4 text-center uppercase tracking-wider">Swipe to choose caption</Text>

              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                className="w-full mb-6"
              >
                {data.captions.map((caption: string, idx: number) => (
                  <View key={idx} style={{ width: width, paddingHorizontal: 24, paddingTop: 16 }}>
                    <TouchableOpacity
                      activeOpacity={1}
                      className="bg-white rounded-[32px] p-6 border-[4px] border-black min-h-[120px] justify-center items-center relative"
                      style={{ shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5 }}
                    >
                      <View className="absolute -top-4 bg-neo-orange border-[3px] border-black px-4 py-1 rounded-xl" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
                        <Text className="text-black font-extrabold text-[12px]">Option {idx + 1}</Text>
                      </View>
                      <Text className="text-[20px] text-black font-extrabold text-center leading-8">{caption}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              <View className="flex-row justify-center mb-10">
                {data.captions.map((_: any, idx: number) => (
                  <View key={idx} className={`w-3 h-3 rounded-full mx-1 border-2 border-black ${idx === activeIndex ? 'bg-black w-8' : 'bg-white'}`} />
                ))}
              </View>
            </View>
          )}

          <View className="px-6 flex-row flex-wrap justify-between">
            <TouchableOpacity onPress={handleShare} className="w-[48%] bg-white rounded-2xl p-4 mb-4 items-center justify-center flex-row border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
              <Feather name="share" size={20} color="black" />
              <Text className="font-extrabold text-black ml-2 text-[14px]">Share</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSaveToGallery} className="w-[48%] bg-neo-yellow rounded-2xl p-4 mb-4 items-center justify-center flex-row border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
              <Feather name="save" size={20} color="black" />
              <Text className="font-extrabold text-black ml-2 text-[14px]">Save</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
