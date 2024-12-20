import { reactive } from 'vue';

export const addImport = (state, imp) => {
  state.imports.push(imp);
  return state;
};

export const syncImports = (state, imports) => {
  state.imports = imports;
  return state;
};

export const updateImport = (state, update) => {
  let index = state.imports.findIndex(i => i.id === update.import_id);
  let item = state.imports[index];
  if (!item) return state;

  // Use Object.assign to update the object
  let updated = Object.assign({}, item, update.updates);

  // Replace the old item with the updated one using Vue's reactivity
  state.imports.splice(index, 1, reactive(updated));

  return state;
};