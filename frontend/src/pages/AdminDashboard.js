import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  School, 
  UserPlus,
  Shield,
  BarChart3,
  LogOut,
  UserCog,
  CheckCircle,
  XCircle,
  Ban,
  Trash2,
  Mail,
  Copy,
  Upload,
  User,
  ChevronDown,
  ChevronRight,
  Flag
} from 'lucide-react';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminDashboard({ user, logout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalCoordinators: 0,
    totalTutors: 0,
    totalStudents: 0,
    totalParents: 0,
    totalBatches: 0,
    totalSchools: 0,
    totalStateBoards: 0,
    pendingCoordinators: 0,
    pendingTutors: 0
  });

  // Manage Admins State
  const [admins, setAdmins] = useState([]);
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  // Coordinators State
  const [coordinators, setCoordinators] = useState([]);
  const [coordinatorFilter, setCoordinatorFilter] = useState('all'); // all, pending, active, suspended, blacklisted

  // Tutors State
  const [tutors, setTutors] = useState([]);
  const [tutorFilter, setTutorFilter] = useState('all');

  // Students & Parents State
  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);

  // Schools State
  const [schools, setSchools] = useState([]);

  // Batches State
  const [batches, setBatches] = useState([]);

  // State Boards State
  const [stateBoards, setStateBoards] = useState([]);

  // Curriculum State
  const [curriculum, setCurriculum] = useState([]);
  const [curriculumSummary, setCurriculumSummary] = useState([]);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState([]);
  const [curriculumFilterBoard, setCurriculumFilterBoard] = useState('all');
  const [curriculumFilterClass, setCurriculumFilterClass] = useState('all');
  const [curriculumFilterSubject, setCurriculumFilterSubject] = useState('all');

  // Selection state for bulk operations
  const [selectedCoordinators, setSelectedCoordinators] = useState([]);
  const [selectedTutors, setSelectedTutors] = useState([]);
  const [selectedParents, setSelectedParents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedAdmins, setSelectedAdmins] = useState([]);
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [selectedBoards, setSelectedBoards] = useState([]);

  // Expanded details state
  const [expandedId, setExpandedId] = useState(null);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState('');
  const [idsToDelete, setIdsToDelete] = useState([]);
  const [deleteWarningMessage, setDeleteWarningMessage] = useState('');

  // State Board form
  const [showAddBoardDialog, setShowAddBoardDialog] = useState(false);
  const [boardFormData, setBoardFormData] = useState({
    name: '',
    code: '',
    description: ''
  });

  // Coordinator Assignments State
  const [coordinatorAssignments, setCoordinatorAssignments] = useState([]);
  const [showAssignCoordinatorDialog, setShowAssignCoordinatorDialog] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState('create'); // 'create' or 'delete'
  const [assignmentData, setAssignmentData] = useState({
    coordinator_id: '',
    assignment_type: 'class',
    class_level: '',
    subject: '',
    batch_start: '',
    batch_end: ''
  });

  // Helper function to get subjects based on class level
  const getSubjectsForClass = (classLevel) => {
    if (classLevel >= 6 && classLevel <= 7) {
      return [
        { code: 'MAT', name: 'Mathematics' },
        { code: 'SCI', name: 'Science' },
        { code: 'ENG', name: 'English' }
      ];
    } else if (classLevel >= 8 && classLevel <= 10) {
      return [
        { code: 'MAT', name: 'Mathematics' },
        { code: 'PHY', name: 'Physics' },
        { code: 'BIO', name: 'Biology' },
        { code: 'ENG', name: 'English' }
      ];
    }
    return [];
  };

  useEffect(() => {
    fetchDashboardStats();
    if (activeTab === 'admins') fetchAdmins();
    if (activeTab === 'coordinators') {
      fetchCoordinators();
      fetchCoordinatorAssignments();
    }
    if (activeTab === 'tutors') fetchTutors();
    if (activeTab === 'students') fetchStudents();
    if (activeTab === 'parents') fetchParents();
    if (activeTab === 'schools') fetchSchools();
    if (activeTab === 'batches') fetchBatches();
    if (activeTab === 'state-boards') fetchStateBoards();
    if (activeTab === 'curriculum') {
      fetchCurriculum();
      fetchCurriculumSummary();
    }
  }, [activeTab]);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, {
        withCredentials: true
      });
      
      // Fetch schools and state boards counts separately
      const schoolsResponse = await axios.get(`${API}/admin/schools`, {
        withCredentials: true
      });
      const boardsResponse = await axios.get(`${API}/admin/state-boards`, {
        withCredentials: true
      });
      
      setStats({
        ...response.data,
        totalSchools: schoolsResponse.data.length,
        totalStateBoards: boardsResponse.data.length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${API}/admin/admins`, {
        withCredentials: true
      });
      setAdmins(response.data);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Failed to load admins');
    }
  };

  const fetchCoordinators = async () => {
    try {
      const response = await axios.get(`${API}/admin/coordinators`, {
        withCredentials: true
      });
      setCoordinators(response.data);
    } catch (error) {
      console.error('Error fetching coordinators:', error);
      toast.error('Failed to load coordinators');
    }
  };

  const fetchTutors = async () => {
    try {
      const response = await axios.get(`${API}/tutors`, {
        withCredentials: true
      });
      setTutors(response.data);
    } catch (error) {
      console.error('Error fetching tutors:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/admin/students`, {
        withCredentials: true
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchParents = async () => {
    try {
      const response = await axios.get(`${API}/admin/parents`, {
        withCredentials: true
      });
      setParents(response.data);
    } catch (error) {
      console.error('Error fetching parents:', error);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API}/admin/schools`, {
        withCredentials: true
      });
      setSchools(response.data);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await axios.get(`${API}/batches`, {
        withCredentials: true
      });
      setBatches(response.data);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const fetchStateBoards = async () => {
    try {
      const response = await axios.get(`${API}/admin/state-boards`, {
        withCredentials: true
      });
      setStateBoards(response.data);
    } catch (error) {
      console.error('Error fetching state boards:', error);
      toast.error('Failed to load state boards');
    }
  };

  const fetchCurriculum = async () => {
    try {
      const response = await axios.get(`${API}/admin/curriculum`, {
        withCredentials: true
      });
      setCurriculum(response.data);
    } catch (error) {
      console.error('Error fetching curriculum:', error);
      toast.error('Failed to load curriculum');
    }
  };

  const fetchCurriculumSummary = async () => {
    try {
      const response = await axios.get(`${API}/admin/curriculum/summary`, {
        withCredentials: true
      });
      setCurriculumSummary(response.data);
    } catch (error) {
      console.error('Error fetching curriculum summary:', error);
    }
  };

  // Admin Management Functions
  const handleAddCoAdmin = async () => {
    if (!newAdminData.email || !newAdminData.password || !newAdminData.name) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      await axios.post(`${API}/admin/co-admins`, newAdminData, {
        withCredentials: true
      });
      toast.success('Co-admin created successfully');
      setShowAddAdminDialog(false);
      setNewAdminData({ email: '', password: '', name: '' });
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create co-admin');
    }
  };

  const handleGenerateInvite = async () => {
    if (!inviteEmail) {
      toast.error('Please enter email address');
      return;
    }

    try {
      const response = await axios.post(`${API}/admin/invite`, 
        { email: inviteEmail },
        { withCredentials: true }
      );
      setInviteLink(response.data.invite_link);
      toast.success('Invite link generated');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate invite');
    }
  };

  const handleRemoveCoAdmin = async (adminId) => {
    if (!confirm('Are you sure you want to remove this co-admin?')) return;

    try {
      await axios.delete(`${API}/admin/co-admins/${adminId}`, {
        withCredentials: true
      });
      toast.success('Co-admin removed');
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove co-admin');
    }
  };

  // Coordinator Management Functions
  const handleCoordinatorAction = async (coordinatorId, action) => {
    try {
      await axios.put(`${API}/admin/coordinators/${coordinatorId}/status`, 
        { action },
        { withCredentials: true }
      );
      toast.success(`Coordinator ${action}d successfully`);
      fetchCoordinators();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} coordinator`);
    }
  };

  // Coordinator Assignment Functions
  const fetchCoordinatorAssignments = async () => {
    try {
      const response = await axios.get(`${API}/admin/coordinator-assignments`, {
        withCredentials: true
      });
      setCoordinatorAssignments(response.data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleCreateAssignment = async () => {
    if (!assignmentData.coordinator_id) {
      toast.error('Please select a coordinator');
      return;
    }

    try {
      await axios.post(`${API}/admin/coordinator-assignments`, assignmentData, {
        withCredentials: true
      });
      toast.success('Coordinator assigned successfully');
      setShowAssignCoordinatorDialog(false);
      setAssignmentData({
        coordinator_id: '',
        assignment_type: 'class',
        class_level: '',
        subject: '',
        batch_start: '',
        batch_end: ''
      });
      fetchCoordinatorAssignments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;

    try {
      await axios.delete(`${API}/admin/coordinator-assignments/${assignmentId}`, {
        withCredentials: true
      });
      toast.success('Assignment removed');
      fetchCoordinatorAssignments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove assignment');
    }
  };

  const handleBulkUnassign = async () => {
    if (!confirm('Are you sure you want to remove ALL coordinator assignments?')) return;

    try {
      // Delete all assignments one by one
      for (const assignment of coordinatorAssignments) {
        await axios.delete(`${API}/admin/coordinator-assignments/${assignment.id}`, {
          withCredentials: true
        });
      }
      toast.success('All assignments removed');
      fetchCoordinatorAssignments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove assignments');
    }
  };

  // Selection handlers
  const handleSelectAll = (type, items, selectedItems, setSelectedItems) => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  const handleSelectSingle = (id, selectedItems, setSelectedItems) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  // Delete handlers
  const handleOpenDeleteDialog = async (type, ids) => {
    setDeleteType(type);
    setIdsToDelete(ids);
    setDeleteWarningMessage('');

    // Special check for parents - show student info before confirming
    if (type === 'parents') {
      try {
        const response = await axios.post(`${API}/admin/parents/check-students`, 
          { ids },
          { withCredentials: true }
        );

        if (response.data.has_students) {
          // Build warning message
          let warningMsg = 'The following parents have students:\n\n';
          response.data.details.forEach(detail => {
            warningMsg += `• ${detail.parent_name} (${detail.student_count} student${detail.student_count > 1 ? 's' : ''}):\n`;
            detail.students.forEach(student => {
              warningMsg += `  - ${student}\n`;
            });
            warningMsg += '\n';
          });
          warningMsg += 'All students will be deleted along with their parents.';
          setDeleteWarningMessage(warningMsg);
        }
      } catch (error) {
        console.error('Error checking parent students:', error);
      }
    }

    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const endpoint = `${API}/admin/${deleteType}/bulk`;
      const response = await axios.delete(endpoint, {
        data: { ids: idsToDelete },
        withCredentials: true
      });

      toast.success(`Deleted ${response.data.deleted_count} ${deleteType}`);
      
      if (response.data.warnings && response.data.warnings.length > 0) {
        response.data.warnings.forEach(warning => toast.warning(warning));
      }
      
      if (response.data.errors && response.data.errors.length > 0) {
        response.data.errors.forEach(error => toast.error(error));
      }

      // Clear selections and refresh data
      if (deleteType === 'coordinators') {
        setSelectedCoordinators([]);
        fetchCoordinators();
      } else if (deleteType === 'tutors') {
        setSelectedTutors([]);
        fetchTutors();
      } else if (deleteType === 'parents') {
        setSelectedParents([]);
        fetchParents();
      } else if (deleteType === 'students') {
        setSelectedStudents([]);
        fetchStudents();
      } else if (deleteType === 'co-admins') {
        setSelectedAdmins([]);
        fetchAdmins();
      } else if (deleteType === 'schools') {
        setSelectedSchools([]);
        fetchSchools();
      } else if (deleteType === 'batches') {
        setSelectedBatches([]);
        fetchBatches();
      } else if (deleteType === 'state-boards') {
        setSelectedBoards([]);
        fetchStateBoards();
      }

      setDeleteDialogOpen(false);
      fetchDashboardStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to delete ${deleteType}`);
    }
  };

  // State Board handlers
  const handleAddStateBoard = async () => {
    if (!boardFormData.name || !boardFormData.code) {
      toast.error('Name and code are required');
      return;
    }

    try {
      await axios.post(`${API}/admin/state-boards`, boardFormData, {
        withCredentials: true
      });
      toast.success('State board created successfully');
      setShowAddBoardDialog(false);
      setBoardFormData({ name: '', code: '', description: '' });
      fetchStateBoards();
      fetchDashboardStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create state board');
    }
  };

  // Curriculum handlers
  const handleCsvUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingCsv(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/admin/curriculum/upload-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });

      toast.success(`Added ${response.data.items_added} lessons, Updated ${response.data.items_updated} lessons`);
      
      if (response.data.errors.length > 0) {
        console.error('CSV errors:', response.data.errors);
        toast.warning(`${response.data.errors.length} rows had errors`);
      }

      fetchCurriculum();
      fetchCurriculumSummary();
      fetchDashboardStats();
      event.target.value = '';
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload CSV');
    } finally {
      setUploadingCsv(false);
    }
  };

  // Toggle expand/collapse for details view
  const handleToggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredCoordinators = coordinatorFilter === 'all' 
    ? coordinators 
    : coordinators.filter(c => c.status === coordinatorFilter || c.approval_status === coordinatorFilter);

  const filteredTutors = tutorFilter === 'all'
    ? tutors
    : tutors.filter(t => t.tutor?.status === tutorFilter || t.tutor?.approval_status === tutorFilter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Rising Stars Nation
              </h1>
              <p className="text-xs text-gray-500">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">
                {user.is_main_admin ? 'Main Admin' : 'Co-Admin'}
              </p>
            </div>
            <Button onClick={() => window.location.href = '/profile'} variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              My Profile
            </Button>
            <Button onClick={logout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-10 gap-2 bg-white p-2 rounded-lg shadow-sm">
            <TabsTrigger value="overview" className="text-xs">
              <BarChart3 className="h-4 w-4 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="admins" className="text-xs">
              <Shield className="h-4 w-4 mr-1" />
              Admins
            </TabsTrigger>
            <TabsTrigger value="coordinators" className="text-xs">
              <UserCog className="h-4 w-4 mr-1" />
              Coordinators
            </TabsTrigger>
            <TabsTrigger value="tutors" className="text-xs">
              <GraduationCap className="h-4 w-4 mr-1" />
              Tutors
            </TabsTrigger>
            <TabsTrigger value="students" className="text-xs">
              <Users className="h-4 w-4 mr-1" />
              Students
            </TabsTrigger>
            <TabsTrigger value="parents" className="text-xs">
              <Users className="h-4 w-4 mr-1" />
              Parents
            </TabsTrigger>
            <TabsTrigger value="schools" className="text-xs">
              <School className="h-4 w-4 mr-1" />
              Schools
            </TabsTrigger>
            <TabsTrigger value="batches" className="text-xs">
              <BookOpen className="h-4 w-4 mr-1" />
              Batches
            </TabsTrigger>
            <TabsTrigger value="state-boards" className="text-xs">
              <Flag className="h-4 w-4 mr-1" />
              State Boards
            </TabsTrigger>
            <TabsTrigger value="curriculum" className="text-xs">
              <Upload className="h-4 w-4 mr-1" />
              Curriculum
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Coordinators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{stats.totalCoordinators}</div>
                  {stats.pendingCoordinators > 0 && (
                    <p className="text-xs text-orange-600 mt-1">{stats.pendingCoordinators} pending approval</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Tutors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{stats.totalTutors}</div>
                  {stats.pendingTutors > 0 && (
                    <p className="text-xs text-orange-600 mt-1">{stats.pendingTutors} pending approval</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">{stats.totalStudents}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Batches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-indigo-600">{stats.totalBatches}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Schools</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">{stats.totalSchools}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">State Boards</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-teal-600">{stats.totalStateBoards}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Manage Admins Tab */}
          <TabsContent value="admins" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Manage Admins</h2>
              {user.can_manage_admins && (
                <div className="flex gap-2">
                  {selectedAdmins.length > 0 && (
                    <Button
                      variant="destructive"
                      onClick={() => handleOpenDeleteDialog('co-admins', selectedAdmins)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedAdmins.length})
                    </Button>
                  )}
                  <Dialog open={showAddAdminDialog} onOpenChange={setShowAddAdminDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Co-Admin
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Co-Admin</DialogTitle>
                        <DialogDescription>Create a new co-admin account with direct credentials</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Name</label>
                          <Input
                            value={newAdminData.name}
                            onChange={(e) => setNewAdminData({...newAdminData, name: e.target.value})}
                            placeholder="Full Name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Email</label>
                          <Input
                            type="email"
                            value={newAdminData.email}
                            onChange={(e) => setNewAdminData({...newAdminData, email: e.target.value})}
                            placeholder="email@example.com"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Password</label>
                          <Input
                            type="password"
                            value={newAdminData.password}
                            onChange={(e) => setNewAdminData({...newAdminData, password: e.target.value})}
                            placeholder="Password"
                          />
                        </div>
                        <Button onClick={handleAddCoAdmin} className="w-full">Create Co-Admin</Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Mail className="h-4 w-4 mr-2" />
                        Send Invite
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Co-Admin</DialogTitle>
                        <DialogDescription>Generate an invite link for a new co-admin</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Email</label>
                          <Input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="email@example.com"
                          />
                        </div>
                        <Button onClick={handleGenerateInvite} className="w-full">Generate Invite Link</Button>
                        
                        {inviteLink && (
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm font-medium mb-2">Invite Link:</p>
                            <div className="flex gap-2">
                              <Input value={inviteLink} readOnly className="text-xs" />
                              <Button
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(inviteLink);
                                  toast.success('Link copied!');
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {admins.filter(a => !a.is_main_admin).length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg mb-4">
                      <Checkbox
                        checked={selectedAdmins.length === admins.filter(a => !a.is_main_admin).length}
                        onCheckedChange={() => handleSelectAll('admins', admins.filter(a => !a.is_main_admin), selectedAdmins, setSelectedAdmins)}
                      />
                      <span className="text-sm font-medium">Select All Co-Admins ({admins.filter(a => !a.is_main_admin).length})</span>
                    </div>
                  )}
                  {admins.map((admin) => (
                    <div key={admin.id}>
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        {!admin.is_main_admin && (
                          <Checkbox
                            checked={selectedAdmins.includes(admin.id)}
                            onCheckedChange={() => handleSelectSingle(admin.id, selectedAdmins, setSelectedAdmins)}
                          />
                        )}
                        <button
                          onClick={() => handleToggleExpand(admin.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {expandedId === admin.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <div className="flex-1">
                          <p className="font-semibold">{admin.name}</p>
                          <p className="text-sm text-gray-600">{admin.email}</p>
                          <div className="mt-1">
                            {admin.is_main_admin ? (
                              <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-green-600 rounded">
                                Main Admin
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded">
                                Co-Admin
                              </span>
                            )}
                          </div>
                        </div>
                        {user.can_manage_admins && !admin.is_main_admin && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveCoAdmin(admin.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        )}
                      </div>
                      {expandedId === admin.id && (
                        <div className="ml-12 mt-2 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                          <h4 className="font-semibold text-sm mb-2">Admin Details</h4>
                          <div className="space-y-1 text-sm">
                            <p><span className="font-medium">Name:</span> {admin.name}</p>
                            <p><span className="font-medium">Email:</span> {admin.email}</p>
                            <p><span className="font-medium">Role:</span> {admin.is_main_admin ? 'Main Admin' : 'Co-Admin'}</p>
                            <p><span className="font-medium">Can Manage Admins:</span> {admin.can_manage_admins ? 'Yes' : 'No'}</p>
                            <p><span className="font-medium">Created:</span> {new Date(admin.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coordinators Tab */}
          <TabsContent value="coordinators" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Manage Coordinators</h2>
              <div className="flex gap-2">
                {selectedCoordinators.length > 0 && (
                  <Button
                    variant="destructive"
                    onClick={() => handleOpenDeleteDialog('coordinators', selectedCoordinators)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedCoordinators.length})
                  </Button>
                )}
                <Dialog open={showAssignCoordinatorDialog} onOpenChange={setShowAssignCoordinatorDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserCog className="h-4 w-4 mr-2" />
                      Manage Coordinators
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Manage Coordinator Assignments</DialogTitle>
                      <DialogDescription>Create or delete coordinator assignments for classes, subjects, and batch ranges</DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex gap-4 mb-4">
                      <Button onClick={() => setAssignmentMode('create')} className={assignmentMode === 'create' ? '' : 'variant-outline'}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Assignment
                      </Button>
                      <Button onClick={() => setAssignmentMode('delete')} variant={assignmentMode === 'delete' ? 'destructive' : 'outline'}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Assignment
                      </Button>
                    </div>

                    {assignmentMode === 'create' && (
                      <div className="space-y-4 border-t pt-4">
                        <div>
                          <label className="text-sm font-medium">Select Coordinator</label>
                          <Select
                            value={assignmentData.coordinator_id}
                            onValueChange={(value) => setAssignmentData({...assignmentData, coordinator_id: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose coordinator" />
                            </SelectTrigger>
                            <SelectContent>
                              {coordinators.filter(c => c.status === 'active').map((coord) => (
                                <SelectItem key={coord.id} value={coord.id}>
                                  {coord.name} ({coord.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Assignment Type</label>
                          <Select
                            value={assignmentData.assignment_type}
                            onValueChange={(value) => setAssignmentData({...assignmentData, assignment_type: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="class">Class-wise (e.g., All Class 6)</SelectItem>
                              <SelectItem value="class_subject">Class + Subject (e.g., Class 7 Math)</SelectItem>
                              <SelectItem value="batch_range">Batch Range (e.g., MAT-001 to MAT-020)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {(assignmentData.assignment_type === 'class' || assignmentData.assignment_type === 'class_subject') && (
                          <div>
                            <label className="text-sm font-medium">Class Level</label>
                            <Select
                              value={assignmentData.class_level}
                              onValueChange={(value) => setAssignmentData({...assignmentData, class_level: value, subject: ''})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select class" />
                              </SelectTrigger>
                              <SelectContent>
                                {[6, 7, 8, 9, 10].map((cls) => (
                                  <SelectItem key={cls} value={cls.toString()}>Class {cls}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {assignmentData.assignment_type === 'class_subject' && assignmentData.class_level && (
                          <div>
                            <label className="text-sm font-medium">Subject</label>
                            <Select
                              value={assignmentData.subject}
                              onValueChange={(value) => setAssignmentData({...assignmentData, subject: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select subject" />
                              </SelectTrigger>
                              <SelectContent>
                                {getSubjectsForClass(parseInt(assignmentData.class_level)).map((subject) => (
                                  <SelectItem key={subject.code} value={subject.code}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {assignmentData.assignment_type === 'batch_range' && (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Class Level</label>
                              <Select
                                value={assignmentData.class_level}
                                onValueChange={(value) => setAssignmentData({...assignmentData, class_level: value, subject: ''})}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select class first" />
                                </SelectTrigger>
                                <SelectContent>
                                  {[6, 7, 8, 9, 10].map((cls) => (
                                    <SelectItem key={cls} value={cls.toString()}>Class {cls}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {assignmentData.class_level && (
                              <div>
                                <label className="text-sm font-medium">Subject</label>
                                <Select
                                  value={assignmentData.subject}
                                  onValueChange={(value) => setAssignmentData({...assignmentData, subject: value})}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select subject" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getSubjectsForClass(parseInt(assignmentData.class_level)).map((subject) => (
                                      <SelectItem key={subject.code} value={subject.code}>
                                        {subject.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {assignmentData.class_level && assignmentData.subject && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Batch Start</label>
                                  <Input
                                    value={assignmentData.batch_start}
                                    onChange={(e) => setAssignmentData({...assignmentData, batch_start: e.target.value})}
                                    placeholder={`e.g., ${assignmentData.subject}-001`}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Batch End</label>
                                  <Input
                                    value={assignmentData.batch_end}
                                    onChange={(e) => setAssignmentData({...assignmentData, batch_end: e.target.value})}
                                    placeholder={`e.g., ${assignmentData.subject}-020`}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <Button onClick={handleCreateAssignment} className="w-full">
                          Create Assignment
                        </Button>
                      </div>
                    )}

                    {assignmentMode === 'delete' && (
                      <div className="space-y-4 border-t pt-4">
                        {coordinatorAssignments.length === 0 ? (
                          <p className="text-center text-gray-500 py-8">No coordinator assignments found</p>
                        ) : (
                          <>
                            <div className="flex justify-between items-center">
                              <p className="text-sm text-gray-600">
                                {coordinatorAssignments.length} assignment(s) found
                              </p>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkUnassign}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete All
                              </Button>
                            </div>
                            <div className="max-h-96 overflow-y-auto space-y-2">
                              {coordinatorAssignments.map((assignment) => (
                                <div key={assignment.id} className="flex justify-between items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                                  <div>
                                    <p className="font-semibold text-red-900">{assignment.coordinator?.name}</p>
                                    <p className="text-sm text-red-700">
                                      {assignment.assignment_type === 'class' && `Class ${assignment.class_level}`}
                                      {assignment.assignment_type === 'class_subject' && `Class ${assignment.class_level} - ${assignment.subject}`}
                                      {assignment.assignment_type === 'batch_range' && `Class ${assignment.class_level} ${assignment.subject}: ${assignment.batch_start} to ${assignment.batch_end}`}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteAssignment(assignment.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <Select value={coordinatorFilter} onValueChange={setCoordinatorFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Coordinators</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="blacklisted">Blacklisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Coordinator Assignments Section */}
            {coordinatorAssignments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Coordinator Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {coordinatorAssignments.map((assignment) => (
                      <div key={assignment.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-semibold">{assignment.coordinator?.name}</p>
                          <p className="text-sm text-gray-600">
                            {assignment.assignment_type === 'class' && `Class ${assignment.class_level}`}
                            {assignment.assignment_type === 'class_subject' && `Class ${assignment.class_level} - ${assignment.subject}`}
                            {assignment.assignment_type === 'batch_range' && `Class ${assignment.class_level} ${assignment.subject}: ${assignment.batch_start} to ${assignment.batch_end}`}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteAssignment(assignment.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Unassign
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {filteredCoordinators.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg mb-4">
                      <Checkbox
                        checked={selectedCoordinators.length === filteredCoordinators.length}
                        onCheckedChange={() => handleSelectAll('coordinators', filteredCoordinators, selectedCoordinators, setSelectedCoordinators)}
                      />
                      <span className="text-sm font-medium">Select All ({filteredCoordinators.length})</span>
                    </div>
                  )}
                  {filteredCoordinators.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No coordinators found</p>
                  ) : (
                    filteredCoordinators.map((coordinator) => (
                      <div key={coordinator.id}>
                        <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                          <Checkbox
                            checked={selectedCoordinators.includes(coordinator.id)}
                            onCheckedChange={() => handleSelectSingle(coordinator.id, selectedCoordinators, setSelectedCoordinators)}
                          />
                          <button onClick={() => handleToggleExpand(coordinator.id)} className="p-1 hover:bg-gray-200 rounded">
                            {expandedId === coordinator.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <div className="flex-1">
                            <p className="font-semibold">{coordinator.name}</p>
                            <p className="text-sm text-gray-600">{coordinator.email}</p>
                            <div className="flex gap-2 mt-1">
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                coordinator.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                coordinator.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {coordinator.approval_status}
                              </span>
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                coordinator.status === 'active' ? 'bg-green-100 text-green-800' :
                                coordinator.status === 'suspended' ? 'bg-orange-100 text-orange-800' :
                                coordinator.status === 'blacklisted' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {coordinator.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {coordinator.approval_status === 'pending' && (
                              <>
                                <Button size="sm" onClick={() => handleCoordinatorAction(coordinator.id, 'approve')}>
                                  <CheckCircle className="h-4 w-4 mr-1" />Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleCoordinatorAction(coordinator.id, 'reject')}>
                                  <XCircle className="h-4 w-4 mr-1" />Reject
                                </Button>
                              </>
                            )}
                            {coordinator.status === 'active' && (
                              <Button size="sm" variant="outline" onClick={() => handleCoordinatorAction(coordinator.id, 'suspend')}>
                                <Ban className="h-4 w-4 mr-1" />Suspend
                              </Button>
                            )}
                            {(coordinator.status === 'active' || coordinator.status === 'suspended') && (
                              <Button size="sm" variant="destructive" onClick={() => handleCoordinatorAction(coordinator.id, 'blacklist')}>
                                <Ban className="h-4 w-4 mr-1" />Blacklist
                              </Button>
                            )}
                          </div>
                        </div>
                        {expandedId === coordinator.id && (
                          <div className="ml-12 mt-2 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <h4 className="font-semibold text-sm mb-2">Coordinator Details</h4>
                            <div className="space-y-1 text-sm">
                              <p><span className="font-medium">Name:</span> {coordinator.name}</p>
                              <p><span className="font-medium">Email:</span> {coordinator.email}</p>
                              <p><span className="font-medium">Phone:</span> {coordinator.phone_number || 'N/A'}</p>
                              <p><span className="font-medium">Location:</span> {coordinator.location || 'N/A'}</p>
                              <p><span className="font-medium">State:</span> {coordinator.state || 'N/A'}</p>
                              <p><span className="font-medium">Status:</span> {coordinator.status}</p>
                              <p><span className="font-medium">Approval Status:</span> {coordinator.approval_status}</p>
                              <p><span className="font-medium">Created:</span> {new Date(coordinator.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tutors Tab */}
          <TabsContent value="tutors" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Manage Tutors</h2>
              <div className="flex gap-2">
                {selectedTutors.length > 0 && (
                  <Button variant="destructive" onClick={() => handleOpenDeleteDialog('tutors', selectedTutors)}>
                    <Trash2 className="h-4 w-4 mr-2" />Delete Selected ({selectedTutors.length})
                  </Button>
                )}
                <Select value={tutorFilter} onValueChange={setTutorFilter}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tutors</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="blacklisted">Blacklisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {filteredTutors.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg mb-4">
                      <Checkbox checked={selectedTutors.length === filteredTutors.length} onCheckedChange={() => handleSelectAll('tutors', filteredTutors, selectedTutors, setSelectedTutors)} />
                      <span className="text-sm font-medium">Select All ({filteredTutors.length})</span>
                    </div>
                  )}
                  {filteredTutors.length === 0 ? (<p className="text-center text-gray-500 py-8">No tutors found</p>) : (
                    filteredTutors.map((item) => (
                      <div key={item.tutor?.id}>
                        <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                          <Checkbox checked={selectedTutors.includes(item.tutor?.id)} onCheckedChange={() => handleSelectSingle(item.tutor?.id, selectedTutors, setSelectedTutors)} />
                          <button onClick={() => handleToggleExpand(item.tutor?.id)} className="p-1 hover:bg-gray-200 rounded">
                            {expandedId === item.tutor?.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <div className="flex-1">
                            <p className="font-semibold">{item.user?.name}</p>
                            <p className="text-sm text-gray-600">{item.user?.email}</p>
                            <p className="text-sm text-gray-500 mt-1">Classes: {item.tutor?.classes_can_teach?.join(', ')} | Subjects: {item.tutor?.subjects_can_teach?.join(', ')}</p>
                            <div className="flex gap-2 mt-1">
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${item.tutor?.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : item.tutor?.approval_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{item.tutor?.approval_status}</span>
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${item.tutor?.status === 'active' ? 'bg-green-100 text-green-800' : item.tutor?.status === 'suspended' ? 'bg-orange-100 text-orange-800' : item.tutor?.status === 'blacklisted' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{item.tutor?.status}</span>
                            </div>
                          </div>
                        </div>
                        {expandedId === item.tutor?.id && (
                          <div className="ml-12 mt-2 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <h4 className="font-semibold text-sm mb-2">Tutor Details</h4>
                            <div className="space-y-1 text-sm">
                              <p><span className="font-medium">Code:</span> {item.tutor?.tutor_code}</p>
                              <p><span className="font-medium">Board:</span> {item.tutor?.board_preference}</p>
                              <p><span className="font-medium">Classes:</span> {item.tutor?.classes_can_teach?.join(', ')}</p>
                              <p><span className="font-medium">Subjects:</span> {item.tutor?.subjects_can_teach?.join(', ')}</p>
                              <p><span className="font-medium">Days:</span> {item.tutor?.available_days?.join(', ')}</p>
                              <p><span className="font-medium">About:</span> {item.tutor?.about_yourself || 'N/A'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">All Students</h2>
              {selectedStudents.length > 0 && (
                <Button variant="destructive" onClick={() => handleOpenDeleteDialog('students', selectedStudents)}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete Selected ({selectedStudents.length})
                </Button>
              )}
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {students.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg mb-4">
                      <Checkbox checked={selectedStudents.length === students.length} onCheckedChange={() => handleSelectAll('students', students, selectedStudents, setSelectedStudents)} />
                      <span className="text-sm font-medium">Select All ({students.length})</span>
                    </div>
                  )}
                  {students.length === 0 ? (<p className="text-center text-gray-500 py-8">No students found</p>) : (
                    students.map((student) => (
                      <div key={student.id}>
                        <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                          <Checkbox checked={selectedStudents.includes(student.id)} onCheckedChange={() => handleSelectSingle(student.id, selectedStudents, setSelectedStudents)} />
                          <button onClick={() => handleToggleExpand(student.id)} className="p-1 hover:bg-gray-200 rounded">
                            {expandedId === student.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <div className="flex-1">
                            <p className="font-semibold">{student.name}</p>
                            <p className="text-sm text-gray-600">{student.student_code} | Class {student.class_level} | {student.board}</p>
                          </div>
                        </div>
                        {expandedId === student.id && (
                          <div className="ml-12 mt-2 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <h4 className="font-semibold text-sm mb-2">Student Details</h4>
                            <div className="space-y-1 text-sm">
                              <p><span className="font-medium">Code:</span> {student.student_code}</p>
                              <p><span className="font-medium">School:</span> {student.school_name}</p>
                              <p><span className="font-medium">Class:</span> {student.class_level}</p>
                              <p><span className="font-medium">Board:</span> {student.board}</p>
                              <p><span className="font-medium">Roll No:</span> {student.roll_no}</p>
                              <p><span className="font-medium">Subjects:</span> {student.subjects?.join(', ')}</p>
                              <p><span className="font-medium">Location:</span> {student.location}</p>
                              <p><span className="font-medium">Enrollment Year:</span> {student.enrollment_year}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parents Tab */}
          <TabsContent value="parents" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">All Parents</h2>
              {selectedParents.length > 0 && (
                <Button variant="destructive" onClick={() => handleOpenDeleteDialog('parents', selectedParents)}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete Selected ({selectedParents.length})
                </Button>
              )}
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {parents.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg mb-4">
                      <Checkbox checked={selectedParents.length === parents.length} onCheckedChange={() => handleSelectAll('parents', parents, selectedParents, setSelectedParents)} />
                      <span className="text-sm font-medium">Select All ({parents.length})</span>
                    </div>
                  )}
                  {parents.length === 0 ? (<p className="text-center text-gray-500 py-8">No parents found</p>) : (
                    parents.map((parent) => (
                      <div key={parent.id}>
                        <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                          <Checkbox checked={selectedParents.includes(parent.id)} onCheckedChange={() => handleSelectSingle(parent.id, selectedParents, setSelectedParents)} />
                          <button onClick={() => handleToggleExpand(parent.id)} className="p-1 hover:bg-gray-200 rounded">
                            {expandedId === parent.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <div className="flex-1">
                            <p className="font-semibold">{parent.name}</p>
                            <p className="text-sm text-gray-600">{parent.email}</p>
                          </div>
                        </div>
                        {expandedId === parent.id && (
                          <div className="ml-12 mt-2 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <h4 className="font-semibold text-sm mb-2">Parent Details</h4>
                            <div className="space-y-1 text-sm">
                              <p><span className="font-medium">Name:</span> {parent.name}</p>
                              <p><span className="font-medium">Email:</span> {parent.email}</p>
                              <p><span className="font-medium">Phone:</span> {parent.phone_number || 'N/A'}</p>
                              <p><span className="font-medium">Location:</span> {parent.location || 'N/A'}</p>
                              <p><span className="font-medium">State:</span> {parent.state || 'N/A'}</p>
                              <p><span className="font-medium">User Code:</span> {parent.user_code || 'N/A'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schools Tab */}
          <TabsContent value="schools" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">All Schools</h2>
              {selectedSchools.length > 0 && (
                <Button variant="destructive" onClick={() => handleOpenDeleteDialog('schools', selectedSchools)}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete Selected ({selectedSchools.length})
                </Button>
              )}
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {schools.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg mb-4">
                      <Checkbox checked={selectedSchools.length === schools.length} onCheckedChange={() => handleSelectAll('schools', schools, selectedSchools, setSelectedSchools)} />
                      <span className="text-sm font-medium">Select All ({schools.length})</span>
                    </div>
                  )}
                  {schools.length === 0 ? (<p className="text-center text-gray-500 py-8">No schools found</p>) : (
                    schools.map((school) => (
                      <div key={school.id}>
                        <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                          <Checkbox checked={selectedSchools.includes(school.id)} onCheckedChange={() => handleSelectSingle(school.id, selectedSchools, setSelectedSchools)} />
                          <button onClick={() => handleToggleExpand(school.id)} className="p-1 hover:bg-gray-200 rounded">
                            {expandedId === school.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <div className="flex-1">
                            <p className="font-semibold">{school.school_name}</p>
                            <p className="text-sm text-gray-600">{school.email} | {school.city}</p>
                          </div>
                        </div>
                        {expandedId === school.id && (
                          <div className="ml-12 mt-2 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <h4 className="font-semibold text-sm mb-3">Complete School Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="font-semibold text-blue-900 mb-1">Basic Information</p>
                                <p><span className="font-medium">School Name:</span> {school.school_name}</p>
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
                                  <p><span className="font-medium">Map:</span> <a href={school.location_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View Location</a></p>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-blue-900 mb-1">Academic Details</p>
                                <p><span className="font-medium">Board:</span> {school.state_board}</p>
                                <p><span className="font-medium">Classes:</span> {school.class_from} to {school.class_to}</p>
                                <p><span className="font-medium">Status:</span> <span className={`px-2 py-0.5 rounded text-xs ${school.approval_status === 'approved' ? 'bg-green-100 text-green-800' : school.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{school.approval_status}</span></p>
                              </div>
                              <div>
                                <p className="font-semibold text-blue-900 mb-1">Tutor Requirements</p>
                                <p><span className="font-medium">Subjects:</span> {school.tutors_required_subjects?.join(', ')}</p>
                                <p><span className="font-medium">Preferred Days:</span> {school.preferred_days?.join(', ')}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Batches Tab */}
          <TabsContent value="batches" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">All Batches</h2>
              {selectedBatches.length > 0 && (
                <Button variant="destructive" onClick={() => handleOpenDeleteDialog('batches', selectedBatches)}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete Selected ({selectedBatches.length})
                </Button>
              )}
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {batches.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg mb-4">
                      <Checkbox checked={selectedBatches.length === batches.length} onCheckedChange={() => handleSelectAll('batches', batches, selectedBatches, setSelectedBatches)} />
                      <span className="text-sm font-medium">Select All ({batches.length})</span>
                    </div>
                  )}
                  {batches.length === 0 ? (<p className="text-center text-gray-500 py-8">No batches found</p>) : (
                    batches.map((batch) => (
                      <div key={batch.id}>
                        <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                          <Checkbox checked={selectedBatches.includes(batch.id)} onCheckedChange={() => handleSelectSingle(batch.id, selectedBatches, setSelectedBatches)} />
                          <button onClick={() => handleToggleExpand(batch.id)} className="p-1 hover:bg-gray-200 rounded">
                            {expandedId === batch.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <div className="flex-1">
                            <p className="font-semibold">{batch.batch_code}</p>
                            <p className="text-sm text-gray-600">Class {batch.class_level} | {batch.subject} | {batch.status}</p>
                          </div>
                        </div>
                        {expandedId === batch.id && (
                          <div className="ml-12 mt-2 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <h4 className="font-semibold text-sm mb-2">Batch Details</h4>
                            <div className="space-y-1 text-sm">
                              <p><span className="font-medium">Code:</span> {batch.batch_code}</p>
                              <p><span className="font-medium">State:</span> {batch.state}</p>
                              <p><span className="font-medium">Academic Year:</span> {batch.academic_year}</p>
                              <p><span className="font-medium">Class Level:</span> {batch.class_level}</p>
                              <p><span className="font-medium">Subject:</span> {batch.subject}</p>
                              <p><span className="font-medium">Board:</span> {batch.board}</p>
                              <p><span className="font-medium">Status:</span> {batch.status}</p>
                              <p><span className="font-medium">Students:</span> {batch.student_ids?.length || 0}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* State Boards Tab */}
          <TabsContent value="state-boards" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">State Boards Management</h2>
              <div className="flex gap-2">
                {selectedBoards.length > 0 && (
                  <Button
                    variant="destructive"
                    onClick={() => handleOpenDeleteDialog('state-boards', selectedBoards)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedBoards.length})
                  </Button>
                )}
                <Dialog open={showAddBoardDialog} onOpenChange={setShowAddBoardDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add State Board
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New State Board</DialogTitle>
                      <DialogDescription>Create a new state board entry</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Name *</label>
                        <Input
                          value={boardFormData.name}
                          onChange={(e) => setBoardFormData({...boardFormData, name: e.target.value})}
                          placeholder="e.g., Telangana State Board"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Code *</label>
                        <Input
                          value={boardFormData.code}
                          onChange={(e) => setBoardFormData({...boardFormData, code: e.target.value})}
                          placeholder="e.g., TS"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Input
                          value={boardFormData.description}
                          onChange={(e) => setBoardFormData({...boardFormData, description: e.target.value})}
                          placeholder="Optional description"
                        />
                      </div>
                      <Button onClick={handleAddStateBoard} className="w-full">Create State Board</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {stateBoards.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg mb-4">
                      <Checkbox
                        checked={selectedBoards.length === stateBoards.length}
                        onCheckedChange={() => handleSelectAll('boards', stateBoards, selectedBoards, setSelectedBoards)}
                      />
                      <span className="text-sm font-medium">Select All ({stateBoards.length})</span>
                    </div>
                  )}
                  {stateBoards.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No state boards found</p>
                  ) : (
                    stateBoards.map((board) => (
                      <div key={board.id}>
                        <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={selectedBoards.includes(board.id)}
                              onCheckedChange={() => handleSelectSingle(board.id, selectedBoards, setSelectedBoards)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleExpand(board.id)}
                                  className="p-1 hover:bg-gray-200 rounded"
                                >
                                  {expandedId === board.id ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                                <div>
                                  <p className="font-semibold">{board.name}</p>
                                  <p className="text-sm text-gray-600">Code: {board.code}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Details */}
                        {expandedId === board.id && (
                          <div className="ml-12 mt-2 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <h4 className="font-semibold text-sm mb-2">Board Details</h4>
                            <div className="space-y-1 text-sm">
                              <p><span className="font-medium">Name:</span> {board.name}</p>
                              <p><span className="font-medium">Code:</span> {board.code}</p>
                              <p><span className="font-medium">Description:</span> {board.description || 'N/A'}</p>
                              <p><span className="font-medium">Created:</span> {new Date(board.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Curriculum Tab */}
          <TabsContent value="curriculum" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Curriculum Management</h2>
              <div className="flex gap-2">
                {selectedCurriculum.length > 0 && (
                  <Button variant="destructive" onClick={() => handleOpenDeleteDialog('curriculum', selectedCurriculum)}>
                    <Trash2 className="h-4 w-4 mr-2" />Delete Selected ({selectedCurriculum.length})
                  </Button>
                )}
                <Button 
                  onClick={() => document.getElementById('csv-upload').click()} 
                  disabled={uploadingCsv}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingCsv ? 'Uploading...' : 'Upload CSV'}
                </Button>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  style={{ display: 'none' }}
                />
                <a href="/sample_curriculum.csv" download>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />Download Sample CSV
                  </Button>
                </a>
              </div>
            </div>

            {/* Curriculum Summary - Hierarchical View */}
            {curriculumSummary.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Curriculum Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {curriculumSummary.map((board) => (
                      <div key={board._id} className="border rounded-lg p-4">
                        <h3 className="font-bold text-lg mb-2">Board: {board._id}</h3>
                        <div className="space-y-3 ml-4">
                          {board.classes.map((cls) => (
                            <div key={cls.class_level} className="border-l-2 border-blue-500 pl-4">
                              <h4 className="font-semibold text-md mb-2">Class {cls.class_level}</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-4">
                                {cls.subjects.map((subj) => (
                                  <div key={subj.subject} className="bg-blue-50 p-2 rounded text-sm">
                                    <span className="font-medium">{subj.subject}</span>
                                    <span className="text-gray-600 ml-2">({subj.lesson_count} lessons)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Curriculum Items - List View */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {curriculum.length > 0 && (
                    <>
                      {/* Filters Section */}
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-gray-900 mb-3">Filters</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Class Filter */}
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Class</label>
                            <Select value={curriculumFilterClass} onValueChange={setCurriculumFilterClass}>
                              <SelectTrigger className="w-full bg-white">
                                <SelectValue placeholder="All Classes" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Classes</SelectItem>
                                {[...new Set(curriculum.map(item => item.class_level))].sort((a, b) => a - b).map(cls => (
                                  <SelectItem key={cls} value={String(cls)}>Class {cls}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Subject Filter */}
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Subject</label>
                            <Select value={curriculumFilterSubject} onValueChange={setCurriculumFilterSubject}>
                              <SelectTrigger className="w-full bg-white">
                                <SelectValue placeholder="All Subjects" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Subjects</SelectItem>
                                {[...new Set(curriculum.map(item => item.subject))].sort().map(subj => (
                                  <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Clear Filters Button */}
                        {(curriculumFilterClass !== 'all' || curriculumFilterSubject !== 'all') && (
                          <div className="mt-3">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setCurriculumFilterClass('all');
                                setCurriculumFilterSubject('all');
                              }}
                            >
                              Clear Filters
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Select All Checkbox */}
                      <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg mb-4">
                        <Checkbox
                          checked={(() => {
                            const filtered = curriculum.filter(item => 
                              (curriculumFilterClass === 'all' || String(item.class_level) === curriculumFilterClass) &&
                              (curriculumFilterSubject === 'all' || item.subject === curriculumFilterSubject)
                            );
                            return selectedCurriculum.length > 0 && filtered.every(item => selectedCurriculum.includes(item.id));
                          })()}
                          onCheckedChange={() => {
                            const filtered = curriculum.filter(item => 
                              (curriculumFilterClass === 'all' || String(item.class_level) === curriculumFilterClass) &&
                              (curriculumFilterSubject === 'all' || item.subject === curriculumFilterSubject)
                            );
                            handleSelectAll('curriculum', filtered, selectedCurriculum, setSelectedCurriculum);
                          }}
                        />
                        <span className="text-sm font-medium">
                          Select All ({curriculum.filter(item => 
                            (curriculumFilterClass === 'all' || String(item.class_level) === curriculumFilterClass) &&
                            (curriculumFilterSubject === 'all' || item.subject === curriculumFilterSubject)
                          ).length} lessons)
                        </span>
                      </div>
                    </>
                  )}
                  {curriculum.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No curriculum items found. Upload a CSV to get started!</p>
                  ) : (() => {
                    const filteredCurriculum = curriculum.filter(item => 
                      (curriculumFilterClass === 'all' || String(item.class_level) === curriculumFilterClass) &&
                      (curriculumFilterSubject === 'all' || item.subject === curriculumFilterSubject)
                    );
                    
                    if (filteredCurriculum.length === 0) {
                      return (
                        <p className="text-center text-gray-500 py-8">
                          No curriculum items match the selected filters. Try changing your filter criteria.
                        </p>
                      );
                    }
                    
                    return filteredCurriculum.map((item) => (
                      <div key={item.id}>
                        <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                          <Checkbox
                            checked={selectedCurriculum.includes(item.id)}
                            onCheckedChange={() => handleSelectSingle(item.id, selectedCurriculum, setSelectedCurriculum)}
                          />
                          <button onClick={() => handleToggleExpand(item.id)} className="p-1 hover:bg-gray-200 rounded">
                            {expandedId === item.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <div className="flex-1">
                            <p className="font-semibold">{item.topic_name}</p>
                            <p className="text-sm text-gray-600">
                              {item.board} | Class {item.class_level} | {item.subject} | Lesson {item.topic_number}
                            </p>
                          </div>
                        </div>
                        {expandedId === item.id && (
                          <div className="ml-12 mt-2 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <h4 className="font-semibold text-sm mb-2">Lesson Details</h4>
                            <div className="space-y-1 text-sm">
                              <p><span className="font-medium">Board:</span> {item.board}</p>
                              <p><span className="font-medium">Class:</span> {item.class_level}</p>
                              <p><span className="font-medium">Subject:</span> {item.subject}</p>
                              <p><span className="font-medium">Lesson Number:</span> {item.topic_number}</p>
                              <p><span className="font-medium">Title:</span> {item.topic_name}</p>
                              <p><span className="font-medium">Summary:</span> {item.description || 'N/A'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {idsToDelete.length} {deleteType}?
              <br />
              <span className="text-red-600 font-semibold">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          
          {deleteWarningMessage && (
            <div className="my-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
              <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Warning: Students Will Be Deleted</h4>
              <pre className="text-sm text-yellow-900 whitespace-pre-wrap font-sans">{deleteWarningMessage}</pre>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              No, Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Yes, Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
