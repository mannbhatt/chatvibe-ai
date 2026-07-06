import { TouchableOpacity, Text, TouchableOpacityProps } from 'react-native';

interface PrimaryButtonProps extends TouchableOpacityProps {
  label: string;
}

export function PrimaryButton({ label, className = '', ...props }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      className={`bg-[#8A2BE2] rounded-[16px] py-4 px-6 items-center justify-center ${className}`}
      {...props}
    >
      <Text className="text-white font-bold text-lg">{label}</Text>
    </TouchableOpacity>
  );
}
