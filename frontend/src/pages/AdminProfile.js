import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { BookOpen, LogOut, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminProfile({ user, logout }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setProfile(res.data);
    } catch (error) {
      toast.error('Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-xl flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>My Profile</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Button onClick={logout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 bg-blue-50 border border-blue-300 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            ℹ️ Admin profile is read-only. Contact the main administrator if you need to update your details.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Administrator Information</h2>
            <p className="text-sm text-gray-600">Your profile information (read-only)</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">{user.name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">{user.email}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium capitalize">{user.role}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Type</label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">
                {user.is_main_admin ? 'Main Administrator' : user.is_co_admin ? 'Co-Administrator' : 'Administrator'}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
