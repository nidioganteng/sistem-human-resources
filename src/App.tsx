import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '@/app/AppRoutes';
import { AuthProvider } from '@/auth/AuthContext';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
