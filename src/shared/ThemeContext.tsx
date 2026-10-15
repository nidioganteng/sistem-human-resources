import { createContext, useContext } from 'react';

// Dark mode dihapus -- aplikasi selalu light mode.
// File ini dipertahankan agar import lama tidak perlu diubah sekaligus.

interface ThemeContextValue {
  theme: 'light';
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggle: () => undefined,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: 'light', toggle: () => undefined }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
