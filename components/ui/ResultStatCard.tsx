import { View, Text, ViewProps } from 'react-native';
import { Card } from './Card';

interface ResultStatCardProps extends ViewProps {
  title: string;
  value: string;
  subtitle?: string;
}

export function ResultStatCard({ title, value, subtitle, className = '', ...props }: ResultStatCardProps) {
  return (
    <Card className={`items-center justify-center py-6 ${className}`} {...props}>
      <Text className="text-[#8E8E93] text-sm font-medium uppercase mb-1">{title}</Text>
      <Text className="text-[#1C1C1E] text-3xl font-extrabold">{value}</Text>
      {subtitle && <Text className="text-[#8A2BE2] text-xs mt-1 font-semibold">{subtitle}</Text>}
    </Card>
  );
}
