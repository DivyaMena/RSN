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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

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
  const handleOpenDeleteDialog = (type, ids) => {
    setDeleteType(type);
    setIdsToDelete(ids);
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
            <TabsTrigger value="curriculum" className="text-xs">
              <Upload className="h-4 w-4 mr-1" />
              Curriculum
            </TabsTrigger>
            <TabsTrigger value="state-boards" className="text-xs">
              <Flag className="h-4 w-4 mr-1" />
              State Boards
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
                <div className="space-y-4">
                  {admins.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
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
                <div className="space-y-4">
                  {filteredCoordinators.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No coordinators found</p>
                  ) : (
                    filteredCoordinators.map((coordinator) => (
                      <div key={coordinator.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{coordinator.name}</p>
                            <p className="text-sm text-gray-600">{coordinator.email}</p>
                            <div className="flex gap-2 mt-2">
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
                                <Button
                                  size="sm"
                                  onClick={() => handleCoordinatorAction(coordinator.id, 'approve')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleCoordinatorAction(coordinator.id, 'reject')}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {coordinator.status === 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCoordinatorAction(coordinator.id, 'suspend')}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Suspend
                              </Button>
                            )}
                            {(coordinator.status === 'active' || coordinator.status === 'suspended') && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleCoordinatorAction(coordinator.id, 'blacklist')}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Blacklist
                              </Button>
                            )}
                          </div>
                        </div>
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
              <Select value={tutorFilter} onValueChange={setTutorFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tutors</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="blacklisted">Blacklisted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {filteredTutors.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No tutors found</p>
                  ) : (
                    filteredTutors.map((item) => (
                      <div key={item.tutor?.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{item.user?.name}</p>
                            <p className="text-sm text-gray-600">{item.user?.email}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              Classes: {item.tutor?.classes_can_teach?.join(', ')} | 
                              Subjects: {item.tutor?.subjects_can_teach?.join(', ')}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                item.tutor?.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                item.tutor?.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {item.tutor?.approval_status}
                              </span>
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                item.tutor?.status === 'active' ? 'bg-green-100 text-green-800' :
                                item.tutor?.status === 'suspended' ? 'bg-orange-100 text-orange-800' :
                                item.tutor?.status === 'blacklisted' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {item.tutor?.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6">
            <h2 className="text-2xl font-bold">All Students</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {students.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No students found</p>
                  ) : (
                    students.map((student) => (
                      <div key={student.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{student.name}</p>
                          <p className="text-sm text-gray-600">
                            {student.student_code} | Class {student.class_level} | {student.board}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parents Tab */}
          <TabsContent value="parents" className="space-y-6">
            <h2 className="text-2xl font-bold">All Parents</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {parents.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No parents found</p>
                  ) : (
                    parents.map((parent) => (
                      <div key={parent.id} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-semibold">{parent.name}</p>
                        <p className="text-sm text-gray-600">{parent.email}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schools Tab */}
          <TabsContent value="schools" className="space-y-6">
            <h2 className="text-2xl font-bold">All Schools</h2>
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500 py-8">School management coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Batches Tab */}
          <TabsContent value="batches" className="space-y-6">
            <h2 className="text-2xl font-bold">All Batches</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {batches.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No batches found</p>
                  ) : (
                    batches.map((batch) => (
                      <div key={batch.id} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-semibold">{batch.batch_code}</p>
                        <p className="text-sm text-gray-600">
                          Class {batch.class_level} | {batch.subject} | {batch.status}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Curriculum Tab */}
          <TabsContent value="curriculum" className="space-y-6">
            <h2 className="text-2xl font-bold">Curriculum Management</h2>
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500 py-8">Curriculum upload feature coming soon</p>
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
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {idsToDelete.length} {deleteType}?
              <br />
              <span className="text-red-600 font-semibold">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              No, Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
