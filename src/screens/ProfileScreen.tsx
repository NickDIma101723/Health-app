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
import { useNetworkStatus } from '../hooks';

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
    const { user, signOut, isCoach, coachData, checkIsCoach, refreshCoachStatus, switchToCoachMode, switchToClientMode, canBeCoach, currentMode } = useAuth();
  const { isOnline, isInternetReachable } = useNetworkStatus();
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
      
      // Check network status
      if (!isOnline) {
        Alert.alert(
          'No Internet Connection',
          'You need an active internet connection to update your profile picture. Please check your network settings and try again.'
        );
        return;
      }
      
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
        console.log('[ProfileScreen] Selected image:', {
          uri: asset.uri,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
        });
        
        try {
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Upload image to Supabase storage
          console.log('[ProfileScreen] Uploading image to Supabase storage...');
          
          const uploadResult = await uploadMediaToStorage(
            {
              uri: asset.uri,
              type: 'image',
              filename: asset.fileName || `avatar_${Date.now()}.jpg`,
              size: asset.fileSize || 0,
              mimeType: asset.mimeType || 'image/jpeg'
            },
            user.id,
            (progress) => {
              console.log(`[ProfileScreen] Upload progress: ${progress.percentage}%`);
            }
          );

          if (uploadResult.error) {
            throw new Error(`Failed to upload image: ${uploadResult.error}`);
          }

          // Update profile with the permanent storage URL
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: uploadResult.url })
            .eq('user_id', user.id);
          
          if (updateError) {
            // Detect missing column error from Supabase/PostgREST schema cache
            const msg = typeof updateError.message === 'string' ? updateError.message : JSON.stringify(updateError);
            if (msg.includes("Could not find the 'avatar_url' column") || msg.includes('column "avatar_url" does not exist')) {
              console.error('[ProfileScreen] profiles table is missing avatar_url column');
              Alert.alert(
                'Database schema issue',
                'The `profiles` table is missing the `avatar_url` column required to save profile pictures. Run the migration to add the column (see instructions).'
              );
              // Provide developer-friendly console guidance
              console.info('[ProfileScreen] Run this SQL in Supabase SQL editor to fix:');
              console.info("ALTER TABLE profiles ADD COLUMN avatar_url text;");
              throw new Error('Missing avatar_url column in profiles table');
            }
            throw new Error('Failed to update profile: ' + updateError.message);
          }
          
          // Update local state with permanent URL
          setAvatarUrl(uploadResult.url);
          setProfile(prev => ({ ...prev, avatar_url: uploadResult.url }));
          Alert.alert('Success', 'Profile picture updated and saved to cloud storage!');
          
          /* Cloud storage upload (uncomment when buckets are configured)
          console.log('[ProfileScreen] Attempting to upload image to storage...');
          
          // Convert URI to blob
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          
          // Generate a unique filename with proper extension
          let fileExt = 'jpg'; // default
          if (asset.fileName) {
            const parts = asset.fileName.split('.');
            if (parts.length > 1) {
              fileExt = parts[parts.length - 1].toLowerCase();
            }
          } else if (asset.mimeType) {
            // Extract extension from mime type
            const mimeMap: { [key: string]: string } = {
              'image/jpeg': 'jpg',
              'image/jpg': 'jpg',
              'image/png': 'png',
              'image/gif': 'gif',
              'image/webp': 'webp',
            };
            fileExt = mimeMap[asset.mimeType.toLowerCase()] || 'jpg';
          }
          
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `avatars/${user.id}/${fileName}`;
          
          console.log('[ProfileScreen] Uploading to storage path:', filePath);
          
          // Try profile-images bucket
          let bucketName = 'profile-images';
          let uploadError: any = null;
          let uploadData: any = null;
          
          const uploadResult = await supabase.storage
            .from(bucketName)
            .upload(filePath, blob, {
              contentType: asset.mimeType || 'image/jpeg',
              cacheControl: '3600',
              upsert: true,
            });
          
          if (uploadResult.error) {
            console.log('[ProfileScreen] profile-images bucket failed, trying chat-media bucket...');
            bucketName = 'chat-media';
            const fallbackResult = await supabase.storage
              .from(bucketName)
              .upload(filePath, blob, {
                contentType: asset.mimeType || 'image/jpeg',
                cacheControl: '3600',
                upsert: true,
              });
            
            uploadError = fallbackResult.error;
            uploadData = fallbackResult.data;
          } else {
            uploadData = uploadResult.data;
            uploadError = uploadResult.error;
          }
          
          if (uploadError) {
            console.error('[ProfileScreen] Storage upload failed for both buckets:', uploadError);
            throw uploadError;
          }
          
          console.log('[ProfileScreen] Upload successful to bucket:', bucketName);
          
          // Get the public URL
          const { data: urlData } = supabase.storage
            .from(bucketName)
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
          } else {
            throw new Error('Failed to generate public URL');
          }
          */
          
        } catch (uploadError: any) {
          console.error('[ProfileScreen] Error in avatar upload process:', uploadError);
          
          // Check if it's a network error
          if (uploadError.message?.includes('Failed to fetch') || 
              uploadError.message?.includes('Network request failed') ||
              uploadError.message?.includes('ERR_INTERNET_DISCONNECTED')) {
            Alert.alert(
              'Network Error', 
              'Unable to connect to the server. Please check your internet connection and try again.'
            );
          } else {
            Alert.alert(
              'Upload Error', 
              uploadError.message || 'Failed to process image.'
            );
          }
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
      'This will permanently delete your account and ALL of your data including:\n\n• Profile information\n• Activity history\n• Health metrics\n• Messages\n• Goals and progress\n\nThis action CANNOT be undone. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user) return;

              console.log('Starting account deletion for user:', user.id);

              // Step 1: Handle coach-related data if user is a coach
              if (isCoach && coachData) {
                console.log('Deleting coach-related data...');
                
                // Deactivate all client assignments
                await supabase
                  .from('coach_client_assignments')
                  .update({ is_active: false })
                  .eq('coach_id', coachData.id);

                // Delete coach notes
                await supabase
                  .from('coach_notes')
                  .delete()
                  .eq('coach_id', coachData.id);

                // Delete coach record
                await supabase
                  .from('coaches')
                  .delete()
                  .eq('user_id', user.id);
              }

              // Step 2: Delete data that references other tables first (foreign key dependencies)
              console.log('Deleting dependent data...');
              
              // Delete client assignments (user as client)
              await supabase
                .from('coach_client_assignments')
                .delete()
                .eq('client_user_id', user.id);

              // Delete coach notes where user is the client
              await supabase
                .from('coach_notes')
                .delete()
                .eq('client_user_id', user.id);

              // Delete activity logs (depends on activities)
              await supabase
                .from('activity_logs')
                .delete()
                .eq('user_id', user.id);

              // Delete meal ingredients (depends on meals) - do this in two steps
              const { data: userMeals } = await supabase
                .from('meals')
                .select('id')
                .eq('user_id', user.id);
              
              if (userMeals && userMeals.length > 0) {
                const mealIds = userMeals.map(meal => meal.id);
                await supabase
                  .from('meal_ingredients')
                  .delete()
                  .in('meal_id', mealIds);
              }

              // Step 3: Delete main user data tables
              console.log('Deleting main user data...');
              
              const tablesToDelete = [
                'activities',
                'activity_templates', 
                'health_metrics',
                'meals',
                'messages',
                'mindfulness_sessions',
                'mood_logs',
                'notifications',
                'nutrition_goals',
                'user_achievements',
                'user_coaches',
                'user_goals',
                'water_intake',
                'water_logs',
                'weekly_goals'
              ];

              // Delete from each table
              for (const table of tablesToDelete) {
                try {
                  const { error } = await supabase
                    .from(table)
                    .delete()
                    .eq('user_id', user.id);
                  
                  if (error && error.code !== 'PGRST116') { // Ignore "no rows deleted" error
                    console.warn(`Error deleting from ${table}:`, error);
                  }
                } catch (err) {
                  console.warn(`Failed to delete from ${table}:`, err);
                }
              }

              // Handle messages table separately (has sender_id/receiver_id instead of user_id)
              await supabase
                .from('messages')
                .delete()
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

              // Delete profile (should be last since it contains user data)
              const { error: profileDeleteError } = await supabase
                .from('profiles')
                .delete()
                .eq('user_id', user.id);

              if (profileDeleteError) {
                console.error('Error deleting profile:', profileDeleteError);
                throw profileDeleteError;
              }

              // Call the RPC function to delete the user from auth.users table
              const { error: deleteUserError } = await supabase.rpc('delete_user_account');
              
              if (deleteUserError) {
                console.error('Error deleting user account:', deleteUserError);
                // Even if the RPC fails, we've deleted all the app data
                // So just sign out and notify the user
                await signOut();
                Alert.alert(
                  'Partial Deletion',
                  'Your app data has been deleted, but there was an issue removing your login credentials. Please contact support if needed.'
                );
                return;
              }

              // Clear any local storage
              try {
                await AsyncStorage.clear();
              } catch (storageError) {
                console.error('Error clearing storage:', storageError);
              }

              // The user is automatically signed out when their account is deleted
              // So we don't need to call signOut() here

              Alert.alert(
                'Account Deleted', 
                'Your account and all associated data have been permanently deleted.',
                [{ 
                  text: 'OK', 
                  onPress: () => {
                    // Navigate to auth screen
                    onNavigate?.('auth');
                  }
                }]
              );
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
    console.log('[ProfileScreen] handleConvertToCoach called - canBeCoach:', canBeCoach, 'isCoach:', isCoach);
    // Use browser alert for web testing
    if (typeof window !== 'undefined' && window.alert) {
      const confirmed = window.confirm("Are you sure you want to become a health coach? This will unlock coach features while keeping your client access.");
      if (confirmed) {
        console.log('[ProfileScreen] User confirmed becoming coach, showing qualification modal');
        setShowPasswordModal(true);
      }
    } else {
      // Enhanced confirmation dialog with detailed information
      Alert.alert(
        "Become a Health Coach",
        "Are you sure you want to become a health coach? This will unlock coach features while keeping your client access.",
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Yes', 
            style: 'default',
            onPress: () => {
              console.log('[ProfileScreen] User confirmed becoming coach, showing qualification modal');
              setShowPasswordModal(true);
            }
          }
        ],
        { cancelable: true }
      );
    }
  };

  const handleCoachQualificationSubmit = async () => {
    // Check if user has completed their profile enough to be a coach
    if (!profile.full_name || !profile.bio || !profile.fitness_level) {
      Alert.alert(
        'Complete Your Profile First',
        'To become a coach, please complete your profile with:\n• Full name\n• Bio/About section\n• Fitness level\n\nThis helps clients understand your expertise.',
        [{ text: 'OK', onPress: () => setShowPasswordModal(false) }]
      );
      return;
    }

    // Add confirmation before proceeding
    if (typeof window !== 'undefined' && window.confirm) {
      const confirmed = window.confirm('Are you sure you want to become a health coach? This action cannot be undone easily.');
      if (confirmed) {
        // Proceed with coach creation
        setShowPasswordModal(false);
        // ... rest of the function
        try {
          if (!user) {
            if (typeof window !== 'undefined' && window.alert) {
              window.alert('No user found. Please log in again.');
            } else {
              Alert.alert('Error', 'No user found. Please log in again.');
            }
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
              if (typeof window !== 'undefined' && window.alert) {
                window.alert('You are already a coach.');
              } else {
                Alert.alert('Info', 'You are already a coach.');
              }
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

          // Enhanced success experience with creative mode switching
          if (typeof window !== 'undefined' && window.alert) {
            window.alert('🎉 Welcome, Coach! Congratulations! You\'re now a certified health coach. Your coach dashboard is ready.');
            // Refresh the coach status first
            if (refreshCoachStatus) {
              await refreshCoachStatus();
            }
            
            // Add a small delay for the status to update
            setTimeout(() => {
              // Creative coach mode activation
              if (switchToCoachMode) {
                switchToCoachMode();
                
                // Show celebration and navigation
                setTimeout(() => {
                  if (typeof window !== 'undefined' && window.alert) {
                    window.alert('🌟 Coach Mode Activated! You\'re now in Coach Mode! Navigate to your Coach Dashboard to start managing clients.');
                  } else {
                    Alert.alert(
                      '🌟 Coach Mode Activated!',
                      'You\'re now in Coach Mode! Navigate to your Coach Dashboard to start managing clients.',
                      [
                        {
                          text: 'Go to Coach Dashboard',
                          onPress: () => {
                            console.log('Navigate to coach dashboard');
                          }
                        }
                      ]
                    );
                  }
                }, 1000);
              }
            }, 1000);
          } else {
            Alert.alert(
              '🎉 Welcome, Coach!', 
              'Congratulations! You\'re now a certified health coach.\n\nYour coach dashboard is ready. Let\'s switch to coach mode and start helping others!',
              [
                {
                  text: '🚀 Enter Coach Mode',
                  onPress: async () => {
                    // Refresh the coach status first
                    if (refreshCoachStatus) {
                      await refreshCoachStatus();
                    }
                    
                    // Add a small delay for the status to update
                    setTimeout(() => {
                      // Creative coach mode activation
                      if (switchToCoachMode) {
                        switchToCoachMode();
                                
                        // Show celebration and navigation
                        Alert.alert(
                          '🌟 Coach Mode Activated!',
                          'You\'re now in Coach Mode! Navigate to your Coach Dashboard to start managing clients.',
                          [
                            {
                              text: 'Go to Coach Dashboard',
                              onPress: () => {
                                // You can add navigation here if you have it
                                console.log('Navigate to coach dashboard');
                              }
                            }
                          ]
                        );
                      }
                    }, 1000);
                  }
                }
              ],
              { cancelable: false }
            );
          }
        } catch (error) {
          console.error('Error converting to coach:', error);
          if (typeof window !== 'undefined' && window.alert) {
            window.alert('Failed to convert to coach. Please try again.');
          } else {
            Alert.alert('Error', 'Failed to convert to coach. Please try again.');
          }
        }
      }
    } else {
      Alert.alert(
        'Confirm Becoming a Coach',
        'Are you sure you want to become a health coach? This action cannot be undone easily.',
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Yes, Become Coach', 
            style: 'default',
            onPress: async () => {
              setShowPasswordModal(false);

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

                // Enhanced success experience with creative mode switching
                Alert.alert(
                  '🎉 Welcome, Coach!', 
                  'Congratulations! You\'re now a certified health coach.\n\nYour coach dashboard is ready. Let\'s switch to coach mode and start helping others!',
                  [
                    {
                      text: '🚀 Enter Coach Mode',
                      onPress: async () => {
                        // Refresh the coach status first
                        if (refreshCoachStatus) {
                          await refreshCoachStatus();
                        }
                        
                        // Add a small delay for the status to update
                        setTimeout(() => {
                          // Creative coach mode activation
                          if (switchToCoachMode) {
                            switchToCoachMode();
                                    
                            // Show celebration and navigation
                            Alert.alert(
                              '🌟 Coach Mode Activated!',
                              'You\'re now in Coach Mode! Navigate to your Coach Dashboard to start managing clients.',
                              [
                                {
                                  text: 'Go to Coach Dashboard',
                                  onPress: () => {
                                    // You can add navigation here if you have it
                                    console.log('Navigate to coach dashboard');
                                  }
                                }
                              ]
                            );
                          }
                        }, 1000);
                      }
                    }
                  ],
                  { cancelable: false }
                );
              } catch (error) {
                console.error('Error converting to coach:', error);
                Alert.alert('Error', 'Failed to convert to coach. Please try again.');
              }
            }
          }
        ],
        { cancelable: true }
      );
    }
  };  const handleClearInvalidAvatar = async () => {
    if (!user) return;
    
    try {
      console.log('[ProfileScreen] Clearing invalid avatar URL...');
      await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);
      
      // Update local state
      setAvatarUrl(null);
      setProfile(prev => ({ ...prev, avatar_url: null }));
    } catch (error) {
      console.error('[ProfileScreen] Error clearing invalid avatar:', error);
    }
  };

  const handleConvertToClient = async () => {
    // Platform-aware confirmation: window.confirm on web, Alert on native
    const prompt = 'This will remove your coach privileges and unassign all your clients. Are you sure?';

    const runConversion = async () => {
      try {
        if (!user || !coachData) return;

        console.log('[ProfileScreen] Converting to client - unassigning clients for coach:', coachData.id);

        const { error: unassignError } = await supabase
          .from('coach_client_assignments')
          .update({ is_active: false })
          .eq('coach_id', coachData.id)
          .eq('is_active', true);

        if (unassignError) {
          console.error('[ProfileScreen] Error unassigning clients:', unassignError);
          // continue even if unassign fails for some rows
        }

        const { error: deactivateError } = await supabase
          .from('coaches')
          .update({ is_active: false })
          .eq('user_id', user.id);

        if (deactivateError) throw deactivateError;

        // Switch to client mode in AuthContext
        await switchToClientMode();

        // Navigate to home screen as client
        Alert.alert(
          '✅ Switched to Client Focus',
          "You've deactivated coach mode and all clients have been unassigned.\n\nYou can reactivate coach mode anytime from your profile.",
          [
            {
              text: 'Continue as Client',
              onPress: () => onNavigate?.('home'),
            },
          ]
        );
      } catch (error: any) {
        console.error('[ProfileScreen] Error converting to client:', error);
        Alert.alert('Error', error?.message || 'Failed to convert to client. Please try again.');
      }
    };

    if (Platform.OS === 'web') {
      const ok = window.confirm(prompt);
      if (ok) await runConversion();
    } else {
      Alert.alert(
        'Convert to Client',
        prompt,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Convert', style: 'destructive', onPress: () => runConversion() },
        ],
        { cancelable: true }
      );
    }
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

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <MaterialIcons name="wifi-off" size={20} color={colors.textLight} />
          <Text style={styles.offlineBannerText}>
            You're offline. Some features may not work properly.
          </Text>
        </View>
      )}

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
              // Check if the URL is a blob URL (invalid after restart)
              (avatarUrl || profile.avatar_url)?.startsWith('blob:') ? (
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.avatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcons name="person" size={32} color={colors.surface} />
                </LinearGradient>
              ) : (
                <>
                  <Image 
                    source={{ uri: avatarUrl || profile.avatar_url || '' }}
                    style={styles.avatarImage}
                    key={avatarUrl || profile.avatar_url}
                    defaultSource={require('../../assets/default-avatar.png')}
                    onError={(e) => {
                      console.error('[ProfileScreen] Error loading avatar image:', e.nativeEvent.error);
                      // Clear the invalid URL from database
                      handleClearInvalidAvatar();
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
              )
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
                selectionColor={colors.primary}
                underlineColorAndroid="transparent"
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
                  selectionColor={colors.primary}
                  underlineColorAndroid="transparent"
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
                  selectionColor={colors.primary}
                  underlineColorAndroid="transparent"
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
                  selectionColor={colors.primary}
                  underlineColorAndroid="transparent"
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
                selectionColor={colors.primary}
                underlineColorAndroid="transparent"
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
                selectionColor={colors.primary}
                underlineColorAndroid="transparent"
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
                selectionColor={colors.primary}
                underlineColorAndroid="transparent"
              />
            ) : (
              <Text style={styles.formValue}>{profile.goals || 'Not set'}</Text>
            )}
          </View>
        </View>

        {!editing && (
          <View style={styles.dangerZone}>
            <Text style={styles.dangerZoneTitle}>Account Management</Text>
            
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
        animationType="slide"
        onRequestClose={() => {
          setShowPasswordModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.coachQualificationModal]}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="school" size={32} color={colors.primary} />
              <Text style={styles.modalTitle}>Coach Qualification</Text>
            </View>
            
            <ScrollView style={styles.qualificationContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDescription}>
                Ready to inspire others? Let's make sure you're set up for success as a health coach.
              </Text>

              <View style={styles.requirementsList}>
                <View style={styles.requirementItem}>
                  <MaterialIcons 
                    name={profile.full_name ? "check-circle" : "radio-button-unchecked"} 
                    size={20} 
                    color={profile.full_name ? colors.success : colors.textSecondary} 
                  />
                  <Text style={[styles.requirementText, profile.full_name && styles.requirementCompleted]}>
                    Complete your full name
                  </Text>
                </View>
                
                <View style={styles.requirementItem}>
                  <MaterialIcons 
                    name={profile.bio ? "check-circle" : "radio-button-unchecked"} 
                    size={20} 
                    color={profile.bio ? colors.success : colors.textSecondary} 
                  />
                  <Text style={[styles.requirementText, profile.bio && styles.requirementCompleted]}>
                    Write your bio/about section
                  </Text>
                </View>
                
                <View style={styles.requirementItem}>
                  <MaterialIcons 
                    name={profile.fitness_level ? "check-circle" : "radio-button-unchecked"} 
                    size={20} 
                    color={profile.fitness_level ? colors.success : colors.textSecondary} 
                  />
                  <Text style={[styles.requirementText, profile.fitness_level && styles.requirementCompleted]}>
                    Set your fitness level
                  </Text>
                </View>
              </View>

              <View style={styles.coachAgreement}>
                <Text style={styles.agreementTitle}>Coach Responsibilities:</Text>
                <Text style={styles.agreementText}>
                  • Provide supportive and professional guidance{'\n'}
                  • Respect client privacy and boundaries{'\n'}
                  • Maintain regular communication with clients{'\n'}
                  • Stay updated with health and fitness best practices
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Not Ready</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.modalConfirmButton,
                  (!profile.full_name || !profile.bio || !profile.fitness_level) && styles.modalButtonDisabled
                ]}
                onPress={handleCoachQualificationSubmit}
                disabled={!profile.full_name || !profile.bio || !profile.fitness_level}
              >
                <Text style={[
                  styles.modalConfirmButtonText,
                  (!profile.full_name || !profile.bio || !profile.fitness_level) && styles.modalButtonTextDisabled
                ]}>
                  I'm Qualified! 🚀
                </Text>
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
  offlineBanner: {
    backgroundColor: colors.error,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  offlineBannerText: {
    color: colors.textLight,
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
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
  coachSignupButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  coachButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
  },
  coachSignupButtonText: {
    color: colors.textLight,
    fontSize: fontSizes.md,
    fontWeight: '700',
    marginLeft: spacing.sm,
    flex: 1,
  },
  coachQualificationModal: {
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  qualificationContent: {
    maxHeight: 300,
  },
  requirementsList: {
    marginVertical: spacing.lg,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  requirementText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  requirementCompleted: {
    color: colors.success,
    fontWeight: '600',
  },
  coachAgreement: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  agreementTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  agreementText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modalButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
  modalButtonTextDisabled: {
    color: colors.textLight,
    opacity: 0.7,
  },
});
