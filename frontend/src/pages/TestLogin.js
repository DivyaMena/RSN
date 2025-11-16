import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { BookOpen } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TEST_USERS = [
  {
    name: 'Parent (Rajesh Kumar)',
    email: 'parent@test.com',
    token: 'parent_test_token_2025',
    role: 'parent',
    description: 'View 15 registered students, their batches, and log boards'
  },
  {
    name: 'Student (Aarav Patel)',
    email: 'aarav.patel@student.risingstarsnation.com',
    token: 'student_test_token_2025',
    role: 'student',
    description: 'Class 9 student | View own batches, log boards, attendance & request remedial classes'
  },
  {
    name: 'Tutor 1 (Priya Sharma)',
    email: 'tutor1@test.com',
    token: 'tutor1_test_token_2025',
    role: 'tutor',
    description: 'Math & Physics tutor | Assigned to 2 batches | Has log entries'
  },
  {
    name: 'Tutor 2 (Anil Reddy)',
    email: 'tutor2@test.com',
    token: 'tutor2_test_token_2025',
    role: 'tutor',
    description: 'Science & Biology tutor | Assigned to 1 batch'
  },
  {
    name: 'Coordinator (Lakshmi Devi)',
    email: 'coordinator@test.com',
    token: 'coordinator_test_token_2025',
    role: 'coordinator',
    description: 'Manage all 4 batches, assign tutors, edit log boards'
  }
];

export default function TestLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleTestLogin = async (user) => {
    setLoading(true);
    try {
      // Set cookie with session token - try multiple approaches
      const cookieString = `session_token=${user.token}; path=/; max-age=${7 * 24 * 60 * 60}`;
      document.cookie = cookieString;
      
      // Also set in localStorage as backup
      localStorage.setItem('test_session_token', user.token);
      
      toast.success(`Logging in as ${user.name}...`);
      
      // Give time for cookie to set, then hard reload to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } catch (error) {
      toast.error('Login failed. Please try again.');
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-green-500 rounded-xl flex items-center justify-center">
              <BookOpen className="h-10 w-10 text-white" />
            </div>
            <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Rising Stars Nation
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Test Login Portal</h1>
          <p className="text-gray-600">Select a test user to explore the application</p>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-sm text-blue-800">
              <strong>📊 Test Data Loaded:</strong> 15 students, 4 batches (3 active, 1 waitlist), 2 tutors with assignments, 4 log board entries
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {TEST_USERS.map((user, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {user.name}
                  </h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full uppercase">
                    {user.role}
                  </span>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4 min-h-[40px]">{user.description}</p>
              <Button
                data-testid={`login-as-${user.role}-btn`}
                onClick={() => handleTestLogin(user)}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white hover:from-blue-700 hover:to-green-700 transition-all duration-300"
              >
                {loading ? 'Logging in...' : `Login as ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📋 What to Test:</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">✅ Parent Dashboard:</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• View 15 registered students</li>
                <li>• See active batches (Math, Physics, Science)</li>
                <li>• Access log boards with Google Meet links</li>
                <li>• Register more students</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">✅ Tutor Dashboard:</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• View assigned batches</li>
                <li>• Create log board entries</li>
                <li>• Post Google Meet links</li>
                <li>• Mark curriculum items covered</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">✅ Coordinator Dashboard:</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• View all batches (4 total)</li>
                <li>• Assign tutors to batches</li>
                <li>• Edit log board entries (locked for tutors)</li>
                <li>• Monitor system statistics</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">✅ System Features:</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Batch codes: RSN-TS-2025-26-C9-MAT-001</li>
                <li>• Student codes: RSN-TS-S-2025-10001</li>
                <li>• Auto batch creation (10+ students)</li>
                <li>• Multi-tutor assignments per batch</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
          >
            Back to Landing Page
          </Button>
        </div>
      </div>
    </div>
  );
}
