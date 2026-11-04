import { useCallback, useEffect, useRef, useState } from 'react';
import { wsUrl } from './backend.js';
import { clearRoomToken } from './roomToken.js';

const MAX_BACKOFF_MS = 5000;

// A tela é só um reflexo do servidor: a cada (re)conexão chega o estado completo.
export function useRoom(roomId, token) {
  const [connection, setConnection] = useState('connecting');
  const [state, setState] = useState(null);
  const [role, setRole] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [fatal, setFatal] = useState(null);
  const [error, setError] = useState(null);
  // Chega junto com o estado, para o relógio não depender da hora do PC de cada um.
  const [syncedAt, setSyncedAt] = useState(0);
  const socket = useRef(null);

  useEffect(() => {
    let stopped = false;
    let attempts = 0;
    let retry;

    function connect() {
      const ws = new WebSocket(wsUrl());
      socket.current = ws;
      setConnection(attempts === 0 ? 'connecting' : 'reconnecting');

      ws.onopen = () => ws.send(JSON.stringify({ type: 'join', roomId, token }));

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'joined') {
          attempts = 0;
          setConnection('online');
          setRole(message.role);
          setTokens(message.tokens);
        } else if (message.type === 'state') {
          setState(message.state);
          setSyncedAt(performance.now());
        } else if (message.type === 'error') {
          setError({ message: message.message, at: Date.now() });
        } else if (message.type === 'fatal') {
          stopped = true;
          // Um código recusado não pode ficar guardado, senão o link de espectador também falharia nesta aba.
          clearRoomToken(roomId);
          setFatal(message.message);
          ws.close();
        }
      };

      ws.onclose = () => {
        if (stopped) return;
        setConnection('reconnecting');
        const delay = Math.min(500 * 2 ** attempts, MAX_BACKOFF_MS);
        attempts += 1;
        retry = setTimeout(connect, delay);
      };
    }

    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      socket.current?.close();
    };
  }, [roomId, token]);

  const send = useCallback((message) => {
    if (socket.current?.readyState !== WebSocket.OPEN) return false;
    socket.current.send(JSON.stringify(message));
    return true;
  }, []);

  return { connection, state, role, tokens, fatal, error, syncedAt, send };
}
