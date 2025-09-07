import { create } from "zustand";

type PageStore = {
  current: number; // 1-based index
  total: number; // >= 1
  dropdownOpen: boolean;
  next: () => void;
  prev: () => void;
  openDropdown: () => void;
  closeDropdown: () => void;
  toggleDropdown: () => void;
  setTotal: (n: number) => void;
  setCurrent: (n: number) => void;
};

export const usePageStore = create<PageStore>()((set, get) => ({
  current: 1,
  total: 1,
  dropdownOpen: false,
  next: () => set((s) => ({ current: Math.min(s.current + 1, Math.max(1, s.total)) })),
  prev: () => set((s) => ({ current: Math.max(1, s.current - 1) })),
  openDropdown: () => set({ dropdownOpen: true }),
  closeDropdown: () => set({ dropdownOpen: false }),
  toggleDropdown: () => set((s) => ({ dropdownOpen: !s.dropdownOpen })),
  setTotal: (n) => set((s) => ({ total: Math.max(1, Math.floor(n)), current: Math.min(s.current, Math.max(1, Math.floor(n))) })),
  setCurrent: (n) => set((s) => ({ current: Math.min(Math.max(1, Math.floor(n)), Math.max(1, s.total)) })),
}));

