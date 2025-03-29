import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedView, ThemedText, ThemedButton } from '@/components/ThemedView';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingrese email y contraseña');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      Alert.alert('Error de inicio de sesión', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Iniciar Sesión</ThemedText>
      
      <TextInput
        style={[styles.input, { 
          backgroundColor: colors.card,
          color: colors.text,
          borderColor: colors.border 
        }]}
        placeholder="Email"
        placeholderTextColor={colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      
      <TextInput
        style={[styles.input, { 
          backgroundColor: colors.card,
          color: colors.text,
          borderColor: colors.border 
        }]}
        placeholder="Contraseña"
        placeholderTextColor={colors.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <ThemedButton 
        primary 
        onPress={handleLogin} 
        style={styles.button}
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </ThemedButton>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    height: 50,
    marginBottom: 16,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
  button: {
    marginTop: 16,
  },
});