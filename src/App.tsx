import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

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
const UserCoursesPage = lazy(() => import('./pages/user/CoursesPage'))
const UserMyCoursesPage = lazy(() => import('./pages/user/MyCoursesPage'))
const UserCoursePage = lazy(() => import('./pages/user/CoursePage'))
const UserProfilePage = lazy(() => import('./pages/user/ProfilePage'))
const CourseBySlugPage = lazy(() => import('./pages/CourseBySlugPage'))
const RegisterByLinkPage = lazy(() => import('./pages/RegisterByLinkPage'))

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl text-gray-600">Carregando...</div>
    </div>
  )
}

function App() {
  return (
    <div>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/c/:slug" element={<CourseBySlugPage />} />
          <Route path="/register/:linkId" element={<RegisterByLinkPage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />

          <Route path="/courses" element={<UserCoursesPage />} />
          <Route path="/my-courses" element={<UserMyCoursesPage />} />
          <Route path="/course/:courseId" element={<UserCoursePage />} />
          <Route path="/profile" element={<UserProfilePage />} />

          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/courses" element={<AdminCoursesPage />} />
          <Route path="/admin/courses/new" element={<AdminNewCoursePage />} />
          <Route path="/admin/courses/:courseId" element={<AdminCoursePage />} />
          <Route path="/admin/courses/:courseId/lessons" element={<AdminCourseLessonsPage />} />
          <Route path="/admin/courses/:courseId/enrollments" element={<AdminCourseEnrollmentsPage />} />
          <Route path="/admin/events" element={<AdminEventsPage />} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default App
