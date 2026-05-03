import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import MentalHealthChatbotPage from "./pages/MentalHealthChatbotPage";
import ScreeningPage from "./pages/ScreeningPage";
import BookingPage from "./pages/BookingPage";
import ForumPage from "./pages/ForumPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AuthPage from "./pages/AuthPage";
import MainAdminDashboardPage from "./pages/MainAdminDashboardPage";
import InstituteDashboardPage from "./pages/InstituteDashboardPage";
import CounsellorDashboardPage from "./pages/CounsellorDashboardPage";
import VideoCallPage from "./pages/VideoCallPage";
import StudentGuard from "./components/StudentGuard";
import LearnLayout from "./pages/LearnLayout";
import LearnCoursesPage from "./pages/LearnCoursesPage";
import CoursePlayerPage from "./pages/CoursePlayerPage";
import StudentAppLayout from "./layouts/StudentAppLayout";
import CounsellorOnly from "./components/CounsellorOnly";
import DoubtTeacherOnly from "./components/DoubtTeacherOnly";
import DoubtSupportPage from "./pages/DoubtSupportPage";
import DoubtTeacherDashboardPage from "./pages/DoubtTeacherDashboardPage";

export default function App() {
  return (
    <div className="mm-app-shell">
      <div className="relative z-10">
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />

          <Route
            element={
              <StudentGuard>
                <StudentAppLayout />
              </StudentGuard>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/screening" element={<ScreeningPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/doubt-support" element={<DoubtSupportPage />} />
            <Route path="/forum" element={<ForumPage />} />
            <Route path="/video" element={<VideoCallPage />} />
            <Route path="/chat" element={<MentalHealthChatbotPage />} />
            <Route path="/learn" element={<LearnLayout />}>
              <Route index element={<LearnCoursesPage />} />
              <Route path="course/:id" element={<CoursePlayerPage />} />
            </Route>
          </Route>

          <Route path="/chatbot" element={<Navigate to="/chat" replace />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/main-admin" element={<MainAdminDashboardPage />} />
          <Route path="/institute" element={<InstituteDashboardPage />} />
          <Route path="/counsellor" element={<CounsellorDashboardPage />} />
          <Route path="/doubt-teacher" element={<DoubtTeacherDashboardPage />} />
          <Route
            path="/doubt-teacher/forum"
            element={
              <StudentGuard>
                <DoubtTeacherOnly fallbackTo="/forum">
                  <ForumPage />
                </DoubtTeacherOnly>
              </StudentGuard>
            }
          />
          <Route
            path="/doubt-teacher/video"
            element={
              <StudentGuard>
                <DoubtTeacherOnly fallbackTo="/video">
                  <VideoCallPage />
                </DoubtTeacherOnly>
              </StudentGuard>
            }
          />
          <Route
            path="/counsellor/forum"
            element={
              <StudentGuard>
                <CounsellorOnly fallbackTo="/forum">
                  <ForumPage />
                </CounsellorOnly>
              </StudentGuard>
            }
          />
          <Route
            path="/counsellor/video"
            element={
              <StudentGuard>
                <CounsellorOnly fallbackTo="/video">
                  <VideoCallPage />
                </CounsellorOnly>
              </StudentGuard>
            }
          />
          <Route path="/admin" element={<Navigate to="/auth" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
