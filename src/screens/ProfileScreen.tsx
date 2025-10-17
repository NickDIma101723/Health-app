import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomNavigation, BackgroundDecorations, CoachBottomNavigation } from '../components';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { pickImageFromGallery, uploadMediaToStorage } from '../lib/mediaUpload';

interface ProfileScreenProps {
  onNavigate?: (screen: string) => void;
}

interface UserProfile {
  full_name: string;
  age: number | null;
  height: number | null;
  weight: number | null;
  gender: string;
  phone: string;
  bio: string;
  fitness_level: string;
  goals: string;
  avatar_url?: string | null;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate }) => {
  const { user, signOut, isCoach, coachData, checkIsCoach } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    age: null,
    height: null,
    weight: null,
    gender: 'prefer-not-to-say',
    phone: '',
    bio: '',
    fitness_level: 'beginner',
    goals: '',
  });

  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user, coachData]);

  const loadProfile = async () => {
    if (!user) return;

    console.log('[ProfileScreen] loadProfile called - isCoach:', isCoach, 'coachData:', coachData);

    try {
      setLoading(true);
      
      if (isCoach && coachData) {
        console.log('[ProfileScreen] Loading coach profile from coachData:', coachData);
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('[ProfileScreen] Error loading coach profile data:', profileError);
        }

        const combinedProfile: UserProfile = {
          full_name: coachData.full_name || '',
          age: profileData?.age || null,
          height: profileData?.height || null,
          weight: profileData?.weight || null,
          gender: profileData?.gender || 'prefer-not-to-say',
          phone: profileData?.phone || '',
          bio: coachData.bio || '',
          fitness_level: coachData.specialization || 'advanced',
          goals: profileData?.goals || '',
          avatar_url: profileData?.avatar_url || null,
        };
        
        console.log('[ProfileScreen] Setting combined coach profile to:', combinedProfile);
        setProfile(combinedProfile);
        setEditedProfile(combinedProfile);
        setAvatarUrl(profileData?.avatar_url || null);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const profileData: UserProfile = {
          full_name: data.full_name || '',
          age: data.age,
          height: data.height,
          weight: data.weight,
          gender: data.gender || 'prefer-not-to-say',
          phone: data.phone || '',
          bio: data.bio || '',
          fitness_level: data.fitness_level || 'beginner',
          goals: data.goals || '',
          avatar_url: data.avatar_url || null,
        };
        setProfile(profileData);
        setEditedProfile(profileData);
        setAvatarUrl(data.avatar_url || null);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      console.log('[ProfileScreen] Starting avatar pick...');
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[ProfileScreen] Permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      console.log('[ProfileScreen] Image picker result:', JSON.stringify(result, null, 2));
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingAvatar(true);
        const asset = result.assets[0];
        console.log('[ProfileScreen] Selected image URI:', asset.uri);
        
        try {
          // Try uploading the image to Supabase storage first
          if (user) {
            console.log('[ProfileScreen] Attempting to upload image to storage...');
            
            // Convert URI to blob
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            
            // Generate a unique filename
            const fileExt = asset.uri.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `avatars/${user.id}/${fileName}`;
            
            console.log('[ProfileScreen] Uploading to storage path:', filePath);
            
            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
              .from('profile-images')
              .upload(filePath, blob);
              
            if (error) {
              console.error('[ProfileScreen] Storage upload error:', error);
              throw new Error('Failed to upload image to storage');
            }
            
            console.log('[ProfileScreen] Upload successful:', data);
            
            // Get the public URL
            const { data: urlData } = supabase.storage
              .from('profile-images')
              .getPublicUrl(filePath);
              
            if (urlData && urlData.publicUrl) {
              console.log('[ProfileScreen] Public URL:', urlData.publicUrl);
              
              // Update profile with public URL
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: urlData.publicUrl })
                .eq('user_id', user.id);
              
              if (updateError) {
                console.error('[ProfileScreen] Profile update error:', updateError);
                throw new Error('Failed to update profile with image URL');
              }
              
              // Update local state with public URL
              setAvatarUrl(urlData.publicUrl);
              setProfile(prev => ({ ...prev, avatar_url: urlData.publicUrl }));
              Alert.alert('Success', 'Profile picture updated!');
              return;
            }
          }
          
          // Fallback to using the local URI if the upload fails
          console.log('[ProfileScreen] Using local URI as fallback');
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: asset.uri })
            .eq('user_id', user?.id);
          
          if (updateError) {
            throw new Error('Failed to update profile: ' + updateError.message);
          }
          
          // Update local state
          setAvatarUrl(asset.uri);
          setProfile(prev => ({ ...prev, avatar_url: asset.uri }));
          Alert.alert('Success', 'Profile picture updated (local storage)');
          
        } catch (uploadError: any) {
          console.error('[ProfileScreen] Error in avatar upload process:', uploadError);
          Alert.alert('Upload Error', uploadError.message || 'Failed to process image');
        }
      }
    } catch (error: any) {
      console.error('[ProfileScreen] Error picking avatar:', error);
      Alert.alert('Error', error.message || 'Failed to pick image');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    console.log('[ProfileScreen] Saving profile...', {
      isCoach,
      coachData: coachData?.id,
      editedProfile
    });

    try {
      if (isCoach && coachData) {
        console.log('[ProfileScreen] Updating coach profile...');
        
        const coachUpdateData = {
          full_name: editedProfile.full_name,
          bio: editedProfile.bio,
          specialization: editedProfile.fitness_level,
          updated_at: new Date().toISOString(),
        };
        console.log('[ProfileScreen] Coach update data:', coachUpdateData);

        const { data: coachData, error: coachError } = await supabase
          .from('coaches')
          .update(coachUpdateData)
          .eq('user_id', user.id)
          .select();

        console.log('[ProfileScreen] Coach table update result:', { data: coachData, error: coachError });

        if (coachError) throw coachError;

        console.log('[ProfileScreen] Also updating coach personal info in profiles table...');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            full_name: editedProfile.full_name,
            age: editedProfile.age,
            height: editedProfile.height,
            weight: editedProfile.weight,
            gender: editedProfile.gender,
            phone: editedProfile.phone,
            bio: editedProfile.bio,
            fitness_level: editedProfile.fitness_level,
            goals: editedProfile.goals,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          })
          .select();

        console.log('[ProfileScreen] Profiles table update result:', { data: profileData, error: profileError });

        if (profileError) throw profileError;
      } else {
        console.log('[ProfileScreen] Updating client profile...');
        const { data, error } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            full_name: editedProfile.full_name,
            age: editedProfile.age,
            height: editedProfile.height,
            weight: editedProfile.weight,
            gender: editedProfile.gender,
            phone: editedProfile.phone,
            bio: editedProfile.bio,
            fitness_level: editedProfile.fitness_level,
            goals: editedProfile.goals,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          })
          .select();

        console.log('[ProfileScreen] Client update result:', { data, error });

        if (error) throw error;
      }

      setProfile(editedProfile);
      setEditing(false);
      
      if (isCoach && checkIsCoach) {
        console.log('[ProfileScreen] Refreshing coach data in AuthContext...');
        await checkIsCoach();
      }
      
      console.log('[ProfileScreen] ✅ Profile saved successfully');
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('[ProfileScreen] ❌ Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to save profile: ${errorMessage}`);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setEditing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user) return;

              if (isCoach && coachData) {
                await supabase
                  .from('coach_client_assignments')
                  .update({ is_active: false })
                  .eq('coach_id', coachData.id);

                await supabase
                  .from('coach_notes')
                  .delete()
                  .eq('coach_id', coachData.id);

                await supabase
                  .from('coaches')
                  .delete()
                  .eq('user_id', user.id);
              }

              await supabase
                .from('coach_client_assignments')
                .delete()
                .eq('client_user_id', user.id);

              await supabase
                .from('coach_notes')
                .delete()
                .eq('client_user_id', user.id);

              await supabase
                .from('activities')
                .delete()
                .eq('user_id', user.id);

              await supabase
                .from('activity_logs')
                .delete()
                .eq('user_id', user.id);

              await supabase
                .from('activity_templates')
                .delete()
                .eq('user_id', user.id);

              await supabase
                .from('health_metrics')
                .delete()
                .eq('user_id', user.id);

              await supabase
                .from('meals')
                .delete()
                .eq('user_id', user.id);

              await supabase
                .from('messages')
                .delete()
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

              await supabase
                .from('mindfulness_sessions')
                .delete()
                .eq('user_id', user.id);

              await supabase
                .from('mood_logs')
                .delete()
                .eq('user_id', user.id);

              await supabase
                .from('notifications')
                .delete()
                .eq('user_id', user.id);

              await supabase
                .from('nutrition_goals')
                .delete()
                .eq('user_id', user.id);

              await supabase
                .from('user_achievements')
                .delete()
                .eq('user_id', user.id);

              await supabase
                .from('user_coaches')
                .delete()
                .eq('user_id', user.id);

              await supabase
                .from('user_goals')
                .delete()
                .eq('user_id', user.id);

              await supabase
                .from('water_intake')
                .delete()
                .eq('user_id', user.id);

              await supabase
                .from('water_logs')
                .delete()
                .eq('user_id', user.id);

              await supabase
                .from('weekly_goals')
                .delete()
                .eq('user_id', user.id);

              await supabase
                .from('profiles')
                .delete()
                .eq('user_id', user.id);

              const { error: deleteError } = await supabase.rpc('delete_user');
              
              if (deleteError) {
                console.error('RPC delete_user error:', deleteError);
                throw deleteError;
              }

              await signOut();
              Alert.alert('Success', 'Your account has been deleted');
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account. Please contact support.');
            }
          }
        },
      ]
    );
  };

  const handleConvertToCoach = () => {
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    if (!adminPassword || adminPassword !== 'BingBong') {
      Alert.alert('Error', 'Incorrect admin password');
      setAdminPassword('');
      return;
    }

    setShowPasswordModal(false);
    setAdminPassword('');

    try {
      if (!user) {
        Alert.alert('Error', 'No user found. Please log in again.');
        return;
      }

      const { data: existingCoach, error: checkError } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingCoach) {
        if (existingCoach.is_active) {
          Alert.alert('Info', 'You are already a coach.');
          return;
        }

        const { error: updateError } = await supabase
          .from('coaches')
          .update({ is_active: true })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('coaches')
          .insert({
            user_id: user.id,
            full_name: profile.full_name,
            email: user.email || '',
            specialization: profile.fitness_level,
            bio: profile.bio,
            is_active: true,
          });

        if (insertError) throw insertError;
      }

      Alert.alert('Success', 'Your account has been converted to a coach account. Please re-login.');
      await signOut();
    } catch (error) {
      console.error('Error converting to coach:', error);
      Alert.alert('Error', 'Failed to convert to coach. Please try again.');
    }
  };

  const handleConvertToClient = async () => {
    Alert.alert(
      'Convert to Client',
      'This will remove your coach privileges and unassign all your clients. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user || !coachData) return;

              const { error: unassignError } = await supabase
                .from('coach_client_assignments')
                .update({ is_active: false })
                .eq('coach_id', coachData.id)
                .eq('is_active', true);

              if (unassignError) {
                console.error('Error unassigning clients:', unassignError);
              }

              const { error: deactivateError } = await supabase
                .from('coaches')
                .update({ is_active: false })
                .eq('user_id', user.id);

              if (deactivateError) throw deactivateError;

              Alert.alert('Success', 'Your account has been converted to a client account. All clients have been unassigned. Please re-login.');
              await signOut();
            } catch (error) {
              console.error('Error converting to client:', error);
              Alert.alert('Error', 'Failed to convert to client. Please try again.');
            }
          }
        },
      ]
    );
  };

  const calculateBMI = () => {
    if (profile.height && profile.weight) {
      const heightInMeters = profile.height / 100;
      const bmi = profile.weight / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return null;
  };

  const bmi = calculateBMI();

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate?.(isCoach ? 'coach-dashboard' : 'home')}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        {!editing ? (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setEditing(true)}
          >
            <MaterialIcons name="edit" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <MaterialIcons name="check" size={24} color={colors.success} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            onPress={handlePickAvatar}
            style={styles.avatarContainer}
            disabled={uploadingAvatar}
          >
            {avatarUrl || profile.avatar_url ? (
              <>
                <Image 
                  source={{ uri: avatarUrl || profile.avatar_url || '' }}
                  style={styles.avatarImage}
                  key={avatarUrl || profile.avatar_url}
                  defaultSource={require('../../assets/default-avatar.png')}
                  onError={(e) => {
                    console.error('[ProfileScreen] Error loading avatar image:', e.nativeEvent.error);
                    // If image fails to load, show fallback
                    if (avatarUrl === profile.avatar_url) {
                      // Both are the same and failed, show gradient
                      setAvatarUrl(null);
                      setProfile(prev => ({ ...prev, avatar_url: null }));
                    } else if (avatarUrl) {
                      // Try fallback to profile.avatar_url
                      setAvatarUrl(profile.avatar_url || null);
                    } else {
                      // Clear failed profile.avatar_url
                      setProfile(prev => ({ ...prev, avatar_url: null }));
                    }
                  }}
                />
                {uploadingAvatar && (
                  <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    borderRadius: 50,
                  }}>
                    <ActivityIndicator size="large" color={colors.textLight} />
                  </View>
                )}
              </>
            ) : (
              <LinearGradient
                colors={[colors.primary, colors.primaryLight] as [string, string, ...string[]]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.avatarEditBadge}>
              {uploadingAvatar ? (
                <MaterialIcons name="hourglass-empty" size={16} color={colors.textLight} />
              ) : (
                <MaterialIcons name="camera-alt" size={16} color={colors.textLight} />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {!editing && (
          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{profile.age || '--'}</Text>
              <Text style={styles.statLabel}>Age</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{profile.height || '--'}</Text>
              <Text style={styles.statLabel}>Height (cm)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{profile.weight || '--'}</Text>
              <Text style={styles.statLabel}>Weight (kg)</Text>
            </View>
            {bmi && (
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{bmi}</Text>
                <Text style={styles.statLabel}>BMI</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.formSection}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Full Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.full_name}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, full_name: text })}
                placeholder="Enter your name"
              />
            ) : (
              <Text style={styles.formValue}>{profile.full_name || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.formLabel}>Age</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={editedProfile.age?.toString() || ''}
                  onChangeText={(text) => setEditedProfile({ ...editedProfile, age: parseInt(text) || null })}
                  placeholder="Age"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.formValue}>{profile.age || 'Not set'}</Text>
              )}
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Gender</Text>
              {editing ? (
                <View style={styles.genderButtons}>
                  {['male', 'female', 'prefer-not-to-say'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderButton,
                        editedProfile.gender === g && styles.genderButtonActive
                      ]}
                      onPress={() => setEditedProfile({ ...editedProfile, gender: g })}
                    >
                      <Text style={[
                        styles.genderButtonText,
                        editedProfile.gender === g && styles.genderButtonTextActive
                      ]}>
                        {g === 'male' ? 'M' : g === 'female' ? 'F' : 'N/A'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.formValue}>
                  {profile.gender === 'male' ? 'Male' : profile.gender === 'female' ? 'Female' : 'Prefer not to say'}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.formLabel}>Height (cm)</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={editedProfile.height?.toString() || ''}
                  onChangeText={(text) => setEditedProfile({ ...editedProfile, height: parseInt(text) || null })}
                  placeholder="Height"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.formValue}>{profile.height || 'Not set'}</Text>
              )}
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Weight (kg)</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={editedProfile.weight?.toString() || ''}
                  onChangeText={(text) => setEditedProfile({ ...editedProfile, weight: parseInt(text) || null })}
                  placeholder="Weight"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.formValue}>{profile.weight || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Phone</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.phone}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, phone: text })}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.formValue}>{profile.phone || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Fitness Level</Text>
            {editing ? (
              <View style={styles.fitnessLevelButtons}>
                {['beginner', 'intermediate', 'advanced'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.fitnessLevelButton,
                      editedProfile.fitness_level === level && styles.fitnessLevelButtonActive
                    ]}
                    onPress={() => setEditedProfile({ ...editedProfile, fitness_level: level })}
                  >
                    <Text style={[
                      styles.fitnessLevelButtonText,
                      editedProfile.fitness_level === level && styles.fitnessLevelButtonTextActive
                    ]}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.formValue}>
                {profile.fitness_level.charAt(0).toUpperCase() + profile.fitness_level.slice(1)}
              </Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Bio</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editedProfile.bio}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, bio: text })}
                placeholder="Tell us about yourself"
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={styles.formValue}>{profile.bio || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Fitness Goals</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editedProfile.goals}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, goals: text })}
                placeholder="What are your fitness goals?"
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={styles.formValue}>{profile.goals || 'Not set'}</Text>
            )}
          </View>
        </View>

        {!editing && (
          <View style={styles.dangerZone}>
            <Text style={styles.dangerZoneTitle}>Account Management</Text>
            
            {!isCoach && (
              <TouchableOpacity style={styles.convertButton} onPress={handleConvertToCoach}>
                <MaterialIcons name="upgrade" size={20} color={colors.primary} />
                <Text style={styles.convertButtonText}>Become a Coach</Text>
              </TouchableOpacity>
            )}

            {isCoach && (
              <TouchableOpacity style={styles.convertButton} onPress={handleConvertToClient}>
                <MaterialIcons name="person" size={20} color={colors.warning} />
                <Text style={styles.convertButtonText}>Convert to Client Account</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <MaterialIcons name="logout" size={20} color={colors.error} />
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
              <MaterialIcons name="delete-forever" size={20} color={colors.textLight} />
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {isCoach ? (
        <CoachBottomNavigation activeTab="profile" onTabChange={onNavigate} />
      ) : (
        <BottomNavigation activeTab="home" onTabChange={onNavigate} />
      )}

      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowPasswordModal(false);
          setAdminPassword('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Become a Coach</Text>
            <Text style={styles.modalDescription}>
              Enter admin password to convert your account:
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={adminPassword}
              onChangeText={setAdminPassword}
              placeholder="Admin Password"
              secureTextEntry
              autoFocus
              onSubmitEditing={handlePasswordSubmit}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setAdminPassword('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handlePasswordSubmit}
              >
                <Text style={styles.modalConfirmButtonText}>Convert</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 140,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  avatarHint: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    marginTop: spacing.xs,
  },
  avatarText: {
    fontSize: 40,
    fontFamily: 'Poppins_700Bold',
    color: colors.textLight,
  },
  email: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginHorizontal: 2,
    marginBottom: spacing.xs,
    ...shadows.sm,
  },
  statValue: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  formSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  formValue: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  genderButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  genderButton: {
    flex: 1,
    minWidth: 50,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  genderButtonTextActive: {
    color: colors.textLight,
  },
  fitnessLevelButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  fitnessLevelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitnessLevelButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  fitnessLevelButtonText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fitnessLevelButtonTextActive: {
    color: colors.textLight,
  },
  dangerZone: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  dangerZoneTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  convertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  convertButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  logoutButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.error,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  deleteButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.md,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_400Regular',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_400Regular',
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  modalConfirmButton: {
    backgroundColor: colors.primary,
  },
  modalConfirmButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textLight,
  },
});
