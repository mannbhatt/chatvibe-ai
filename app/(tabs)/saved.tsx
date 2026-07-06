import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert, Modal, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

type Folder = {
  id: string;
  name: string;
};

type SavedResult = {
  id: string;
  folder_id: string | null;
  generations: {
    id: string;
    feature_type: string;
    output_data: any;
    style_mode: string;
    created_at: string;
  };
};

export default function SavedScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0] || 'There';

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const [isFolderModalVisible, setFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const fetchSavedData = async () => {
    if (!user) return;
    
    try {
      setError(null);
      // 1. Fetch Folders
      const { data: folderData, error: folderError } = await supabase
        .from('folders')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (folderError) throw folderError;
      if (folderData) setFolders(folderData);

      // 2. Fetch Saved Results with generations data
      const { data: resultsData, error: resultsError } = await supabase
        .from('saved_results')
        .select(`
          id,
          folder_id,
          generations (
            id, feature_type, output_data, style_mode, created_at
          )
        `)
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });
      
      if (resultsError) throw resultsError;
      if (resultsData) setSavedResults(resultsData as any);

    } catch (error) {
      console.error('Error fetching saved data:', error);
      setError('Failed to load your vault. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSavedData();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSavedData();
  }, [user]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !user) return;
    
    try {
      const { data, error } = await supabase
        .from('folders')
        .insert({ user_id: user.id, name: newFolderName.trim() })
        .select()
        .single();
        
      if (error) throw error;
      
      setFolders([data, ...folders]);
      setNewFolderName('');
      setFolderModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', 'Could not create folder');
    }
  };

  const filteredResults = activeFolderId 
    ? savedResults.filter(r => r.folder_id === activeFolderId)
    : savedResults;

  const renderSavedItem = (item: SavedResult) => {
    const gen = item.generations;
    if (!gen) return null;

    let content = null;
    let title = '';

    if (gen.feature_type === 'text_to_emoji') {
      title = 'Emoji Translation';
      content = <Text className="text-[32px] text-center mt-2">{gen.output_data.emoji}</Text>;
    } else if (gen.feature_type === 'chat_detective') {
      title = 'Chat Analysis';
      content = <Text className="text-[14px] text-[#111] font-medium leading-5 mt-2" numberOfLines={4}>{gen.output_data.aiSummary}</Text>;
    } else if (gen.feature_type === 'roast_my_chat') {
      title = 'Chat Roast';
      content = <Text className="text-[14px] text-[#111] font-medium leading-5 mt-2" numberOfLines={4}>{gen.output_data.overallVibe}</Text>;
    } else if (gen.feature_type === 'meme_generator') {
      title = 'Meme';
      content = <Text className="text-[14px] text-[#111] font-medium leading-5 mt-2 font-bold text-center italic" numberOfLines={3}>"{gen.output_data.captions?.[0]}"</Text>;
    } else if (gen.feature_type === 'rewrite_text') {
      title = 'Rewritten Text';
      content = <Text className="text-[14px] text-[#111] font-medium leading-5 mt-2" numberOfLines={4}>{gen.output_data.rewrittenText}</Text>;
    } else if (gen.feature_type === 'vibe_check') {
      title = 'Vibe Check';
      content = <Text className="text-[14px] text-[#111] font-medium leading-5 mt-2" numberOfLines={4}>{gen.output_data.summary}</Text>;
    }

    return (
      <TouchableOpacity 
        key={item.id} 
        className="w-[48%] bg-white rounded-2xl p-4 mb-4 border border-gray-50 shadow-sm"
        onPress={() => {
           // Basic routing back to result screen for preview (assuming result screens accept resultData param)
           let path = '/result';
           if (gen.feature_type === 'chat_detective') path = '/results/chat-detective';
           else if (gen.feature_type === 'roast_my_chat') path = '/results/roast-my-chat';
           else if (gen.feature_type === 'meme_generator') path = '/results/meme-generator';
           else if (gen.feature_type === 'rewrite_text') path = '/results/rewrite-text';
           else if (gen.feature_type === 'vibe_check') path = '/results/vibe-check';
           
           router.push({
             pathname: path as any,
             params: {
               resultData: JSON.stringify(gen.output_data),
               generation_id: gen.id
             }
           });
        }}
      >
        <Text className="text-[#8E8E93] text-[11px] font-bold uppercase tracking-wider">{title}</Text>
        {content}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFBFF' }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-4 pb-4 border-b border-gray-100 mb-4">
        <TouchableOpacity onPress={() => setFolderModalVisible(true)} className="w-10 h-10 bg-[#F8F5FF] rounded-full items-center justify-center">
          <Feather name="folder-plus" size={20} color="#5D5FEF" />
        </TouchableOpacity>
        <Text className="text-[24px] font-extrabold text-[#5D5FEF] tracking-tight text-center">Vault</Text>
        <Image 
          source={{ uri: user?.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + firstName }} 
          className="w-10 h-10 rounded-full"
        />
      </View>

      {/* Folders ScrollView */}
      <View className="mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
          <TouchableOpacity 
            onPress={() => setActiveFolderId(null)}
            className={`mr-3 px-5 py-2.5 rounded-full flex-row items-center border ${activeFolderId === null ? 'bg-[#111] border-[#111]' : 'bg-white border-gray-200'}`}
          >
            <Text className={`font-bold text-[14px] ${activeFolderId === null ? 'text-white' : 'text-[#111]'}`}>All Magic</Text>
          </TouchableOpacity>

          {folders.map(folder => (
            <TouchableOpacity 
              key={folder.id}
              onPress={() => setActiveFolderId(folder.id)}
              className={`mr-3 px-5 py-2.5 rounded-full flex-row items-center border ${activeFolderId === folder.id ? 'bg-[#5D5FEF] border-[#5D5FEF]' : 'bg-white border-gray-200'}`}
            >
              <Feather name="folder" size={14} color={activeFolderId === folder.id ? 'white' : '#8E8E93'} style={{ marginRight: 6 }} />
              <Text className={`font-bold text-[14px] ${activeFolderId === folder.id ? 'text-white' : 'text-[#111]'}`}>{folder.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
          <TouchableOpacity onPress={fetchSavedData} className="bg-[#5D5FEF] px-6 py-2 rounded-full">
            <Text className="text-white font-bold">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredResults}
          keyExtractor={item => item.id}
          renderItem={({ item }) => renderSavedItem(item)}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 24 }}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5D5FEF" />}
          ListEmptyComponent={
            <View className="mt-20 items-center justify-center">
              <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
                <Feather name="inbox" size={32} color="#8E8E93" />
              </View>
              <Text className="font-bold text-[#111] text-[16px] mb-2">Nothing here yet</Text>
              <Text className="text-[#8E8E93] text-[14px] text-center px-8">
                {activeFolderId ? "This folder is empty. Save some magic to see it here." : "When you favorite generations, they will appear here in your Vault."}
              </Text>
            </View>
          }
        />
      )}

      {/* Create Folder Modal */}
      <Modal visible={isFolderModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/40 justify-center items-center p-6">
          <View className="bg-white rounded-3xl w-full p-6 shadow-lg">
            <Text className="text-[20px] font-bold text-[#111] mb-2">New Folder</Text>
            <Text className="text-[14px] text-[#8E8E93] mb-4">Organize your vibes</Text>
            
            <TextInput
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="e.g. Hilarious Roasts"
              className="bg-[#F8F9FA] rounded-2xl p-4 text-[16px] font-medium text-[#111] mb-6"
              autoFocus
            />
            
            <View className="flex-row justify-end">
              <TouchableOpacity onPress={() => setFolderModalVisible(false)} className="px-6 py-3 rounded-full mr-2">
                <Text className="font-bold text-[#8E8E93]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateFolder} className="bg-[#5D5FEF] px-6 py-3 rounded-full shadow-sm">
                <Text className="font-bold text-white">Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
