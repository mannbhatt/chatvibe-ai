import { View, Text, ActivityIndicator } from 'react-native';

interface LoadingMascotProps {
  message?: string;
}

export function LoadingMascot({ message = 'Finding the drama...' }: LoadingMascotProps) {
  return (
    <View className="items-center justify-center py-10">
      <View className="w-24 h-24 bg-[#E6F4FE] rounded-full items-center justify-center mb-4">
        <ActivityIndicator size="large" color="#8A2BE2" />
      </View>
      <Text className="text-[#8E8E93] font-medium text-lg text-center px-4 animate-pulse">
        {message}
      </Text>
    </View>
  );
}
