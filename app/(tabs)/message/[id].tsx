import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';  // Add this import

export default function MessageDetail() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();  // Moved to top level
  
  // Add useEffect for navigation options
  useEffect(() => {
    navigation.setOptions({ 
      title: 'Detalle del Mensaje',
      headerLeft: () => (
        <MessageCircle 
          size={24} 
          color="#007AFF" 
          style={{ marginLeft: 15 }}
        />
      ),
    });
  }, [navigation]);
  
  const { data: message, isLoading, isError, error } = useQuery({
    queryKey: ['message', id],
    queryFn: async () => {
      try {
        console.log('Fetching message with ID:', id);
        const { data, error } = await supabase
          .from('email_submissions')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        console.log('Message data received:', data);
        return data;
      } catch (err) {
        console.error('Error in queryFn:', err);
        throw err;
      }
    },
    enabled: !!id, // Solo ejecutar la consulta si hay un ID
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
      </View>
    );
  }

  if (!message) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>No se encontró el mensaje</Text>
      </View>
    );
  }

  // Formatear la fecha solo si message existe
  const formattedDate = message.created_at 
    ? new Date(message.created_at).toLocaleDateString() 
    : '';

  return (
    <View style={styles.container}>
      <Text style={styles.subject}>{message.subject}</Text>
      <Text style={styles.email}>{message.email}</Text>
      <Text style={styles.date}>{formattedDate}</Text>
      <Text style={styles.message}>{message.message}</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => {
          Linking.openURL(`mailto:${message.email}?subject=Respuesta: ${message.subject}`);
        }}
      >
        <Text style={styles.buttonText}>Contactar por email</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 24,
    paddingBottom: 80,
    backgroundColor: 'white',
    flex: 1 
  },
  subject: { 
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12
  },
  email: { 
    fontSize: 18,
    color: '#666',
    marginBottom: 8
  },
  date: { 
    fontSize: 16,
    color: '#999',
    marginBottom: 24
  },
  message: { 
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 100
  },
  button: {
    marginTop: 'auto',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    width: '100%'
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  },
  errorText: {
    color: '#721C24',
    fontSize: 16,
    textAlign: 'center',
  }
});