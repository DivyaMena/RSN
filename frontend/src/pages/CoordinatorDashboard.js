import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BookOpen, LogOut, Plus, Users, CheckCircle, XCircle, Eye, UserCheck, Shield, Ban, UserX, User, School, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [allSchools, setAllSchools] = useState([]);
  const [pendingSchools, setPendingSchools] = useState([]);
  const [remedialRequests, setRemedialRequests] = useState([]);
  const [remedialClasses, setRemedialClasses] = useState([]);
  const [expandedSchoolId, setExpandedSchoolId] = useState(null);
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
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDayFilter, setSelectedDayFilter] = useState('all');
  const [selectedTutorFilter, setSelectedTutorFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('batches');
  const [tutorDetailsDialogOpen, setTutorDetailsDialogOpen] = useState(false);
  const [selectedTutorDetails, setSelectedTutorDetails] = useState(null);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [newTutorStatus, setNewTutorStatus] = useState('');
  const [batchAssignments, setBatchAssignments] = useState({});
  const [selectedTutorData, setSelectedTutorData] = useState(null);
  const [availableTutorsForBatch, setAvailableTutorsForBatch] = useState([]);

  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [availabilityRequestType, setAvailabilityRequestType] = useState('available');
  const [availabilityRequestFrom, setAvailabilityRequestFrom] = useState('');
  const [availabilityRequestTo, setAvailabilityRequestTo] = useState('');
  const [availabilityRequestLoading, setAvailabilityRequestLoading] = useState(false);

  // Remedial management states
  const [remedialFilterClass, setRemedialFilterClass] = useState('all');
  const [remedialFilterSubject, setRemedialFilterSubject] = useState('all');
  const [selectedRemedialRequests, setSelectedRemedialRequests] = useState([]);
  const [remedialStudentDetails, setRemedialStudentDetails] = useState({});
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [poolDialogOpen, setPoolDialogOpen] = useState(false);
  const [poolTopic, setPoolTopic] = useState('');
  const [assignTutorDialogOpen, setAssignTutorDialogOpen] = useState(false);
  const [selectedRemedialClass, setSelectedRemedialClass] = useState(null);
  const [selectedRemedialTutor, setSelectedRemedialTutor] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [batchesRes, tutorsRes, pendingRes, allSchoolsRes, remedialReqRes, remedialClassesRes] = await Promise.all([
        axios.get(`${API}/batches`, { withCredentials: true }),
        axios.get(`${API}/tutors`, { withCredentials: true }),
        axios.get(`${API}/tutors/pending`, { withCredentials: true }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/schools`, { withCredentials: true }).catch(() => ({ data: [] })),
        axios.get(`${API}/remedial/requests`, { withCredentials: true }).catch(() => ({ data: [] })),
        axios.get(`${API}/remedial/classes`, { withCredentials: true }).catch(() => ({ data: [] }))
      ]);
      setBatches(batchesRes.data);
      setTutors(tutorsRes.data);
      setPendingTutors(pendingRes.data);
      setAllSchools(allSchoolsRes.data); // Store all schools
      setPendingSchools(allSchoolsRes.data.filter(s => s.approval_status === 'pending'));
      setRemedialRequests(remedialReqRes.data);
      setRemedialClasses(remedialClassesRes.data);

      // Fetch student details for all remedial requests
      const studentDetailsMap = {};
      for (const req of remedialReqRes.data) {
        try {
          const studentRes = await axios.get(`${API}/students/${req.student_id}`, { withCredentials: true });
          studentDetailsMap[req.student_id] = studentRes.data;
          console.log(`Fetched student: ${studentRes.data.name} (${studentRes.data.student_code})`);
        } catch (error) {
          console.error(`Failed to fetch student ${req.student_id}:`, error);
        }
      }
      console.log('Total student details fetched:', Object.keys(studentDetailsMap).length);
      setRemedialStudentDetails(studentDetailsMap);
      
      // Fetch assignments for each batch
      const assignments = {};
      for (const batch of batchesRes.data) {
        try {
          const res = await axios.get(`${API}/batches/${batch.id}/tutors`, { withCredentials: true });
          assignments[batch.id] = res.data;
        } catch (error) {
          assignments[batch.id] = [];
        }
      }
      setBatchAssignments(assignments);
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

  const handleAssignTutor = async (mode = 'assign') => {
    if (!selectedTutor || selectedDays.length === 0) {
      toast.error('Please select tutor and days');
      return;
    }

    // Validate that all selected days are in the batch schedule
    const batchDays = selectedBatch?.schedule_slots ? 
      new Set(selectedBatch.schedule_slots.map(s => s.day)) : 
      new Set();
    
    const invalidDays = selectedDays.filter(day => !batchDays.has(day));
    if (invalidDays.length > 0) {
      toast.error(`Cannot assign to ${invalidDays.join(', ')}. Not in batch schedule.`);
      return;
    }

    try {
      await axios.post(
        `${API}/batches/assign-tutor`,
        {
          batch_id: selectedBatch.id,
          tutor_id: selectedTutor,
          assigned_days: selectedDays,
          mode
        },
        { withCredentials: true }
      );
      toast.success(mode === 'assign' ? 'Tutor assigned successfully' : 'Tutor removed successfully');
      setAssignDialogOpen(false);
      setSelectedBatch(null);
      setSelectedTutor('');
      setSelectedDays([]);
      setSelectedTutorData(null);
      setAvailableTutorsForBatch([]);
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
      setStatusChangeDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleSubmitAvailabilityRequest = async () => {
    if (availabilityRequestType === 'unavailable' && (!availabilityRequestFrom || !availabilityRequestTo)) {
      toast.error('Please provide from and to dates for unavailability');
      return;
    }

    try {
      setAvailabilityRequestLoading(true);
      await axios.post(
        `${API}/coordinators/me/availability-requests`,
        {
          request_type: availabilityRequestType,
          unavailable_from: availabilityRequestType === 'unavailable' ? availabilityRequestFrom : null,
          unavailable_to: availabilityRequestType === 'unavailable' ? availabilityRequestTo : null,
        },
        { withCredentials: true }
      );
      toast.success('Availability request sent to Admin');
      // Reset form and close dialog
      setAvailabilityRequestType('available');
      setAvailabilityRequestFrom('');
      setAvailabilityRequestTo('');
      setAvailabilityDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send request');
    } finally {
      setAvailabilityRequestLoading(false);
    }
  };

  const handleViewTutorDetails = (tutorData) => {
    setSelectedTutorDetails(tutorData);
    setTutorDetailsDialogOpen(true);
  };
  const handleUpdateCoordinatorAvailability = async () => {
    if (coordinatorAvailability === 'unavailable' && (!coordUnavailableFrom || !coordUnavailableTo)) {
      toast.error('Please provide unavailability dates');
      return;
    }

    try {
      const payload = {
        availability_status: coordinatorAvailability,
        unavailable_from: coordinatorAvailability === 'unavailable' ? coordUnavailableFrom : null,
        unavailable_to: coordinatorAvailability === 'unavailable' ? coordUnavailableTo : null,
      };

      await axios.put(`${API}/coordinators/me/availability`, payload, { withCredentials: true });
      toast.success('Availability updated');
      setAvailabilityDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update availability');
    }
  };



  const handleChangeStatus = (tutorData) => {
    setSelectedTutorDetails(tutorData);
    setNewTutorStatus(tutorData.tutor.status || 'active');
    setStatusChangeDialogOpen(true);
  };

  const handleApproveSchool = async (schoolId) => {
    try {
      await axios.put(`${API}/coordinator/schools/${schoolId}/approve`, {}, {
        withCredentials: true
      });
      toast.success('School approved successfully');
      fetchData(); // Refresh data
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve school');
    }
  };

  const handleRejectSchool = async (schoolId) => {
    try {
      await axios.put(`${API}/coordinator/schools/${schoolId}/reject`, {}, {
        withCredentials: true
      });
      toast.success('School rejected');
      fetchData(); // Refresh data
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject school');
    }
  };

  const handleSelectRemedialRequest = (requestId) => {
    if (selectedRemedialRequests.includes(requestId)) {
      setSelectedRemedialRequests(selectedRemedialRequests.filter(id => id !== requestId));
    } else {
      setSelectedRemedialRequests([...selectedRemedialRequests, requestId]);
    }
  };

  const handleSelectAllRemedialRequests = (requests) => {
    if (selectedRemedialRequests.length === requests.length) {
      setSelectedRemedialRequests([]);
    } else {
      setSelectedRemedialRequests(requests.map(r => r.id));
    }
  };

  const handlePoolStudents = async () => {
    if (selectedRemedialRequests.length === 0) {
      toast.error('Please select at least one request');
      return;
    }
    if (!poolTopic) {
      toast.error('Please enter a topic for this remedial class');
      return;
    }

    try {
      await axios.post(`${API}/remedial/pool-students`, {
        request_ids: selectedRemedialRequests,
        topic: poolTopic
      }, { withCredentials: true });
      
      toast.success('Remedial class created successfully');
      setPoolDialogOpen(false);
      setSelectedRemedialRequests([]);
      setPoolTopic('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to pool students');
    }
  };

  const handleAssignRemedialTutor = async () => {
    if (!selectedRemedialTutor) {
      toast.error('Please select a tutor');
      return;
    }

    try {
      await axios.post(`${API}/remedial/assign-tutor`, {
        remedial_class_id: selectedRemedialClass.id,
        tutor_id: selectedRemedialTutor
      }, { withCredentials: true });
      
      toast.success('Tutor assigned successfully');
      setAssignTutorDialogOpen(false);
      setSelectedRemedialClass(null);
      setSelectedRemedialTutor('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign tutor');
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

  let filteredBatches = selectedClass === 'all' 
    ? batches 
    : groupedBatches[`class_${selectedClass}`] || [];

  // Further filter by Subject
  if (selectedSubject !== 'all') {
    filteredBatches = filteredBatches.filter(batch => batch.subject === selectedSubject);
  }

  // Filter by Day - check batch schedule_slots
  if (selectedDayFilter !== 'all') {
    filteredBatches = filteredBatches.filter(batch => {
      if (!batch.schedule_slots || batch.schedule_slots.length === 0) return false;
      return batch.schedule_slots.some(slot => slot.day === selectedDayFilter);
    });
  }

  // Filter by Tutor
  if (selectedTutorFilter !== 'all') {
    filteredBatches = filteredBatches.filter(batch => {
      const assignments = batchAssignments[batch.id] || [];
      // Check both tutor_id and assignment.tutor_id to handle different data structures
      return assignments.some(a => 
        a.tutor_id === selectedTutorFilter || 
        a.assignment?.tutor_id === selectedTutorFilter
      );
    });
  }

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
            <img src="/logo.jpg" alt="Rising Stars Nation" className="h-12 w-12 rounded-lg object-cover" />
            <span className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Rising Stars Nation</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-gray-700 hidden sm:inline">Welcome, {user.name}</span>
            <Button onClick={() => navigate('/profile')} variant="outline" size="sm">
              <User className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">My Profile</span>
            </Button>
            <Button data-testid="logout-btn" onClick={logout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Coordinator Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">Coordinate free tuition support - manage batches and assign volunteer tutors</p>
        </div>



        {/* Statistics - Clickable */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <button 
            onClick={() => setActiveTab('batches')}
            data-testid="stat-total-batches" 
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left cursor-pointer"
          >
            <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-2">Total Batches</h3>
            <p className="text-3xl sm:text-4xl font-bold text-blue-600">{batches.length}</p>
            <p className="text-xs text-gray-500 mt-2">Click to view all</p>
          </button>
          <button 
            onClick={() => setActiveTab('tutors')}
            data-testid="stat-total-tutors" 
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left cursor-pointer"
          >
            <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-2">Approved Tutors</h3>
            <p className="text-3xl sm:text-4xl font-bold text-purple-600">{tutors.length}</p>
            <p className="text-xs text-gray-500 mt-2">Click to manage</p>
          </button>
          <button 
            onClick={() => setActiveTab('schools')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left cursor-pointer"
          >
            <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-2">Schools</h3>
            <p className="text-3xl sm:text-4xl font-bold text-orange-600">{allSchools.length}</p>
            <p className="text-xs text-gray-500 mt-2">Click to view all</p>
          </button>
          <button 
            onClick={() => setActiveTab('pending')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left cursor-pointer"
          >
            <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-2">Pending Approvals</h3>
            <p className="text-3xl sm:text-4xl font-bold text-yellow-600">
              {pendingTutors.length + pendingSchools.length + remedialRequests.filter(r => r.status === 'pending').length}
            </p>
            <p className="text-xs text-gray-500 mt-2">Tutors, Schools & Remedial Requests</p>
          </button>
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
            <TabsTrigger value="batches" className="text-xs sm:text-sm">Batches ({batches.length})</TabsTrigger>
            <TabsTrigger value="tutors" className="text-xs sm:text-sm">Tutors ({tutors.length})</TabsTrigger>
            <TabsTrigger value="schools" className="text-xs sm:text-sm">Schools ({allSchools.length})</TabsTrigger>
            <TabsTrigger value="remedial" className="text-xs sm:text-sm">Remedial ({remedialRequests.length})</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending ({pendingTutors.length + pendingSchools.length + remedialRequests.filter(r => r.status === 'pending').length})</TabsTrigger>
          </TabsList>

          {/* All Tutors Tab */}
          <TabsContent value="tutors">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">All Approved Tutors</h2>
              <div className="space-y-4">
                {tutors.map(tutorData => (
                  <div key={tutorData.tutor.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-4 flex-1">
                        {/* Profile Thumbnail */}
                        <div className="flex-shrink-0">
                          {tutorData.tutor?.photo_url || tutorData.user?.photo_url ? (
                            <img 
                              src={tutorData.tutor?.photo_url || tutorData.user?.photo_url} 
                              alt={tutorData.user?.name}
                              className="w-16 h-16 object-cover rounded-full border-2 border-gray-300"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-green-400 rounded-full flex items-center justify-center text-white font-bold text-xl">
                              {tutorData.user?.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        
                        {/* Tutor Info */}
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg">{tutorData.user?.name}</h3>
                          <p className="text-sm text-gray-600">{tutorData.user?.email}</p>
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Board:</span> {tutorData.tutor.board_preference} | 
                            <span className="font-medium ml-2">Classes:</span> {tutorData.tutor.classes_can_teach?.join(', ')} | 
                            <span className="font-medium ml-2">Subjects:</span> {tutorData.tutor.subjects_can_teach?.map(s => SUBJECTS[s]).join(', ')}
                          </p>
                          <div className="mt-2 flex items-center space-x-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              tutorData.tutor.status === 'active' ? 'bg-green-100 text-green-800' :
                              tutorData.tutor.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                              tutorData.tutor.status === 'blacklisted' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {tutorData.tutor.status?.toUpperCase() || 'ACTIVE'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleViewTutorDetails(tutorData)}
                          size="sm"
                          variant="outline"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <Button
                          onClick={() => handleChangeStatus(tutorData)}
                          size="sm"
                          variant="outline"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Change Status
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* All Batches Tab */}
          <TabsContent value="batches">
            {/* Filter Bar */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              {/* Filter by Class */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Classes" />
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

              {/* Filter by Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    <SelectItem value="MAT">Maths</SelectItem>
                    <SelectItem value="PHY">Physics</SelectItem>
                    <SelectItem value="SCI">Science</SelectItem>
                    <SelectItem value="BIO">Biology</SelectItem>
                    <SelectItem value="ENG">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filter by Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
                <Select value={selectedDayFilter} onValueChange={setSelectedDayFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Days</SelectItem>
                    {DAYS.map(day => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filter by Tutor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tutor</label>
                <Select value={selectedTutorFilter} onValueChange={setSelectedTutorFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Tutors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tutors</SelectItem>
                    {tutors.map(t => (
                      <SelectItem key={t.tutor.id} value={t.tutor.id}>{t.user?.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>

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
                  {filteredBatches.map(batch => {
                    // Determine border and status colors
                    const statusColors = {
                      'waitlist': 'border-l-yellow-500 bg-yellow-50',
                      'active': 'border-l-green-500 bg-green-50',
                      'full': 'border-l-blue-500 bg-blue-50'
                    };
                    const statusBadgeColors = {
                      'waitlist': 'bg-yellow-100 text-yellow-800 border-yellow-300',
                      'active': 'bg-green-100 text-green-800 border-green-300',
                      'full': 'bg-blue-100 text-blue-800 border-blue-300'
                    };
                    
                    return (
                    <div 
                      key={batch.id} 
                      data-testid={`coordinator-batch-${batch.id}`} 
                      className={`bg-white rounded-2xl shadow-lg p-6 border-l-4 ${statusColors[batch.status] || 'border-l-gray-400'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{batch.batch_code}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusBadgeColors[batch.status] || 'bg-gray-100 text-gray-800'}`}>
                              {batch.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-600 mt-1">
                            {SUBJECTS[batch.subject]} | Class {batch.class_level} | {batch.board} Board
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Academic Year: {batch.academic_year}
                          </p>
                          
                          {/* Assigned Days & Slots visualization based on global schedule */}
                          <div className="mt-3">
                            <p className="text-xs font-medium text-gray-600 mb-1">Assigned Days & Slots:</p>
                            <div className="flex flex-wrap gap-2">
                              {(batch.schedule_slots || [])
                                .slice()
                                .sort((a, b) => {
                                  const idxA = DAYS.indexOf(a.day);
                                  const idxB = DAYS.indexOf(b.day);
                                  if (idxA !== idxB) return idxA - idxB;
                                  // If same day, sort 17:00-18:00 before 18:00-19:00
                                  return a.slot.localeCompare(b.slot);
                                })
                                .map((slotObj, idx) => {
                                  const dayShort = slotObj.day.substring(0, 3);
                                  const display = slotObj.slot === '17:00-18:00' ? '5pm-6pm' : '6pm-7pm';

                                  const assignments = batchAssignments[batch.id] || [];
                                  const isAssigned = assignments.some(a => {
                                    const days = a.assignment?.assigned_days || [];
                                    return days.includes(slotObj.day);
                                  });

                                  let classes = 'px-2.5 py-1 rounded-md text-xs font-semibold border shadow-sm ';
                                  if (isAssigned) {
                                    classes += 'bg-emerald-100 text-emerald-700 border-emerald-300';
                                  } else {
                                    classes += 'bg-amber-100 text-amber-700 border-amber-300';
                                  }

                                  return (
                                    <span
                                      key={`${slotObj.day}-${slotObj.slot}-${idx}`}
                                      className={classes}
                                    >
                                      {dayShort} {display}
                                    </span>
                                  );
                                })}

                              {(batch.schedule_slots || []).length === 0 && (
                                <span className="text-xs text-gray-400">No schedule defined</span>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleViewStudents(batch)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-3 flex items-center"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Students: {batch.student_ids.length}/25
                          </button>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        data-testid={`assign-tutor-${batch.id}`}
                        onClick={async () => {
                          if (batch.status?.toLowerCase() === 'waitlist') return;
                          // Reset state
                          setSelectedTutor('');
                          setSelectedDays([]);
                          setSelectedTutorData(null);
                          setSelectedBatch(batch);
                          
                          // Fetch available tutors for this batch
                          try {
                            const res = await axios.get(`${API}/batches/${batch.id}/available-tutors`, { withCredentials: true });
                            setAvailableTutorsForBatch(res.data);
                          } catch (error) {
                            console.error('Failed to fetch available tutors:', error);
                            toast.error('Failed to fetch available tutors');
                            setAvailableTutorsForBatch([]);
                          }
                          setAssignDialogOpen(true);
                        }}
                        variant="outline"
                        size="sm"
                        disabled={batch.status?.toLowerCase() === 'waitlist'}
                        className={batch.status?.toLowerCase() === 'waitlist' ? 'opacity-50 cursor-not-allowed bg-gray-200' : ''}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Assign Tutor
                      </Button>
                      <Button
                        data-testid={`view-logboard-${batch.id}`}
                        onClick={() => {
                          if (batch.status?.toLowerCase() === 'waitlist') return;
                          navigate(`/logboard/${batch.id}`);
                        }}
                        className={batch.status?.toLowerCase() === 'waitlist' 
                          ? 'opacity-50 cursor-not-allowed bg-gray-400' 
                          : 'bg-gradient-to-r from-blue-600 to-green-600 text-white'
                        }
                        size="sm"
                        disabled={batch.status?.toLowerCase() === 'waitlist'}
                      >
                        View Log Board
                      </Button>
                    </div>
                  </div>
                </div>
                    );
                  })}
            </div>
          )}
        </div>
      </TabsContent>

      {/* Schools Tab */}
      <TabsContent value="schools">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">All Schools ({allSchools.length})</h2>
          
          {allSchools.length === 0 ? (
            <div className="text-center py-20">
              <School className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No schools found</h3>
              <p className="text-gray-600">No schools have registered yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allSchools.map((school) => {
                const statusColors = {
                  'pending': 'bg-yellow-50 border-yellow-200',
                  'approved': 'bg-green-50 border-green-200',
                  'rejected': 'bg-red-50 border-red-200'
                };
                const statusBadgeColors = {
                  'pending': 'bg-yellow-100 text-yellow-800',
                  'approved': 'bg-green-100 text-green-800',
                  'rejected': 'bg-red-100 text-red-800'
                };
                
                return (
                  <div key={school.id}>
                    <div className={`border rounded-lg p-4 ${statusColors[school.approval_status] || 'bg-white border-gray-200'}`}>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setExpandedSchoolId(expandedSchoolId === school.id ? null : school.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {expandedSchoolId === school.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <School className="h-5 w-5 text-orange-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">{school.school_name}</h3>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadgeColors[school.approval_status] || 'bg-gray-100 text-gray-800'}`}>
                              {school.approval_status?.toUpperCase() || 'UNKNOWN'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{school.city}, {school.state} | Classes {school.class_from}-{school.class_to}</p>
                        </div>
                        {school.approval_status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleApproveSchool(school.id)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              size="sm"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleRejectSchool(school.id)}
                              variant="destructive"
                              size="sm"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedSchoolId === school.id && (
                      <div className="ml-8 mt-2 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <h4 className="font-semibold text-sm mb-3">Complete School Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="font-semibold text-blue-900 mb-1">Basic Information</p>
                            <p><span className="font-medium">Principal:</span> {school.principal_name}</p>
                            <p><span className="font-medium">Email:</span> {school.email}</p>
                            <p><span className="font-medium">Phone:</span> {school.phone}</p>
                            {school.alternate_phone && <p><span className="font-medium">Alt Phone:</span> {school.alternate_phone}</p>}
                          </div>
                          <div>
                            <p className="font-semibold text-blue-900 mb-1">Location</p>
                            <p><span className="font-medium">Address:</span> {school.address}</p>
                            <p><span className="font-medium">City:</span> {school.city}</p>
                            <p><span className="font-medium">State:</span> {school.state}</p>
                            <p><span className="font-medium">Pincode:</span> {school.pincode}</p>
                            {school.location_url && (
                              <p><span className="font-medium">Map:</span> <a href={school.location_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a></p>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-blue-900 mb-1">Academic Details</p>
                            <p><span className="font-medium">Board:</span> {school.state_board}</p>
                            <p><span className="font-medium">Classes:</span> {school.class_from} to {school.class_to}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-blue-900 mb-1">Requirements</p>
                            <p><span className="font-medium">Subjects:</span></p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {school.tutors_required_subjects?.map(subject => (
                                <span key={subject} className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-semibold">
                                  {subject}
                                </span>
                              ))}
                            </div>
                            <p className="mt-2"><span className="font-medium">Days:</span></p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {school.preferred_days?.map(day => (
                                <span key={day} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                                  {day}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </TabsContent>

      {/* Remedial Requests Tab */}
      <TabsContent value="remedial">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Remedial Requests Management</h2>
          
          {remedialRequests.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No remedial requests</h3>
              <p className="text-gray-600">Students haven't requested any remedial classes yet</p>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-3">Filter Requests</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Class</label>
                    <Select value={remedialFilterClass} onValueChange={setRemedialFilterClass}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="All Classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {[...new Set(remedialRequests.map(r => r.class_level))].sort((a, b) => a - b).map(cls => (
                          <SelectItem key={cls} value={String(cls)}>Class {cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Subject</label>
                    <Select value={remedialFilterSubject} onValueChange={setRemedialFilterSubject}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="All Subjects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {[...new Set(remedialRequests.map(r => r.subject))].sort().map(subj => (
                          <SelectItem key={subj} value={subj}>{SUBJECTS[subj] || subj}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(remedialFilterClass !== 'all' || remedialFilterSubject !== 'all') && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setRemedialFilterClass('all');
                      setRemedialFilterSubject('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              {(() => {
                const filteredRequests = remedialRequests.filter(r => 
                  r.status === 'pending' &&
                  (remedialFilterClass === 'all' || String(r.class_level) === remedialFilterClass) &&
                  (remedialFilterSubject === 'all' || r.subject === remedialFilterSubject)
                );

                return filteredRequests.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">No pending remedial requests match the selected filters.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Select All and Pool Button */}
                    <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedRemedialRequests.length === filteredRequests.length && filteredRequests.length > 0}
                          onCheckedChange={() => handleSelectAllRemedialRequests(filteredRequests)}
                        />
                        <span className="text-sm font-medium">
                          Select All ({selectedRemedialRequests.filter(id => filteredRequests.find(r => r.id === id)).length}/{filteredRequests.length})
                        </span>
                      </div>
                      {selectedRemedialRequests.length > 0 && (
                        <Button
                          onClick={() => setPoolDialogOpen(true)}
                          className="bg-gradient-to-r from-blue-600 to-green-600 text-white"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Pool Selected ({selectedRemedialRequests.length})
                        </Button>
                      )}
                    </div>

                    {/* Requests List */}
                    <div className="space-y-3">
                      {filteredRequests.map(req => {
                        const student = remedialStudentDetails[req.student_id];
                        const isExpanded = expandedStudentId === req.student_id;
                        
                        return (
                          <div key={req.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedRemedialRequests.includes(req.id)}
                                onCheckedChange={() => handleSelectRemedialRequest(req.id)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setExpandedStudentId(isExpanded ? null : req.student_id)}
                                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-left"
                                    >
                                      <Eye className="h-4 w-4 flex-shrink-0" />
                                      {student ? (
                                        <span>{student.name} ({student.student_code})</span>
                                      ) : (
                                        <span className="text-xs text-gray-500">Loading student data...</span>
                                      )}
                                    </button>
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                      {req.board} | Class {req.class_level} | {SUBJECTS[req.subject]}
                                    </span>
                                  </div>
                                  <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">
                                    {req.status.toUpperCase()}
                                  </span>
                                </div>
                                
                                <div className="space-y-1 text-sm">
                                  <p><strong>Topic:</strong> {req.topic}</p>
                                  <p><strong>Reason:</strong> {req.reason}</p>
                                  {req.description && <p className="text-gray-600">{req.description}</p>}
                                  <p className="text-xs text-gray-500">Requested: {new Date(req.requested_at).toLocaleDateString()}</p>
                                </div>

                                {/* Expanded Student Details */}
                                {isExpanded && (
                                  <div className="mt-3 p-4 bg-white rounded-lg border-2 border-blue-300 shadow-sm">
                                    <h5 className="font-semibold text-base text-gray-900 mb-3 flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      Complete Student Profile
                                    </h5>
                                    {student ? (
                                      <div className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-700 min-w-[80px]">Name:</span>
                                            <span className="text-gray-900">{student.name}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-700 min-w-[80px]">Code:</span>
                                            <span className="text-gray-900 font-mono">{student.student_code}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-700 min-w-[80px]">Class:</span>
                                            <span className="text-gray-900">Class {student.class_level}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-700 min-w-[80px]">Board:</span>
                                            <span className="text-gray-900">{student.board}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-700 min-w-[80px]">School:</span>
                                            <span className="text-gray-900">{student.school_name}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-700 min-w-[80px]">Location:</span>
                                            <span className="text-gray-900">{student.location}</span>
                                          </div>
                                        </div>
                                        <div className="pt-2 border-t">
                                          <span className="font-medium text-gray-700 text-sm">Enrolled Subjects:</span>
                                          <div className="flex flex-wrap gap-2 mt-2">
                                            {student.subjects && student.subjects.map(subj => (
                                              <span key={subj} className="px-3 py-1 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-full text-xs font-medium">
                                                {SUBJECTS[subj] || subj}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-gray-500 text-sm">Loading student details...</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
          
          {/* Remedial Classes Section */}
          {remedialClasses.length > 0 && (
            <div className="mt-8 border-t pt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Remedial Classes Created ({remedialClasses.length})</h3>
              <div className="space-y-3">
                {remedialClasses.map(rc => (
                  <div key={rc.id} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{rc.class_code}</h4>
                        <p className="text-sm text-gray-600">
                          {rc.board} | Class {rc.class_level} | {SUBJECTS[rc.subject] || rc.subject}
                        </p>
                        <p className="text-sm text-gray-600">Topic: {rc.topic}</p>
                        <p className="text-sm text-gray-600">Students: {rc.student_ids.length}</p>
                        {rc.tutor_id && <p className="text-sm text-green-600 font-medium">✓ Tutor Assigned</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          rc.status === 'assigned' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {rc.status?.toUpperCase()}
                        </span>
                        {!rc.tutor_id && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRemedialClass(rc);
                              setAssignTutorDialogOpen(true);
                            }}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Assign Tutor
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Pending Approvals Tab - All Pending Items */}
      <TabsContent value="pending">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Pending Approvals</h2>
          
          {(pendingTutors.length === 0 && pendingSchools.length === 0 && remedialRequests.filter(r => r.status === 'pending').length === 0) ? (
            <div className="text-center py-20">
              <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No pending approvals</h3>
              <p className="text-gray-600">All items have been reviewed</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Pending Tutors */}
              {pendingTutors.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Pending Tutor Approvals ({pendingTutors.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingTutors.map(tutorData => (
                      <div key={tutorData.tutor.id} className="border rounded-lg p-4 hover:bg-gray-50 bg-yellow-50 border-yellow-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900">{tutorData.user?.name}</h4>
                            <p className="text-sm text-gray-600">{tutorData.user?.email}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Board:</strong> {tutorData.tutor.board_preference} | 
                              <strong className="ml-2">Classes:</strong> {tutorData.tutor.classes_can_teach?.join(', ')} | 
                              <strong className="ml-2">Subjects:</strong> {tutorData.tutor.subjects_can_teach?.map(s => SUBJECTS[s]).join(', ')}
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              setCurrentTutor(tutorData);
                              setTutorApprovalDialogOpen(true);
                            }}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Pending Schools */}
              {pendingSchools.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <School className="h-5 w-5" />
                    Pending School Approvals ({pendingSchools.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingSchools.map(school => (
                      <div key={school.id} className="border rounded-lg p-4 hover:bg-gray-50 bg-yellow-50 border-yellow-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900">{school.school_name}</h4>
                            <p className="text-sm text-gray-600">{school.city}, {school.state} | Classes {school.class_from}-{school.class_to}</p>
                            <p className="text-sm text-gray-600">Principal: {school.principal_name}</p>
                          </div>
                          <Button
                            onClick={() => setActiveTab('schools')}
                            size="sm"
                            variant="outline"
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Pending Remedial Requests */}
              {remedialRequests.filter(r => r.status === 'pending').length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Pending Remedial Requests ({remedialRequests.filter(r => r.status === 'pending').length})
                  </h3>
                  <div className="space-y-3">
                    {remedialRequests.filter(r => r.status === 'pending').slice(0, 5).map(req => (
                      <div key={req.id} className="border rounded-lg p-4 hover:bg-gray-50 bg-yellow-50 border-yellow-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {req.board} - Class {req.class_level} - {SUBJECTS[req.subject] || req.subject}
                            </p>
                            <p className="text-sm text-gray-600">Topic: {req.topic}</p>
                            <p className="text-xs text-gray-500 mt-1">Student ID: {req.student_id}</p>
                          </div>
                          <Button
                            onClick={() => setActiveTab('remedial')}
                            size="sm"
                            variant="outline"
                          >
                            View All
                          </Button>
                        </div>
                      </div>
                    ))}
                    {remedialRequests.filter(r => r.status === 'pending').length > 5 && (
                      <p className="text-sm text-gray-500 text-center">
                        +{remedialRequests.filter(r => r.status === 'pending').length - 5} more remedial requests
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
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
              <Select 
                value={selectedTutor} 
                onValueChange={(value) => {
                  setSelectedTutor(value);
                  // Find and store selected tutor data
                  const tutorData = tutors.find(t => t.tutor.id === value);
                  setSelectedTutorData(tutorData);
                  setSelectedDays([]); // Reset selected days when tutor changes
                }}
              >
                <SelectTrigger data-testid="tutor-select">
                  <SelectValue placeholder="Choose a tutor" />
                </SelectTrigger>
                <SelectContent>
                  {availableTutorsForBatch.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No available tutors match this batch's schedule</div>
                  ) : (
                    availableTutorsForBatch.map(tutorData => {
                    // Calculate how many days this tutor has already been assigned
                    let assignedDaysCount = 0;
                    Object.values(batchAssignments).forEach(assignments => {
                      assignments.forEach(assignment => {
                        if (assignment.tutor_id === tutorData.tutor.id) {
                          assignedDaysCount += assignment.assignment?.assigned_days?.length || 0;
                        }
                      });
                    });
                    
                    const availableDaysCount = tutorData.tutor.available_days?.length || 0;
                    const isFullyAssigned = assignedDaysCount >= availableDaysCount;
                    
                    return (
                      <SelectItem 
                        key={tutorData.tutor.id} 
                        value={tutorData.tutor.id}
                        disabled={isFullyAssigned}
                      >
                        {tutorData.user?.name} ({tutorData.tutor.tutor_code})
                        {isFullyAssigned && ' - Fully Assigned'}
                      </SelectItem>
                    );
                  })
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedTutorData && (
              <div className="space-y-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {selectedTutorData.user?.name}'s Available Days:
                  </p>
                  <p className="text-sm text-blue-800 font-medium">
                    {selectedTutorData.tutor.available_days?.join(', ')}
                  </p>
                </div>
                {selectedTutorData.matching_days && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Days matching batch schedule:
                    </p>
                    <p className="text-sm text-green-800 font-medium">
                      {selectedTutorData.matching_days.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Assign/Unassign Days {selectedTutorData && '(matching batch schedule & tutor availability)'}
              </label>
              {selectedBatch && selectedBatch.schedule_slots && (
                <div className="mb-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  Batch schedule: {[...new Set(selectedBatch.schedule_slots.map(s => s.day))].join(', ')}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {DAYS.map(day => {
                  // Check if day is in batch schedule
                  const batchDays = selectedBatch?.schedule_slots ? 
                    new Set(selectedBatch.schedule_slots.map(s => s.day)) : 
                    new Set();
                  const isInBatchSchedule = batchDays.has(day);
                  
                  const isAvailable = selectedTutorData?.tutor.available_days?.includes(day);
                  const isDisabled = !selectedTutorData || !isAvailable || !isInBatchSchedule;
                  
                  return (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        data-testid={`assign-day-${day}-checkbox`}
                        id={`assign-day-${day}`}
                        checked={selectedDays.includes(day)}
                        onCheckedChange={() => toggleDay(day)}
                        disabled={isDisabled}
                      />
                      <label 
                        htmlFor={`assign-day-${day}`} 
                        className={`text-sm ${isDisabled ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {day}
                        {!isInBatchSchedule && ' (Not in batch schedule)'}
                        {isInBatchSchedule && !isAvailable && selectedTutorData && ' (Tutor not available)'}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                data-testid="confirm-assign-tutor"
                onClick={() => handleAssignTutor('assign')}
                className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 text-white"
                disabled={!selectedTutor || selectedDays.length === 0}
              >
                Assign
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleAssignTutor('unassign')}
                disabled={!selectedTutor || selectedDays.length === 0}
              >
                Unassign
              </Button>
            </div>
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
              {/* Basic Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 text-lg">{currentTutor.user?.name}</h3>
                <p className="text-sm text-gray-600">{currentTutor.user?.email}</p>
                <p className="text-sm text-gray-600 mt-2"><strong>Tutor Code:</strong> {currentTutor.tutor?.tutor_code}</p>
                <p className="text-sm text-gray-600"><strong>Board Preference:</strong> {currentTutor.tutor?.board_preference}</p>
                <p className="text-sm text-gray-600"><strong>Address:</strong> {currentTutor.tutor?.current_address || 'Not provided'}</p>
                <p className="text-sm text-gray-600"><strong>Pincode:</strong> {currentTutor.tutor?.pincode || 'Not provided'}</p>
                <p className="text-sm text-gray-600 mt-2"><strong>Classes:</strong> {currentTutor.tutor?.classes_can_teach?.join(', ')}</p>
                <p className="text-sm text-gray-600"><strong>Subjects:</strong> {currentTutor.tutor?.subjects_can_teach?.map(s => SUBJECTS[s]).join(', ')}</p>
                <p className="text-sm text-gray-600"><strong>Available Days:</strong> {currentTutor.tutor?.available_days?.join(', ')}</p>
              </div>

              {/* KYC Documents */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3">KYC Documents</h4>
                
                {/* Photo */}
                {(currentTutor.tutor?.photo_url || currentTutor.user?.photo_url) ? (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Selfie Photo:</p>
                    <img 
                      src={currentTutor.tutor?.photo_url || currentTutor.user?.photo_url} 
                      alt="Tutor Selfie" 
                      className="w-32 h-32 object-cover rounded-lg border-2 border-blue-300 shadow-md"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 mb-4">📷 Photo: Not uploaded</p>
                )}

                {/* Aadhaar */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Aadhaar Information:</p>
                  {currentTutor.tutor?.aadhaar_number && currentTutor.tutor.aadhaar_number !== '000000000000' && (
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Number:</strong> {currentTutor.tutor.aadhaar_number}
                    </p>
                  )}
                  
                  {currentTutor.tutor?.aadhaar_page1_url ? (
                    <a 
                      href={currentTutor.tutor.aadhaar_page1_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img 
                        src={currentTutor.tutor.aadhaar_page1_url} 
                        alt="Aadhaar Document" 
                        className="max-w-xs w-full h-auto rounded-lg border-2 border-blue-300 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                      />
                      <p className="text-xs text-blue-600 mt-1 hover:underline">Click to view full size</p>
                    </a>
                  ) : (
                    <p className="text-sm text-red-600">⚠️ Aadhaar document not uploaded</p>
                  )}
                </div>
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

      {/* Tutor Details View Dialog */}
      <Dialog open={tutorDetailsDialogOpen} onOpenChange={setTutorDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tutor Details</DialogTitle>
            <DialogDescription>Complete information about the tutor</DialogDescription>
          </DialogHeader>
          {selectedTutorDetails && (
            <div className="space-y-4">
              {/* User & Profile Info */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
                <div className="flex items-start space-x-6">
                  {selectedTutorDetails.tutor?.photo_url && (
                    <img 
                      src={selectedTutorDetails.tutor.photo_url} 
                      alt="Tutor" 
                      className="w-24 h-24 object-cover rounded-full border-4 border-white shadow-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedTutorDetails.user?.name}</h3>
                    <p className="text-gray-600">{selectedTutorDetails.user?.email}</p>
                    <p className="text-sm text-gray-600 mt-2"><strong>Code:</strong> {selectedTutorDetails.tutor?.tutor_code}</p>
                    <div className="mt-3">
                      <span className={`px-4 py-1 rounded-full text-sm font-medium ${
                        selectedTutorDetails.tutor?.status === 'active' ? 'bg-green-100 text-green-800' :
                        selectedTutorDetails.tutor?.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                        selectedTutorDetails.tutor?.status === 'blacklisted' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedTutorDetails.tutor?.status?.toUpperCase() || 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact & Address */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-3">Contact Information</h4>
                  <p className="text-sm text-gray-700"><strong>Email:</strong> {selectedTutorDetails.user?.email}</p>
                  <p className="text-sm text-gray-700 mt-2"><strong>Address:</strong> {selectedTutorDetails.tutor?.current_address || 'Not provided'}</p>
                  <p className="text-sm text-gray-700"><strong>Pincode:</strong> {selectedTutorDetails.tutor?.pincode || 'Not provided'}</p>
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-3">Teaching Preferences</h4>
                  <p className="text-sm text-gray-700"><strong>Board:</strong> {selectedTutorDetails.tutor?.board_preference}</p>
                  <p className="text-sm text-gray-700 mt-2"><strong>Classes:</strong> {selectedTutorDetails.tutor?.classes_can_teach?.join(', ')}</p>
                  <p className="text-sm text-gray-700 mt-2"><strong>Subjects:</strong> {selectedTutorDetails.tutor?.subjects_can_teach?.map(s => SUBJECTS[s]).join(', ')}</p>
                  <p className="text-sm text-gray-700 mt-2"><strong>Days:</strong> {selectedTutorDetails.tutor?.available_days?.join(', ')}</p>
                </div>
              </div>

              {/* KYC Documents */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3">KYC Documents</h4>
                <div className="space-y-4">
                  {/* Selfie Photo Thumbnail */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Selfie Photo:</p>
                    {selectedTutorDetails.tutor?.photo_url || selectedTutorDetails.user?.photo_url ? (
                      <img 
                        src={selectedTutorDetails.tutor?.photo_url || selectedTutorDetails.user?.photo_url} 
                        alt="Tutor Selfie" 
                        className="w-32 h-32 object-cover rounded-lg border-2 border-blue-300 shadow-md"
                      />
                    ) : (
                      <p className="text-sm text-gray-500">Not uploaded</p>
                    )}
                  </div>
                  
                  {/* Aadhaar */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Aadhaar Document:</p>
                    {selectedTutorDetails.tutor?.aadhaar_number && (
                      <p className="text-sm text-gray-700 mb-2">Number: {selectedTutorDetails.tutor.aadhaar_number}</p>
                    )}
                    {selectedTutorDetails.tutor?.aadhaar_page1_url ? (
                      <a 
                        href={selectedTutorDetails.tutor.aadhaar_page1_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img 
                          src={selectedTutorDetails.tutor.aadhaar_page1_url} 
                          alt="Aadhaar Document" 
                          className="max-w-xs w-full h-auto rounded-lg border-2 border-blue-300 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                        />
                        <p className="text-xs text-blue-600 mt-1">Click to view full size</p>
                      </a>
                    ) : (
                      <p className="text-sm text-gray-500">Not uploaded</p>
                    )}
                  </div>
                  
                  {/* Availability */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Availability Status:</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      selectedTutorDetails.tutor?.availability_status === 'available' ? 'bg-green-100 text-green-800' :
                      selectedTutorDetails.tutor?.availability_status === 'unavailable' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedTutorDetails.tutor?.availability_status?.toUpperCase() || 'AVAILABLE'}
                    </span>
                    {selectedTutorDetails.tutor?.unavailable_from && (
                      <p className="text-xs text-gray-600 mt-2">
                        Unavailable: {selectedTutorDetails.tutor.unavailable_from} to {selectedTutorDetails.tutor.unavailable_to}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Assigned Batches */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3">Assigned Batches</h4>
                {(() => {
                  // Find all batches where this tutor is assigned
                  const tutorBatches = [];
                  batches.forEach(batch => {
                    const assignments = batchAssignments[batch.id] || [];
                    // The structure is { assignment: {...}, tutor: {...}, tutor_user: {...} }
                    const tutorAssignment = assignments.find(a => {
                      // Check if tutor.id matches
                      return a.tutor?.id === selectedTutorDetails.tutor.id;
                    });
                    if (tutorAssignment) {
                      tutorBatches.push({
                        batch,
                        days: tutorAssignment.assignment?.assigned_days || []
                      });
                    }
                  });

                  if (tutorBatches.length === 0) {
                    return <p className="text-sm text-gray-600">No batches assigned yet</p>;
                  }

                  return (
                    <div className="space-y-3">
                      {tutorBatches.map(({ batch, days }) => (
                        <div key={batch.id} className="bg-white rounded-lg p-3 border border-green-300">
                          <p className="font-medium text-gray-900">{batch.batch_code}</p>
                          <p className="text-sm text-gray-600">
                            {SUBJECTS[batch.subject]} | Class {batch.class_level} | {batch.board} Board
                          </p>
                          <p className="text-sm text-green-700 mt-1">
                            <strong>Days:</strong> {days.join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setTutorDetailsDialogOpen(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Tutor Status</DialogTitle>
            <DialogDescription>
              Update the status of {selectedTutorDetails?.user?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedTutorDetails && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Current Status:</p>
                <p className="font-bold text-lg capitalize">{selectedTutorDetails.tutor?.status || 'active'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">New Status:</label>
                <Select value={newTutorStatus} onValueChange={setNewTutorStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <div className="flex items-center">
                        <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                        Active
                      </div>
                    </SelectItem>
      {/* Coordinator Availability Dialog - Submit Request to Admin */}
      <Dialog open={availabilityDialogOpen} onOpenChange={setAvailabilityDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Availability</DialogTitle>
            <DialogDescription>
              Submit your availability request. Admin will review and update your coordinator status or reassign batches if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setAvailabilityRequestType('available')}>
                <div className="flex items-start">
                  <input 
                    type="radio" 
                    checked={availabilityRequestType === 'available'} 
                    onChange={() => setAvailabilityRequestType('available')}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">Available</p>
                    <p className="text-sm text-gray-600">I am ready to teach and take new batches</p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setAvailabilityRequestType('unavailable')}>
                <div className="flex items-start">
                  <input 
                    type="radio" 
                    checked={availabilityRequestType === 'unavailable'} 
                    onChange={() => setAvailabilityRequestType('unavailable')}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Temporarily Unavailable</p>
                    <p className="text-sm text-gray-600">I need a break for a specific period</p>
                  </div>
                </div>
              </div>

              {availabilityRequestType === 'unavailable' && (
                <div className="ml-8 space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700">Unavailability Period</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                      <Input
                        type="date"
                        value={availabilityRequestFrom}
                        onChange={(e) => setAvailabilityRequestFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                      <Input
                        type="date"
                        value={availabilityRequestTo}
                        onChange={(e) => setAvailabilityRequestTo(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="border border-red-200 rounded-lg p-4 hover:bg-red-50 cursor-pointer" onClick={() => setAvailabilityRequestType('delete_account')}>
                <div className="flex items-start">
                  <input 
                    type="radio" 
                    checked={availabilityRequestType === 'delete_account'} 
                    onChange={() => setAvailabilityRequestType('delete_account')}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <p className="font-semibold text-red-900">Not Interested / Delete Account</p>
                    <p className="text-sm text-red-700">I no longer wish to volunteer</p>
                  </div>
                </div>
              </div>

              {availabilityRequestType === 'delete_account' && (
                <div className="ml-8 p-4 bg-red-50 border border-red-300 rounded-lg text-sm text-red-800">
                  ⚠️ <strong>Warning:</strong> This will send a request to Admin to delete your account and reassign your batches.
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-2">
              <Button variant="outline" onClick={() => setAvailabilityDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitAvailabilityRequest} disabled={availabilityRequestLoading}>
                {availabilityRequestLoading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

                    <SelectItem value="suspended">
                      <div className="flex items-center">
                        <Ban className="h-4 w-4 mr-2 text-yellow-600" />
                        Suspended
                      </div>
                    </SelectItem>
                    <SelectItem value="blacklisted">
                      <div className="flex items-center">
                        <XCircle className="h-4 w-4 mr-2 text-red-600" />
                        Blacklisted
                      </div>
                    </SelectItem>
                    <SelectItem value="unavailable">
                      <div className="flex items-center">
                        <UserX className="h-4 w-4 mr-2 text-gray-600" />
                        Unavailable
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Note:</strong> Changing status will affect the tutor's ability to teach and be assigned to batches.
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => handleUpdateTutorStatus(selectedTutorDetails.tutor.id, newTutorStatus)}
                  className="flex-1"
                >
                  Update Status
                </Button>
                <Button
                  onClick={() => setStatusChangeDialogOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pool Students Dialog */}
      <Dialog open={poolDialogOpen} onOpenChange={setPoolDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pool Selected Students into Remedial Class</DialogTitle>
            <DialogDescription>
              Create a remedial class from {selectedRemedialRequests.length} selected student{selectedRemedialRequests.length > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Topic/Lesson Name *</label>
              <Input
                value={poolTopic}
                onChange={(e) => setPoolTopic(e.target.value)}
                placeholder="Enter the topic for this remedial class"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePoolStudents} className="flex-1">
                Create Remedial Class
              </Button>
              <Button onClick={() => setPoolDialogOpen(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Tutor to Remedial Class Dialog */}
      <Dialog open={assignTutorDialogOpen} onOpenChange={setAssignTutorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Tutor to Remedial Class</DialogTitle>
          </DialogHeader>
          {selectedRemedialClass && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="font-bold text-gray-900">{selectedRemedialClass.class_code}</p>
                <p className="text-sm text-gray-600">
                  {selectedRemedialClass.board} | Class {selectedRemedialClass.class_level} | {SUBJECTS[selectedRemedialClass.subject]}
                </p>
                <p className="text-sm text-gray-600">Topic: {selectedRemedialClass.topic}</p>
                <p className="text-sm text-gray-600">Students: {selectedRemedialClass.student_ids.length}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Select Tutor *</label>
                <Select value={selectedRemedialTutor} onValueChange={setSelectedRemedialTutor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a tutor" />
                  </SelectTrigger>
                  <SelectContent>
                    {tutors
                      .filter(t => 
                        t.subjects_can_teach?.includes(selectedRemedialClass.subject) &&
                        t.classes_can_teach?.includes(selectedRemedialClass.class_level)
                      )
                      .map(tutor => (
                        <SelectItem key={tutor.id} value={tutor.id}>
                          {tutor.name} - {tutor.tutor_code}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAssignRemedialTutor} className="flex-1">
                  Assign Tutor
                </Button>
                <Button onClick={() => setAssignTutorDialogOpen(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
