import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen() {
  const { signIn, signUp, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        Alert.alert('Error', error.message);
      } else if (isSignUp) {
        Alert.alert('Success', 'Account created! Please check your email to verify your account.');
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  return (
    <View className="flex-1 justify-center p-6 bg-gray-50">
      <View className="bg-white p-6 rounded-lg shadow-sm">
        <Text className="text-2xl font-bold text-center mb-6">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </Text>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            className="border border-gray-300 p-3 rounded-lg"
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 mb-1">Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            className="border border-gray-300 p-3 rounded-lg"
            placeholder="Enter your password"
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          onPress={handleAuth}
          disabled={loading}
          className={`p-3 rounded-lg mb-4 ${loading ? 'bg-gray-400' : 'bg-blue-500'}`}
        >
          <Text className="text-white font-semibold text-center">
            {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsSignUp(!isSignUp)}
          className="p-2"
        >
          <Text className="text-blue-500 text-center">
            {isSignUp 
              ? 'Already have an account? Sign In' 
              : "Don't have an account? Create One"
            }
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}