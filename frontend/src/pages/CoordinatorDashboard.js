import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { BookOpen, LogOut, Plus, Users } from 'lucide-react';
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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function CoordinatorDashboard({ user, logout }) {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [batchesRes, tutorsRes] = await Promise.all([
        axios.get(`${API}/batches`, { withCredentials: true }),
        axios.get(`${API}/tutors`, { withCredentials: true })
      ]);
      setBatches(batchesRes.data);
      setTutors(tutorsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleAssignTutor = async () => {
    if (!selectedTutor || selectedDays.length === 0) {
      toast.error('Please select tutor and days');
      return;
    }

    try {
      await axios.post(
        `${API}/batches/assign-tutor`,
        {
          batch_id: selectedBatch.id,
          tutor_id: selectedTutor,
          assigned_days: selectedDays
        },
        { withCredentials: true }
      );
      toast.success('Tutor assigned successfully');
      setAssignDialogOpen(false);
      setSelectedBatch(null);
      setSelectedTutor('');
      setSelectedDays([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign tutor');
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
          <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Coordinator Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage batches and assign tutors</p>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div data-testid="stat-total-batches" className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Total Batches</h3>
            <p className="text-4xl font-bold text-blue-600">{batches.length}</p>
          </div>
          <div data-testid="stat-active-batches" className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Active Batches</h3>
            <p className="text-4xl font-bold text-green-600">{batches.filter(b => b.status === 'active').length}</p>
          </div>
          <div data-testid="stat-total-tutors" className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Total Tutors</h3>
            <p className="text-4xl font-bold text-purple-600">{tutors.length}</p>
          </div>
        </div>

        {/* Batches */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>All Batches</h2>
          {batches.length === 0 ? (
            <div data-testid="no-batches-message" className="text-center py-20">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No batches created yet</h3>
              <p className="text-gray-600">Batches will be automatically created when students enroll</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {batches.map(batch => (
                <div key={batch.id} data-testid={`coordinator-batch-${batch.id}`} className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{batch.batch_code}</h3>
                      <p className="text-gray-600 mt-1">
                        {SUBJECTS[batch.subject]} | Class {batch.class_level} | {batch.board} Board
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Status: <span className="capitalize font-medium">{batch.status}</span> | 
                        Students: {batch.student_ids.length}/25 |
                        Academic Year: {batch.academic_year}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        data-testid={`assign-tutor-${batch.id}`}
                        onClick={() => {
                          setSelectedBatch(batch);
                          setAssignDialogOpen(true);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Assign Tutor
                      </Button>
                      <Button
                        data-testid={`view-logboard-${batch.id}`}
                        onClick={() => navigate(`/logboard/${batch.id}`)}
                        className="bg-gradient-to-r from-blue-600 to-green-600 text-white"
                        size="sm"
                      >
                        View Log Board
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Assign Tutor Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Tutor to Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedBatch && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-900">{selectedBatch.batch_code}</p>
                <p className="text-sm text-gray-600">{SUBJECTS[selectedBatch.subject]} | Class {selectedBatch.class_level}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Select Tutor</label>
              <Select value={selectedTutor} onValueChange={setSelectedTutor}>
                <SelectTrigger data-testid="tutor-select">
                  <SelectValue placeholder="Choose a tutor" />
                </SelectTrigger>
                <SelectContent>
                  {tutors.map(tutorData => (
                    <SelectItem key={tutorData.tutor.id} value={tutorData.tutor.id}>
                      {tutorData.user?.name} ({tutorData.tutor.tutor_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Assign Days</label>
              <div className="grid grid-cols-2 gap-2">
                {DAYS.map(day => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      data-testid={`assign-day-${day}-checkbox`}
                      id={`assign-day-${day}`}
                      checked={selectedDays.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    <label htmlFor={`assign-day-${day}`} className="text-sm cursor-pointer">{day}</label>
                  </div>
                ))}
              </div>
            </div>

            <Button
              data-testid="confirm-assign-tutor"
              onClick={handleAssignTutor}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white"
            >
              Assign Tutor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
