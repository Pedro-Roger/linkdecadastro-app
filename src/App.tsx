import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import LoadingScreen from './components/ui/LoadingScreen'
import ProtectedUserRoute from './components/ProtectedUserRoute'

const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const CompleteProfilePage = lazy(() => import('./pages/auth/CompleteProfilePage'))
const AdminDashboardPage = lazy(() => import('./pages/admin/DashboardPage'))
const AdminCoursesPage = lazy(() => import('./pages/admin/CoursesPage'))
const AdminNewCoursePage = lazy(() => import('./pages/admin/NewCoursePage'))
const AdminCoursePage = lazy(() => import('./pages/admin/CoursePage'))
const AdminCourseLessonsPage = lazy(() => import('./pages/admin/CourseLessonsPage'))
const AdminCourseEnrollmentsPage = lazy(() => import('./pages/admin/CourseEnrollmentsPage'))
const AdminEventsPage = lazy(() => import('./pages/admin/EventsPage'))
const AdminNewEventPage = lazy(() => import('./pages/admin/NewEventPage'))
const EventRegistrationsPage = lazy(() => import('./pages/admin/EventRegistrationsPage'))
const EventClassesPage = lazy(() => import('./pages/admin/EventClassesPage'))
const UserCoursesPage = lazy(() => import('./pages/user/CoursesPage'))
const UserMyCoursesPage = lazy(() => import('./pages/user/MyCoursesPage'))
const UserCoursePage = lazy(() => import('./pages/user/CoursePage'))
const UserProfilePage = lazy(() => import('./pages/user/ProfilePage'))
const CourseBySlugPage = lazy(() => import('./pages/CourseBySlugPage'))
const RegisterByLinkPage = lazy(() => import('./pages/RegisterByLinkPage'))
const GoogleCallbackPage = lazy(() => import('./pages/auth/GoogleCallbackPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function LoadingFallback() {
  return <LoadingScreen />
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/c/:slug" element={<CourseBySlugPage />} />
          <Route path="/e/:slug" element={<RegisterByLinkPage />} />
          <Route path="/register/:linkId" element={<RegisterByLinkPage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />

          <Route path="/courses" element={<ProtectedUserRoute><UserCoursesPage /></ProtectedUserRoute>} />
          <Route path="/my-courses" element={<ProtectedUserRoute><UserMyCoursesPage /></ProtectedUserRoute>} />
          <Route path="/course/:courseId" element={<ProtectedUserRoute><UserCoursePage /></ProtectedUserRoute>} />
          <Route path="/profile" element={<ProtectedUserRoute><UserProfilePage /></ProtectedUserRoute>} />

          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/courses" element={<AdminCoursesPage />} />
          <Route path="/admin/courses/new" element={<AdminNewCoursePage />} />
          <Route path="/admin/courses/:courseId" element={<AdminCoursePage />} />
          <Route path="/admin/courses/:courseId/lessons" element={<AdminCourseLessonsPage />} />
          <Route path="/admin/courses/:courseId/enrollments" element={<AdminCourseEnrollmentsPage />} />
          <Route path="/admin/events" element={<AdminEventsPage />} />
          <Route path="/admin/events/new" element={<AdminNewEventPage />} />
          <Route path="/admin/events/:eventId/registrations" element={<EventRegistrationsPage />} />
          <Route path="/admin/events/:eventId/classes" element={<EventClassesPage />} />
          
          {/* Rota 404 - deve ser a última */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
