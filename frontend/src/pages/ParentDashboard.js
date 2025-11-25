import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { BookOpen, LogOut, Plus, Users, User } from 'lucide-react';
import { toast } from 'sonner';
import DonateButton from '../components/DonateButton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ParentDashboard({ user, logout }) {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    dob_day: '',
    dob_month: '',
    dob_year: '',
    student_photo: null,
    aadhaar_page1: null,
    aadhaar_page2: null,
    aadhaar_number: '000000000000', // Placeholder since backend expects it
    class_level: '',
    board: '',
    school_name: '',
    location: '',
    roll_no: '',
    subjects: [],
    non_academic_courses: [],
    accept_terms: false,
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

  const toggleNonAcademicCourse = (course) => {
    if (formData.non_academic_courses.includes(course)) {
      setFormData({ ...formData, non_academic_courses: formData.non_academic_courses.filter(c => c !== course) });
    } else {
      setFormData({ ...formData, non_academic_courses: [...formData.non_academic_courses, course] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.dob_day || !formData.dob_month || !formData.dob_year || !formData.student_photo || !formData.class_level || !formData.board || !formData.school_name || 
        !formData.location || !formData.roll_no || formData.subjects.length === 0 || !formData.aadhaar_page1 || !formData.accept_terms) {
      toast.error('Please fill all required fields including DOB, photo, Aadhaar card and accept Terms & Conditions');
      return;
    }

    try {
      // Upload files first
      let photoUrl = null;
      let aadhaarPage1Url = null;
      let aadhaarPage2Url = null;

      // Upload student photo
      if (formData.student_photo) {
        const photoFormData = new FormData();
        photoFormData.append('file', formData.student_photo);
        const photoResponse = await axios.post(`${API}/upload-file`, photoFormData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        photoUrl = photoResponse.data.url;
      }

      // Upload Aadhaar page 1
      if (formData.aadhaar_page1) {
        const aadhaarFormData = new FormData();
        aadhaarFormData.append('file', formData.aadhaar_page1);
        const aadhaarResponse = await axios.post(`${API}/upload-file`, aadhaarFormData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        aadhaarPage1Url = aadhaarResponse.data.url;
      }

      // Upload Aadhaar page 2 (optional)
      if (formData.aadhaar_page2) {
        const aadhaar2FormData = new FormData();
        aadhaar2FormData.append('file', formData.aadhaar_page2);
        const aadhaar2Response = await axios.post(`${API}/upload-file`, aadhaar2FormData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        aadhaarPage2Url = aadhaar2Response.data.url;
      }

      const dobFormatted = `${formData.dob_year}-${formData.dob_month}-${formData.dob_day}`;

      // Combine academic subjects and non-academic courses
      const allSubjects = [...formData.subjects, ...formData.non_academic_courses];

      const dataToSend = {
        ...formData,
        dob: dobFormatted,
        subjects: allSubjects,
        aadhaar_number: '000000000000', // Placeholder
        photo_url: photoUrl,
        aadhaar_page1_url: aadhaarPage1Url,
        aadhaar_page2_url: aadhaarPage2Url
      };
      delete dataToSend.dob_day;
      delete dataToSend.dob_month;
      delete dataToSend.dob_year;
      delete dataToSend.accept_terms;
      delete dataToSend.aadhaar_page1;
      delete dataToSend.aadhaar_page2;
      delete dataToSend.student_photo;
      delete dataToSend.non_academic_courses;
      
      await axios.post(`${API}/students`, dataToSend, { withCredentials: true });
      toast.success('Student registered successfully!');
      setDialogOpen(false);
      setFormData({
        name: '',
        student_photo: null,
        aadhaar_page1: null,
        aadhaar_page2: null,
        aadhaar_number: '000000000000',
        class_level: '',
        board: '',
        school_name: '',
        location: '',
        roll_no: '',
        subjects: [],
        non_academic_courses: [],
        enrollment_year: new Date().getFullYear()
      });
      fetchData();
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || 'Failed to register student');
    }
  };

  const SUBJECTS_MAP = {
    'MAT': 'Mathematics',
    'PHY': 'Physics',
    'SCI': 'Science',
    'BIO': 'Biology',
    'ENG': 'English'
  };

  const SUBJECTS_ARRAY = [
    { value: 'MAT', label: 'Mathematics' },
    { value: 'PHY', label: 'Physics' },
    { value: 'SCI', label: 'Science' },
    { value: 'BIO', label: 'Biology' },
    { value: 'ENG', label: 'English' }
  ];

  const NON_ACADEMIC_COURSES = [
    { value: 'CHS', label: 'Chess' },
    { value: 'CUB', label: "Rubik's Cube" },
    { value: 'CON', label: 'Confidence Club' },
    { value: 'CAR', label: 'Career Guidance' }
  ];

  const getStudentBatches = (studentId) => {
    return batches.filter(batch => batch.student_ids.includes(studentId));
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    
    try {
      await axios.delete(`${API}/students/${studentToDelete.id}`, { withCredentials: true });
      toast.success('Student deleted successfully');
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete student');
    }
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
              <img src="/logo.jpg" alt="Rising Stars Nation" className="h-10 w-10 object-cover rounded-xl flex-shrink-0" />
              <span className="text-base sm:text-xl font-bold truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Rising Stars Nation</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-xs sm:text-sm text-gray-700 truncate max-w-[120px] sm:max-w-none">Welcome, {user.name}</span>
              <DonateButton />
              <Button onClick={() => navigate('/profile')} variant="outline" size="sm" className="text-xs">
                <User className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">My Profile</span>
              </Button>
              <Button data-testid="logout-btn" onClick={logout} variant="outline" size="sm" className="text-xs">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Parent Dashboard</h1>
            <p className="text-gray-600 mt-1">Register your children for free online tuition support</p>
          </div>
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
                    <label className="block text-sm font-medium mb-2">Student Name *</label>
                    <Input
                      data-testid="student-name-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter student name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Date of Birth *</label>
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={formData.dob_day || ''}
                        onValueChange={(val) => setFormData({ ...formData, dob_day: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Day" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(day => (
                            <SelectItem key={day} value={day}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={formData.dob_month || ''}
                        onValueChange={(val) => setFormData({ ...formData, dob_month: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="01">Jan</SelectItem>
                          <SelectItem value="02">Feb</SelectItem>
                          <SelectItem value="03">Mar</SelectItem>
                          <SelectItem value="04">Apr</SelectItem>
                          <SelectItem value="05">May</SelectItem>
                          <SelectItem value="06">Jun</SelectItem>
                          <SelectItem value="07">Jul</SelectItem>
                          <SelectItem value="08">Aug</SelectItem>
                          <SelectItem value="09">Sep</SelectItem>
                          <SelectItem value="10">Oct</SelectItem>
                          <SelectItem value="11">Nov</SelectItem>
                          <SelectItem value="12">Dec</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={formData.dob_year || ''}
                        onValueChange={(val) => setFormData({ ...formData, dob_year: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 15 }, (_, i) => (new Date().getFullYear() - 6 - i).toString()).map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>


                  <div>
                    <label className="block text-sm font-medium mb-2">Student Photo/Selfie *</label>
                    <Input
                      data-testid="student-photo-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, student_photo: e.target.files[0] })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Recent photo of the student</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Aadhaar Card - Page 1 *</label>
                    <Input
                      data-testid="aadhaar-page1-input"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setFormData({ ...formData, aadhaar_page1: e.target.files[0] })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Upload scanned copy of Aadhaar card page 1</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Aadhaar Card - Page 2 (Optional)</label>
                    <Input
                      data-testid="aadhaar-page2-input"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setFormData({ ...formData, aadhaar_page2: e.target.files[0] })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Some Aadhaar cards have all details on one page</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Class *</label>
                      <Select 
                        value={formData.class_level ? formData.class_level.toString() : ""} 
                        onValueChange={(val) => setFormData({ ...formData, class_level: parseInt(val), subjects: [] })}
                      >
                        <SelectTrigger data-testid="class-select">
                          <SelectValue placeholder="Select class">
                            {formData.class_level ? `Class ${formData.class_level}` : "Select class"}
                          </SelectValue>
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
                    <label className="block text-sm font-medium mb-2">Select Non Academic Courses (Optional)</label>
                    <div className="grid grid-cols-2 gap-3 p-4 bg-blue-50 rounded-lg">
                      {NON_ACADEMIC_COURSES.map(course => (
                        <div key={course.value} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.non_academic_courses.includes(course.value)}
                            onCheckedChange={() => toggleNonAcademicCourse(course.value)}
                          />
                          <label className="text-sm cursor-pointer" onClick={() => toggleNonAcademicCourse(course.value)}>
                            {course.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Courses: CHS - Chess, CUB - Rubik's Cube, CON - Confidence Club, CAR - Career Guidance
                    </p>
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
                    <label className="block text-sm font-medium mb-2">Select Subjects *</label>
                    {!formData.class_level ? (
                      <p className="text-sm text-gray-500">Please select a class first</p>
                    ) : (
                      <div className="space-y-2">
                        {SUBJECTS_ARRAY.filter(subject => {
                          // Classes 6 & 7: No PHY, BIO
                          if ([6, 7].includes(formData.class_level) && ['PHY', 'BIO'].includes(subject.value)) {
                            return false;
                          }
                          // Classes 8, 9, 10: No SCI
                          if ([8, 9, 10].includes(formData.class_level) && subject.value === 'SCI') {
                            return false;
                          }
                          return true;
                        }).map(subject => (
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
                    )}
                  </div>

                  {/* Terms & Conditions Checkbox */}
                  <div className="flex items-center space-x-2 pt-4">
                    <Checkbox
                      data-testid="accept-terms-checkbox"
                      checked={formData.accept_terms || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, accept_terms: !!checked })}
                    />
                    <label className="text-sm text-gray-600 cursor-pointer">
                      I accept the{' '}
                      <a 
                        href="https://risingstarsnation.org/terms" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        terms and conditions
                      </a>
                      {' '}for student registration *
                    </label>
                  </div>

                  <Button data-testid="submit-student-btn" type="submit" className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white">
                    Register Student
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
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
                    <div className="flex gap-2">
                      <Button
                        data-testid={`view-student-${student.id}-btn`}
                        onClick={() => navigate(`/student/${student.id}`)}
                        variant="outline"
                      >
                        View Details
                      </Button>
                      <Button
                        onClick={() => {
                          setStudentToDelete(student);
                          setDeleteDialogOpen(true);
                        }}
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
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
                                  {SUBJECTS_MAP[batch.subject]} | 
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              Are you sure you want to delete <strong>{studentToDelete?.name}</strong>?
            </p>
            <p className="text-red-600 text-sm mt-2">
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setStudentToDelete(null);
              }}
            >
              No
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteStudent}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
