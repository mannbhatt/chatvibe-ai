import { View, Text, ViewProps } from 'react-native';

interface ChatBubbleProps extends ViewProps {
  message: string;
  isSender?: boolean;
}

export function ChatBubble({ message, isSender = false, className = '', ...props }: ChatBubbleProps) {
  return (
    <View
      className={`max-w-[80%] rounded-[18px] p-4 my-1 ${
        isSender 
          ? 'bg-[#8A2BE2] rounded-br-[4px] self-end' 
          : 'bg-[#E5E5EA] rounded-bl-[4px] self-start'
      } ${className}`}
      {...props}
    >
      <Text className={`text-base ${isSender ? 'text-white' : 'text-[#1C1C1E]'}`}>
        {message}
      </Text>
    </View>
  );
}
