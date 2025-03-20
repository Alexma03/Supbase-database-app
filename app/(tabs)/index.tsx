import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert
} from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { EmailSubmission } from '@/types/supabase';
import { useRouter } from 'expo-router';
import { Trash2, CheckCircle, XCircle } from 'lucide-react-native';

const PAGE_SIZE = 20;

export default function SubmissionsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMessageStatus, setSelectedMessageStatus] = useState<'read' | 'unread'>('unread');

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
    }
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['email-submissions'],
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      const { data, error } = await supabase
        .from('email_submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      // Use double assertion to safely convert types
      return (data as unknown) as EmailSubmission[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: EmailSubmission[], allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleLongPress = (message: EmailSubmission) => {
    setSelectedMessageId(message.id);
    setSelectedMessageStatus(message.status);
    setModalVisible(true);
  };
  
  const handleToggleReadStatus = () => {
    if (!selectedMessageId) return;
    
    if (selectedMessageStatus === 'read') {
      markAsUnread(selectedMessageId);
    } else {
      markAsRead(selectedMessageId);
    }
    
    setModalVisible(false);
  };
  
  const handleDelete = () => {
    setModalVisible(false);
    
    if (!selectedMessageId) return;
    
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
          onPress: () => selectedMessageId && deleteMessage(selectedMessageId),
          style: "destructive"
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {(error as Error).message}</Text>
      </View>
    );
  }

  // Use double assertion to ensure type safety
  const allSubmissions = (data?.pages.flat() ?? []) as unknown as EmailSubmission[];

  if (allSubmissions.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No submissions yet</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: EmailSubmission }) => (
    <TouchableOpacity 
      onPress={() => router.push(`/message/${item.id}`)}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={300}
    >
      <View style={styles.card}>
        <Text style={styles.subject}>{item.subject}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <View style={styles.details}>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
          <Text style={[styles.status, item.status === 'read' ? styles.read : styles.unread]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <FlatList<EmailSubmission>
        data={allSubmissions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} color="#007AFF" />
          ) : null
        }
      />
      
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
              {selectedMessageStatus === 'read' ? (
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subject: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: '#666',
    fontSize: 14,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  read: {
    backgroundColor: '#D4EDDA',
    color: '#155724',
  },
  unread: {
    backgroundColor: '#FFF3CD',
    color: '#856404',
  },
  pending: {
    backgroundColor: '#FFF3CD',
    color: '#856404',
  },
  verified: {
    backgroundColor: '#D4EDDA',
    color: '#155724',
  },
  invalid: {
    backgroundColor: '#F8D7DA',
    color: '#721C24',
  },
  errorText: {
    color: '#721C24',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 16,
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