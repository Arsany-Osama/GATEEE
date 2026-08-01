import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLanguageProvider } from './context/AppLanguageContext';
import Loader from './components/Loader';
import AdminLayout from './layouts/AdminLayout';
import StudentLayout from './layouts/StudentLayout';
import AdminRoute from './routes/AdminRoute';
import ProtectedRoute from './routes/ProtectedRoute';
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminNotificationsPage = lazy(() => import('./pages/admin/AdminNotificationsPage'));
const AdminProgressPage = lazy(() => import('./pages/admin/AdminProgressPage'));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminSecurityPage = lazy(() => import('./pages/admin/AdminSecurityPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminReferencePages').then((module) => ({ default: module.AdminCategoriesPage })));
const AdminInstructorsPage = lazy(() => import('./pages/admin/AdminReferencePages').then((module) => ({ default: module.AdminInstructorsPage })));
const AdminLecturesPage = lazy(() => import('./pages/admin/AdminReferencePages').then((module) => ({ default: module.AdminLecturesPage })));
const AdminCouponsPage = lazy(() => import('./pages/admin/AdminReferencePages').then((module) => ({ default: module.AdminCouponsPage })));
const CertificateVerification = lazy(() => import('./pages/CertificateVerification'));
const CourseEditorPage = lazy(() => import('./pages/admin/CourseEditorPage'));
const CoursesPage = lazy(() => import('./pages/admin/CoursesPage'));
const CoursePlayer = lazy(() => import('./pages/CoursePlayer'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Home = lazy(() => import('./pages/Home'));
const Learning = lazy(() => import('./pages/Learning'));
const Login = lazy(() => import('./pages/Login'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const PaymentInstructions = lazy(() => import('./pages/PaymentInstructions'));
const PaymentRequestsPage = lazy(() => import('./pages/admin/PaymentRequestsPage'));
const Profile = lazy(() => import('./pages/Profile'));
const QuizBuilderPage = lazy(() => import('./pages/admin/QuizBuilderPage'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const Register = lazy(() => import('./pages/Register'));
const StudentsPage = lazy(() => import('./pages/admin/StudentsPage'));

const AppRoutes = () => (
  <Suspense fallback={<Loader fullScreen label="Loading page..." />}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/learning" element={<Learning />} />
      <Route path="/payment/course/:courseId" element={<PaymentInstructions />} />
      <Route path="/verify/certificate/:uuid" element={<CertificateVerification />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute><StudentLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="/player/:courseId" element={<ProtectedRoute><CoursePlayer /></ProtectedRoute>} />
      <Route path="/quiz/:lessonId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
      <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/students" element={<StudentsPage />} />
        <Route path="/admin/courses" element={<CoursesPage />} />
        <Route path="/admin/courses/:id/edit" element={<CourseEditorPage />} />
        <Route path="/admin/categories" element={<AdminCategoriesPage />} />
        <Route path="/admin/instructors" element={<AdminInstructorsPage />} />
        <Route path="/admin/lectures" element={<AdminLecturesPage />} />
        <Route path="/admin/payment-requests" element={<PaymentRequestsPage />} />
        <Route path="/admin/coupons" element={<AdminCouponsPage />} />
        <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
        <Route path="/admin/progress" element={<AdminProgressPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/admin/quizzes" element={<QuizBuilderPage />} />
        <Route path="/admin/security" element={<AdminSecurityPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

const ScrollToTop = () => {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (hash) {
      window.requestAnimationFrame(() => {
        const target = document.getElementById(hash.slice(1));
        if (!target) return;
        const offset = 88;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(top, 0), left: 0, behavior: 'auto' });
      });
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [hash, pathname]);

  return null;
};

const App = () => (
  <AuthProvider>
    <AppLanguageProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
    </AppLanguageProvider>
  </AuthProvider>
);

export default App;
