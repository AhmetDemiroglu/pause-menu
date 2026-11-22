import React from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** Temizle dugmesinin erisilebilirlik etiketi. */
  clearLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Liste ekranlarinin ortak arama kutusu (Kesfet'teki arama satiriyla ayni gorunum). */
export function SearchField({ value, onChangeText, placeholder, clearLabel, style }: SearchFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }, style]}>
      <Ionicons name="search" size={18} color={colors.placeholder} />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={60}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityRole="button" accessibilityLabel={clearLabel}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    height: '100%',
  },
});
