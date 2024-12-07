import store from '../../';
import { bus } from '../../../components/global/ws';

const init = () => {};

const sync = () => {
  // Replace $on with on for mitt
  bus.on('WS_STATUS_CHANGE', (ws) => {
    store.commit('setGlobalWarning', { key: 'connected', value: ws.connected });
  });
};

export default function () {
  init();
  sync();
}
