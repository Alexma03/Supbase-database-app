import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  
  return (
    <>
      <Stack.Screen options={{ 
        title: 'Página no encontrada', 
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
      }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AlertTriangle size={80} color={colors.danger} style={styles.icon} />
        <Text style={[styles.title, { color: colors.text }]}>¡Oops!</Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          La página que buscas no existe.
        </Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]}>
          <Link href="/" style={styles.link}>
            <Text style={styles.buttonText}>Volver al inicio</Text>
          </Link>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  link: {
    width: '100%',
    height: '100%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  }
});
