import type {
  ClientMessage,
  ServerMessage,
} from '@interview-copilot/shared';
import { useStore } from '../sidepanel/store';

const WS_URL = 'ws://localhost:3001/ws';
const PING_INTERVAL_MS = 25_000;

let socket: WebSocket | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;

export function connect(): void {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  useStore.getState().setWsStatus('connecting');
  socket = new WebSocket(WS_URL);

  socket.addEventListener('open', () => {
    useStore.getState().setWsStatus('open');
    pingTimer = setInterval(() => {
      send({ type: 'PING' });
    }, PING_INTERVAL_MS);
  });

  socket.addEventListener('message', (ev) => {
    if (typeof ev.data !== 'string') return;
    try {
      const msg = JSON.parse(ev.data) as ServerMessage;
      useStore.getState().handleServerMessage(msg);
    } catch (err) {
      console.error('Failed to parse server message', err, ev.data);
    }
  });

  socket.addEventListener('close', () => {
    useStore.getState().setWsStatus('closed');
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  });

  socket.addEventListener('error', (err) => {
    console.error('WS error', err);
  });
}

export function send(msg: ClientMessage): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('WS not open; dropping message', msg.type);
    return;
  }
  socket.send(JSON.stringify(msg));
}

export function sendBinary(data: Blob | ArrayBuffer): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(data);
}

export function disconnect(): void {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  socket?.close();
  socket = null;
}
