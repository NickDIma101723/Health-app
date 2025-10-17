import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Alert,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, fontSizes } from '../constants/theme';
import * as FileSystem from 'expo-file-system';

export const TestImage: React.FC = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageInfo, setImageInfo] = useState<any>(null);

  // Test static images
  const testImages = [
    'https://reactnative.dev/img/tiny_logo.png',
    'https://picsum.photos/200/300',
  ];

  useEffect(() => {
    // When imageUri changes, try to get file info
    const getFileInfo = async () => {
      if (!imageUri) {
        setImageInfo(null);
        return;
      }

      try {
        if (imageUri.startsWith('file://')) {
          const info = await FileSystem.getInfoAsync(imageUri);
          setImageInfo(info);
          console.log('[TestImage] File info:', info);
        } else {
          setImageInfo({ uri: imageUri, exists: 'unknown' });
        }
      } catch (error) {
        console.error('[TestImage] Error getting file info:', error);
        setImageInfo({ error: String(error) });
      }
    };

    getFileInfo();
  }, [imageUri]);

  const pickImage = async () => {
    setLoading(true);
    setImageError(null);
    try {
      console.log('[TestImage] Requesting media library permission...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[TestImage] Permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'We need camera roll permission to pick an image');
        return;
      }

      console.log('[TestImage] Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('[TestImage] Picker result:', JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        console.log('[TestImage] Selected image URI:', uri);
        setImageUri(uri);
      }
    } catch (error) {
      console.error('[TestImage] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
      setImageError(String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView>
      <View style={styles.container}>
        <Text style={styles.title}>Image Display Test</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Platform Info</Text>
          <Text style={styles.infoText}>OS: {Platform.OS}</Text>
          <Text style={styles.infoText}>OS Version: {Platform.Version}</Text>
          <Text style={styles.infoText}>
            {Platform.OS === 'ios' ? 'isTV: ' + String(Platform.isPad) : 'Is Android TV: N/A'}
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Test Remote Images</Text>
          {testImages.map((uri, index) => (
            <View key={index} style={styles.testItem}>
              <Text style={styles.testItemTitle}>Test Image {index + 1}</Text>
              <Text style={styles.uriText}>{uri}</Text>
              <Image 
                source={{ uri }}
                style={styles.testImage} 
                onLoadStart={() => console.log(`[TestImage] Started loading image ${index + 1}`)}
                onLoad={() => console.log(`[TestImage] Remote image ${index + 1} loaded successfully`)}
                onLoadEnd={() => console.log(`[TestImage] Finished loading image ${index + 1}`)}
                onError={(e) => console.error(`[TestImage] Error loading image ${index + 1}:`, e.nativeEvent.error)}
              />
            </View>
          ))}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Test Image Picker</Text>
          
          <View style={styles.imageContainer}>
            {imageUri ? (
              <>
                {imageLoading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                )}
                
                <Image 
                  source={{ uri: imageUri }} 
                  style={styles.image} 
                  onLoadStart={() => {
                    console.log('[TestImage] Started loading selected image');
                    setImageLoading(true);
                  }}
                  onLoad={() => {
                    console.log('[TestImage] Selected image loaded successfully');
                  }}
                  onLoadEnd={() => {
                    console.log('[TestImage] Finished loading selected image');
                    setImageLoading(false);
                  }}
                  onError={(e) => {
                    console.error('[TestImage] Error loading selected image:', e.nativeEvent.error);
                    setImageError(e.nativeEvent.error);
                    setImageLoading(false);
                  }}
                />
                
                <View style={styles.infoContainer}>
                  <Text style={styles.infoTitle}>Image URI:</Text>
                  <Text style={styles.uriText}>{imageUri}</Text>
                  
                  {imageInfo && (
                    <>
                      <Text style={styles.infoTitle}>Image Info:</Text>
                      <Text style={styles.infoText}>
                        {JSON.stringify(imageInfo, null, 2)}
                      </Text>
                    </>
                  )}
                  
                  {imageError && (
                    <Text style={styles.errorText}>Error: {imageError}</Text>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>No image selected</Text>
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={pickImage} 
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Selecting...' : 'Pick an image'}
            </Text>
          </TouchableOpacity>
          
          {imageUri && (
            <TouchableOpacity 
              style={[styles.button, styles.resetButton]} 
              onPress={() => {
                setImageUri(null);
                setImageError(null);
                setImageInfo(null);
              }}
            >
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    flex: 1,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: colors.primary,
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: spacing.lg,
    position: 'relative',
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: spacing.md,
    backgroundColor: colors.border,
  },
  testItem: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  testItemTitle: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    marginBottom: spacing.xs,
    color: colors.textPrimary,
  },
  testImage: {
    width: 120,
    height: 120,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  uriText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginVertical: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  infoContainer: {
    width: '100%',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  infoTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorText: {
    fontSize: fontSizes.sm,
    color: colors.error,
    marginTop: spacing.sm,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  placeholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
    alignSelf: 'center',
  },
  buttonText: {
    color: colors.textLight,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: colors.error,
  }
});