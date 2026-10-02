import { BrowserRouter as Router, Navigate, Routes, Route, useSearchParams, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import { lazyWithRetry as lazy } from './utils/lazyWithRetry';
import { useSettingsStore } from './stores/settingsStore';
import { Header } from './Header';
import { LoadingSpinner } from './components/LoadingSpinner';
import IOSInstallBanner from './components/IOSInstallBanner';
import DeviceNotificationPromptBanner from './components/pwa/DeviceNotificationPromptBanner';
import PWAInstallModal from './components/pwa/PWAInstallModal';
import { SkipLink } from './components/a11y/SkipLink';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { GlobalCommandPalette } from './components/common/GlobalCommandPalette';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { AdminStudentModeBanner } from './components/admin/AdminStudentModeBanner';
import { useAuth } from './contexts/AuthProvider';
import { useStaffViewStore } from './stores/staffViewStore';
import { shouldRedirectToStaffInbox } from './utils/postLoginPath';
import { ScrollToTop } from './components/common/ScrollToTop';

const LandingPage = lazy(() => import('./components/pages/LandingPage'));
const SyllabusPage = lazy(() => import('./components/pages/SyllabusPage'));
const ModulePage = lazy(() => import('./components/pages/ModulePage'));
const TopicPage = lazy(() => import('./components/pages/TopicPage'));
const TopicQuizPage = lazy(() => import('./components/pages/TopicQuizPage'));
const PlexoCalculatorPage = lazy(() => import('./components/Plexo/PlexoCalculatorPage'));
const ExerciseMode = lazy(() => import('../ejercicios/src/components/ExerciseMode'));
const WorkshopsListPage = lazy(() => import('./components/pages/WorkshopsListPage'));
const WorkshopDetailPage = lazy(() => import('./components/pages/WorkshopDetailPage'));
const LoginPage = lazy(() => import('./components/auth/LoginPage'));
const RegisterPage = lazy(() => import('./components/auth/RegisterPage'));
const ResetPasswordPage = lazy(() => import('./components/auth/ResetPasswordPage'));
const AuthCallbackPage = lazy(() => import('./components/auth/AuthCallbackPage'));
const ContributorDashboard = lazy(() => import('./components/editorial/ContributorDashboard'));
const ProfileSetupPage = lazy(() => import('./components/editorial/ProfileSetupPage'));
const ModuleEditorPage = lazy(() => import('./components/editorial/ModuleEditorPage'));
const RevisionEditorPage = lazy(() => import('./components/editorial/RevisionEditorPage'));
const SpecialistsPage = lazy(() => import('./components/editorial/SpecialistsPage'));
const SpecialistContentHubPage = lazy(() => import('./components/pages/SpecialistContentHubPage'));
const PublicProfilePage = lazy(() => import('./components/editorial/PublicProfilePage'));
const QuizEditorPage = lazy(() => import('./components/quiz/QuizEditorPage'));
const ClinicalCaseEditorPage = lazy(() => import('./components/editorial/ClinicalCaseEditorPage'));
const StudentDashboard = lazy(() => import('./components/student/StudentDashboard'));
const SimulatorsHubPage = lazy(() => import('./components/pages/SimulatorsHubPage'));
const TraceSimulatorPage = lazy(() => import('./components/pages/TraceSimulatorPage'));
const CertificateVerifyPage = lazy(() => import('./components/pages/CertificateVerifyPage'));
const EditorialCommitteePage = lazy(() => import('./components/editorial/EditorialCommitteePage'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AdminReviewQueue = lazy(() => import('./components/admin/AdminReviewQueue'));
const AdminUsersPage = lazy(() => import('./components/admin/AdminUsersPage'));
const AdminAuditPage = lazy(() => import('./components/admin/AdminAuditPage'));
const AdminQuizAttemptsPage = lazy(() => import('./components/admin/AdminQuizAttemptsPage'));
const AdminQuizzesPage = lazy(() => import('./components/admin/AdminQuizzesPage'));
const AdminWorkshopsPage = lazy(() => import('./components/admin/AdminWorkshopsPage'));
const AdminModuleAccessPage = lazy(() => import('./components/admin/AdminModuleAccessPage'));
const AccountPage = lazy(() => import('./components/user/AccountPage'));
const SettingsPage = lazy(() => import('./components/user/SettingsPage'));
const ExamConfigPage = lazy(() => import('./components/exam/ExamConfigPage'));
const ExamSessionPage = lazy(() => import('./components/exam/ExamSessionPage'));
const ExamResultsPage = lazy(() => import('./components/exam/ExamResultsPage'));
const AdminStudentsListPage = lazy(() => import('./components/admin/AdminStudentsListPage'));
const AdminStudentProgressPage = lazy(() => import('./components/admin/AdminStudentProgressPage'));
const AdminExamAnalyticsPage = lazy(() => import('./components/admin/AdminExamAnalyticsPage'));
const AdminAssignmentsAnalyticsPage = lazy(() => import('./components/admin/AdminAssignmentsAnalyticsPage'));
const AdminAttendanceAnalyticsPage = lazy(() => import('./components/admin/AdminAttendanceAnalyticsPage'));
const AdminExerciseCasesPage = lazy(() => import('./components/admin/AdminExerciseCasesPage'));
const AdminSyllabusPage = lazy(() => import('./components/admin/AdminSyllabusPage'));
const AdminCourseWaitlistPage = lazy(() => import('./components/admin/AdminCourseWaitlistPage'));
const AdminAcademicCalendarPage = lazy(() => import('./components/admin/AdminAcademicCalendarPage'));
const AdminPortalWelcomePage = lazy(() => import('./components/admin/AdminPortalWelcomePage'));
const AdminTextbookExportPage = lazy(() => import('./components/admin/AdminTextbookExportPage'));
const CoursesCatalogPage = lazy(() => import('./components/pages/CoursesCatalogPage'));

function AdminEntryGate() {
  const { user, isAdmin, isEditor, isLoading } = useAuth();
  const location = useLocation();
  const view = useStaffViewStore((s) => s.view);
  const hydrated = useStaffViewStore((s) => s.hydrated);
  const isStaff = Boolean(user && (isAdmin || isEditor));
  const openInbox = shouldRedirectToStaffInbox({
    isStaff,
    isAdmin: Boolean(user && isAdmin),
    isLoading,
    hydrated,
    studentMode: isStaff && view === 'student',
    pathname: location.pathname,
  });
  if (!openInbox) return null;
  return <Navigate to="/admin" replace />;
}

function RedirectToPortal() {
  const [params] = useSearchParams();
  const query = params.toString();
  return <Navigate to={query ? `/portal?${query}` : '/portal'} replace />;
}

function App() {
  const { isDarkMode } = useSettingsStore();

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 pb-24 lg:pb-0">
        <SkipLink />
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <Header />
          <AdminStudentModeBanner />
          <DeviceNotificationPromptBanner />
          <AdminEntryGate />
          <GlobalCommandPalette />
          <MobileBottomNav />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/verificar/:folio" element={<CertificateVerifyPage />} />
              <Route path="/temario" element={<SyllabusPage />} />
              <Route path="/programa" element={<SyllabusPage />} />
              <Route path="/cursos" element={<CoursesCatalogPage />} />

              {/* Contenido formativo exclusivo para alumnos con suscripción */}
              <Route path="/modulo/:moduleId" element={<ProtectedRoute mode="enrolled"><ModulePage /></ProtectedRoute>} />
              <Route path="/modulo/:moduleId/evaluacion/:topicId" element={<ProtectedRoute mode="enrolled"><TopicQuizPage /></ProtectedRoute>} />
              <Route path="/modulo/:moduleId/*" element={<ProtectedRoute mode="enrolled"><TopicPage /></ProtectedRoute>} />
              
              {/* Simuladores y herramientas con candado exclusivo Premium */}
              <Route path="/simuladores/publico" element={<ExerciseMode publicMode />} />
              <Route path="/simuladores" element={<ProtectedRoute mode="premium"><SimulatorsHubPage /></ProtectedRoute>} />
              <Route path="/simuladores/trazos" element={<ProtectedRoute mode="premium"><TraceSimulatorPage /></ProtectedRoute>} />
              <Route path="/ejercicios" element={<ProtectedRoute mode="premium"><ExerciseMode /></ProtectedRoute>} />
              <Route path="/herramientas/plexo-braquial" element={<ProtectedRoute mode="premium"><PlexoCalculatorPage /></ProtectedRoute>} />

              {/* Simulador de Examen — exclusivo para alumnos */}
              <Route path="/examenes" element={<ProtectedRoute mode="enrolled"><ExamConfigPage /></ProtectedRoute>} />
              <Route path="/examenes/configurar" element={<ProtectedRoute mode="enrolled"><ExamConfigPage /></ProtectedRoute>} />
              <Route path="/examenes/sesion" element={<ProtectedRoute mode="enrolled"><ExamSessionPage /></ProtectedRoute>} />
              <Route path="/examenes/resultados" element={<ProtectedRoute mode="enrolled"><ExamResultsPage /></ProtectedRoute>} />

              {/* Talleres */}
              <Route path="/talleres" element={<WorkshopsListPage />} />
              <Route path="/taller/:workshopId" element={<WorkshopDetailPage />} />

              {/* Público */}
              <Route path="/especialistas" element={<SpecialistsPage />} />
              <Route path="/especialistas/contenido" element={<SpecialistContentHubPage />} />
              <Route path="/biblioteca" element={<SpecialistContentHubPage />} />
              <Route path="/especialistas/:userId" element={<PublicProfilePage />} />
              <Route path="/comite-editorial" element={<EditorialCommitteePage />} />

              {/* Auth */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/registro" element={<RegisterPage />} />
              <Route path="/registro" element={<RegisterPage />} />
              <Route path="/auth/recuperar-password" element={<LoginPage initialMode="recovery" />} />
              <Route path="/auth/actualizar-password" element={<ResetPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />

              {/* Perfil del Usuario / Médico */}
              <Route path="/perfil" element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />
              <Route path="/colaborador/perfil" element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />

              {/* Colaboradores (Solo accesible para usuarios autorizados por el Administrador) */}
              <Route path="/colaborador" element={<ProtectedRoute mode="contributor"><ContributorDashboard /></ProtectedRoute>} />
              <Route path="/colaborador/nueva-revision" element={<ProtectedRoute mode="verified"><RevisionEditorPage /></ProtectedRoute>} />
              <Route path="/colaborador/nuevo-modulo" element={<ProtectedRoute mode="verified"><ModuleEditorPage /></ProtectedRoute>} />
              <Route path="/colaborador/cuestionario" element={<ProtectedRoute mode="verified"><QuizEditorPage /></ProtectedRoute>} />
              <Route path="/colaborador/cuestionario/:revisionId" element={<ProtectedRoute mode="verified"><QuizEditorPage /></ProtectedRoute>} />
              <Route path="/colaborador/nuevo-caso" element={<ProtectedRoute mode="verified"><ClinicalCaseEditorPage /></ProtectedRoute>} />
              <Route path="/colaborador/caso-clinico/:revisionId" element={<ProtectedRoute mode="verified"><ClinicalCaseEditorPage /></ProtectedRoute>} />
              <Route path="/colaborador/revision/:revisionId" element={<ProtectedRoute mode="verified"><RevisionEditorPage /></ProtectedRoute>} />
              <Route path="/mi-progreso" element={<ProtectedRoute mode="enrolled"><RedirectToPortal /></ProtectedRoute>} />

              {/* Portal del Estudiante / Alumno */}
              <Route path="/portal" element={<ProtectedRoute mode="student"><StudentDashboard /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute mode="student"><RedirectToPortal /></ProtectedRoute>} />
              <Route path="/estudiante" element={<ProtectedRoute mode="student"><RedirectToPortal /></ProtectedRoute>} />

              {/* Cuenta */}
              <Route path="/cuenta" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
              <Route path="/cuenta/ajustes" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin" element={<ProtectedRoute mode="editor"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/calendario" element={<ProtectedRoute mode="editor"><AdminAcademicCalendarPage /></ProtectedRoute>} />
              <Route path="/admin/admisiones" element={<ProtectedRoute mode="admin"><AdminCourseWaitlistPage /></ProtectedRoute>} />
              <Route path="/admin/revisiones" element={<ProtectedRoute mode="editor"><AdminReviewQueue /></ProtectedRoute>} />
              <Route path="/admin/usuarios" element={<ProtectedRoute mode="admin"><AdminUsersPage /></ProtectedRoute>} />
              <Route path="/admin/usuarios/:userId/perfil" element={<ProtectedRoute mode="admin"><ProfileSetupPage /></ProtectedRoute>} />
              <Route path="/admin/alumnos" element={<ProtectedRoute mode="editor"><AdminStudentsListPage /></ProtectedRoute>} />
              <Route path="/admin/alumnos/examenes" element={<ProtectedRoute mode="editor"><AdminExamAnalyticsPage /></ProtectedRoute>} />
              <Route path="/admin/alumnos/tareas" element={<ProtectedRoute mode="editor"><AdminAssignmentsAnalyticsPage /></ProtectedRoute>} />
              <Route path="/admin/alumnos/asistencias" element={<ProtectedRoute mode="editor"><AdminAttendanceAnalyticsPage /></ProtectedRoute>} />
              <Route path="/admin/alumnos/:studentId" element={<ProtectedRoute mode="editor"><AdminStudentProgressPage /></ProtectedRoute>} />
              <Route path="/admin/progreso" element={<ProtectedRoute mode="editor"><AdminStudentsListPage /></ProtectedRoute>} />
              <Route path="/admin/progreso/examenes" element={<ProtectedRoute mode="editor"><AdminExamAnalyticsPage /></ProtectedRoute>} />
              <Route path="/admin/progreso/tareas" element={<ProtectedRoute mode="editor"><AdminAssignmentsAnalyticsPage /></ProtectedRoute>} />
              <Route path="/admin/progreso/asistencias" element={<ProtectedRoute mode="editor"><AdminAttendanceAnalyticsPage /></ProtectedRoute>} />
              <Route path="/admin/progreso/:studentId" element={<ProtectedRoute mode="editor"><AdminStudentProgressPage /></ProtectedRoute>} />
              <Route path="/admin/quizzes" element={<ProtectedRoute mode="editor"><AdminQuizzesPage /></ProtectedRoute>} />
              <Route path="/admin/quizzes/:topicId" element={<ProtectedRoute mode="editor"><AdminQuizzesPage /></ProtectedRoute>} />
              <Route path="/admin/evaluaciones" element={<ProtectedRoute mode="editor"><AdminQuizAttemptsPage /></ProtectedRoute>} />
              <Route path="/admin/auditoria" element={<ProtectedRoute mode="admin"><AdminAuditPage /></ProtectedRoute>} />
              <Route path="/admin/talleres" element={<ProtectedRoute mode="editor"><AdminWorkshopsPage /></ProtectedRoute>} />
              <Route path="/admin/acceso" element={<ProtectedRoute mode="admin"><AdminModuleAccessPage /></ProtectedRoute>} />
              <Route path="/admin/temario" element={<ProtectedRoute mode="editor"><AdminSyllabusPage /></ProtectedRoute>} />
              <Route path="/admin/exportacion" element={<ProtectedRoute mode="editor"><AdminTextbookExportPage /></ProtectedRoute>} />
              <Route path="/admin/induccion" element={<ProtectedRoute mode="editor"><AdminPortalWelcomePage /></ProtectedRoute>} />
              <Route path="/admin/ejercicios" element={<ProtectedRoute mode="editor"><AdminExerciseCasesPage /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </Router>
        <IOSInstallBanner />
        <PWAInstallModal />
      </div>
    </div>
  );
}

export default App;
