import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TeacherDashboard from './components/TeacherDashboard';
import AttendanceSessionPage from './components/AttendanceSessionPage';
import StudentScanPage from './components/StudentScanPage';
import TeacherReportsPage from './components/TeacherReportsPage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/student/scan" element={<StudentScanPage />} />
          
          <Route path="*" element={
            !user ? <Navigate to="/" replace /> : (
              <div className="flex min-h-screen">
                <Sidebar />
                <main className="flex-1 flex flex-col">
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                    <Route path="/teacher/reports" element={<TeacherReportsPage />} />
                    <Route path="/attendance/session/:subjectId" element={<AttendanceSessionPage />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </main>
              </div>
            )
          } />
        </Routes>
      </div>
    </Router>
  );
}
