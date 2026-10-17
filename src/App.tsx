import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '@/app/AppRoutes';
import { AuthProvider } from '@/auth/AuthContext';
import { ThemeProvider } from '@/shared/ThemeContext';
import { ToastProvider } from '@/shared/ui/Toast';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
