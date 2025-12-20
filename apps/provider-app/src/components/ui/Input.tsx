import React, {forwardRef, useState} from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  colors,
  typography,
  borderRadius,
  spacing,
  shadows,
  componentSizes,
} from '@config/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  size?: 'md' | 'lg';
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconPress,
      style,
      size = 'lg',
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputHeight = size === 'lg' ? componentSizes.inputHeight : 48;

    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View
          style={[
            styles.inputContainer,
            {minHeight: inputHeight},
            isFocused ? styles.focused : null,
            error ? styles.errorBorder : null,
            !isFocused && !error ? shadows.sm : null,
          ]}>
          {leftIcon && (
            <Icon
              name={leftIcon}
              size={22}
              color={isFocused ? colors.primary : colors.textLight}
              style={styles.leftIcon}
            />
          )}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              !leftIcon && styles.inputNoLeftIcon,
              !rightIcon && styles.inputNoRightIcon,
              style,
            ]}
            placeholderTextColor={colors.textLight}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            selectionColor={colors.primary}
            {...props}
          />
          {rightIcon && (
            <TouchableOpacity
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Icon
                name={rightIcon}
                size={22}
                color={isFocused ? colors.primary : colors.textLight}
                style={styles.rightIcon}
              />
            </TouchableOpacity>
          )}
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
        {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
      </View>
    );
  },
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  focused: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  errorBorder: {
    borderColor: colors.error,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  inputNoLeftIcon: {
    paddingLeft: spacing.md,
  },
  inputNoRightIcon: {
    paddingRight: spacing.md,
  },
  leftIcon: {
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginRight: spacing.md,
    marginLeft: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
