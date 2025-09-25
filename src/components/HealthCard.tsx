import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface HealthCardProps {
  title: string;
  value: string;
  unit: string;
  color?: string;
}

export const HealthCard: React.FC<HealthCardProps> = ({ 
  title, 
  value, 
  unit, 
  color = 'blue' 
}) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  return (
    <TouchableOpacity className="bg-white p-6 rounded-xl shadow-md m-2 min-w-[150px]">
      <View className={`w-12 h-12 rounded-full ${colorClasses[color as keyof typeof colorClasses]} items-center justify-center mb-3`}>
        <Text className="text-white font-bold text-lg">💗</Text>
      </View>
      <Text className="text-gray-600 text-sm mb-1">{title}</Text>
      <Text className="text-2xl font-bold text-gray-800 mb-1">{value}</Text>
      <Text className="text-gray-500 text-xs">{unit}</Text>
    </TouchableOpacity>
  );
};