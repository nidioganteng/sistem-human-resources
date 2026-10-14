import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '@/app/AppRoutes';
import { AuthProvider } from '@/auth/AuthContext';
import { ThemeProvider } from '@/shared/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
