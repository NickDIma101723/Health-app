import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import './global.css';

export default function App() {
  return (
    <View className="flex-1 justify-center items-center bg-blue-100">
      <Text className="text-4xl font-bold text-blue-800 mb-4">Hello World!</Text>
      <Text className="text-lg text-gray-600">Welcome to your Health App</Text>
      <StatusBar style="auto" />
    </View>
  );
}
