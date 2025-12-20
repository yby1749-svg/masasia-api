import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {launchImageLibrary} from 'react-native-image-picker';
import {useQueryClient} from '@tanstack/react-query';

import {Button, Input} from '@components';
import {useAuthStore} from '@store';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@config/theme';

export function EditProfileScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const {provider, updateProfile} = useAuthStore();

  const [displayName, setDisplayName] = useState(provider?.displayName || '');
  const [bio, setBio] = useState(provider?.bio || '');
  const [photoUrl, setPhotoUrl] = useState(provider?.photoUrl || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to pick image');
        return;
      }

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // For now, we'll use a placeholder URL
        // In production, you would upload to a cloud storage service
        setUploading(true);

        // Simulate upload delay
        setTimeout(() => {
          // Use the local URI temporarily (in production, upload to cloud storage)
          if (asset.uri) {
            setPhotoUrl(asset.uri);
          }
          setUploading(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name is required');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        photoUrl,
      });
      queryClient.invalidateQueries({queryKey: ['provider']});
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Photo Section */}
      <View style={styles.photoSection}>
        <TouchableOpacity
          style={styles.photoContainer}
          onPress={handlePickImage}
          disabled={uploading}>
          {uploading ? (
            <View style={styles.photoPlaceholder}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : photoUrl ? (
            <Image source={{uri: photoUrl}} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Icon name="person" size={48} color={colors.textLight} />
            </View>
          )}
          <View style={styles.editBadge}>
            <Icon name="camera" size={16} color={colors.card} />
          </View>
        </TouchableOpacity>
        <Text style={styles.photoHint}>Tap to change photo</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Input
          label="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Enter your display name"
          leftIcon="person-outline"
        />

        <Input
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Tell customers about yourself..."
          multiline
          numberOfLines={4}
          style={styles.bioInput}
        />
      </View>

      {/* Save Button */}
      <View style={styles.footer}>
        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  photoHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  form: {
    marginBottom: spacing.xl,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  footer: {
    marginTop: spacing.md,
  },
});
