import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BookOpen, LogOut, Plus, Users, CheckCircle, XCircle, Eye, UserCheck, Shield, Ban, UserX } from 'lucide-react';
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
  const [pendingTutors, setPendingTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [studentsDialogOpen, setStudentsDialogOpen] = useState(false);
  const [tutorApprovalDialogOpen, setTutorApprovalDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [batchStudents, setBatchStudents] = useState([]);
  const [currentTutor, setCurrentTutor] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [batchesRes, tutorsRes, pendingRes] = await Promise.all([
        axios.get(`${API}/batches`, { withCredentials: true }),
        axios.get(`${API}/tutors`, { withCredentials: true }),
        axios.get(`${API}/tutors/pending`, { withCredentials: true }).catch(() => ({ data: [] }))
      ]);
      setBatches(batchesRes.data);
      setTutors(tutorsRes.data);
      setPendingTutors(pendingRes.data);
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

  const handleViewStudents = async (batch) => {
    try {
      const res = await axios.get(`${API}/batches/${batch.id}/students`, { withCredentials: true });
      setBatchStudents(res.data);
      setSelectedBatch(batch);
      setStudentsDialogOpen(true);
    } catch (error) {
      toast.error('Failed to fetch students');
    }
  };

  const handleApproveTutor = async (tutorId) => {
    try {
      await axios.put(`${API}/tutors/${tutorId}/approve`, {}, { withCredentials: true });
      toast.success('Tutor approved!');
      fetchData();
      setTutorApprovalDialogOpen(false);
    } catch (error) {
      toast.error('Failed to approve tutor');
    }
  };

  const handleRejectTutor = async (tutorId) => {
    if (!rejectionReason) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      await axios.put(`${API}/tutors/${tutorId}/reject?reason=${encodeURIComponent(rejectionReason)}`, {}, { withCredentials: true });
      toast.success('Tutor rejected');
      fetchData();
      setTutorApprovalDialogOpen(false);
      setRejectionReason('');
    } catch (error) {
      toast.error('Failed to reject tutor');
    }
  };

  const handleUpdateTutorStatus = async (tutorId, status) => {
    try {
      await axios.put(`${API}/tutors/${tutorId}/status?status=${status}`, {}, { withCredentials: true });
      toast.success(`Tutor status updated to ${status}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Group batches by class
  const groupedBatches = batches.reduce((acc, batch) => {
    const classKey = `class_${batch.class_level}`;
    if (!acc[classKey]) {
      acc[classKey] = [];
    }
    acc[classKey].push(batch);
    return acc;
  }, {});

  // Sort and group by subject within each class
  Object.keys(groupedBatches).forEach(classKey => {
    groupedBatches[classKey].sort((a, b) => {
      const subjectOrder = ['MAT', 'PHY', 'SCI', 'BIO', 'ENG'];
      return subjectOrder.indexOf(a.subject) - subjectOrder.indexOf(b.subject);
    });
  });

  const filteredBatches = selectedClass === 'all' 
    ? batches 
    : groupedBatches[`class_${selectedClass}`] || [];

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
          <p className="text-gray-600 mt-2">Coordinate free tuition support - manage batches and assign volunteer tutors</p>
        </div>

        {/* Pending Tutors Section */}
        {pendingTutors.length > 0 && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-yellow-600" />
              Pending Tutor Approvals ({pendingTutors.length})
            </h2>
            <div className="grid gap-4">
              {pendingTutors.map(tutorData => (
                <div key={tutorData.tutor.id} className="bg-white rounded-lg p-4 flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{tutorData.user?.name}</h3>
                    <p className="text-sm text-gray-600">{tutorData.user?.email}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Board: {tutorData.tutor.board_preference} | 
                      Classes: {tutorData.tutor.classes_can_teach.join(', ')} | 
                      Subjects: {tutorData.tutor.subjects_can_teach.map(s => SUBJECTS[s]).join(', ')}
                    </p>
                    <p className="text-sm text-gray-600">Days: {tutorData.tutor.available_days.join(', ')}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => {
                        setCurrentTutor(tutorData);
                        setTutorApprovalDialogOpen(true);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div data-testid="stat-total-batches" className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Total Batches</h3>
            <p className="text-4xl font-bold text-blue-600">{batches.length}</p>
          </div>
          <div data-testid="stat-active-batches" className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Active Batches</h3>
            <p className="text-4xl font-bold text-green-600">{batches.filter(b => b.status === 'active').length}</p>
          </div>
          <div data-testid="stat-total-tutors" className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Approved Tutors</h3>
            <p className="text-4xl font-bold text-purple-600">{tutors.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Pending Approvals</h3>
            <p className="text-4xl font-bold text-yellow-600">{pendingTutors.length}</p>
          </div>
        </div>

        {/* Class Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Class:</label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              <SelectItem value="6">Class 6</SelectItem>
              <SelectItem value="7">Class 7</SelectItem>
              <SelectItem value="8">Class 8</SelectItem>
              <SelectItem value="9">Class 9</SelectItem>
              <SelectItem value="10">Class 10</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Batches */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {selectedClass === 'all' ? 'All Batches' : `Class ${selectedClass} Batches`}
          </h2>
          {filteredBatches.length === 0 ? (
            <div data-testid="no-batches-message" className="text-center py-20">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No batches found</h3>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredBatches.map(batch => (
                <div key={batch.id} data-testid={`coordinator-batch-${batch.id}`} className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{batch.batch_code}</h3>
                      <p className="text-gray-600 mt-1">
                        {SUBJECTS[batch.subject]} | Class {batch.class_level} | {batch.board} Board
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Status: <span className="capitalize font-medium">{batch.status}</span> | 
                        Academic Year: {batch.academic_year}
                      </p>
                      <button
                        onClick={() => handleViewStudents(batch)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Students: {batch.student_ids.length}/25
                      </button>
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
                  {tutors.filter(t => t.tutor.status === 'active').map(tutorData => (
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

      {/* View Students Dialog */}
      <Dialog open={studentsDialogOpen} onOpenChange={setStudentsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Students in {selectedBatch?.batch_code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {batchStudents.map((student, idx) => (
              <div key={student.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900">{idx + 1}. {student.name}</h3>
                <p className="text-sm text-gray-600">Code: {student.student_code}</p>
                <p className="text-sm text-gray-600">School: {student.school_name}</p>
                <p className="text-sm text-gray-600">Location: {student.location}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tutor Approval Dialog */}
      <Dialog open={tutorApprovalDialogOpen} onOpenChange={setTutorApprovalDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Tutor Application</DialogTitle>
          </DialogHeader>
          {currentTutor && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 text-lg">{currentTutor.user?.name}</h3>
                <p className="text-sm text-gray-600">{currentTutor.user?.email}</p>
                <p className="text-sm text-gray-600 mt-2"><strong>Tutor Code:</strong> {currentTutor.tutor?.tutor_code}</p>
                <p className="text-sm text-gray-600"><strong>Board Preference:</strong> {currentTutor.tutor?.board_preference}</p>
                <p className="text-sm text-gray-600"><strong>Address:</strong> {currentTutor.tutor?.current_address}</p>
                <p className="text-sm text-gray-600"><strong>Pincode:</strong> {currentTutor.tutor?.pincode}</p>
                <p className="text-sm text-gray-600 mt-2"><strong>Classes:</strong> {currentTutor.tutor?.classes_can_teach.join(', ')}</p>
                <p className="text-sm text-gray-600"><strong>Subjects:</strong> {currentTutor.tutor?.subjects_can_teach.map(s => SUBJECTS[s]).join(', ')}</p>
                <p className="text-sm text-gray-600"><strong>Available Days:</strong> {currentTutor.tutor?.available_days.join(', ')}</p>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => handleApproveTutor(currentTutor.tutor.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Tutor
                </Button>
                <Button
                  onClick={() => {
                    if (rejectionReason) {
                      handleRejectTutor(currentTutor.tutor.id);
                    } else {
                      toast.error('Please provide rejection reason below');
                    }
                  }}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Tutor
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Rejection Reason (if rejecting):</label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide reason for rejection..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
