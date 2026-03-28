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
import { Sidebar } from './components/layout/Sidebar';
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/post-auth" element={<PostAuth />} />
        <Route
          path="/notes"
          element={
            <div className="min-h-screen bg-background flex">
              <Sidebar />
              <main className="ml-72 flex-1">
                <Notes />
              </main>
            </div>
          }
        />
        <Route
          path="/notes/:subject"
          element={
            <div className="min-h-screen bg-background flex">
              <Sidebar />
              <main className="ml-72 flex-1">
                <SubjectPage />
              </main>
            </div>
          }
        />
        {/* Placeholder Routes */}
        <Route path="/pomodoro" element={<PlaceholderPage title="Pomodoro" />} />
        <Route path="/tests" element={<PlaceholderPage title="Tests" />} />
        <Route path="/analytics" element={<PlaceholderPage title="Analytics" />} />
        <Route path="/planner" element={<PlaceholderPage title="Planner" />} />
        <Route path="/chat" element={<PlaceholderPage title="AI Chat" />} />
        <Route
          path="/profile"
          element={
            <div className="min-h-screen bg-background flex">
              <Sidebar />
              <main className="ml-72 flex-1">
                <Profile />
              </main>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}
