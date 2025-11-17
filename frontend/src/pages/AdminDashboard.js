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
  Calendar,
  UserPlus,
  Shield,
  Settings,
  BarChart3,
  LogOut,
  UserCog,
  CheckCircle,
  XCircle,
  Ban,
  Trash2,
  Mail,
  Copy,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

  useEffect(() => {
    fetchDashboardStats();
    if (activeTab === 'admins') fetchAdmins();
    if (activeTab === 'coordinators') fetchCoordinators();
    if (activeTab === 'tutors') fetchTutors();
    if (activeTab === 'students') fetchStudents();
    if (activeTab === 'parents') fetchParents();
    if (activeTab === 'schools') fetchSchools();
    if (activeTab === 'batches') fetchBatches();
  }, [activeTab]);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, {
        withCredentials: true
      });
      setStats(response.data);
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
            <TabsTrigger value="holidays" className="text-xs">
              <Calendar className="h-4 w-4 mr-1" />
              Holidays
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

          {/* Manage Admins Tab */}
          <TabsContent value="admins" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Manage Admins</h2>
              {user.can_manage_admins && (
                <div className="flex gap-2">
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

          {/* Holidays Tab */}
          <TabsContent value="holidays" className="space-y-6">
            <h2 className="text-2xl font-bold">Holiday Management</h2>
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500 py-8">Holiday upload feature coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
