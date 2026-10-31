import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TextInputProps, Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  clearButton?: boolean;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  error,
  helperText,
  icon,
  clearButton = false,
  value,
  onChangeText,
  style,
  ...rest
}) => {
  const { colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const renderLabel = () => {
    if (!label) return null;
    return (
      <Text style={[Typography.subhead, styles.label, { color: error ? colors.hold : colors.textSecondary }]}>
        {label}
      </Text>
    );
  };

  const renderInputRow = () => {
    const inputChildren: React.ReactNode[] = [];
    if (icon) {
      inputChildren.push(
        <Ionicons
          key="icon"
          name={icon}
          size={20}
          color={isFocused ? colors.primary : colors.textMuted}
          style={styles.icon}
        />
      );
    }
    inputChildren.push(
      <TextInput
        key="input"
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholderTextColor={colors.textMuted}
        style={[
          Typography.body,
          styles.input,
          { color: colors.text },
          style,
        ]}
        {...rest}
      />
    );
    if (clearButton && value && value.length > 0) {
      inputChildren.push(
        <Pressable key="clear" onPress={() => onChangeText?.('')} hitSlop={10} style={styles.clearBtn}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      );
    }
    return (
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: isDark ? colors.card : '#F8FAFC',
            borderColor: error ? colors.hold : isFocused ? colors.primary : colors.border,
            borderWidth: isFocused || error ? 1.5 : 1,
          },
        ]}
      >
        {inputChildren}
      </View>
    );
  };

  const renderFooter = () => {
    if (error) {
      return <Text style={[Typography.caption1, styles.errorText, { color: colors.hold }]}>{error}</Text>;
    }
    if (helperText) {
      return <Text style={[Typography.caption1, styles.helperText, { color: colors.textMuted }]}>{helperText}</Text>;
    }
    return null;
  };

  const containerChildren: React.ReactNode[] = [];
  const labelEl = renderLabel();
  if (labelEl) containerChildren.push(<React.Fragment key="label">{labelEl}</React.Fragment>);
  containerChildren.push(<React.Fragment key="input">{renderInputRow()}</React.Fragment>);
  const footerEl = renderFooter();
  if (footerEl) containerChildren.push(<React.Fragment key="footer">{footerEl}</React.Fragment>);

  return (
    <View style={styles.container}>
      {containerChildren}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  label: {
    marginBottom: 6,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
  },
  clearBtn: {
    padding: 4,
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
  },
  helperText: {
    marginTop: 4,
    marginLeft: 4,
  },
});
