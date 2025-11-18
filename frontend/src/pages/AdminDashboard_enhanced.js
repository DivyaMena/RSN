// This is a work-in-progress enhanced version with inline details, bulk selection, and state boards
// Will replace AdminDashboard.js once complete
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
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
    pendingCoordinators: 0,
    pendingTutors: 0
  });

  // Existing state
  const [admins, setAdmins] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [batches, setBatches] = useState([]);
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

  // ... (rest of existing state variables for coordinatorFilter, tutorFilter, etc.)
  const [coordinatorFilter, setCoordinatorFilter] = useState('all');
  const [tutorFilter, setTutorFilter] = useState('all');
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [coordinatorAssignments, setCoordinatorAssignments] = useState([]);
  const [showAssignCoordinatorDialog, setShowAssignCoordinatorDialog] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState('create');
  const [assignmentData, setAssignmentData] = useState({
    coordinator_id: '',
    assignment_type: 'class',
    class_level: '',
    subject: '',
    batch_start: '',
    batch_end: ''
  });

  // Helper function for subjects
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

  // Fetch data on tab change
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

  // Fetch functions
  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, { withCredentials: true });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${API}/admin/admins`, { withCredentials: true });
      setAdmins(response.data);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const fetchCoordinators = async () => {
    try {
      const response = await axios.get(`${API}/admin/coordinators`, { withCredentials: true });
      setCoordinators(response.data);
    } catch (error) {
      console.error('Error fetching coordinators:', error);
    }
  };

  const fetchTutors = async () => {
    try {
      const response = await axios.get(`${API}/tutors`, { withCredentials: true });
      setTutors(response.data);
    } catch (error) {
      console.error('Error fetching tutors:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/admin/students`, { withCredentials: true });
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchParents = async () => {
    try {
      const response = await axios.get(`${API}/admin/parents`, { withCredentials: true });
      setParents(response.data);
    } catch (error) {
      console.error('Error fetching parents:', error);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API}/admin/schools`, { withCredentials: true });
      setSchools(response.data);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await axios.get(`${API}/batches`, { withCredentials: true });
      setBatches(response.data);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const fetchStateBoards = async () => {
    try {
      const response = await axios.get(`${API}/admin/state-boards`, { withCredentials: true });
      setStateBoards(response.data);
    } catch (error) {
      console.error('Error fetching state boards:', error);
    }
  };

  const fetchCoordinatorAssignments = async () => {
    try {
      const response = await axios.get(`${API}/admin/coordinator-assignments`, { withCredentials: true });
      setCoordinatorAssignments(response.data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
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
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create state board');
    }
  };

  // Toggle expand/collapse for details view
  const handleToggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Existing handlers (keeping all previous functions)
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
    try {
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            </div>
          </TabsContent>

          {/* State Boards Tab - NEW */}
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

          {/* Placeholder for other tabs - will show message for now */}
          <TabsContent value="admins">
            <p className="text-center text-gray-500 py-8">Admins tab - keeping existing functionality</p>
          </TabsContent>

          <TabsContent value="coordinators">
            <p className="text-center text-gray-500 py-8">Coordinators tab - keeping existing functionality</p>
          </TabsContent>

          <TabsContent value="tutors">
            <p className="text-center text-gray-500 py-8">Tutors tab - keeping existing functionality</p>
          </TabsContent>

          <TabsContent value="students">
            <p className="text-center text-gray-500 py-8">Students tab - keeping existing functionality</p>
          </TabsContent>

          <TabsContent value="parents">
            <p className="text-center text-gray-500 py-8">Parents tab - keeping existing functionality</p>
          </TabsContent>

          <TabsContent value="schools">
            <p className="text-center text-gray-500 py-8">Schools tab - keeping existing functionality</p>
          </TabsContent>

          <TabsContent value="batches">
            <p className="text-center text-gray-500 py-8">Batches tab - keeping existing functionality</p>
          </TabsContent>

          <TabsContent value="curriculum">
            <p className="text-center text-gray-500 py-8">Curriculum tab - keeping existing functionality</p>
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
