import { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Linking,
  Modal,
  Alert,
  Pressable
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { MessageCircle, AlertCircle, Trash2, CheckCircle, XCircle } from 'lucide-react-native';
import type { EmailSubmission } from '@/types/supabase';

export default function MessageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  
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
  
  // Mutation para marcar el mensaje como leído
  const { mutate: markAsRead } = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('email_submissions')
        .update({ status: 'read' })
        .eq('id', messageId);
      
      if (error) {
        console.error('Error marking message as read:', error);
        throw error;
      }
      return true;
    },
    onSuccess: () => {
      // Invalidar la consulta para actualizar la lista de mensajes
      queryClient.invalidateQueries({ queryKey: ['email-submissions'] });
      // Actualizar el mensaje actual en la cache
      queryClient.setQueryData(['message', id], (oldData: any) => {
        if (oldData) {
          return { ...oldData, status: 'read' };
        }
        return oldData;
      });
    }
  });
  
  // Mutation para marcar el mensaje como no leído
  const { mutate: markAsUnread } = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('email_submissions')
        .update({ status: 'unread' })
        .eq('id', messageId);
      
      if (error) {
        console.error('Error marking message as unread:', error);
        throw error;
      }
      return true;
    },
    onSuccess: () => {
      // Invalidar la consulta para actualizar la lista de mensajes
      queryClient.invalidateQueries({ queryKey: ['email-submissions'] });
      // Actualizar el mensaje actual en la cache
      queryClient.setQueryData(['message', id], (oldData: any) => {
        if (oldData) {
          return { ...oldData, status: 'unread' };
        }
        return oldData;
      });
    }
  });
  
  // Mutation para eliminar el mensaje
  const { mutate: deleteMessage } = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('email_submissions')
        .delete()
        .eq('id', messageId);
      
      if (error) {
        console.error('Error deleting message:', error);
        throw error;
      }
      return true;
    },
    onSuccess: () => {
      // Invalidar la consulta para actualizar la lista de mensajes
      queryClient.invalidateQueries({ queryKey: ['email-submissions'] });
      // Regresar a la lista después de eliminar
      router.navigate('/');
    }
  });
  
  const { data: message, isLoading, isError, error } = useQuery({
    queryKey: ['message', id],
    queryFn: async () => {
      try {
        console.log('Fetching message with ID:', id);
        // Using string cast to avoid type errors with Supabase query
        const stringId = String(id);
        const { data, error } = await supabase
          .from('email_submissions')
          .select('*')
          .eq('id', stringId as unknown as any)
          .single();
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        console.log('Message data received:', data);
        if (!data) {
          throw new Error('Mensaje no encontrado');
        }
        
        return (data as unknown) as EmailSubmission;
      } catch (err) {
        console.error('Error in queryFn:', err);
        throw err;
      }
    },
    enabled: !!id,
  });

  // Efecto para marcar como leído cuando se carga el mensaje
  useEffect(() => {
    if (message && message.status === 'unread' && id) {
      console.log('Marking message as read:', id);
      markAsRead(String(id));
    }
  }, [message, id, markAsRead]);
  
  const handleToggleReadStatus = () => {
    if (!message || !id) return;
    
    if (message.status === 'read') {
      markAsUnread(String(id));
    } else {
      markAsRead(String(id));
    }
    
    setModalVisible(false);
  };
  
  const handleDelete = () => {
    setModalVisible(false);
    
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro que deseas eliminar este mensaje? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        { 
          text: "Eliminar", 
          onPress: () => id && deleteMessage(String(id)),
          style: "destructive"
        }
      ]
    );
  };
  
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (isError || !message) {
    return (
      <View style={[styles.container, styles.centered]}>
        <AlertCircle size={80} color="#FF6B6B" style={styles.icon} />
        <Text style={styles.errorTitle}>Mensaje no encontrado</Text>
        <Text style={styles.errorText}>
          {(error as Error)?.message || 'No se pudo encontrar el mensaje solicitado'}
        </Text>
        <TouchableOpacity 
          style={styles.errorButton}
          onPress={() => router.navigate('/')}
        >
          <Text style={styles.errorButtonText}>Volver a la lista</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Since we've already type-asserted in the query function, 
  // we can safely use EmailSubmission properties
  const formattedDate = message.created_at 
    ? new Date(message.created_at).toLocaleDateString() 
    : '';

  return (
    <View style={styles.container}>
      <Pressable 
        style={styles.contentContainer} 
        onLongPress={() => setModalVisible(true)}
        delayLongPress={300}
      >
        <Text style={styles.subject}>{message.subject}</Text>
        <Text style={styles.email}>{message.email}</Text>
        <Text style={styles.date}>{formattedDate}</Text>
        <Text style={styles.message}>{message.message}</Text>
      </Pressable>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => {
          Linking.openURL(`mailto:${message.email}?subject=Respuesta: ${message.subject}`);
        }}
      >
        <Text style={styles.buttonText}>Contactar por email</Text>
      </TouchableOpacity>
      
      {/* Modal de menú contextual */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={handleToggleReadStatus}
            >
              {message.status === 'read' ? (
                <>
                  <XCircle size={22} color="#007AFF" style={styles.modalIcon} />
                  <Text style={styles.modalOptionText}>Marcar como no leído</Text>
                </>
              ) : (
                <>
                  <CheckCircle size={22} color="#007AFF" style={styles.modalIcon} />
                  <Text style={styles.modalOptionText}>Marcar como leído</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalOption, styles.deleteOption]}
              onPress={handleDelete}
            >
              <Trash2 size={22} color="#FF3B30" style={styles.modalIcon} />
              <Text style={styles.deleteText}>Eliminar mensaje</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
  contentContainer: {
    flex: 1
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  errorButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    marginBottom: 20,
  },
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 8,
    width: '80%',
    maxWidth: 350,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8
  },
  modalIcon: {
    marginRight: 12
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333'
  },
  deleteOption: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2'
  },
  deleteText: {
    fontSize: 16,
    color: '#FF3B30'
  }
});