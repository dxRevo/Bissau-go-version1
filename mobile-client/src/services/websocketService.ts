import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3008';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<Function>> = new Map();

  async connect(token: string): Promise<void> {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      const wsUrl = API_URL.replace('/api', '');
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

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.reconnectAttempts++;
    });

    this.socket.on('connected', (data) => {
      console.log('📡 WebSocket connected:', data);
    });

    this.socket.on('ride_accepted', (data) => {
      console.log('✅ Ride accepted via WebSocket:', data);
      this.emit('ride_accepted', data);
    });

    this.socket.on('delivery_accepted', (data) => {
      console.log('✅ Delivery accepted via WebSocket:', data);
      this.emit('delivery_accepted', data);
    });

    this.socket.on('ride_status_changed', (data) => {
      console.log('🔄 Ride status changed via WebSocket:', data);
      this.emit('ride_status_changed', data);
    });
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      console.log('🔌 WebSocket disconnected');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const websocketService = new WebSocketService();






