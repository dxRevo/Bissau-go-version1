import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3008';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<Function>> = new Map();

  /**
   * Se connecter au WebSocket
   */
  async connect(token: string): Promise<void> {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      // Socket.io utilise HTTP/HTTPS, pas ws/wss
      const wsUrl = API_URL.replace('/api', ''); // Enlever /api car socket.io gère son propre chemin
      console.log(`🔌 Connecting to WebSocket: ${wsUrl}/realtime`);

      this.socket = io(`${wsUrl}/realtime`, {
        transports: ['websocket'],
        auth: {
          token,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      throw error;
    }
  }

  /**
   * Configurer les handlers d'événements
   */
  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;

      // Rejoindre les rooms appropriées
      this.socket?.emit('join_drivers_room');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('⚠️ Max reconnection attempts reached');
      }
    });

    this.socket.on('connected', (data) => {
      console.log('📡 WebSocket connected:', data);
    });

    // Écouter les erreurs d'authentification
    this.socket.on('error', (error: any) => {
      console.error('❌ WebSocket error:', error);
      if (error.type === 'TOKEN_EXPIRED' || error.type === 'INVALID_TOKEN') {
        console.warn('⚠️ Token expired or invalid, will attempt to reconnect with new token');
        // Le client devra se reconnecter avec un nouveau token
        this.emit('token_expired', error);
      } else {
        this.emit('error', error);
      }
    });

    // Écouter les nouvelles courses
    this.socket.on('new_ride', (data) => {
      console.log('🚗 New ride received via WebSocket:', data);
      this.emit('new_ride', data);
    });

    // Écouter les nouvelles livraisons
    this.socket.on('new_delivery', (data) => {
      console.log('📦 New delivery received via WebSocket:', data);
      this.emit('new_delivery', data);
    });

    // Écouter les changements de statut
    this.socket.on('ride_status_changed', (data) => {
      console.log('🔄 Ride status changed via WebSocket:', data);
      this.emit('ride_status_changed', data);
    });
  }

  /**
   * S'abonner à un événement
   */
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Se désabonner d'un événement
   */
  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Émettre un événement local
   */
  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  /**
   * Se déconnecter
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      console.log('🔌 WebSocket disconnected');
    }
  }

  /**
   * Vérifier si connecté
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const websocketService = new WebSocketService();

