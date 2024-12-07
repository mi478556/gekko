import { get } from '../../../tools/ajax';
import store from '../../';
import { bus } from '../../../components/global/ws';

const transformMarkets = (backendData) => {
  if (!backendData) {
    return {};
  }

  const exchangesRaw = backendData;
  const exchangesTemp = {};

  exchangesRaw.forEach((e) => {
    exchangesTemp[e.slug] = exchangesTemp[e.slug] || { markets: {} };

    e.markets.forEach((pair) => {
      const [currency, asset] = pair['pair'];
      exchangesTemp[e.slug].markets[currency] =
        exchangesTemp[e.slug].markets[currency] || [];
      exchangesTemp[e.slug].markets[currency].push(asset);
    });

    if ('exchangeMaxHistoryAge' in e) {
      exchangesTemp[e.slug].exchangeMaxHistoryAge = e.exchangeMaxHistoryAge;
    }

    exchangesTemp[e.slug].importable = !!e.providesFullHistory;
    exchangesTemp[e.slug].tradable = !!e.tradable;
    exchangesTemp[e.slug].requires = e.requires;
  });

  return exchangesTemp;
};

const init = () => {
  get('apiKeys', (err, resp) => {
    if (!err) {
      store.commit('syncApiKeys', resp);
    }
  });

  get('exchanges', (err, resp) => {
    if (!err) {
      store.commit('syncExchanges', transformMarkets(resp));
    }
  });
};

const sync = () => {
  // Use `mitt` syntax
  bus.on('apiKeys', (data) => {
    store.commit('syncApiKeys', data.exchanges);
  });
};

export default function () {
  init();
  sync();
}
