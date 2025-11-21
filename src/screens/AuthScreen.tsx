import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        Alert.alert(
          'Success!',
          'Account created! Please check your email to verify your account.',
          [{ text: 'OK', onPress: () => setIsSignUp(false) }]
        );
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send password reset link to ${email}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send Reset Link',
          style: 'default',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'your-app-scheme://reset-password', // Adjust as needed
              });

              if (error) {
                setError(error.message);
              } else {
                Alert.alert('Success!', 'Password reset email sent. Check your email.');
              }
            } catch (error) {
              setError('An unexpected error occurred');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gradient-to-b from-blue-50 to-blue-100"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-center px-6 py-12">
          {/* Header */}
          <View className="items-center mb-10">
            <Text className="text-4xl font-bold text-blue-800 mb-2">
              Health App
            </Text>
            <Text className="text-lg text-gray-600">
              {isSignUp ? 'Create your account' : 'Welcome back!'}
            </Text>
          </View>

          {/* Form */}
          <View className="bg-white rounded-2xl p-6 shadow-lg">
            <Text className="text-2xl font-semibold text-gray-800 mb-6">
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Text>

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Email
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="your.email@example.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(''); // Clear error on typing
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Password
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="Enter your password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError(''); // Clear error on typing
                }}
                secureTextEntry
                editable={!loading}
              />
              {isSignUp && (
                <Text className="text-xs text-gray-500 mt-1">
                  Must be at least 6 characters
                </Text>
              )}
              {error ? (
                <Text className="text-xs text-red-500 mt-1">
                  {error}
                </Text>
              ) : null}
            </View>

            {/* Forgot Password */}
            {!isSignUp && (
              <View className="mb-6">
                <TouchableOpacity 
                  className="bg-gray-100 rounded-lg py-3 px-4" 
                  onPress={handleResetPassword} 
                  disabled={loading}
                >
                  <Text className="text-blue-600 text-sm text-center font-medium">
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              className={`rounded-lg py-4 ${loading ? 'bg-blue-400' : 'bg-blue-600'}`}
              onPress={isSignUp ? handleSignUp : handleResetPassword}
              disabled={loading}
            >
              <Text className="text-white text-center text-lg font-semibold">
                {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Toggle Sign In/Sign Up */}
            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-600">
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              </Text>
              <TouchableOpacity onPress={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }} disabled={loading}>
                <Text className="text-blue-600 font-semibold">
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Test Info */}
          <View className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <Text className="text-sm font-semibold text-yellow-800 mb-1">
              📝 Test Mode
            </Text>
            <Text className="text-xs text-yellow-700">
              You can test the authentication with any email and password (min 6 chars).
              Check your Supabase dashboard to see registered users.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
