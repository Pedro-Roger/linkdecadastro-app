import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import CompleteProfilePage from './pages/auth/CompleteProfilePage'
import AdminDashboardPage from './pages/admin/DashboardPage'
import AdminCoursesPage from './pages/admin/CoursesPage'
import AdminNewCoursePage from './pages/admin/NewCoursePage'
import AdminCoursePage from './pages/admin/CoursePage'
import AdminCourseLessonsPage from './pages/admin/CourseLessonsPage'
import AdminCourseEnrollmentsPage from './pages/admin/CourseEnrollmentsPage'
import AdminEventsPage from './pages/admin/EventsPage'
import UserCoursesPage from './pages/user/CoursesPage'
import UserMyCoursesPage from './pages/user/MyCoursesPage'
import UserCoursePage from './pages/user/CoursePage'
import UserProfilePage from './pages/user/ProfilePage'
import CourseBySlugPage from './pages/CourseBySlugPage'
import RegisterByLinkPage from './pages/RegisterByLinkPage'

function App() {
  return (
    <div>
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
    </div>
  )
}

export default App
