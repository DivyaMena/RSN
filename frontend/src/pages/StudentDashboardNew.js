import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { BookOpen, LogOut, AlertCircle, Calendar, CheckCircle, XCircle } from 'lucide-react';
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

export default function StudentDashboardNew({ user, logout }) {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [batches, setBatches] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [remedialRequests, setRemedialRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [remedialForm, setRemedialForm] = useState({
    reason: '',
    topic: '',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentRes, batchesRes, attendanceRes, remedialRes] = await Promise.all([
        axios.get(`${API}/students/me`, { withCredentials: true }),
        axios.get(`${API}/students/me/batches`, { withCredentials: true }),
        axios.get(`${API}/students/me`, { withCredentials: true }).then(res => 
          axios.get(`${API}/attendance/student/${res.data.id}`, { withCredentials: true })
        ),
        axios.get(`${API}/remedial/my-requests`, { withCredentials: true })
      ]);
      
      setStudent(studentRes.data);
      setBatches(batchesRes.data);
      setAttendance(attendanceRes.data);
      setRemedialRequests(remedialRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemedialRequest = async (e) => {
    e.preventDefault();
    
    if (!remedialForm.reason || !remedialForm.topic) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await axios.post(
        `${API}/remedial/request`,
        { ...remedialForm, batch_id: selectedBatch.id },
        { withCredentials: true }
      );
      toast.success('Remedial class request submitted!');
      setDialogOpen(false);
      setRemedialForm({ reason: '', topic: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    }
  };

  const getAttendanceStats = () => {
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    return { total, present, absent, percentage: total > 0 ? Math.round((present / total) * 100) : 0 };
  };

  if (loading) {
    return (
      <div className=\"min-h-screen flex items-center justify-center\">
        <div className=\"animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600\"></div>
      </div>
    );
  }

  if (!student) return null;

  const stats = getAttendanceStats();

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
      <main className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8\">
        {/* Student Info Card */}
        <div className=\"bg-white rounded-2xl shadow-lg p-6 mb-8\">
          <div className=\"flex justify-between items-start\">
            <div>
              <h1 className=\"text-3xl font-bold text-gray-900 mb-2\" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{student.name}</h1>
              <p className=\"text-gray-600\">Student Code: {student.student_code}</p>
              <p className=\"text-gray-600\">Class {student.class_level} | {student.board} Board</p>
              <p className=\"text-sm text-gray-500 mt-1\">{student.school_name}</p>
            </div>
            <div className=\"text-right\">
              <div className=\"bg-green-100 text-green-800 px-4 py-2 rounded-lg\">
                <p className=\"text-sm font-medium\">Attendance</p>
                <p className=\"text-2xl font-bold\">{stats.percentage}%</p>
                <p className=\"text-xs\">{stats.present}/{stats.total} classes</p>
              </div>
            </div>
          </div>
        </div>

        {/* My Batches */}
        <div className=\"mb-8\">
          <h2 className=\"text-2xl font-bold text-gray-900 mb-4\" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>My Classes</h2>
          {batches.length === 0 ? (
            <p className=\"text-gray-600\">No active batches yet.</p>
          ) : (
            <div className=\"grid gap-4\">
              {batches.map(batch => (
                <div
                  key={batch.id}
                  data-testid={`student-batch-${batch.id}`}
                  className=\"bg-white rounded-xl shadow-lg p-6\"
                >
                  <div className=\"flex justify-between items-start mb-4\">
                    <div>
                      <h3 className=\"text-xl font-bold text-gray-900\">{SUBJECTS[batch.subject]}</h3>
                      <p className=\"text-gray-600 text-sm\">{batch.batch_code}</p>
                      <p className=\"text-sm text-gray-500\">Status: <span className=\"capitalize font-medium\">{batch.status}</span></p>
                    </div>
                    <div className=\"flex space-x-2\">
                      <Button
                        data-testid={`view-logboard-${batch.id}`}
                        onClick={() => navigate(`/logboard/${batch.id}`)}
                        variant=\"outline\"
                        size=\"sm\"
                      >
                        <Calendar className=\"h-4 w-4 mr-2\" />
                        View Classes
                      </Button>
                      <Button
                        data-testid={`request-remedial-${batch.id}`}
                        onClick={() => {
                          setSelectedBatch(batch);
                          setDialogOpen(true);
                        }}
                        className=\"bg-orange-600 text-white hover:bg-orange-700\"
                        size=\"sm\"
                      >
                        <AlertCircle className=\"h-4 w-4 mr-2\" />
                        Need Help?
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Remedial Requests */}
        {remedialRequests.length > 0 && (
          <div className=\"mb-8\">
            <h2 className=\"text-2xl font-bold text-gray-900 mb-4\" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>My Help Requests</h2>
            <div className=\"grid gap-4\">
              {remedialRequests.map(request => (
                <div key={request.id} className=\"bg-white rounded-xl shadow-lg p-4\">
                  <div className=\"flex justify-between items-start\">
                    <div>
                      <p className=\"font-semibold text-gray-900\">{request.topic}</p>
                      <p className=\"text-sm text-gray-600\">{SUBJECTS[request.subject]} | Class {request.class_level}</p>
                      <p className=\"text-sm text-gray-500 mt-1\">{request.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Attendance */}
        <div>
          <h2 className=\"text-2xl font-bold text-gray-900 mb-4\" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Recent Attendance</h2>
          {attendance.length === 0 ? (
            <p className=\"text-gray-600\">No attendance records yet.</p>
          ) : (
            <div className=\"bg-white rounded-xl shadow-lg p-6\">
              <div className=\"space-y-3\">
                {attendance.slice(-10).reverse().map((record, idx) => (
                  <div key={idx} className=\"flex justify-between items-center py-2 border-b border-gray-100 last:border-0\">
                    <div>
                      <p className=\"text-sm font-medium text-gray-900\">{new Date(record.date).toLocaleDateString()}</p>
                      <p className=\"text-xs text-gray-500\">Batch ID: {record.batch_id.substring(0, 15)}...</p>
                    </div>
                    <div className=\"flex items-center space-x-2\">
                      {record.status === 'present' && <CheckCircle className=\"h-5 w-5 text-green-600\" />}
                      {record.status === 'absent' && <XCircle className=\"h-5 w-5 text-red-600\" />}
                      <span className={`text-sm font-medium capitalize ${
                        record.status === 'present' ? 'text-green-600' :
                        record.status === 'absent' ? 'text-red-600' :
                        'text-orange-600'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Remedial Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Remedial Class</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRemedialRequest} className=\"space-y-4\">
            <div>
              <label className=\"block text-sm font-medium mb-2\">Why do you need help?</label>
              <Select value={remedialForm.reason} onValueChange={(val) => setRemedialForm({ ...remedialForm, reason: val })}>
                <SelectTrigger data-testid=\"remedial-reason-select\">
                  <SelectValue placeholder=\"Select reason\" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=\"missed_class\">I missed a class</SelectItem>
                  <SelectItem value=\"need_clarification\">I need more clarification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className=\"block text-sm font-medium mb-2\">Which topic?</label>
              <input
                data-testid=\"remedial-topic-input\"
                type=\"text\"
                value={remedialForm.topic}
                onChange={(e) => setRemedialForm({ ...remedialForm, topic: e.target.value })}
                placeholder=\"e.g., Quadratic Equations\"
                className=\"w-full px-3 py-2 border border-gray-300 rounded-lg\"
              />
            </div>

            <div>
              <label className=\"block text-sm font-medium mb-2\">Additional Details (Optional)</label>
              <Textarea
                data-testid=\"remedial-description-input\"
                value={remedialForm.description}
                onChange={(e) => setRemedialForm({ ...remedialForm, description: e.target.value })}
                placeholder=\"Explain what you're struggling with...\"
                rows={3}
              />
            </div>

            <Button
              data-testid=\"submit-remedial-request\"
              type=\"submit\"
              className=\"w-full bg-gradient-to-r from-blue-600 to-green-600 text-white\"
            >
              Submit Request
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
