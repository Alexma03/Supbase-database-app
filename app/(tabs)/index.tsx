import React, { useCallback, useState, useRef, useEffect } from 'react';
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
  Alert,
  Animated,
  Easing,
  TextInput,
  Keyboard,
} from 'react-native';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { EmailSubmission } from '@/types/supabase';
import { useRouter } from 'expo-router';
import {
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  ChevronDown,
} from 'lucide-react-native';
import { deleteEmailSubmission } from '@/lib/services';
import { useTheme } from '@/contexts/ThemeContext';

const PAGE_SIZE = 20;
const DEBOUNCE_TIME = 500; // 500ms antes de realizar la búsqueda

// Animation constants
const ANIMATION_DURATION = 250; // Slower animation (250ms)

// Definir interfaz para las props del SearchBar
interface SearchBarProps {
  searchText: string;
  setSearchText: (text: string) => void;
  searchParam: string;
  setSearchParam: (param: string) => void;
  isSearching: boolean;
  setIsSearching: (isSearching: boolean) => void;
  colors: any;
}

// Componente separado para la barra de búsqueda
function SearchBar({
  searchText,
  setSearchText,
  searchParam,
  setSearchParam,
  isSearching,
  setIsSearching,
  colors,
}: SearchBarProps) {
  const [localSearchText, setLocalSearchText] = useState(searchText);
  const [showSearchParams, setShowSearchParams] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput | null>(null);

  // Lista de parámetros de búsqueda disponibles
  const searchParams = [
    { label: 'Asunto', value: 'subject' },
    { label: 'Email', value: 'email' },
    { label: 'Nombre', value: 'name' },
    { label: 'Mensaje', value: 'message' },
  ];

  // Obtener etiqueta del parámetro actual
  const getSearchParamLabel = () => {
    return (
      searchParams.find((param) => param.value === searchParam)?.label ||
      'Asunto'
    );
  };

  // Aplicar debounce a la búsqueda
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      setSearchText(localSearchText);
      setIsSearching(!!localSearchText);
    }, DEBOUNCE_TIME);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [localSearchText]);

  // Función para limpiar la búsqueda
  const handleClearSearch = () => {
    setLocalSearchText('');
    setSearchText('');
    setIsSearching(false);
    // Enfocar el input nuevamente
    inputRef.current?.focus();
  };

  return (
    <View
      style={[
        styles.searchContainer,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View
        style={[styles.searchInputContainer, { backgroundColor: colors.card }]}
      >
        <Search
          size={20}
          color={colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={`Buscar por ${getSearchParamLabel().toLowerCase()}...`}
          placeholderTextColor={colors.textSecondary}
          value={localSearchText}
          onChangeText={setLocalSearchText}
          returnKeyType="search"
          clearButtonMode="never" // Usaremos nuestro propio botón de limpiar
        />
        {localSearchText.length > 0 && (
          <TouchableOpacity
            onPress={handleClearSearch}
            style={styles.clearButton}
          >
            <Text
              style={[styles.clearButtonText, { color: colors.textSecondary }]}
            >
              ×
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.paramSelector}
        onPress={() => {
          setShowSearchParams(!showSearchParams);
          Keyboard.dismiss();
        }}
      >
        <Text style={[styles.paramSelectorText, { color: colors.primary }]}>
          {getSearchParamLabel()}
        </Text>
        <ChevronDown size={16} color={colors.primary} />
      </TouchableOpacity>

      {showSearchParams && (
        <View
          style={[
            styles.paramDropdown,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {searchParams.map((param) => (
            <TouchableOpacity
              key={param.value}
              style={[
                styles.paramOption,
                { borderBottomColor: colors.border },
                param.value === searchParam && styles.paramOptionSelected,
              ]}
              onPress={() => {
                setSearchParam(param.value);
                setShowSearchParams(false);
                // Enfocar el input después de seleccionar un parámetro
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
            >
              <Text
                style={[
                  styles.paramOptionText,
                  { color: colors.text },
                  param.value === searchParam && {
                    color: colors.primary,
                    fontWeight: '600',
                  },
                ]}
              >
                {param.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function SubmissionsScreen() {
  const { colors, actualTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMessageStatus, setSelectedMessageStatus] = useState<
    'read' | 'unread'
  >('unread');
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchParam, setSearchParam] = useState('subject');
  const [isSearching, setIsSearching] = useState(false);

  // Animation values map
  const animatedValues = useRef(new Map()).current;
  // Store navigation timeouts to be able to cancel them
  const navigationTimeouts = useRef(new Map()).current;

  // Clean up animations when component unmounts
  useEffect(() => {
    return () => {
      // Clear all navigation timeouts
      navigationTimeouts.forEach((timeout) => clearTimeout(timeout));
      navigationTimeouts.clear();

      // Reset all animations
      animatedValues.forEach((value) => {
        value.setValue(0);
      });
    };
  }, []);

  // Get or create animated value for an item
  const getAnimatedValue = (id: string) => {
    if (!animatedValues.has(id)) {
      animatedValues.set(id, new Animated.Value(0));
    }
    return animatedValues.get(id);
  };

  // Start animation for pressed card
  const animatePress = (id: string, pressed: boolean) => {
    // Clear any existing timeout for this id
    if (navigationTimeouts.has(id)) {
      clearTimeout(navigationTimeouts.get(id));
      navigationTimeouts.delete(id);
    }

    const toValue = pressed ? 1 : 0;
    Animated.timing(getAnimatedValue(id), {
      toValue,
      duration: pressed ? ANIMATION_DURATION : ANIMATION_DURATION * 1.2, // Slower release
      easing: pressed
        ? Easing.bezier(0.2, 0.8, 0.2, 1)
        : Easing.bezier(0.33, 0, 0.66, 1),
      useNativeDriver: false,
    }).start();

    setPressedId(pressed ? id : null);
  };

  // Handle actual navigation with delay for visual feedback
  const handleCardPress = (id: string) => {
    animatePress(id, true);

    // Delay navigation slightly to see the animation
    const timeout = setTimeout(() => {
      // Reset animation before navigating
      animatePress(id, false);

      // Small additional delay before actual navigation
      setTimeout(() => {
        router.push(`/message/${id}`);
      }, 50);

      // Clean up the timeout reference
      if (navigationTimeouts.has(id)) {
        navigationTimeouts.delete(id);
      }
    }, ANIMATION_DURATION * 0.5);

    // Store timeout reference
    navigationTimeouts.set(id, timeout);
  };

  // Cancel navigation and reset animation if press is released
  const handlePressOut = (id: string) => {
    if (pressedId !== id) return;

    // Check if we have a pending navigation
    if (navigationTimeouts.has(id)) {
      clearTimeout(navigationTimeouts.get(id));
      navigationTimeouts.delete(id);
    }

    // Reset the animation
    animatePress(id, false);
  };

  // Nueva mutación para actualizar el estatus usando la función RPC
  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({
      messageId,
      newStatus,
    }: {
      messageId: string;
      newStatus: string;
    }) => {
      const { data, error } = await supabase.rpc(
        'update_email_submission_status',
        {
          new_status: newStatus,
          submission_id: messageId,
        }
      );
      if (error) {
        console.error('Error updating status:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-submissions'] });
    },
  });

  // Mutation para eliminar el mensaje usando la función RPC definida en Supabase
  const { mutate: deleteMessage } = useMutation({
    mutationFn: async (messageId: string) => {
      return await deleteEmailSubmission(messageId);
    },
    onSuccess: () => {
      // Invalidar la consulta para actualizar la lista de mensajes
      queryClient.invalidateQueries({ queryKey: ['email-submissions'] });
    },
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
    queryKey: ['email-submissions', searchParam, searchText],
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;

      // Crear la consulta base
      let query = supabase
        .from('email_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtro de búsqueda si hay texto
      if (searchText) {
        query = query.ilike(searchParam, `%${searchText}%`);
      }

      // Aplicar paginación
      const { data, error } = await query.range(
        page * PAGE_SIZE,
        (page + 1) * PAGE_SIZE - 1
      );

      if (error) throw error;
      return data as unknown as EmailSubmission[];
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

    // Si el mensaje está en "read", se cambia a "unread" y viceversa
    const newStatus = selectedMessageStatus === 'read' ? 'unread' : 'read';
    updateStatus({ messageId: selectedMessageId, newStatus });

    setModalVisible(false);
  };

  const handleDelete = () => {
    setModalVisible(false);

    if (!selectedMessageId) return;

    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro que deseas eliminar este mensaje? Esta acción no se puede deshacer.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          onPress: () => selectedMessageId && deleteMessage(selectedMessageId),
          style: 'destructive',
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: EmailSubmission }) => {
    const animatedValue = getAnimatedValue(item.id);

    // Interpolate animation values
    const scale = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.96],
    });

    const backgroundColor = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [
        colors.card,
        actualTheme === 'dark' ? '#1A1A1A' : '#f0f2f5',
      ],
    });

    const elevation = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [3, 1],
    });

    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => handleCardPress(item.id)}
        onLongPress={() => handleLongPress(item)}
        onPressIn={() => animatePress(item.id, true)}
        onPressOut={() => handlePressOut(item.id)}
        delayLongPress={300}
        style={styles.cardContainer}
      >
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale }],
              backgroundColor,
              elevation,
              shadowOpacity: elevation.interpolate({
                inputRange: [1, 3],
                outputRange: [0.05, 0.1],
              }),
            },
          ]}
        >
          <Text style={[styles.subject, { color: colors.text }]}>
            {item.subject}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>
            {item.email}
          </Text>
          <View style={styles.details}>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
            <Text
              style={[
                styles.status,
                item.status === 'read'
                  ? { backgroundColor: '#D4EDDA', color: '#155724' }
                  : { backgroundColor: '#FFF3CD', color: '#856404' },
              ]}
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[styles.mainContainer, { backgroundColor: colors.background }]}
    >
      {/* Barra de búsqueda separada */}
      <SearchBar
        searchText={searchText}
        setSearchText={setSearchText}
        searchParam={searchParam}
        setSearchParam={setSearchParam}
        isSearching={isSearching}
        setIsSearching={setIsSearching}
        colors={colors}
      />

      {/* Contenedor para el contenido principal (siempre presente) */}
      <View
        style={[
          styles.contentContainer,
          { backgroundColor: colors.background },
        ]}
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: colors.danger }]}>
              Error: {(error as Error).message}
            </Text>
          </View>
        ) : (data?.pages.flat() ?? []).length === 0 ? (
          <View style={styles.centered}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {isSearching ? 'No se encontraron resultados' : 'No hay mensajes'}
            </Text>
          </View>
        ) : (
          <FlatList<EmailSubmission>
            data={(data?.pages.flat() ?? []) as unknown as EmailSubmission[]}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.container}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator
                  style={styles.footer}
                  color={colors.primary}
                />
              ) : null
            }
          />
        )}
      </View>

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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleToggleReadStatus}
            >
              {selectedMessageStatus === 'read' ? (
                <>
                  <XCircle
                    size={22}
                    color={colors.primary}
                    style={styles.modalIcon}
                  />
                  <Text
                    style={[styles.modalOptionText, { color: colors.text }]}
                  >
                    Marcar como no leído
                  </Text>
                </>
              ) : (
                <>
                  <CheckCircle
                    size={22}
                    color={colors.primary}
                    style={styles.modalIcon}
                  />
                  <Text
                    style={[styles.modalOptionText, { color: colors.text }]}
                  >
                    Marcar como leído
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalOption,
                styles.deleteOption,
                { borderTopColor: colors.border },
              ]}
              onPress={handleDelete}
            >
              <Trash2
                size={22}
                color={colors.danger}
                style={styles.modalIcon}
              />
              <Text style={[styles.deleteText, { color: colors.danger }]}>
                Eliminar mensaje
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
  },
  container: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
    alignItems: 'center',
  },
  // Actualiza estos estilos en el StyleSheet
  modalContent: {
    borderRadius: 14,
    padding: 8,
    width: '80%',
    maxWidth: 350,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  modalIcon: {
    marginRight: 12,
  },
  modalOptionText: {
    fontSize: 16,
  },
  deleteOption: {
    borderTopWidth: 1,
  },
  deleteText: {
    fontSize: 16,
  },
  // Estilos de búsqueda
  searchContainer: {
    padding: 10,
    paddingBottom: 6,
    backgroundColor: '#fff',
    position: 'relative',
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    height: 26,
    padding: 0,
  },
  clearButton: {
    padding: 3,
  },
  clearButtonText: {
    color: '#999',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  paramSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    padding: 4,
  },
  paramSelectorText: {
    fontSize: 13,
    color: '#007AFF',
    marginRight: 3,
  },
  paramDropdown: {
    position: 'absolute',
    top: 75, // Ajustar según la nueva altura reducida
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
    borderWidth: 1,
    borderColor: '#eee',
  },
  paramOption: {
    padding: 10, // Reducido de 12
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paramOptionSelected: {
    backgroundColor: '#f0f8ff',
  },
  paramOptionText: {
    fontSize: 16,
    color: '#333',
  },
  paramOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
