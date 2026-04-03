import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import PlaceholderPage from './pages/PlaceholderPage';
import PostAuth from './pages/PostAuth';
import Notes from './pages/Notes';
import SubjectPage from './pages/SubjectPage';
import Profile from './pages/profile';
import { MainLayout } from './components/layout/MainLayout';
import { ClassProvider } from './context/ClassContext';
export default function App() {
  return (
    <ClassProvider>
      <Router>
        <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/dashboard"
          element={
            <MainLayout>
              <Dashboard />
            </MainLayout>
          }
        />
        <Route path="/post-auth" element={<PostAuth />} />
        <Route
          path="/notes"
          element={
            <MainLayout>
              <Notes />
            </MainLayout>
          }
        />
        <Route
          path="/notes/:subject"
          element={
            <MainLayout>
              <SubjectPage />
            </MainLayout>
          }
        />
        {/* Placeholder Routes */}
        <Route
          path="/pomodoro"
          element={
            <MainLayout>
              <PlaceholderPage title="Pomodoro" />
            </MainLayout>
          }
        />
        <Route
          path="/tests"
          element={
            <MainLayout>
              <PlaceholderPage title="Tests" />
            </MainLayout>
          }
        />
        <Route
          path="/analytics"
          element={
            <MainLayout>
              <PlaceholderPage title="Analytics" />
            </MainLayout>
          }
        />
        <Route
          path="/planner"
          element={
            <MainLayout>
              <PlaceholderPage title="Planner" />
            </MainLayout>
          }
        />
        <Route
          path="/chat"
          element={
            <MainLayout>
              <PlaceholderPage title="AI Chat" />
            </MainLayout>
          }
        />
        <Route
          path="/profile"
          element={
            <MainLayout>
              <Profile />
            </MainLayout>
          }
        />
      </Routes>
    </Router>
  </ClassProvider>
  );
}
