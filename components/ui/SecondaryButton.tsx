import { TouchableOpacity, Text, TouchableOpacityProps } from 'react-native';

interface SecondaryButtonProps extends TouchableOpacityProps {
  label: string;
}

export function SecondaryButton({ label, className = '', ...props }: SecondaryButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      className={`bg-[#F2F2F7] rounded-[16px] py-4 px-6 items-center justify-center ${className}`}
      {...props}
    >
      <Text className="text-[#1C1C1E] font-semibold text-lg">{label}</Text>
    </TouchableOpacity>
  );
}
