import { createApp } from 'vue';
import App from './App.vue';

import { createRouter, createWebHashHistory } from 'vue-router';
import store from './store'; // Assuming the Vuex store has been updated to use `createStore`

import backtester from './components/backtester/backtester.vue';
import home from './components/layout/home.vue';

import data from './components/data/data.vue';
import importer from './components/data/import/importer.vue';
import singleImport from './components/data/import/single.vue';
import config from './components/config/config.vue';

import gekkoList from './components/gekko/list.vue';
import newGekko from './components/gekko/new.vue';
import singleGekko from './components/gekko/singleGekko.vue';
import { connect as connectWS } from './components/global/ws';

// Define your routes
const routes = [
  { path: '/', redirect: '/home' },
  { path: '/home', component: home },
  { path: '/backtest', component: backtester },
  { path: '/config', component: config },
  { path: '/data', component: data },
  { path: '/data/importer', component: importer },
  { path: '/data/importer/import/:id', component: singleImport },
  { path: '/live-gekkos', component: gekkoList },
  { path: '/live-gekkos/new', component: newGekko },
  { path: '/live-gekkos/:id', component: singleGekko },
];

// Create the router instance
const router = createRouter({
  history: createWebHashHistory(), // Equivalent to `mode: 'hash'` in Vue 2
  routes,
});

// Initialize WebSocket connection
connectWS();

// Create the Vue app instance
const app = createApp(App);

// Use the store and router
app.use(store);
app.use(router);

// Mount the app
app.mount('#app');
