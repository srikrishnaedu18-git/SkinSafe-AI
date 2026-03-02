import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Palette, Radius, Spacing, Type } from '../../constants/design';
export function AppInput({ label, value, onChangeText, placeholder, multiline = false }) {
    return (<View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, multiline && styles.multiline]} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={Palette.muted} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'}/>
    </View>);
}
const styles = StyleSheet.create({
    container: {
        gap: Spacing.sm,
    },
    label: {
        fontSize: Type.caption,
        color: Palette.textSecondary,
        fontWeight: '600',
    },
    input: {
        minHeight: 44,
        borderColor: Palette.border,
        borderWidth: 1,
        borderRadius: Radius.md,
        backgroundColor: Palette.surface,
        paddingHorizontal: Spacing.md,
        color: Palette.textPrimary,
        fontSize: Type.body,
    },
    multiline: {
        minHeight: 100,
        paddingTop: Spacing.md,
    },
});
