import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BackgroundDecorations } from '../components';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface CoachNotesScreenProps {
  route?: any;
  navigation?: any;
  clientId: string;
  onBack?: () => void;
}

interface Note {
  id: string;
  title: string;
  content: string;
  note_type: 'general' | 'progress' | 'concern' | 'achievement' | 'plan_update';
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

const noteTypes = [
  { value: 'general', label: 'General', icon: 'note', color: colors.primary },
  { value: 'progress', label: 'Progress', icon: 'trending-up', color: colors.success },
  { value: 'concern', label: 'Concern', icon: 'warning', color: colors.warning },
  { value: 'achievement', label: 'Achievement', icon: 'emoji-events', color: colors.gold },
  { value: 'plan_update', label: 'Plan Update', icon: 'edit-note', color: colors.info },
];

export const CoachNotesScreen: React.FC<CoachNotesScreenProps> = ({
  route,
  navigation,
  clientId: propClientId,
  onBack,
}) => {
  const { coachData } = useAuth();
  const clientId = propClientId || route?.params?.clientId;
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<Note['note_type']>('general');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (clientId && coachData) {
      loadNotes();
    }
  }, [clientId, coachData]);

  const loadNotes = async () => {
    if (!clientId || !coachData) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('coach_notes')
        .select('*')
        .eq('coach_id', coachData.id)
        .eq('client_user_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);

    } catch (error) {
      console.error('Error loading notes:', error);
      Alert.alert('Error', 'Failed to load notes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotes();
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation) {
      navigation.goBack();
    }
  };

  const openAddNote = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setNoteType('general');
    setIsPrivate(false);
    setModalVisible(true);
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setNoteType(note.note_type);
    setIsPrivate(note.is_private);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingNote(null);
    setTitle('');
    setContent('');
    setNoteType('general');
    setIsPrivate(false);
  };

  const handleSaveNote = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Validation Error', 'Please enter both title and content');
      return;
    }

    if (!coachData || !clientId) return;

    try {
      setSaving(true);

      if (editingNote) {
        const { error } = await supabase
          .from('coach_notes')
          .update({
            title: title.trim(),
            content: content.trim(),
            note_type: noteType,
            is_private: isPrivate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingNote.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('coach_notes')
          .insert({
            coach_id: coachData.id,
            client_user_id: clientId,
            title: title.trim(),
            content: content.trim(),
            note_type: noteType,
            is_private: isPrivate,
          });

        if (error) throw error;
      }

      closeModal();
      loadNotes();
      Alert.alert('Success', `Note ${editingNote ? 'updated' : 'created'} successfully`);

    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('coach_notes')
                .delete()
                .eq('id', noteId);

              if (error) throw error;
              loadNotes();
              Alert.alert('Success', 'Note deleted successfully');
            } catch (error) {
              console.error('Error deleting note:', error);
              Alert.alert('Error', 'Failed to delete note');
            }
          },
        },
      ]
    );
  };

  const getNoteTypeInfo = (type: Note['note_type']) => {
    return noteTypes.find(t => t.value === type) || noteTypes[0];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <BackgroundDecorations />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading notes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Client Notes</Text>
        <TouchableOpacity style={styles.headerAddButton} onPress={openAddNote}>
          <MaterialIcons name="add" size={24} color={colors.textLight} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {notes.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="note-add" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No Notes Yet</Text>
            <Text style={styles.emptyStateText}>
              Add notes to track progress, concerns, or achievements for this client.
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={openAddNote}>
              <Text style={styles.addButtonText}>Add First Note</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.notesList}>
            {notes.map((note) => {
              const typeInfo = getNoteTypeInfo(note.note_type);
              return (
                <View key={note.id} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <View style={[styles.noteTypeBadge, { backgroundColor: typeInfo.color + '20' }]}>
                      <MaterialIcons name={typeInfo.icon as any} size={16} color={typeInfo.color} />
                      <Text style={[styles.noteTypeText, { color: typeInfo.color }]}>
                        {typeInfo.label}
                      </Text>
                    </View>
                    {note.is_private && (
                      <View style={styles.privateBadge}>
                        <MaterialIcons name="lock" size={14} color={colors.textSecondary} />
                        <Text style={styles.privateText}>Private</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.noteTitle}>{note.title}</Text>
                  <Text style={styles.noteContent} numberOfLines={3}>{note.content}</Text>
                  
                  <View style={styles.noteFooter}>
                    <Text style={styles.noteDate}>
                      {new Date(note.created_at).toLocaleDateString()} at{' '}
                      {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <View style={styles.noteActions}>
                      <TouchableOpacity 
                        style={styles.noteActionButton}
                        onPress={() => openEditNote(note)}
                      >
                        <MaterialIcons name="edit" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.noteActionButton}
                        onPress={() => handleDeleteNote(note.id)}
                      >
                        <MaterialIcons name="delete" size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingNote ? 'Edit Note' : 'Add New Note'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Note Type</Text>
              <View style={styles.noteTypeGrid}>
                {noteTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.noteTypeOption,
                      noteType === type.value && { 
                        backgroundColor: type.color + '20',
                        borderColor: type.color 
                      }
                    ]}
                    onPress={() => setNoteType(type.value as Note['note_type'])}
                  >
                    <MaterialIcons 
                      name={type.icon as any} 
                      size={20} 
                      color={noteType === type.value ? type.color : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.noteTypeOptionText,
                      noteType === type.value && { color: type.color }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter note title"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.label}>Content</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={content}
                onChangeText={setContent}
                placeholder="Enter note content"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <TouchableOpacity 
                style={styles.privateToggle}
                onPress={() => setIsPrivate(!isPrivate)}
              >
                <View style={styles.privateToggleLeft}>
                  <MaterialIcons 
                    name={isPrivate ? "lock" : "lock-open"} 
                    size={20} 
                    color={colors.textPrimary} 
                  />
                  <Text style={styles.privateToggleText}>Private Note</Text>
                </View>
                <View style={[styles.toggle, isPrivate && styles.toggleActive]}>
                  <View style={[styles.toggleThumb, isPrivate && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveNote}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.textLight} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingNote ? 'Update Note' : 'Save Note'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyStateText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 280,
  },
  addButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  addButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textLight,
  },
  notesList: {
    gap: spacing.md,
  },
  noteCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  noteTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  noteTypeText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  privateText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  noteTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  noteContent: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  noteDate: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  noteActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  noteActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  modalScroll: {
    padding: spacing.lg,
  },
  label: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  noteTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  noteTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  noteTypeOptionText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textPrimary,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  privateToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  privateToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  privateToggleText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadows.md,
  },
  saveButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  saveButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textLight,
  },
});
