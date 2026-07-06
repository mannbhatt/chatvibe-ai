import { TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface IconButtonProps extends TouchableOpacityProps {
  icon: React.ReactNode;
}

export function IconButton({ icon, className = '', ...props }: IconButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      className={`w-12 h-12 rounded-full bg-[#F2F2F7] items-center justify-center ${className}`}
      {...props}
    >
      {icon}
    </TouchableOpacity>
  );
}
