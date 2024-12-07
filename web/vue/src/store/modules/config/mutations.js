export const syncApiKeys = (state, apiKeys) => {
  state.apiKeys = apiKeys; // Direct assignment
  return state;
};

export const syncExchanges = (state, exchanges) => {
  state.exchanges = exchanges; // Direct assignment
  return state;
};
