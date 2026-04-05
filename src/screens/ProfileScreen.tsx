import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SignOut, Trash, GraduationCap, UserSwitch, CaretRight, Check, X, Star, ChatCircleDots, ShieldCheck, ArrowsClockwise, Sparkle, ArrowLeft, PencilSimple, Camera, User, Calendar, GenderIntersex, Ruler, Barbell, Phone, Info, Target, EnvelopeSimple, WifiSlash, Medal } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { pickImageFromGallery, uploadMediaToStorage } from '../lib/mediaUpload';
import { useNetworkStatus } from '../hooks';

const PC = {
  bg: '#F4F6FB',
  card: '#FFFFFF',
  accent: '#FF477E',
  accentSecondary: '#7C3AED',
  accentSoft: 'rgba(124, 58, 237, 0.12)',
  text: '#1A1A24',
  textLight: '#FFFFFF',
  textDim: '#8A8A9D',
  border: '#EAEDF4',
  surfaceMuted: '#F0F1FA',
  danger: '#FF4757',
};

const PF = {
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  regular: 'PlusJakartaSans_400Regular',
} as const;

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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBecomeCoachConfirm, setShowBecomeCoachConfirm] = useState(false);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user, coachData]);

  useEffect(() => {
    if (!user) {
      onNavigate?.('login');
    }
  }, [user, onNavigate]);

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
      
      
      if (!isOnline) {
        Alert.alert(
          'No Internet Connection',
          'You need an active internet connection to update your profile picture. Please check your network settings and try again.'
        );
        return;
      }
      
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[ProfileScreen] Permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      
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

          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: uploadResult.url })
            .eq('user_id', user.id);
          
          if (updateError) {
            
            const msg = typeof updateError.message === 'string' ? updateError.message : JSON.stringify(updateError);
            if (msg.includes("Could not find the 'avatar_url' column") || msg.includes('column "avatar_url" does not exist')) {
              console.error('[ProfileScreen] profiles table is missing avatar_url column');
              Alert.alert(
                'Database schema issue',
                'The `profiles` table is missing the `avatar_url` column required to save profile pictures. Run the migration to add the column (see instructions).'
              );
              
              console.info('[ProfileScreen] Run this SQL in Supabase SQL editor to fix:');
              console.info("ALTER TABLE profiles ADD COLUMN avatar_url text;");
              throw new Error('Missing avatar_url column in profiles table');
            }
            throw new Error('Failed to update profile: ' + updateError.message);
          }
          
          
          setAvatarUrl(uploadResult.url);
          setProfile(prev => ({ ...prev, avatar_url: uploadResult.url }));
          Alert.alert('Success', 'Profile picture updated and saved to cloud storage!');
          
                    
        } catch (uploadError: any) {
          console.error('[ProfileScreen] Error in avatar upload process:', uploadError);
          
          
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
      
      console.log('[ProfileScreen] Profile saved successfully');
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

  const handleLogout = () => {
    console.log('[ProfileScreen] handleLogout called');
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    console.log('[ProfileScreen] User confirmed sign out');
    setShowLogoutConfirm(false);
    try {
      await signOut();
      console.log('[ProfileScreen] Sign out completed');
    } catch (error) {
      console.error('[ProfileScreen] Sign out error:', error);
    }
  };

  const confirmConvertToClient = async () => {
    setShowConvertConfirm(false);
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
        
      }

      const { error: deactivateError } = await supabase
        .from('coaches')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (deactivateError) throw deactivateError;

      
      await switchToClientMode();

      
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

  const handleDeleteAccount = () => {
    console.log('[ProfileScreen] handleDeleteAccount called');
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    console.log('[ProfileScreen] User confirmed account deletion');
    setShowDeleteConfirm(false);
    
    try {
      if (!user) {
        console.log('[ProfileScreen] No user found, aborting delete');
        return;
      }

      console.log('[ProfileScreen] Starting account deletion for user:', user.id);

              // Als deze gebruiker een coach is, moet eerst alle coach-spul weg
              if (isCoach && coachData) {
                console.log('Deleting coach-related data...');
                
                
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

              // Nu alle data die afhankelijk is van andere tabellen
              console.log('Deleting dependent data...');
              
              
              await supabase
                .from('coach_client_assignments')
                .delete()
                .eq('client_user_id', user.id);

              
              await supabase
                .from('coach_notes')
                .delete()
                .eq('client_user_id', user.id);

              
              await supabase
                .from('activity_logs')
                .delete()
                .eq('user_id', user.id);

              
              // Maalingrediënten moeten weg voordat de maaltijden zelf worden verwijderd
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

              // En nu alle hoofdtabellen van de gebruiker
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

              
              for (const table of tablesToDelete) {
                try {
                  const { error } = await supabase
                    .from(table)
                    .delete()
                    .eq('user_id', user.id);
                  
                  if (error && error.code !== 'PGRST116') { 
                    console.warn(`Error deleting from ${table}:`, error);
                  }
                } catch (err) {
                  console.warn(`Failed to delete from ${table}:`, err);
                }
              }

              
              await supabase
                .from('messages')
                .delete()
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

              
              const { error: profileDeleteError } = await supabase
                .from('profiles')
                .delete()
                .eq('user_id', user.id);

              if (profileDeleteError) {
                console.error('Error deleting profile:', profileDeleteError);
                throw profileDeleteError;
              }

              
              const { error: deleteUserError } = await supabase.rpc('delete_user_account');
              
              if (deleteUserError) {
                console.error('Error deleting user account:', deleteUserError);
                
                
                await signOut();
                Alert.alert(
                  'Partial Deletion',
                  'Your app data has been deleted, but there was an issue removing your login credentials. Please contact support if needed.'
                );
                return;
              }

              
              try {
                await AsyncStorage.clear();
              } catch (storageError) {
                console.error('Error clearing storage:', storageError);
              }

              
              await signOut();

              Alert.alert(
                'Account Deleted', 
                'Your account and all associated data have been permanently deleted.',
                [{ 
                  text: 'OK', 
                  onPress: () => {
                    
                  }
                }]
              );
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', 'Failed to delete account. Please contact support.');
    }
  };

  const handleConvertToCoach = () => {
    console.log('[ProfileScreen] handleConvertToCoach called - canBeCoach:', canBeCoach, 'isCoach:', isCoach);
    setShowBecomeCoachConfirm(true);
  };

  const confirmBecomeCoach = async () => {
    setShowBecomeCoachConfirm(false);
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
                  
                  console.log('Navigate to coach dashboard');
                }
              }
            ]
          );
        }
      }, 1000);
    } catch (error) {
      console.error('Error converting to coach:', error);
      Alert.alert('Error', 'Failed to convert to coach. Please try again.');
    }
  };

  const handleCoachQualificationSubmit = async () => {
    
    if (!profile.full_name || !profile.bio || !profile.fitness_level) {
      Alert.alert(
        'Complete Your Profile First',
        'To become a coach, please complete your profile with:\n• Full name\n• Bio/About section\n• Fitness level\n\nThis helps clients understand your expertise.',
        [{ text: 'OK', onPress: () => setShowPasswordModal(false) }]
      );
      return;
    }

    
    setShowPasswordModal(false);
    setShowBecomeCoachConfirm(true);
  };  const handleClearInvalidAvatar = async () => {
    if (!user) return;
    
    try {
      console.log('[ProfileScreen] Clearing invalid avatar URL...');
      await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);
      
      
      setAvatarUrl(null);
      setProfile(prev => ({ ...prev, avatar_url: null }));
    } catch (error) {
      console.error('[ProfileScreen] Error clearing invalid avatar:', error);
    }
  };

  const handleConvertToClient = async () => {
    setShowConvertConfirm(true);
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

  const fitnessLevelMap: Record<string, { label: string; color: string }> = {
    beginner: { label: 'Beginner', color: '#00B86B' },
    intermediate: { label: 'Intermediate', color: '#FF8A00' },
    advanced: { label: 'Advanced', color: PC.accentSecondary },
  };
  const fitnessInfo = fitnessLevelMap[profile.fitness_level] || { label: profile.fitness_level, color: PC.accentSecondary };

  return (
    <View style={pStyles.root}>
      <StatusBar barStyle="dark-content" />

      {!isOnline && (
        <View style={pStyles.offlineBanner}>
          <WifiSlash size={16} color="#FFF" weight="bold" />
          <Text style={pStyles.offlineBannerText}>You're offline.</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={pStyles.scroll}
          contentContainerStyle={pStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Top bar ── */}
          <View style={pStyles.topBar}>
            <TouchableOpacity
              onPress={() => onNavigate?.(isCoach ? 'coach-dashboard' : 'home')}
              style={pStyles.topBarButton}
            >
              <ArrowLeft size={20} color="#111" weight="bold" />
            </TouchableOpacity>

            <Text style={pStyles.topBarTitle}>Profile</Text>

            {editing ? (
              <View style={pStyles.topBarActions}>
                <TouchableOpacity onPress={handleCancel} style={pStyles.topBarButton}>
                  <X size={18} color="#999" weight="bold" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={[pStyles.topBarButton, { backgroundColor: '#111' }]}>
                  <Check size={18} color="#FFF" weight="bold" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditing(true)} style={pStyles.topBarButton}>
                <PencilSimple size={18} color="#111" />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Profile card ── */}
          <View style={pStyles.profileCard}>
            <View style={pStyles.profileHeaderRow}>
              <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar} style={pStyles.avatarShell}>
                {(avatarUrl || profile.avatar_url) && !(avatarUrl || profile.avatar_url)?.startsWith('blob:') ? (
                  <Image
                    source={{ uri: avatarUrl || profile.avatar_url || '' }}
                    style={pStyles.avatarImg}
                    defaultSource={require('../../assets/default-avatar.png')}
                    onError={handleClearInvalidAvatar}
                  />
                ) : (
                  <View style={pStyles.avatarPlaceholder}>
                    <Text style={pStyles.avatarInitial}>
                      {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                {uploadingAvatar && (
                  <View style={pStyles.avatarOverlay}>
                    <ActivityIndicator color="#FFF" size="small" />
                  </View>
                )}
                <View style={pStyles.cameraChip}>
                  <Camera size={11} color="#FFF" weight="fill" />
                </View>
              </TouchableOpacity>

              <View style={pStyles.profileMeta}>
                <Text style={pStyles.profileName}>{profile.full_name || 'Your name'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <EnvelopeSimple size={13} color="#999" />
                  <Text style={pStyles.profileEmail}>{user?.email}</Text>
                </View>
              </View>
            </View>

            <View style={pStyles.badgeRow}>
              <View style={[pStyles.badge, { backgroundColor: fitnessInfo.color + '15' }]}>
                <Barbell size={13} color={fitnessInfo.color} weight="fill" />
                <Text style={[pStyles.badgeText, { color: fitnessInfo.color }]}>{fitnessInfo.label}</Text>
              </View>
              {isCoach && (
                <View style={[pStyles.badge, { backgroundColor: '#EDE9FE' }]}>
                  <GraduationCap size={13} color="#7C3AED" weight="fill" />
                  <Text style={[pStyles.badgeText, { color: '#7C3AED' }]}>Coach</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Stats grid ── */}
          <View style={pStyles.statsGrid}>
            {[
              { label: 'Age', value: profile.age ? `${profile.age}` : '--', unit: 'yrs', color: '#FF477E', bg: '#FEE2E2', Icon: Calendar },
              { label: 'Height', value: profile.height ? `${profile.height}` : '--', unit: 'cm', color: '#7C3AED', bg: '#EDE9FE', Icon: Ruler },
              { label: 'Weight', value: profile.weight ? `${profile.weight}` : '--', unit: 'kg', color: '#10B981', bg: '#D1FAE5', Icon: Barbell },
              ...(bmi ? [{ label: 'BMI', value: bmi, unit: '', color: '#F59E0B', bg: '#FEF3C7', Icon: Target }] : []),
            ].map((s) => (
              <View key={s.label} style={[pStyles.statCard, { backgroundColor: s.bg }]}>
                <View style={[pStyles.statIconWrap, { backgroundColor: s.color + '20' }]}>
                  <s.Icon size={18} color={s.color} weight="fill" />
                </View>
                <Text style={pStyles.statValue}>{s.value}<Text style={pStyles.statUnit}> {s.unit}</Text></Text>
                <Text style={pStyles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Personal section ── */}
          <View style={pStyles.sectionCard}>
            <Text style={pStyles.sectionTitle}>Personal</Text>

            {/* Full Name */}
            <View style={pStyles.fieldRow}>
              <View style={[pStyles.fieldIcon, { backgroundColor: '#EDE9FE' }]}>
                <User size={18} color="#7C3AED" weight="duotone" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={pStyles.fieldLabel}>Full Name</Text>
                {editing ? (
                  <TextInput
                    style={pStyles.fieldInput}
                    value={editedProfile.full_name}
                    onChangeText={(t) => setEditedProfile({ ...editedProfile, full_name: t })}
                    placeholder="Enter your name"
                    placeholderTextColor="#CCC"
                    selectionColor="#7C3AED"
                    underlineColorAndroid="transparent"
                  />
                ) : (
                  <Text style={pStyles.fieldValue}>{profile.full_name || 'Not set'}</Text>
                )}
              </View>
            </View>

            <View style={pStyles.divider} />

            {/* Age + Gender row */}
            <View style={{ flexDirection: 'row', gap: 0 }}>
              <View style={[pStyles.fieldRow, { flex: 1 }]}>
                <View style={[pStyles.fieldIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Calendar size={18} color="#FF477E" weight="duotone" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={pStyles.fieldLabel}>Age</Text>
                  {editing ? (
                    <TextInput
                      style={pStyles.fieldInput}
                      value={editedProfile.age?.toString() || ''}
                      onChangeText={(t) => setEditedProfile({ ...editedProfile, age: parseInt(t) || null })}
                      placeholder="Age"
                      placeholderTextColor="#CCC"
                      keyboardType="numeric"
                      selectionColor="#7C3AED"
                      underlineColorAndroid="transparent"
                    />
                  ) : (
                    <Text style={pStyles.fieldValue}>{profile.age || 'Not set'}</Text>
                  )}
                </View>
              </View>
              <View style={[pStyles.fieldRow, { flex: 1 }]}>
                <View style={[pStyles.fieldIcon, { backgroundColor: '#D1FAE5' }]}>
                  <GenderIntersex size={18} color="#10B981" weight="duotone" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={pStyles.fieldLabel}>Gender</Text>
                  {editing ? (
                    <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                      {[['M', 'male'], ['F', 'female'], ['—', 'prefer-not-to-say']].map(([label, val]) => (
                        <TouchableOpacity
                          key={val}
                          onPress={() => setEditedProfile({ ...editedProfile, gender: val })}
                          style={[pStyles.chipBtn, editedProfile.gender === val && pStyles.chipBtnActive]}
                        >
                          <Text style={[pStyles.chipBtnText, editedProfile.gender === val && pStyles.chipBtnTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={pStyles.fieldValue}>
                      {profile.gender === 'male' ? 'Male' : profile.gender === 'female' ? 'Female' : 'N/A'}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={pStyles.divider} />

            {/* Height + Weight */}
            <View style={{ flexDirection: 'row' }}>
              <View style={[pStyles.fieldRow, { flex: 1 }]}>
                <View style={[pStyles.fieldIcon, { backgroundColor: '#EDE9FE' }]}>
                  <Ruler size={18} color="#7C3AED" weight="duotone" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={pStyles.fieldLabel}>Height (cm)</Text>
                  {editing ? (
                    <TextInput
                      style={pStyles.fieldInput}
                      value={editedProfile.height?.toString() || ''}
                      onChangeText={(t) => setEditedProfile({ ...editedProfile, height: parseInt(t) || null })}
                      placeholder="cm"
                      placeholderTextColor="#CCC"
                      keyboardType="numeric"
                      selectionColor="#7C3AED"
                      underlineColorAndroid="transparent"
                    />
                  ) : (
                    <Text style={pStyles.fieldValue}>{profile.height ? `${profile.height} cm` : 'Not set'}</Text>
                  )}
                </View>
              </View>
              <View style={[pStyles.fieldRow, { flex: 1 }]}>
                <View style={[pStyles.fieldIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Barbell size={18} color="#10B981" weight="duotone" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={pStyles.fieldLabel}>Weight (kg)</Text>
                  {editing ? (
                    <TextInput
                      style={pStyles.fieldInput}
                      value={editedProfile.weight?.toString() || ''}
                      onChangeText={(t) => setEditedProfile({ ...editedProfile, weight: parseInt(t) || null })}
                      placeholder="kg"
                      placeholderTextColor="#CCC"
                      keyboardType="numeric"
                      selectionColor="#7C3AED"
                      underlineColorAndroid="transparent"
                    />
                  ) : (
                    <Text style={pStyles.fieldValue}>{profile.weight ? `${profile.weight} kg` : 'Not set'}</Text>
                  )}
                </View>
              </View>
            </View>

            <View style={pStyles.divider} />

            {/* Phone */}
            <View style={pStyles.fieldRow}>
              <View style={[pStyles.fieldIcon, { backgroundColor: '#FEF3C7' }]}>
                <Phone size={18} color="#F59E0B" weight="duotone" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={pStyles.fieldLabel}>Phone</Text>
                {editing ? (
                  <TextInput
                    style={pStyles.fieldInput}
                    value={editedProfile.phone}
                    onChangeText={(t) => setEditedProfile({ ...editedProfile, phone: t })}
                    placeholder="Phone number"
                    placeholderTextColor="#CCC"
                    keyboardType="phone-pad"
                    selectionColor="#7C3AED"
                    underlineColorAndroid="transparent"
                  />
                ) : (
                  <Text style={pStyles.fieldValue}>{profile.phone || 'Not set'}</Text>
                )}
              </View>
            </View>
          </View>

          {/* ── Fitness section ── */}
          <View style={pStyles.sectionCard}>
            <Text style={pStyles.sectionTitle}>Fitness</Text>

            {/* Fitness Level */}
            <View style={pStyles.fieldRow}>
              <View style={[pStyles.fieldIcon, { backgroundColor: fitnessInfo.color + '18' }]}>
                <Barbell size={18} color={fitnessInfo.color} weight="duotone" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={pStyles.fieldLabel}>Fitness Level</Text>
                {editing ? (
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                    {['beginner', 'intermediate', 'advanced'].map((lvl) => {
                      const info = fitnessLevelMap[lvl];
                      const active = editedProfile.fitness_level === lvl;
                      return (
                        <TouchableOpacity
                          key={lvl}
                          onPress={() => setEditedProfile({ ...editedProfile, fitness_level: lvl })}
                          style={[pStyles.levelBtn, active && { backgroundColor: info.color, borderColor: info.color }]}
                        >
                          <Text style={[pStyles.levelBtnText, active && { color: '#FFF' }]}>
                            {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <View style={[pStyles.badge, { backgroundColor: fitnessInfo.color + '18' }]}>
                      <Text style={[pStyles.badgeText, { color: fitnessInfo.color }]}>{fitnessInfo.label}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            <View style={pStyles.divider} />

            {/* Bio */}
            <View style={pStyles.fieldRow}>
              <View style={[pStyles.fieldIcon, { backgroundColor: '#EDE9FE' }]}>
                <Info size={18} color="#7C3AED" weight="duotone" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={pStyles.fieldLabel}>Bio</Text>
                {editing ? (
                  <TextInput
                    style={[pStyles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                    value={editedProfile.bio}
                    onChangeText={(t) => setEditedProfile({ ...editedProfile, bio: t })}
                    placeholder="Tell us about yourself"
                    placeholderTextColor="#CCC"
                    multiline
                    numberOfLines={3}
                    selectionColor="#7C3AED"
                    underlineColorAndroid="transparent"
                  />
                ) : (
                  <Text style={[pStyles.fieldValue, { lineHeight: 20 }]}>{profile.bio || 'Not set'}</Text>
                )}
              </View>
            </View>

            <View style={pStyles.divider} />

            {/* Goals */}
            <View style={pStyles.fieldRow}>
              <View style={[pStyles.fieldIcon, { backgroundColor: '#FEE2E2' }]}>
                <Target size={18} color="#FF477E" weight="duotone" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={pStyles.fieldLabel}>Fitness Goals</Text>
                {editing ? (
                  <TextInput
                    style={[pStyles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                    value={editedProfile.goals}
                    onChangeText={(t) => setEditedProfile({ ...editedProfile, goals: t })}
                    placeholder="What are your fitness goals?"
                    placeholderTextColor="#CCC"
                    multiline
                    numberOfLines={3}
                    selectionColor="#7C3AED"
                    underlineColorAndroid="transparent"
                  />
                ) : (
                  <Text style={[pStyles.fieldValue, { lineHeight: 20 }]}>{profile.goals || 'Not set'}</Text>
                )}
              </View>
            </View>
          </View>

          {/* ── Account Management ── */}
          {!editing && (
            <View style={pStyles.accountSection}>
              <Text style={pStyles.accountSectionTitle}>Account</Text>

              {!isCoach && !canBeCoach && (
                <TouchableOpacity
                  style={pStyles.accountRow}
                  onPress={() => setShowPasswordModal(true)}
                  activeOpacity={0.7}
                >
                  <View style={[pStyles.accountRowIcon, { backgroundColor: '#EDE9FE' }]}>
                    <GraduationCap size={20} color="#7C3AED" weight="duotone" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={pStyles.accountRowLabel}>Become a Coach</Text>
                    <Text style={pStyles.accountRowSub}>Unlock coaching features</Text>
                  </View>
                  <CaretRight size={18} color={PC.textDim} />
                </TouchableOpacity>
              )}

              {isCoach && (
                <TouchableOpacity
                  style={pStyles.accountRow}
                  onPress={handleConvertToClient}
                  activeOpacity={0.7}
                >
                  <View style={[pStyles.accountRowIcon, { backgroundColor: '#FEF3C7' }]}>
                    <UserSwitch size={20} color="#D97706" weight="duotone" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={pStyles.accountRowLabel}>Switch to Client Mode</Text>
                    <Text style={pStyles.accountRowSub}>Deactivate coaching</Text>
                  </View>
                  <CaretRight size={18} color={PC.textDim} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={pStyles.accountRow}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <View style={[pStyles.accountRowIcon, { backgroundColor: '#FEE2E2' }]}>
                  <SignOut size={20} color="#EF4444" weight="duotone" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={pStyles.accountRowLabel}>Sign Out</Text>
                  <Text style={pStyles.accountRowSub}>Log out of your account</Text>
                </View>
                <CaretRight size={18} color={PC.textDim} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[pStyles.accountRow, { marginBottom: 0 }]}
                onPress={handleDeleteAccount}
                activeOpacity={0.7}
              >
                <View style={[pStyles.accountRowIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Trash size={20} color="#EF4444" weight="duotone" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[pStyles.accountRowLabel, { color: '#EF4444' }]}>Delete Account</Text>
                  <Text style={pStyles.accountRowSub}>Permanently remove all data</Text>
                </View>
                <CaretRight size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={pStyles.coachOverlay}>
          <View style={pStyles.coachSheet}>
            {/* Header */}
            <View style={pStyles.coachSheetHeader}>
              <View style={pStyles.coachHandle} />
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={pStyles.coachCloseBtn}>
                <X size={18} color={PC.textDim} weight="bold" />
              </TouchableOpacity>
            </View>

            {/* Hero */}
            <View style={pStyles.coachHero}>
              <View style={pStyles.coachHeroIcon}>
                <GraduationCap size={36} color="#7C3AED" weight="duotone" />
              </View>
              <Text style={pStyles.coachHeroTitle}>Become a Coach</Text>
              <Text style={pStyles.coachHeroSub}>Join our community of health experts</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              {/* Requirements */}
              <Text style={pStyles.coachSecTitle}>Requirements</Text>
              {[
                {
                  done: !!profile.full_name,
                  label: 'Full Name',
                  desc: profile.full_name ? 'Completed' : 'Add your full name',
                  bg: '#E8F5E9',
                  iconBg: '#10B981',
                },
                {
                  done: !!profile.bio,
                  label: 'Professional Bio',
                  desc: profile.bio ? 'Completed' : 'Tell clients about your expertise',
                  bg: '#F3E8FF',
                  iconBg: '#8B5CF6',
                },
                {
                  done: !!profile.fitness_level,
                  label: 'Fitness Level',
                  desc: profile.fitness_level ? 'Completed' : 'Set your fitness expertise',
                  bg: '#FEF3C7',
                  iconBg: '#F59E0B',
                },
              ].map((req, i) => (
                <View key={i} style={[pStyles.coachReqCard, { backgroundColor: req.done ? req.bg : '#F5F5F5' }]}>
                  <View style={[pStyles.coachReqDot, { backgroundColor: req.done ? req.iconBg : '#D1D5DB' }]}>
                    {req.done ? <Check size={14} color="#FFF" weight="bold" /> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[pStyles.coachReqLabel, req.done && { color: '#111' }]}>{req.label}</Text>
                    <Text style={pStyles.coachReqDesc}>{req.desc}</Text>
                  </View>
                </View>
              ))}

              {/* Responsibilities */}
              <Text style={[pStyles.coachSecTitle, { marginTop: 24 }]}>Responsibilities</Text>
              <View style={pStyles.coachRespCard}>
                {[
                  { icon: <Star size={18} color="#F59E0B" weight="fill" />, text: 'Provide supportive and professional guidance' },
                  { icon: <ShieldCheck size={18} color="#10B981" weight="fill" />, text: 'Respect client privacy and boundaries' },
                  { icon: <ChatCircleDots size={18} color="#3B82F6" weight="fill" />, text: 'Maintain regular communication' },
                  { icon: <ArrowsClockwise size={18} color="#8B5CF6" weight="fill" />, text: 'Stay updated with best practices' },
                ].map((item, i) => (
                  <View key={i} style={pStyles.coachRespRow}>
                    {item.icon}
                    <Text style={pStyles.coachRespText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Footer buttons */}
            <View style={pStyles.coachFooter}>
              <TouchableOpacity
                style={pStyles.coachCancelBtn}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={pStyles.coachCancelText}>Not Ready</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  pStyles.coachSubmitBtn,
                  (!profile.full_name || !profile.bio || !profile.fitness_level) && { opacity: 0.4 },
                ]}
                onPress={handleCoachQualificationSubmit}
                disabled={!profile.full_name || !profile.bio || !profile.fitness_level}
                activeOpacity={0.8}
              >
                <Sparkle size={18} color="#FFF" weight="fill" />
                <Text style={pStyles.coachSubmitText}>Become a Coach</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {}
      <Modal
        visible={showLogoutConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={pStyles.modalOverlay}>
          <View style={pStyles.logoutModalContent}>
            <Text style={pStyles.logoutTitle}>Sign Out</Text>
            <Text style={pStyles.logoutMessage}>
              Are you sure you want to sign out?
            </Text>
            <View style={pStyles.logoutButtons}>
              <TouchableOpacity
                style={pStyles.logoutCancelButton}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={pStyles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={pStyles.logoutConfirmButton}
                onPress={confirmLogout}
              >
                <Text style={pStyles.logoutConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {}
      <Modal
        visible={showConvertConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConvertConfirm(false)}
      >
        <View style={pStyles.modalOverlay}>
          <View style={pStyles.logoutModalContent}>
            <MaterialIcons name="person" size={48} color={colors.primary} />
            <Text style={pStyles.logoutTitle}>Convert to Client</Text>
            <Text style={pStyles.logoutMessage}>
              This will remove your coach privileges and unassign all your clients. Are you sure?
            </Text>
            <View style={pStyles.logoutButtons}>
              <TouchableOpacity
                style={pStyles.logoutCancelButton}
                onPress={() => setShowConvertConfirm(false)}
              >
                <Text style={pStyles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={pStyles.logoutConfirmButton}
                onPress={confirmConvertToClient}
              >
                <Text style={pStyles.logoutConfirmText}>Convert</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={pStyles.modalOverlay}>
          <View style={pStyles.logoutModalContent}>
            <MaterialIcons name="warning" size={48} color={colors.error} />
            <Text style={pStyles.logoutTitle}>Delete Account</Text>
            <Text style={pStyles.logoutMessage}>
              This will permanently delete your account and ALL of your data including:{'\n\n'}
              • Profile information{'\n'}
              • Activity history{'\n'}
              • Health metrics{'\n'}
              • Messages{'\n'}
              • Goals and progress{'\n\n'}
              This action CANNOT be undone. Are you absolutely sure?
            </Text>
            <View style={pStyles.logoutButtons}>
              <TouchableOpacity
                style={pStyles.logoutCancelButton}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={pStyles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[pStyles.logoutConfirmButton, { backgroundColor: colors.error }]}
                onPress={confirmDeleteAccount}
              >
                <Text style={pStyles.logoutConfirmText}>Delete Forever</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {}
      <Modal
        visible={showBecomeCoachConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBecomeCoachConfirm(false)}
      >
        <View style={pStyles.modalOverlay}>
          <View style={pStyles.logoutModalContent}>
            <MaterialIcons name="emoji-events" size={48} color={colors.primary} />
            <Text style={pStyles.logoutTitle}>Become a Health Coach</Text>
            <Text style={pStyles.logoutMessage}>
              Are you sure you want to become a health coach? This will unlock coach features while keeping your client access.
            </Text>
            <View style={pStyles.logoutButtons}>
              <TouchableOpacity
                style={pStyles.logoutCancelButton}
                onPress={() => setShowBecomeCoachConfirm(false)}
              >
                <Text style={pStyles.logoutCancelText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[pStyles.logoutConfirmButton, { backgroundColor: colors.primary }]}
                onPress={confirmBecomeCoach}
              >
                <Text style={pStyles.logoutConfirmText}>Yes, Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const pStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  offlineBanner: {
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    zIndex: 100,
  },
  offlineBannerText: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: PF.semi,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  topBarTitle: {
    fontSize: 22,
    fontFamily: PF.bold,
    color: '#111',
    letterSpacing: -0.5,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  topBarButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Profile card */
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 22,
    marginBottom: 14,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarShell: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  profileMeta: {
    flex: 1,
    marginLeft: 16,
  },
  avatarImg: {
    width: 76,
    height: 76,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  avatarInitial: {
    fontSize: 28,
    fontFamily: PF.bold,
    color: '#FFF',
  },
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraChip: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileName: {
    fontSize: 22,
    fontFamily: PF.bold,
    color: '#111',
    letterSpacing: -0.5,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: PF.medium,
    color: '#999',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: PF.semi,
  },

  /* Stats grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 20,
    padding: 16,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontFamily: PF.bold,
    color: '#111',
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 11,
    fontFamily: PF.medium,
    color: '#999',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: PF.semi,
    color: '#888',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Section cards */
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    marginBottom: 14,
    padding: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: PF.bold,
    color: '#111',
    marginBottom: 16,
    letterSpacing: -0.4,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  fieldIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: PF.semi,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 15,
    fontFamily: PF.semi,
    color: '#111',
  },
  fieldInput: {
    fontSize: 15,
    fontFamily: PF.semi,
    color: '#111',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E5E5E5',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F2',
    marginVertical: 2,
  },

  /* Chip buttons */
  chipBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    borderWidth: 1.5,
    borderColor: '#F5F5F5',
  },
  chipBtnActive: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  chipBtnText: {
    fontSize: 13,
    fontFamily: PF.semi,
    color: '#999',
  },
  chipBtnTextActive: {
    color: '#FFF',
  },
  levelBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1.5,
    borderColor: '#F5F5F5',
    alignItems: 'center',
  },
  levelBtnText: {
    fontSize: 12,
    fontFamily: PF.semi,
    color: '#999',
  },

  /* ── Account Section (redesigned) ── */
  accountSection: {
    backgroundColor: PC.card,
    borderRadius: 24,
    marginBottom: 16,
    padding: 8,
  },
  accountSectionTitle: {
    fontFamily: PF.bold,
    fontSize: 18,
    color: PC.text,
    letterSpacing: -0.4,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginBottom: 4,
  },
  accountRowIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountRowLabel: {
    fontFamily: PF.semi,
    fontSize: 15,
    color: PC.text,
  },
  accountRowSub: {
    fontFamily: PF.regular,
    fontSize: 12,
    color: PC.textDim,
    marginTop: 1,
  },

  /* ── Modals ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  logoutModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  logoutTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  logoutMessage: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  logoutButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  logoutCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  logoutCancelText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  logoutConfirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  logoutConfirmText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },

  /* ── Coach Modal (redesigned) ── */
  coachOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-end',
  },
  coachSheet: {
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
  },
  coachSheetHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 20,
  },
  coachHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
  },
  coachCloseBtn: {
    position: 'absolute',
    right: 16,
    top: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachHero: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  coachHeroIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  coachHeroTitle: {
    fontFamily: PF.bold,
    fontSize: 24,
    color: '#111',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  coachHeroSub: {
    fontFamily: PF.medium,
    fontSize: 14,
    color: '#888',
  },
  coachSecTitle: {
    fontFamily: PF.bold,
    fontSize: 17,
    color: '#111',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  coachReqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    marginBottom: 8,
  },
  coachReqDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachReqLabel: {
    fontFamily: PF.semi,
    fontSize: 15,
    color: '#666',
  },
  coachReqDesc: {
    fontFamily: PF.regular,
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  coachRespCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  coachRespRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coachRespText: {
    fontFamily: PF.medium,
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  coachFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
  },
  coachCancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachCancelText: {
    fontFamily: PF.semi,
    fontSize: 15,
    color: '#888',
  },
  coachSubmitBtn: {
    flex: 2,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#111',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  coachSubmitText: {
    fontFamily: PF.bold,
    fontSize: 15,
    color: '#FFF',
  },

  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.md,
  },
});
