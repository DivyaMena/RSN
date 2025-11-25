import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { BookOpen, LogOut, Settings, Calendar, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateIST, getCurrentDateIST } from '../utils/dateUtils';
import DonateButton from '../components/DonateButton';
import RoleSwitcher from '../components/RoleSwitcher';
import AddRoleButton from '../components/AddRoleButton';

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

      // Fetch curriculum for tutor's opted classes and subjects
      const curriculumData = {};
      const tutorBoard = tutorRes.data.board_preference;
      const tutorClasses = tutorRes.data.classes_can_teach || [];
      const tutorSubjects = tutorRes.data.subjects_can_teach || [];
      
      for (const classLevel of tutorClasses) {
        for (const subject of tutorSubjects) {
          const key = `${tutorBoard}-${classLevel}-${subject}`;
          try {
            const res = await axios.get(
              `${API}/curriculum?board=${tutorBoard}&class_level=${classLevel}&subject=${subject}`,
              { withCredentials: true }
            );
            if (res.data && res.data.length > 0) {
              curriculumData[key] = res.data.sort((a, b) => {
                // First sort by lesson number
                if (a.topic_number !== b.topic_number) {
                  return a.topic_number - b.topic_number;
                }
                // Then sort alphabetically by topic name (handles A, B, C)
                return a.topic_name.localeCompare(b.topic_name);
              });
            }
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
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <img src="/logo.jpg" alt="Rising Stars Nation" className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-cover flex-shrink-0" />
              <span className="text-base sm:text-xl font-bold truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Rising Stars Nation</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-xs sm:text-sm text-gray-700 truncate max-w-[120px] sm:max-w-none">Welcome, {user.name}</span>
              <DonateButton />
              <Button onClick={() => navigate('/profile')} variant="outline" size="sm" className="text-xs">
                My Profile
              </Button>
              <Button data-testid="logout-btn" onClick={logout} variant="outline" size="sm" className="text-xs">
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
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
                        Status: <span className="capitalize">{batch.status}</span> | Students: <button 
                          onClick={() => handleViewStudents(batch.id, batch.student_ids)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                        >
                          <Eye className="h-4 w-4" />
                          {batch.student_ids.length}/25
                        </button>
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
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 rounded-lg p-3 gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{tutorData.tutor_user?.name}</p>
                              <p className="text-xs sm:text-sm text-gray-600 truncate">{tutorData.tutor_user?.email}</p>
                            </div>
                            <div className="flex-shrink-0">
                              <p className="text-xs sm:text-sm text-gray-600">Days:</p>
                              <p className="text-xs sm:text-sm font-medium text-blue-600 break-words">{tutorData.assignment?.assigned_days.join(', ')}</p>
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

        {/* Curriculum Section - Showing all opted subjects and classes */}
        {tutorProfile && tutorProfile.classes_can_teach && tutorProfile.subjects_can_teach && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📚 My Teaching Curriculum</h2>
            <p className="text-gray-600 mb-6">
              Curriculum for Classes {tutorProfile.classes_can_teach.join(', ')} - {tutorProfile.board_preference} Board
            </p>
            
            <div className="grid gap-6">
              {tutorProfile.classes_can_teach.map(classLevel => (
                <div key={classLevel} className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Class {classLevel}</h3>
                  
                  <div className="space-y-4">
                    {tutorProfile.subjects_can_teach.map(subject => {
                      const curriculumKey = `${tutorProfile.board_preference}-${classLevel}-${subject}`;
                      const curriculumItems = (curriculum[curriculumKey] || []).sort((a, b) => {
                        // First sort by lesson number
                        if (a.topic_number !== b.topic_number) {
                          return a.topic_number - b.topic_number;
                        }
                        // Then sort alphabetically by topic name (handles A, B, C)
                        return a.topic_name.localeCompare(b.topic_name);
                      });
                      const isExpanded = expandedCurriculum[curriculumKey];
                      
                      return (
                        <div key={subject} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleCurriculum(curriculumKey)}
                            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 hover:from-blue-100 hover:to-green-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-lg flex items-center justify-center text-white font-bold">
                                {subject}
                              </div>
                              <div className="text-left">
                                <h4 className="font-semibold text-gray-900">{SUBJECTS[subject]}</h4>
                                <p className="text-sm text-gray-600">
                                  {curriculumItems.length} {curriculumItems.length === 1 ? 'topic' : 'topics'}
                                </p>
                              </div>
                            </div>
                            <span className="text-gray-500 text-xl">{isExpanded ? '▼' : '▶'}</span>
                          </button>
                          
                          {isExpanded && (
                            <div className="p-4 bg-white">
                              {curriculumItems.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">No curriculum available for this subject yet.</p>
                              ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                  {curriculumItems.map((item, idx) => (
                                    <div key={idx} className="bg-blue-50 rounded-lg p-3 border border-blue-200 hover:border-blue-300 transition-colors">
                                      <div className="flex items-start">
                                        <span className="font-semibold text-blue-700 mr-3 text-lg">{item.topic_number}.</span>
                                        <div className="flex-1">
                                          <p className="font-medium text-gray-900">{item.topic_name}</p>
                                          {item.description && (
                                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
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

      {/* Student List Dialog */}
      <Dialog open={studentListDialog.open} onOpenChange={(open) => setStudentListDialog({ ...studentListDialog, open })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student List</DialogTitle>
            <DialogDescription>
              Students enrolled in this batch
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
            {studentListDialog.students.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No students found</p>
            ) : (
              studentListDialog.students.map((student, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-600">{student.student_code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Class {student.class_level}</p>
                    <p className="text-xs text-gray-500">{student.school_name}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
