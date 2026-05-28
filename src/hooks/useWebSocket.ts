import { useState, useEffect, useRef, useCallback } from 'react';
import type { WSMessage } from '@/types/quantum';

const WS_URL = 'ws://localhost:8000/ws';

export function useQuantumWebSocket() {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        setConnected(true);
        console.log('[QuantumWS] Connected to FastAPI backend');
      };
      
      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          setLastMessage(msg);
        } catch (e) {
          console.warn('[QuantumWS] Invalid message:', event.data);
        }
      };
      
      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };
      
      ws.onerror = () => {
        setConnected(false);
        wsRef.current = null;
      };
      
      wsRef.current = ws;
    } catch {
      setConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }, []);

  return { connected, lastMessage, send };
}
