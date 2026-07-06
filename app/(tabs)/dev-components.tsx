import { ScrollView, View, Text } from 'react-native';
import { Card, PrimaryButton, SecondaryButton, IconButton, Chip, ChatBubble, ResultStatCard, LoadingMascot } from '../../components/ui';

export default function DevComponentsScreen() {
  return (
    <ScrollView className="flex-1 bg-[#F9F9FB] p-4">
      <Text className="text-3xl font-bold text-[#1C1C1E] mb-6 mt-10">UI Sandbox</Text>

      <View className="mb-6">
        <Text className="text-lg font-semibold mb-2">Buttons</Text>
        <PrimaryButton label="Primary Button" className="mb-2" />
        <SecondaryButton label="Secondary Button" className="mb-2" />
        <View className="flex-row gap-2">
          <IconButton icon={<Text className="text-xl">🌟</Text>} />
          <IconButton icon={<Text className="text-xl">🔥</Text>} />
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-lg font-semibold mb-2">Chips</Text>
        <View className="flex-row gap-2">
          <Chip label="Gen Z" isActive />
          <Chip label="Savage" />
          <Chip label="Corporate" />
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-lg font-semibold mb-2">Chat Bubbles</Text>
        <ChatBubble message="Hey, did you see what happened?" isSender={false} />
        <ChatBubble message="OMG YES it was so crazy!!" isSender={true} />
      </View>

      <View className="mb-6">
        <Text className="text-lg font-semibold mb-2">Cards</Text>
        <Card>
          <Text className="font-bold text-lg mb-2">Default Card</Text>
          <Text className="text-[#8E8E93]">Cards have a 24px radius and soft shadow, making them feel premium.</Text>
        </Card>
      </View>

      <View className="mb-6 flex-row justify-between gap-4">
        <ResultStatCard title="Drama" value="99%" className="flex-1" />
        <ResultStatCard title="Vibe" value="Chill" subtitle="mostly" className="flex-1" />
      </View>

      <View className="mb-10">
        <Text className="text-lg font-semibold mb-2">Loading State</Text>
        <LoadingMascot message="Analyzing the vibes..." />
      </View>

    </ScrollView>
  );
}
