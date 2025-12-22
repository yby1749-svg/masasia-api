import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useMutation} from '@tanstack/react-query';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';

import {userApi} from '@api';
import {Button, Input} from '@components';
import {useAuthStore, useUIStore} from '@store';
import {colors, spacing, typography} from '@config/theme';
import {SOCKET_URL} from '@config/constants'; // Base URL without /api/v1

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  phone: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRelation: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function EditProfileScreen() {
  const {user, updateUser} = useAuthStore();
  const {showSuccess, showError} = useUIStore();
  const [avatarUri, setAvatarUri] = useState<string | null>(
    user?.avatarUrl ? `${SOCKET_URL}${user.avatarUrl}` : null,
  );

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      emergencyName: user?.emergencyName || '',
      emergencyPhone: user?.emergencyPhone || '',
      emergencyRelation: user?.emergencyRelation || '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await userApi.updateMe(data);
      return response.data.data;
    },
    onSuccess: data => {
      updateUser(data);
      showSuccess(
        'Profile Updated',
        'Your profile has been updated successfully',
      );
    },
    onError: () => {
      showError('Update Failed', 'Unable to update profile');
    },
  });

  const avatarMutation = useMutation({
    mutationFn: async (uri: string) => {
      const formData = new FormData();
      formData.append('avatar', {
        uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);
      const response = await userApi.uploadAvatar(formData);
      return response.data.data;
    },
    onSuccess: data => {
      const newAvatarUrl = `${SOCKET_URL}${data.avatarUrl}`;
      setAvatarUri(newAvatarUrl);
      updateUser({...user, avatarUrl: data.avatarUrl});
      showSuccess('Photo Updated', 'Your profile photo has been updated');
    },
    onError: () => {
      showError('Upload Failed', 'Unable to upload photo');
    },
  });

  const handlePickImage = () => {
    const options = ['Take Photo', 'Choose from Library', 'Cancel'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 2,
        },
        buttonIndex => {
          if (buttonIndex === 0) {
            openCamera();
          } else if (buttonIndex === 1) {
            openLibrary();
          }
        },
      );
    } else {
      Alert.alert('Change Photo', 'Select an option', [
        {text: 'Take Photo', onPress: openCamera},
        {text: 'Choose from Library', onPress: openLibrary},
        {text: 'Cancel', style: 'cancel'},
      ]);
    }
  };

  const openCamera = () => {
    launchCamera(
      {mediaType: 'photo', quality: 0.8, maxWidth: 500, maxHeight: 500},
      response => {
        if (response.assets?.[0]?.uri) {
          avatarMutation.mutate(response.assets[0].uri);
        }
      },
    );
  };

  const openLibrary = () => {
    launchImageLibrary(
      {mediaType: 'photo', quality: 0.8, maxWidth: 500, maxHeight: 500},
      response => {
        if (response.assets?.[0]?.uri) {
          avatarMutation.mutate(response.assets[0].uri);
        }
      },
    );
  };

  const onSubmit = (data: ProfileFormData) => {
    mutation.mutate(data);
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickImage}
            disabled={avatarMutation.isPending}>
            {avatarUri ? (
              <Image source={{uri: avatarUri}} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials || 'U'}</Text>
              </View>
            )}
            <View style={styles.cameraButton}>
              <Icon name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>
            {avatarMutation.isPending ? 'Uploading...' : 'Tap to change photo'}
          </Text>
        </View>

        <View style={styles.section}>
          <Controller
            control={control}
            name="firstName"
            render={({field: {onChange, onBlur, value}}) => (
              <Input
                label="First Name"
                placeholder="John"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.firstName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="lastName"
            render={({field: {onChange, onBlur, value}}) => (
              <Input
                label="Last Name"
                placeholder="Doe"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.lastName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({field: {onChange, onBlur, value}}) => (
              <Input
                label="Phone Number"
                placeholder="+63 9XX XXX XXXX"
                keyboardType="phone-pad"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.phone?.message}
              />
            )}
          />
        </View>

        <View style={styles.section}>
          <Controller
            control={control}
            name="emergencyName"
            render={({field: {onChange, onBlur, value}}) => (
              <Input
                label="Emergency Contact Name"
                placeholder="Jane Doe"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.emergencyName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="emergencyPhone"
            render={({field: {onChange, onBlur, value}}) => (
              <Input
                label="Emergency Contact Phone"
                placeholder="+63 9XX XXX XXXX"
                keyboardType="phone-pad"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.emergencyPhone?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="emergencyRelation"
            render={({field: {onChange, onBlur, value}}) => (
              <Input
                label="Relationship"
                placeholder="Spouse, Parent, etc."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.emergencyRelation?.message}
              />
            )}
          />
        </View>

        <View style={styles.footer}>
          <Button
            title="Save Changes"
            onPress={handleSubmit(onSubmit)}
            loading={mutation.isPending}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    ...typography.h1,
    color: '#fff',
    fontWeight: '600',
  },
  cameraButton: {
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
    borderColor: colors.background,
  },
  changePhotoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  footer: {
    marginTop: spacing.md,
  },
});
