import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { BookOpen, LogOut, ArrowLeft, Plus, Lock, Edit } from 'lucide-react';
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

export default function LogBoard({ user, logout }) {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [logEntries, setLogEntries] = useState([]);
  const [curriculum, setCurriculum] = useState([]);
  const [students, setStudents] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [myTutorId, setMyTutorId] = useState(null);
  const [myAssignedDays, setMyAssignedDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    topic_covered: '',
    curriculum_items: [],
    google_meet_link: '',
    notes: '',
    sessions_count: 1
  });
  const [tutorInfoDialogOpen, setTutorInfoDialogOpen] = useState(false);
  const [tutorInfo, setTutorInfo] = useState(null);

  const [editFormData, setEditFormData] = useState({
    topic_covered: '',
    curriculum_items: [],
    google_meet_link: '',
    notes: ''
  });
  const [attendanceLoading, setAttendanceLoading] = useState(false);


  useEffect(() => {
    fetchData();
  }, [batchId]);

  const fetchData = async () => {
    try {
      const [batchRes, logRes] = await Promise.all([
        axios.get(`${API}/batches/${batchId}`, { withCredentials: true }),
        axios.get(`${API}/logboard/${batchId}`, { withCredentials: true })
      ]);
      
      setBatch(batchRes.data);
      setLogEntries(logRes.data);

      // Fetch curriculum
      if (batchRes.data) {
        const currRes = await axios.get(
          `${API}/curriculum?board=${batchRes.data.board}&class_level=${batchRes.data.class_level}&subject=${batchRes.data.subject}`,
          { withCredentials: true }
        );
        setCurriculum(currRes.data);
      }

      // Fetch students if tutor/coordinator
      if (user.role === 'tutor' || user.role === 'coordinator' || user.role === 'admin') {
        try {
          const studentsRes = await axios.get(`${API}/batches/${batchId}/students`, { withCredentials: true });
          setStudents(studentsRes.data);
        } catch (error) {
          console.log('Could not fetch students');
        }
      }

      // Fetch tutors
      try {
        const tutorsRes = await axios.get(`${API}/batches/${batchId}/tutors`, { withCredentials: true });
        setTutors(tutorsRes.data);
        
        // Get my tutor ID and assigned days if I'm a tutor
        if (user.role === 'tutor') {
          try {
            const myTutorRes = await axios.get(`${API}/tutors/me`, { withCredentials: true });
            setMyTutorId(myTutorRes.data.id);
            
            // Find my assignment for this batch
            const myAssignment = tutorsRes.data.find(t => t.tutor?.id === myTutorRes.data.id);
            if (myAssignment && myAssignment.assignment) {
              setMyAssignedDays(myAssignment.assignment.assigned_days || []);
            }
          } catch (error) {
            console.log('Could not fetch tutor profile');
          }
        }
      } catch (error) {
        console.log('Could not fetch tutors');
      }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const toggleCurriculumItem = (itemId, isEdit = false) => {
    if (isEdit) {
      if (editFormData.curriculum_items.includes(itemId)) {
        setEditFormData({
          ...editFormData,
          curriculum_items: editFormData.curriculum_items.filter(id => id !== itemId)
        });
      } else {
        setEditFormData({
          ...editFormData,
          curriculum_items: [...editFormData.curriculum_items, itemId]
        });
      }
    } else {
      if (formData.curriculum_items.includes(itemId)) {
        setFormData({
          ...formData,
          curriculum_items: formData.curriculum_items.filter(id => id !== itemId)
        });
      } else {
        setFormData({
          ...formData,
          curriculum_items: [...formData.curriculum_items, itemId]
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.topic_covered || !formData.google_meet_link) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await axios.post(
        `${API}/logboard`,
        { ...formData, batch_id: batchId },
        { withCredentials: true }
      );
      toast.success('Log entry created successfully');
      setDialogOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        topic_covered: '',
        curriculum_items: [],
        google_meet_link: '',
        notes: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create log entry');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();

    try {
      await axios.put(
        `${API}/logboard/${selectedEntry.id}`,
        editFormData,
        { withCredentials: true }
      );
      toast.success('Log entry updated successfully');
      setEditDialogOpen(false);
      setSelectedEntry(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update log entry');
  const handleTutorClick = async (tutorName) => {
    try {
      // Find tutor record matching this name from batch tutors
      const match = tutors.find(t => t.tutor_user?.name === tutorName || t.tutor?.tutor_name === tutorName);
      if (!match || !match.tutor) {
        toast.error('Tutor details not available');
        return;
      }

      const res = await axios.get(`${API}/tutors/${match.tutor.id}`, { withCredentials: true });
      setTutorInfo(res.data);
      setTutorInfoDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load tutor details');
    }
  };


    }
  };

  const openEditDialog = (entry) => {
    setSelectedEntry(entry);
    setEditFormData({
      topic_covered: entry.topic_covered,
      curriculum_items: entry.curriculum_items,
      google_meet_link: entry.google_meet_link,
      notes: entry.notes || ''
    });
    setEditDialogOpen(true);
  };

  const handleJoinClass = async (entry) => {
    if (user.role !== 'student') {
      window.open(entry.google_meet_link, '_blank', 'noopener,noreferrer');
      return;
    }

    const confirmed = window.confirm('Are you willing to attend this class?');
    if (!confirmed) return;

    try {
      setAttendanceLoading(true);
      await axios.post(
        `${API}/attendance/join-class`,
        { batch_id: batchId, log_entry_id: entry.id },
        { withCredentials: true }
      );
      toast.success('Attendance marked. Opening class in Google Meet...');
      window.open(entry.google_meet_link, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark attendance');
    } finally {
      setAttendanceLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (!batch) return null;

  const canCreateEntry = user.role === 'tutor';
  const canEditEntry = user.role === 'coordinator' || user.role === 'admin';

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
            <Button data-testid="back-btn" onClick={() => navigate('/dashboard')} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
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
        {/* Batch Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{batch.batch_code}</h1>
              <p className="text-gray-600">{SUBJECTS[batch.subject]} | Class {batch.class_level} | {batch.board} Board</p>
              <p className="text-sm text-gray-500 mt-1">Academic Year: {batch.academic_year}</p>
            </div>
            {canCreateEntry && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="create-log-entry-btn" className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Log Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Log Board Entry</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Date</label>
                      <Input
                        data-testid="log-date-input"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Topic Covered *</label>
                      <Input
                        data-testid="log-topic-input"
                        value={formData.topic_covered}
                        onChange={(e) => setFormData({ ...formData, topic_covered: e.target.value })}
                        placeholder="Enter topic covered"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Google Meet Link *</label>
                      <Input
                        data-testid="log-meet-link-input"
                        value={formData.google_meet_link}
                        onChange={(e) => setFormData({ ...formData, google_meet_link: e.target.value })}
                        placeholder="https://meet.google.com/..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Curriculum Items Covered</label>
                      <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
                        {curriculum.map(item => (
                          <div key={item.id} className="flex items-start space-x-2">
                            <Checkbox
                              data-testid={`curriculum-${item.id}-checkbox`}
                              id={`curriculum-${item.id}`}
                              checked={formData.curriculum_items.includes(item.id)}
                              onCheckedChange={() => toggleCurriculumItem(item.id)}
                            />
                            <label htmlFor={`curriculum-${item.id}`} className="text-sm cursor-pointer">
                              {item.topic_number}. {item.topic_name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                      <Textarea
                        data-testid="log-notes-input"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes..."
                        rows={3}
                      />
                    </div>

                    <Button data-testid="submit-log-entry" type="submit" className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white">
                      Create Entry
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Log Entries */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Log Board Entries</h2>
          {logEntries.length === 0 ? (
            <div data-testid="no-entries-message" className="text-center py-20 bg-white rounded-2xl shadow-lg">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No log entries yet</h3>
              <p className="text-gray-600">Tutors will post class schedules and topics here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logEntries.map(entry => (
                <div key={entry.id} data-testid={`log-entry-${entry.id}`} className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{entry.topic_covered}</h3>
                        {entry.is_locked && <Lock className="h-4 w-4 text-gray-500" />}
                      </div>
                      <p className="text-sm text-gray-600">
                        By{' '}
                        <button
                          type="button"
                          className="text-blue-600 hover:underline"
                          onClick={() => handleTutorClick(entry.tutor_name)}
                        >
                          {entry.tutor_name}
                        </button>{' '}
                        on {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {canEditEntry && (
                      <Button
                        data-testid={`edit-entry-${entry.id}`}
                        onClick={() => openEditDialog(entry)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Google Meet Link:</p>
                      <a
                        data-testid={`meet-link-${entry.id}`}
                        href={entry.google_meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {entry.google_meet_link}
                      </a>
                      <Button
                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1"
                        onClick={() => handleJoinClass(entry)}
                        disabled={attendanceLoading}
                      >
                        Join the Class
                      </Button>
                    </div>

                    {entry.curriculum_items.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Curriculum Covered:</p>
                        <div className="flex flex-wrap gap-2">
                          {entry.curriculum_items.map(itemId => {
                            const currItem = curriculum.find(c => c.id === itemId);
                            return currItem ? (
                              <span key={itemId} className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
                                {currItem.topic_number}. {currItem.topic_name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    {entry.notes && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                        <p className="text-sm text-gray-600">{entry.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Log Board Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Topic Covered</label>
              <Input
                data-testid="edit-topic-input"
                value={editFormData.topic_covered}
                onChange={(e) => setEditFormData({ ...editFormData, topic_covered: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Google Meet Link</label>
              <Input
                data-testid="edit-meet-link-input"
                value={editFormData.google_meet_link}
                onChange={(e) => setEditFormData({ ...editFormData, google_meet_link: e.target.value })}
              />
            </div>

      {/* Tutor Info Dialog */}
      <Dialog open={tutorInfoDialogOpen} onOpenChange={setTutorInfoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tutor Details</DialogTitle>
          </DialogHeader>
          {tutorInfo && (
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-gray-900">{tutorInfo.user?.name}</p>
                <p className="text-sm text-gray-600">{tutorInfo.user?.email}</p>
              </div>
              {tutorInfo.tutor?.about_yourself && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Tell me about yourself (This is visible to students & parents, Co-Ordinators etc)
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {tutorInfo.tutor.about_yourself}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

            <div>
              <label className="block text-sm font-medium mb-2">Curriculum Items Covered</label>
              <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
                {curriculum.map(item => (
                  <div key={item.id} className="flex items-start space-x-2">
                    <Checkbox
                      data-testid={`edit-curriculum-${item.id}-checkbox`}
                      id={`edit-curriculum-${item.id}`}
                      checked={editFormData.curriculum_items.includes(item.id)}
                      onCheckedChange={() => toggleCurriculumItem(item.id, true)}
                    />
                    <label htmlFor={`edit-curriculum-${item.id}`} className="text-sm cursor-pointer">
                      {item.topic_number}. {item.topic_name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <Textarea
                data-testid="edit-notes-input"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <Button data-testid="submit-edit-entry" type="submit" className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white">
              Update Entry
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
