import { View, Text, ViewProps } from 'react-native';

interface ChipProps extends ViewProps {
  label: string;
  isActive?: boolean;
}

export function Chip({ label, isActive = false, className = '', ...props }: ChipProps) {
  return (
    <View
      className={`rounded-full px-4 py-2 self-start ${isActive ? 'bg-[#8A2BE2]' : 'bg-[#E5E5EA]'} ${className}`}
      {...props}
    >
      <Text className={`font-medium ${isActive ? 'text-white' : 'text-[#8E8E93]'}`}>
        {label}
      </Text>
    </View>
  );
}
