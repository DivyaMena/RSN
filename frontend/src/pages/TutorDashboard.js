import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { BookOpen, LogOut, Settings, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SUBJECTS = {
  'MAT': 'Mathematics',
  'PHY': 'Physics',
  'SCI': 'Science',
  'BIO': 'Biology',
  'ENG': 'English'
};

export default function TutorDashboard({ user, logout }) {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [batchTutors, setBatchTutors] = useState({});
  const [loading, setLoading] = useState(true);
  const [tutorProfile, setTutorProfile] = useState(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('available');
  const [unavailableFrom, setUnavailableFrom] = useState('');
  const [unavailableTo, setUnavailableTo] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [batchesRes, tutorRes] = await Promise.all([
        axios.get(`${API}/batches`, { withCredentials: true }),
        axios.get(`${API}/tutors/me`, { withCredentials: true })
      ]);
      
      setBatches(batchesRes.data);
      setTutorProfile(tutorRes.data);
      setSelectedStatus(tutorRes.data.availability_status || 'available');
      setUnavailableFrom(tutorRes.data.unavailable_from || '');
      setUnavailableTo(tutorRes.data.unavailable_to || '');

      // Fetch tutors for each batch
      const tutorsData = {};
      for (const batch of batchesRes.data) {
        try {
          const res = await axios.get(`${API}/batches/${batch.id}/tutors`, { withCredentials: true });
          tutorsData[batch.id] = res.data;
        } catch (error) {
          console.error(`Failed to fetch tutors for batch ${batch.id}`);
        }
      }
      setBatchTutors(tutorsData);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (selectedStatus === 'unavailable' && (!unavailableFrom || !unavailableTo)) {
      toast.error('Please provide unavailability dates');
      return;
    }

    try {
      let statusToSend = selectedStatus;
      if (selectedStatus === 'unavailable') {
        statusToSend = 'unavailable';
      } else if (selectedStatus === 'not_interested') {
        statusToSend = 'not_interested';
      }

      const updateData = {
        availability_status: statusToSend
      };

      if (selectedStatus === 'unavailable') {
        updateData.unavailable_from = unavailableFrom;
        updateData.unavailable_to = unavailableTo;
      }

      await axios.put(
        `${API}/tutors/${tutorProfile.id}/status`,
        updateData,
        { 
          withCredentials: true,
          params: { status: statusToSend }
        }
      );

      toast.success('Status updated successfully');
      setStatusDialogOpen(false);
      fetchData(); // Refresh data
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
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
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-xl flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Rising Stars Nation</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Welcome, {user.name}</span>
            <Button data-testid="logout-btn" onClick={logout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Tutor Dashboard</h1>
          <p className="text-gray-600 mt-2">Help students who need extra support - track what you teach and schedule your online classes</p>
        </div>

        {batches.length === 0 ? (
          <div data-testid="no-batches-message" className="text-center py-20">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No batches assigned yet</h3>
            <p className="text-gray-600">You will be automatically assigned to batches once they reach 10+ students</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {batches.map(batch => {
              const tutors = batchTutors[batch.id] || [];
              return (
                <div key={batch.id} data-testid={`tutor-batch-${batch.id}`} className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{batch.batch_code}</h3>
                      <p className="text-gray-600 mt-1">
                        {SUBJECTS[batch.subject]} | Class {batch.class_level} | {batch.board} Board
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Status: <span className="capitalize">{batch.status}</span> | Students: {batch.student_ids.length}/25
                      </p>
                    </div>
                    <Button
                      data-testid={`view-logboard-${batch.id}`}
                      onClick={() => navigate(`/logboard/${batch.id}`)}
                      className="bg-gradient-to-r from-blue-600 to-green-600 text-white"
                    >
                      Manage Log Board
                    </Button>
                  </div>

                  {tutors.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">Assigned Tutors:</h4>
                      <div className="space-y-2">
                        {tutors.map((tutorData, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                            <div>
                              <p className="font-medium text-gray-900">{tutorData.tutor_user?.name}</p>
                              <p className="text-sm text-gray-600">{tutorData.tutor_user?.email}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Days:</p>
                              <p className="text-sm font-medium text-blue-600">{tutorData.assignment?.assigned_days.join(', ')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
