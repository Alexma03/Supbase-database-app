import { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Linking,
  Modal,
  Alert,
  Pressable,
  Animated,
  Easing
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { MessageCircle, AlertCircle, Trash2, CheckCircle, XCircle } from 'lucide-react-native';
import type { EmailSubmission } from '@/types/supabase';
import { deleteEmailSubmission, updateEmailSubmissionStatus } from '@/lib/services';

export default function MessageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  
  // Animation values
  const pressAnimation = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;
  
  // Run entrance animation when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  // Handle press animation
  const handlePressIn = () => {
    Animated.timing(pressAnimation, {
      toValue: 1,
      duration: 250, // Slower animation
      easing: Easing.bezier(0.2, 0.8, 0.2, 1), // Smooth bezier curve
      useNativeDriver: false, // We need to animate backgroundColor
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.timing(pressAnimation, {
      toValue: 0,
      duration: 300, // Even slower release
      easing: Easing.bezier(0.4, 0, 0.2, 1), // Smooth return
      useNativeDriver: false,
    }).start();
  };

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
      return await updateEmailSubmissionStatus(messageId, 'read');
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
      return await updateEmailSubmissionStatus(messageId, 'unread');
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
      return await deleteEmailSubmission(messageId);
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
    
  // Interpolated animation values
  const scale = pressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.99],
  });
  
  const backgroundColor = pressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff', '#f9f9f9'],
  });

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.contentWrapper,
          {
            opacity: contentOpacity,
            transform: [
              { translateY: contentTranslateY },
            ],
          }
        ]}
      >
        <Pressable 
          onLongPress={() => setModalVisible(true)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          delayLongPress={300}
          style={({ pressed }) => [
            styles.messageContent,
            { backgroundColor: pressed ? '#f9f9f9' : 'white' }
          ]}
        >
          <Animated.View style={{
            transform: [{ scale }],
            backgroundColor,
            flex: 1,
          }}>
            <Text style={styles.subject}>{message.subject}</Text>
            <Text style={styles.email}>{message.email}</Text>
            <Text style={styles.date}>{formattedDate}</Text>
            <Text style={styles.message}>{message.message}</Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
      
      <TouchableOpacity 
        style={styles.button}
        activeOpacity={0.85} // Even more subtle opacity effect
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
    padding: 20,
    paddingBottom: 80,
    backgroundColor: 'white',
    flex: 1 
  },
  contentWrapper: {
    flex: 1,
  },
  messageContent: {
    flex: 1,
    paddingVertical: 10,
  },
  subject: { 
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 14
  },
  email: { 
    fontSize: 18,
    color: '#666',
    marginBottom: 8
  },
  date: { 
    fontSize: 16,
    color: '#999',
    marginBottom: 30
  },
  message: { 
    fontSize: 18,
    lineHeight: 28,
  },
  button: {
    marginTop: 25,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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