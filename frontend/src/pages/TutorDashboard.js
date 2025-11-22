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
import { formatDateIST, getCurrentDateIST } from '../utils/dateUtils';

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
  const [studentListDialog, setStudentListDialog] = useState({ open: false, batchId: null, students: [] });
  const [curriculum, setCurriculum] = useState({});
  const [expandedCurriculum, setExpandedCurriculum] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [batchesRes, tutorRes] = await Promise.all([
        axios.get(`${API}/batches`, { withCredentials: true }),
        axios.get(`${API}/tutors/me`, { withCredentials: true })
      ]);
      
      console.log('Fetched batches:', batchesRes.data);
      console.log('Tutor profile:', tutorRes.data);
      
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

      // Fetch curriculum for tutor's teaching subjects
      const curriculumData = {};
      for (const batch of batchesRes.data) {
        const key = `${batch.board}-${batch.class_level}-${batch.subject}`;
        if (!curriculumData[key]) {
          try {
            const res = await axios.get(
              `${API}/curriculum?board=${batch.board}&class_level=${batch.class_level}&subject=${batch.subject}`,
              { withCredentials: true }
            );
            curriculumData[key] = res.data;
          } catch (error) {
            console.error(`Failed to fetch curriculum for ${key}`);
          }
        }
      }
      setCurriculum(curriculumData);
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
      const updateData = {
        availability_status: selectedStatus
      };

      if (selectedStatus === 'unavailable') {
        updateData.unavailable_from = unavailableFrom;
        updateData.unavailable_to = unavailableTo;
      }

      await axios.put(
        `${API}/tutors/${tutorProfile.id}/availability`,
        updateData,
        { withCredentials: true }
      );

      toast.success('Availability updated successfully');
      setStatusDialogOpen(false);
      fetchData(); // Refresh data
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update availability');
    }
  };

  const handleViewStudents = async (batchId, studentIds) => {
    try {
      const studentsData = [];
      for (const studentId of studentIds) {
        try {
          const res = await axios.get(`${API}/students/${studentId}`, { withCredentials: true });
          studentsData.push(res.data);
        } catch (error) {
          console.error(`Failed to fetch student ${studentId}`);
        }
      }
      setStudentListDialog({ open: true, batchId, students: studentsData });
    } catch (error) {
      toast.error('Failed to fetch student list');
    }
  };

  const toggleCurriculum = (key) => {
    setExpandedCurriculum(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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
            <Button onClick={() => navigate('/profile')} variant="outline" size="sm">
              My Profile
            </Button>
            <Button data-testid="logout-btn" onClick={logout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Tutor Dashboard</h1>
            <p className="text-gray-600 mt-2">Help students who need extra support - track what you teach and schedule your online classes</p>
          </div>
          <Button
            onClick={() => setStatusDialogOpen(true)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Manage Availability</span>
          </Button>
        </div>

        {/* Tutor Status Card */}
        {tutorProfile && (() => {
          // Get today's date in IST
          const todayIST = getCurrentDateIST();
          todayIST.setHours(0, 0, 0, 0);
          
          let actualStatus = tutorProfile.availability_status;
          let isCurrentlyUnavailable = false;
          
          if (tutorProfile.unavailable_from && tutorProfile.unavailable_to) {
            const fromDate = new Date(tutorProfile.unavailable_from);
            fromDate.setHours(0, 0, 0, 0);
            const toDate = new Date(tutorProfile.unavailable_to);
            toDate.setHours(0, 0, 0, 0);
            
            // Check if today falls within the unavailable range
            if (todayIST >= fromDate && todayIST <= toDate) {
              actualStatus = 'unavailable';
              isCurrentlyUnavailable = true;
            } else if (todayIST < fromDate) {
              // Future unavailability - currently available
              actualStatus = 'available';
            } else if (todayIST > toDate) {
              // Past unavailability - currently available
              actualStatus = 'available';
            }
          }
          
          return (
            <div className="mb-6 bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Your Status</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Today's Date: <span className="font-medium">{formatDateIST(todayIST)}</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Current availability: <span className={`font-semibold capitalize ${
                      actualStatus === 'available' ? 'text-green-600' :
                      actualStatus === 'unavailable' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {actualStatus === 'not_interested' ? 'Not Interested' : actualStatus}
                    </span>
                  </p>
                  {tutorProfile.unavailable_from && tutorProfile.unavailable_to && (
                    <p className="text-sm text-gray-600 mt-1">
                      {isCurrentlyUnavailable ? (
                        <>Unavailable from <span className="font-medium">{formatDateIST(tutorProfile.unavailable_from)}</span> to <span className="font-medium">{formatDateIST(tutorProfile.unavailable_to)}</span></>
                      ) : todayIST < new Date(tutorProfile.unavailable_from) ? (
                        <>Will be unavailable from <span className="font-medium">{formatDateIST(tutorProfile.unavailable_from)}</span> to <span className="font-medium">{formatDateIST(tutorProfile.unavailable_to)}</span></>
                      ) : (
                        <>Was unavailable from <span className="font-medium">{formatDateIST(tutorProfile.unavailable_from)}</span> to <span className="font-medium">{formatDateIST(tutorProfile.unavailable_to)}</span></>
                      )}
                    </p>
                  )}
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          );
        })()}

        {/* Batch Statistics */}
        {batches.length > 0 && (() => {
          const ACADEMIC_SUBJECTS = ['MAT', 'PHY', 'SCI', 'BIO', 'ENG'];
          const academicBatches = batches.filter(b => ACADEMIC_SUBJECTS.includes(b.subject));
          const nonAcademicBatches = batches.filter(b => !ACADEMIC_SUBJECTS.includes(b.subject));
          
          return (
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Total Batches</h3>
                <p className="text-3xl font-bold text-blue-600">{batches.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Academic</h3>
                <p className="text-3xl font-bold text-green-600">{academicBatches.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Non-Academic</h3>
                <p className="text-3xl font-bold text-purple-600">{nonAcademicBatches.length}</p>
              </div>
            </div>
          );
        })()}

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
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{batch.batch_code}</h3>
                      <p className="text-gray-600 mt-1">
                        {SUBJECTS[batch.subject]} | Class {batch.class_level} | {batch.board} Board
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Status: <span className="capitalize">{batch.status}</span> | Students: {batch.student_ids.length}/25
                      </p>
                      
                      {/* Batch Schedule */}
                      {batch.schedule_slots && batch.schedule_slots.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Batch Schedule:</p>
                          <div className="flex flex-wrap gap-2">
                            {batch.schedule_slots.map((slot, idx) => {
                              // Check if this tutor is assigned to this day
                              const myAssignment = tutors.find(t => t.tutor?.user_id === user.id);
                              const isMyDay = myAssignment?.assignment?.assigned_days?.includes(slot.day);
                              
                              return (
                                <span
                                  key={idx}
                                  className={`px-3 py-1 rounded-md text-xs font-semibold border shadow-sm ${
                                    isMyDay
                                      ? 'bg-green-100 text-green-700 border-green-300'
                                      : 'bg-gray-100 text-gray-600 border-gray-300'
                                  }`}
                                >
                                  {slot.day.substring(0, 3)} {slot.slot}
                                  {isMyDay && ' ✓'}
                                </span>
                              );
                            })}
                          </div>
                          <p className="text-xs text-green-600 mt-1">✓ = You are assigned to teach this day</p>
                        </div>
                      )}
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

      {/* Status Management Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Your Availability</DialogTitle>
            <DialogDescription>
              Update your availability status to help coordinators know when you can teach
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <RadioGroup value={selectedStatus} onValueChange={setSelectedStatus}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="available" id="available" />
                <Label htmlFor="available" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Available</p>
                    <p className="text-sm text-gray-600">I am ready to teach and take new batches</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="unavailable" id="unavailable" />
                <Label htmlFor="unavailable" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Temporarily Unavailable</p>
                    <p className="text-sm text-gray-600">I need a break for a specific period</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="not_interested" id="not_interested" />
                <Label htmlFor="not_interested" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Not Interested / Delete Account</p>
                    <p className="text-sm text-gray-600">I no longer wish to volunteer</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {selectedStatus === 'unavailable' && (
              <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-gray-900">Unavailability Period</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unavailable_from">From Date</Label>
                    <Input
                      id="unavailable_from"
                      type="date"
                      value={unavailableFrom}
                      onChange={(e) => setUnavailableFrom(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unavailable_to">To Date</Label>
                    <Input
                      id="unavailable_to"
                      type="date"
                      value={unavailableTo}
                      onChange={(e) => setUnavailableTo(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedStatus === 'not_interested' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  ⚠️ This will mark your account as not interested. Coordinators will be notified, 
                  and you won't be assigned to new batches. You can reactivate your account anytime 
                  by contacting the coordinator.
                </p>
              </div>
            )}

            <div className="flex space-x-3 justify-end">
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStatus}>
                Update Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
