import { create } from 'zustand';

let n = 0;
export const useToasts = create((set, get) => ({
  items: [],
  push(text, kind = 'info') {
    const id = ++n;
    set({ items: [...get().items, { id, text, kind }] });
    setTimeout(() => set({ items: get().items.filter((t) => t.id !== id) }), 4000);
  },
}));

export const toast = {
  info: (t) => useToasts.getState().push(t, 'info'),
  error: (t) => useToasts.getState().push(t, 'error'),
  success: (t) => useToasts.getState().push(t, 'success'),
};
