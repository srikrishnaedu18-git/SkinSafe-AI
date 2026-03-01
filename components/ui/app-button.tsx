import { Pressable, StyleSheet, Text } from 'react-native';

import { Palette, Radius, Spacing, Type } from '@/constants/design';

type AppButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

export function AppButton({ label, onPress, variant = 'primary', disabled = false }: AppButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        (pressed || disabled) && styles.pressed,
      ]}>
      <Text style={[styles.text, variant === 'primary' ? styles.primaryText : styles.secondaryText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: Palette.primary,
  },
  secondary: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
  },
  text: {
    fontSize: Type.body,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: Palette.textPrimary,
  },
  pressed: {
    opacity: 0.65,
  },
});
