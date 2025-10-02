import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useHealthRecords } from '../hooks/useHealthRecords';

export default function HealthDashboard() {
  const { user, signOut } = useAuth();
  const { records, loading, addRecord } = useHealthRecords();
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    height: '',
    heart_rate: '',
    notes: '',
  });

  const handleAddRecord = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to add records');
      return;
    }

    const record = {
      user_id: user.id,
      date: formData.date,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      height: formData.height ? parseFloat(formData.height) : undefined,
      heart_rate: formData.heart_rate ? parseInt(formData.heart_rate) : undefined,
      notes: formData.notes || undefined,
    };

    const { error } = await addRecord(record);
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Success', 'Health record added successfully!');
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        weight: '',
        height: '',
        heart_rate: '',
        notes: '',
      });
    }
  };

  if (!user) {
    return (
      <View className="flex-1 justify-center items-center p-4 bg-gray-50">
        <Text className="text-xl mb-4">Please log in to view your health dashboard</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <View className="mb-6">
        <Text className="text-2xl font-bold mb-2">Health Dashboard</Text>
        <Text className="text-gray-600 mb-4">Welcome, {user.email}</Text>
        <TouchableOpacity
          onPress={signOut}
          className="bg-red-500 p-3 rounded-lg self-start"
        >
          <Text className="text-white font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Add New Record Form */}
      <View className="bg-white p-4 rounded-lg mb-6 shadow-sm">
        <Text className="text-lg font-semibold mb-4">Add Health Record</Text>
        
        <View className="mb-4">
          <Text className="text-gray-700 mb-1">Date</Text>
          <TextInput
            value={formData.date}
            onChangeText={(text) => setFormData({ ...formData, date: text })}
            className="border border-gray-300 p-3 rounded-lg"
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1">Weight (kg)</Text>
          <TextInput
            value={formData.weight}
            onChangeText={(text) => setFormData({ ...formData, weight: text })}
            className="border border-gray-300 p-3 rounded-lg"
            placeholder="70.5"
            keyboardType="numeric"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1">Height (cm)</Text>
          <TextInput
            value={formData.height}
            onChangeText={(text) => setFormData({ ...formData, height: text })}
            className="border border-gray-300 p-3 rounded-lg"
            placeholder="175"
            keyboardType="numeric"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1">Heart Rate (bpm)</Text>
          <TextInput
            value={formData.heart_rate}
            onChangeText={(text) => setFormData({ ...formData, heart_rate: text })}
            className="border border-gray-300 p-3 rounded-lg"
            placeholder="72"
            keyboardType="numeric"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1">Notes</Text>
          <TextInput
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            className="border border-gray-300 p-3 rounded-lg h-20"
            placeholder="Any additional notes..."
            multiline
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          onPress={handleAddRecord}
          className="bg-blue-500 p-3 rounded-lg"
        >
          <Text className="text-white font-semibold text-center">Add Record</Text>
        </TouchableOpacity>
      </View>

      {/* Health Records List */}
      <View className="bg-white p-4 rounded-lg shadow-sm">
        <Text className="text-lg font-semibold mb-4">Your Health Records</Text>
        
        {loading ? (
          <Text className="text-gray-500">Loading...</Text>
        ) : records.length === 0 ? (
          <Text className="text-gray-500">No health records yet. Add your first record above!</Text>
        ) : (
          <View>
            {records.map((record) => (
              <View key={record.id} className="border-b border-gray-200 py-3 last:border-b-0">
                <Text className="font-semibold text-gray-800">{record.date}</Text>
                <View className="mt-1">
                  {record.weight && (
                    <Text className="text-gray-600">Weight: {record.weight} kg</Text>
                  )}
                  {record.height && (
                    <Text className="text-gray-600">Height: {record.height} cm</Text>
                  )}
                  {record.heart_rate && (
                    <Text className="text-gray-600">Heart Rate: {record.heart_rate} bpm</Text>
                  )}
                  {record.notes && (
                    <Text className="text-gray-600 mt-1">Notes: {record.notes}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}