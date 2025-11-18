import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Landing from './pages/Landing';
import Login from './pages/Login';
import RoleSelection from './pages/RoleSelection';
import RegisterParent from './pages/RegisterParent';
import RegisterTutor from './pages/RegisterTutor';
import RegisterCoordinator from './pages/RegisterCoordinator';
import RegisterSchool from './pages/RegisterSchool';
import ParentDashboard from './pages/ParentDashboard';
import TutorDashboard from './pages/TutorDashboard';
import TutorProfile from './pages/TutorProfile';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import CoordinatorProfile from './pages/CoordinatorProfile';
import AdminDashboard from './pages/AdminDashboard';
import AdminProfile from './pages/AdminProfile';
import StudentDashboard from './pages/StudentDashboard';
import StudentProfile from './pages/StudentProfile';
import ParentProfile from './pages/ParentProfile';
import LogBoard from './pages/LogBoard';
import TestLogin from './pages/TestLogin';
import { Toaster } from './components/ui/sonner';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Set up axios interceptor for test tokens
axios.interceptors.request.use((config) => {
  const testToken = localStorage.getItem('test_session_token');
  if (testToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${testToken}`;
  }
  return config;
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState(null);

  useEffect(() => {
    // Check for session_id in URL fragment
    const hash = window.location.hash;
    if (hash && hash.includes('session_id=')) {
      const sessionId = hash.split('session_id=')[1].split('&')[0];
      processSessionId(sessionId);
      // Clean URL
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      // Check for existing session
      checkExistingSession();
    }
  }, []);

  const processSessionId = async (sessionId) => {
    try {
      const response = await axios.get(`${API}/auth/session`, {
        headers: { 'X-Session-ID': sessionId }
      });
      
      const { session_token, user: userData } = response.data;
      
      // Set cookie
      document.cookie = `session_token=${session_token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=none`;
      
      setSessionToken(session_token);
      setUser(userData);
    } catch (error) {
      console.error('Failed to process session:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingSession = async () => {
    try {
      // Check for test token in localStorage first
      const testToken = localStorage.getItem('test_session_token');
      const headers = {};
      
      if (testToken) {
        headers['Authorization'] = `Bearer ${testToken}`;
      }
      
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true,
        headers: testToken ? headers : undefined
      });
      setUser(response.data);
      setSessionToken(testToken || response.data.session_token);
    } catch (error) {
      console.log('No existing session');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      localStorage.removeItem('test_session_token');
      setUser(null);
      setSessionToken(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={!user ? <Landing /> : user.role === 'pending' ? <Navigate to="/role-selection" /> : <Navigate to="/dashboard" />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/test-login" element={<TestLogin />} />
          <Route path="/role-selection" element={user && user.role === 'pending' ? <RoleSelection user={user} /> : <Navigate to="/" />} />
          <Route path="/register/parent" element={user && user.role === 'pending' ? <RegisterParent setUser={setUser} /> : <Navigate to="/" />} />
          <Route path="/register/tutor" element={user && user.role === 'pending' ? <RegisterTutor setUser={setUser} /> : <Navigate to="/" />} />
          <Route path="/register/coordinator" element={user && user.role === 'pending' ? <RegisterCoordinator setUser={setUser} /> : <Navigate to="/" />} />
          <Route path="/dashboard" element={
            !user ? <Navigate to="/" /> :
            user.role === 'parent' ? <ParentDashboard user={user} logout={logout} /> :
            user.role === 'student' ? <StudentDashboard user={user} logout={logout} /> :
            user.role === 'tutor' ? <TutorDashboard user={user} logout={logout} /> :
            user.role === 'coordinator' ? <CoordinatorDashboard user={user} logout={logout} /> :
            user.role === 'admin' ? <AdminDashboard user={user} logout={logout} /> :
            <Navigate to="/role-selection" />
          } />
          <Route path="/student/:studentId" element={user ? <StudentDashboard user={user} logout={logout} /> : <Navigate to="/" />} />
          <Route path="/logboard/:batchId" element={user ? <LogBoard user={user} logout={logout} /> : <Navigate to="/" />} />
          <Route path="/profile" element={
            !user ? <Navigate to="/" /> :
            user.role === 'tutor' ? <TutorProfile user={user} logout={logout} /> :
            user.role === 'coordinator' ? <CoordinatorProfile user={user} logout={logout} /> :
            user.role === 'parent' ? <ParentProfile user={user} logout={logout} /> :
            user.role === 'student' ? <StudentProfile user={user} logout={logout} /> :
            user.role === 'admin' ? <AdminProfile user={user} logout={logout} /> :
            <Navigate to="/dashboard" />
          } />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </>
  );
}

export default App;
