import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { OrgProvider } from './context/OrgContext'
import { AppLayout } from './components/layout/AppLayout'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import TasksPage from './pages/TasksPage'
import TeamPage from './pages/TeamPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import InvitePage from './pages/InvitePage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: 'var(--accent)', animation: 'pulse 2s infinite' }}>T</div>
    </div>
  )
  if (!user) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/invite" element={<InvitePage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><OrgProvider><AppLayout><DashboardPage /></AppLayout></OrgProvider></ProtectedRoute>
      } />
      <Route path="/tasks" element={
        <ProtectedRoute><OrgProvider><AppLayout><TasksPage /></AppLayout></OrgProvider></ProtectedRoute>
      } />
      <Route path="/team" element={
        <ProtectedRoute><OrgProvider><AppLayout><TeamPage /></AppLayout></OrgProvider></ProtectedRoute>
      } />
      <Route path="/announcements" element={
        <ProtectedRoute><OrgProvider><AppLayout><AnnouncementsPage /></AppLayout></OrgProvider></ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute><OrgProvider><AppLayout><ProfilePage /></AppLayout></OrgProvider></ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute><OrgProvider><AppLayout><SettingsPage /></AppLayout></OrgProvider></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: 14,
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
