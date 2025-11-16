import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { BookOpen, LogOut, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SUBJECTS = [
  { value: 'MAT', label: 'Mathematics' },
  { value: 'PHY', label: 'Physics' },
  { value: 'SCI', label: 'Science' },
  { value: 'BIO', label: 'Biology' },
  { value: 'ENG', label: 'English' }
];

export default function ParentDashboard({ user, logout }) {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    class_level: '',
    board: '',
    school_name: '',
    location: '',
    roll_no: '',
    subjects: [],
    enrollment_year: new Date().getFullYear()
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, batchesRes] = await Promise.all([
        axios.get(`${API}/students`, { withCredentials: true }),
        axios.get(`${API}/batches`, { withCredentials: true })
      ]);
      setStudents(studentsRes.data);
      setBatches(batchesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subject) => {
    if (formData.subjects.includes(subject)) {
      setFormData({ ...formData, subjects: formData.subjects.filter(s => s !== subject) });
    } else {
      setFormData({ ...formData, subjects: [...formData.subjects, subject] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.class_level || !formData.board || formData.subjects.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await axios.post(`${API}/students`, formData, { withCredentials: true });
      toast.success('Student registered successfully!');
      setDialogOpen(false);
      setFormData({
        name: '',
        class_level: '',
        board: '',
        school_name: '',
        location: '',
        roll_no: '',
        subjects: [],
        enrollment_year: new Date().getFullYear()
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to register student');
    }
  };

  const getStudentBatches = (studentId) => {
    return batches.filter(batch => batch.student_ids.includes(studentId));
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
            <Button data-testid="logout-btn" onClick={logout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Parent Dashboard</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-student-btn" className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Register Student
              </Button>
            </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Register Student</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Student Name</label>
                    <Input
                      data-testid="student-name-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter student name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Class</label>
                      <Select value={formData.class_level} onValueChange={(val) => setFormData({ ...formData, class_level: parseInt(val) })}>
                        <SelectTrigger data-testid="class-select">
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {[6, 7, 8, 9, 10].map(cls => (
                            <SelectItem key={cls} value={cls.toString()}>Class {cls}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Board</label>
                      <Select value={formData.board} onValueChange={(val) => setFormData({ ...formData, board: val })}>
                        <SelectTrigger data-testid="board-select">
                          <SelectValue placeholder="Select board" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TS">Telangana (TS)</SelectItem>
                          <SelectItem value="AP">Andhra Pradesh (AP)</SelectItem>
                          <SelectItem value="TN">Tamil Nadu (TN)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">School Name</label>
                    <Input
                      data-testid="school-name-input"
                      value={formData.school_name}
                      onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                      placeholder="Enter school name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Location</label>
                      <Input
                        data-testid="location-input"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="City/Town"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Roll Number</label>
                      <Input
                        data-testid="roll-no-input"
                        value={formData.roll_no}
                        onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
                        placeholder="Enter roll number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Select Subjects</label>
                    <div className="space-y-2">
                      {SUBJECTS.map(subject => (
                        <div key={subject.value} className="flex items-center space-x-2">
                          <Checkbox
                            data-testid={`form-subject-${subject.value}-checkbox`}
                            id={`form-subject-${subject.value}`}
                            checked={formData.subjects.includes(subject.value)}
                            onCheckedChange={() => toggleSubject(subject.value)}
                          />
                          <label htmlFor={`form-subject-${subject.value}`} className="text-sm cursor-pointer">{subject.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button data-testid="submit-student-btn" type="submit" className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white">
                    Register Student
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {students.length === 0 ? (
          <div data-testid="no-students-message" className="text-center py-20">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No students registered yet</h3>
            <p className="text-gray-600">Click the "Register Student" button to get started</p>
          </div>
        ) : (
          <div className="space-y-6">
            {students.map(student => {
              const studentBatches = getStudentBatches(student.id);
              return (
                <div key={student.id} data-testid={`student-card-${student.id}`} className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{student.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">Code: {student.student_code}</p>
                      <p className="text-sm text-gray-600">Class {student.class_level} | {student.board} Board</p>
                    </div>
                    <Button
                      data-testid={`view-student-${student.id}-btn`}
                      onClick={() => navigate(`/student/${student.id}`)}
                      variant="outline"
                    >
                      View Details
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Enrolled Batches:</h4>
                    {studentBatches.length === 0 ? (
                      <p className="text-gray-600 text-sm">No active batches yet. Batches will be created when 10+ students enroll for the same subject.</p>
                    ) : (
                      <div className="grid gap-3">
                        {studentBatches.map(batch => (
                          <div
                            key={batch.id}
                            data-testid={`batch-card-${batch.id}`}
                            className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => navigate(`/logboard/${batch.id}`)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium text-gray-900">{batch.batch_code}</p>
                                <p className="text-sm text-gray-600">
                                  {SUBJECTS.find(s => s.value === batch.subject)?.label} | 
                                  Status: <span className="capitalize">{batch.status}</span> |
                                  Students: {batch.student_ids.length}/25
                                </p>
                              </div>
                              <Button data-testid={`view-logboard-${batch.id}-btn`} variant="ghost" size="sm">
                                View Log Board
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
