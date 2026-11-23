import { create } from 'zustand';
import { api } from '../lib/api';

export const useAuth = create((set) => ({
  user: null,
  loading: true,

  async init() {
    if (!localStorage.getItem('token')) return set({ loading: false });
    try {
      const { user } = await api('/auth/me');
      set({ user, loading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, loading: false });
    }
  },
  async login(email, password) {
    const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } });
    localStorage.setItem('token', token);
    set({ user });
  },
  async signup(name, email, password) {
    const { token, user } = await api('/auth/signup', { method: 'POST', body: { name, email, password } });
    localStorage.setItem('token', token);
    set({ user });
  },
  async logout() {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    localStorage.removeItem('token');
    set({ user: null });
  },
  clear() {
    localStorage.removeItem('token');
    set({ user: null });
  },
}));
