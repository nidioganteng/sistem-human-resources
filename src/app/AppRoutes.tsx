import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '@/auth/LoginPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import MrfDetailPage from '@/features/recruitment/mrf/MrfDetailPage';
import MrfFormPage from '@/features/recruitment/mrf/MrfFormPage';
import MrfListPage from '@/features/recruitment/mrf/MrfListPage';
import VacancyListPage from '@/features/recruitment/vacancy/VacancyListPage';
import VacancyDetailPage from '@/features/recruitment/vacancy/VacancyDetailPage';
import ApplyPage from '@/features/apply/ApplyPage';
import FormPelamarPage from '@/features/form-pelamar/FormPelamarPage';
import KandidatPage from '@/features/kandidat/KandidatPage';
import KaryawanPage from '@/features/karyawan/KaryawanPage';
import PenggunaPage from '@/features/pengguna/PenggunaPage';
import OlListPage from '@/features/recruitment/ol/OlListPage';
import OlDetailPage from '@/features/recruitment/ol/OlDetailPage';
import OlResponsePage from '@/features/apply/OlResponsePage';
import EmployeeDetailPage from '@/features/karyawan/EmployeeDetailPage';
import OnboardingPage from '@/features/onboarding/OnboardingPage';
import AppShell from './AppShell';
import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/daftar/:token" element={<ApplyPage />} />
      <Route path="/form-pelamar/:token" element={<FormPelamarPage />} />
      <Route path="/ol/:token" element={<OlResponsePage />} />
      <Route path="/onboarding/:token" element={<OnboardingPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="mrf" element={<MrfListPage />} />
          <Route path="mrf/baru" element={<MrfFormPage />} />
          <Route path="mrf/:id" element={<MrfDetailPage />} />
          <Route path="mrf/:id/ubah" element={<MrfFormPage />} />
          <Route path="lowongan" element={<VacancyListPage />} />
          <Route path="lowongan/:id" element={<VacancyDetailPage />} />
          <Route path="kandidat" element={<KandidatPage />} />
          <Route path="karyawan" element={<KaryawanPage />} />
          <Route path="karyawan/:id" element={<EmployeeDetailPage />} />
          <Route path="pengguna" element={<PenggunaPage />} />
          <Route path="offering-letters" element={<OlListPage />} />
          <Route path="offering-letters/:id" element={<OlDetailPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
