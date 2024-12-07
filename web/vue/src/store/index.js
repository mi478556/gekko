import { createApp } from 'vue';
import { createStore } from 'vuex';
import _ from 'lodash';

// Import mutation modules
import * as importMutations from './modules/imports/mutations';
import * as gekkoMutations from './modules/gekkos/mutations';
import * as notificationMutations from './modules/notifications/mutations';
import * as configMutations from './modules/config/mutations';

// Merge mutations
let mutations = {};
_.merge(mutations, importMutations);
_.merge(mutations, gekkoMutations);
_.merge(mutations, notificationMutations);
_.merge(mutations, configMutations);

// Create the Vuex store
const store = createStore({
  state: {
    warnings: {
      connected: true, // assume we will connect
    },
    imports: [],
    gekkos: {},
    archivedGekkos: {},
    connection: {
      disconnected: false,
      reconnected: false,
    },
    apiKeys: [],
    exchanges: {},
  },
  mutations,
  strict: process.env.NODE_ENV !== 'production',
});

export default store;
