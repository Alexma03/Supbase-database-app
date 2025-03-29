import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun, Settings } from 'lucide-react-native';

export default function SettingsScreen() {
  const { theme, actualTheme, setTheme, colors } = useTheme();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={[
      styles.container, 
      { backgroundColor: colors.background }
    ]}>
      {/* Sección de temas */}
      <View style={styles.section}>
        <Text style={[
          styles.sectionTitle, 
          { color: colors.text }
        ]}>
          Apariencia
        </Text>
        
        <View style={[styles.option, { backgroundColor: colors.card }]}>
          <View style={styles.optionLeft}>
            <Moon 
              size={22} 
              color={colors.text}
              style={styles.optionIcon} 
            />
            <Text style={[styles.optionText, { color: colors.text }]}>
              Modo Oscuro
            </Text>
          </View>
          <Switch
            value={actualTheme === 'dark'}
            onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor="#f4f3f4"
          />
        </View>
      </View>
      
      {/* Sección de cuenta */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Cuenta
        </Text>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.danger }]} 
          onPress={handleSignOut}
        >
          <Text style={styles.buttonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 4,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 1,
    borderRadius: 8,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});