import mitt from 'mitt';
import _ from 'lodash';

import { wsPath } from '../../tools/api';
import initializeState from '../../store/init';

var socket = null;

// Replace Vue event bus with mitt
export const bus = mitt();

const info = {
  connected: false,
};

export const connect = () => {
  socket = new ReconnectingWebSocket(wsPath, null, { maxReconnectInterval: 4000 });

  setTimeout(() => {
    // in case we cannot connect
    if (!info.connected) {
      initializeState();
      bus.emit('WS_STATUS_CHANGE', info);
    }
  }, 500);

  socket.onopen = () => {
    if (info.connected) return;

    info.connected = true;
    bus.emit('WS_STATUS_CHANGE', info);
    initializeState();
  };

  socket.onclose = () => {
    if (!info.connected) return;

    info.connected = false;
    bus.emit('WS_STATUS_CHANGE', info);
  };

  socket.onerror = () => {
    if (!info.connected) return;

    info.connected = false;
    bus.emit('WS_STATUS_CHANGE', info);
  };

  socket.onmessage = function (message) {
    const payload = JSON.parse(message.data);
    // Emit payload type as event
    bus.emit(payload.type, payload);
  };
};
