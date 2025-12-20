import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  colors,
  typography,
  borderRadius,
  spacing,
  shadows,
  gradients,
  componentSizes,
} from '@config/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
  fullWidth = false,
}: ButtonProps) {
  const isGradient = variant === 'gradient' || variant === 'primary';
  const isOutlineOrGhost = variant === 'outline' || variant === 'ghost';

  const getHeight = () => {
    switch (size) {
      case 'sm':
        return componentSizes.buttonHeightSmall;
      case 'lg':
        return 56;
      default:
        return componentSizes.buttonHeight;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 18;
      case 'lg':
        return 24;
      default:
        return 20;
    }
  };

  const buttonContent = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator
          color={isOutlineOrGhost ? colors.primary : colors.textInverse}
          size={size === 'sm' ? 'small' : 'small'}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Icon
              name={icon}
              size={getIconSize()}
              color={isOutlineOrGhost ? colors.primary : colors.textInverse}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[
              styles.text,
              styles[`text_${variant === 'gradient' ? 'primary' : variant}`],
              styles[`textSize_${size}`],
              disabled && styles.textDisabled,
              textStyle,
            ]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Icon
              name={icon}
              size={getIconSize()}
              color={isOutlineOrGhost ? colors.primary : colors.textInverse}
              style={styles.iconRight}
            />
          )}
        </>
      )}
    </View>
  );

  const buttonStyles = [
    styles.button,
    {height: getHeight()},
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  if (isGradient && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[buttonStyles, shadows.primaryGlow]}>
        <LinearGradient
          colors={gradients.primary as [string, string]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={[styles.gradient, {height: getHeight()}]}>
          {buttonContent}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        buttonStyles,
        styles[variant === 'gradient' ? 'primary' : variant],
        !isOutlineOrGhost && shadows.md,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}>
      {buttonContent}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  primary: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
  },
  secondary: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.lg,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: spacing.lg,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.button,
  },
  text_primary: {
    color: colors.textInverse,
  },
  text_secondary: {
    color: colors.textInverse,
  },
  text_outline: {
    color: colors.primary,
  },
  text_ghost: {
    color: colors.primary,
  },
  textSize_sm: {
    ...typography.buttonSmall,
  },
  textSize_md: {
    fontSize: 16,
  },
  textSize_lg: {
    fontSize: 18,
    fontWeight: '600',
  },
  textDisabled: {
    color: colors.textLight,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});
