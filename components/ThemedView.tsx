import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type ThemedViewProps = {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  darkMode?: Partial<ViewStyle>;
};

export function ThemedView({ style, children, darkMode }: ThemedViewProps) {
  const { actualTheme, colors } = useTheme();
  
  return (
    <View 
      style={[
        { backgroundColor: colors.background },
        style,
        actualTheme === 'dark' && darkMode
      ]}
    >
      {children}
    </View>
  );
}

type ThemedTextProps = {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  darkMode?: Partial<TextStyle>;
};

export function ThemedText({ style, children, darkMode }: ThemedTextProps) {
  const { actualTheme, colors } = useTheme();
  
  return (
    <Text 
      style={[
        { color: colors.text },
        style,
        actualTheme === 'dark' && darkMode
      ]}
    >
      {children}
    </Text>
  );
}

type ThemedButtonProps = {
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  onPress?: () => void;
  children: React.ReactNode;
  primary?: boolean;
  danger?: boolean;
};

export function ThemedButton({ style, textStyle, onPress, children, primary, danger }: ThemedButtonProps) {
  const { colors } = useTheme();
  
  let backgroundColor = colors.card;
  if (primary) backgroundColor = colors.primary;
  if (danger) backgroundColor = colors.danger;
  
  return (
    <TouchableOpacity 
      style={[
        { 
          backgroundColor,
          padding: 16,
          borderRadius: 8,
          alignItems: 'center',
        },
        style
      ]}
      onPress={onPress}
    >
      <Text style={[
        { 
          color: primary || danger ? '#FFFFFF' : colors.text,
          fontSize: 16,
          fontWeight: '600',
        },
        textStyle
      ]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}