import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { BookOpen, LogOut, ArrowLeft, GraduationCap, Trophy, Send, ExternalLink, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SUBJECTS = {
  'MAT': 'Mathematics',
  'PHY': 'Physics',
  'SCI': 'Science',
  'BIO': 'Biology',
  'ENG': 'English',
  'CHESS': 'Chess',
  'RUBIKS': "Rubik's Cube",
  'CONFIDENCE': 'Confidence Club',
  'CAREER': 'Career Guidance'
};

const ACADEMIC_SUBJECTS = ['MAT', 'PHY', 'SCI', 'BIO', 'ENG'];
const NON_ACADEMIC_SUBJECTS = ['CHESS', 'RUBIKS', 'CONFIDENCE', 'CAREER'];

export default function StudentDashboard({ user, logout }) {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [batches, setBatches] = useState([]);
  const [batchTutors, setBatchTutors] = useState({});
  const [curriculum, setCurriculum] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Remedial request state
  const [showRemedialDialog, setShowRemedialDialog] = useState(false);
  const [remedialSubject, setRemedialSubject] = useState('');
  const [remedialTopic, setRemedialTopic] = useState('');
  const [remedialReason, setRemedialReason] = useState('');
  const [submittingRemedial, setSubmittingRemedial] = useState(false);
  
  // Join class state
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    try {
      let studentData;
      let batchesRes;
      
      // If studentId is "me" or undefined (direct student login), fetch logged-in student's data
      if (!studentId || studentId === 'me' || user.role === 'student') {
        const [studentRes, batchesData] = await Promise.all([
          axios.get(`${API}/students/me`, { withCredentials: true }),
          axios.get(`${API}/students/me/batches`, { withCredentials: true })
        ]);
        studentData = studentRes.data;
        batchesRes = { data: batchesData.data };
      } else {
        // Parent viewing their kid
        const [studentsRes, allBatchesRes] = await Promise.all([
          axios.get(`${API}/students`, { withCredentials: true }),
          axios.get(`${API}/batches`, { withCredentials: true })
        ]);
        studentData = studentsRes.data.find(s => s.id === studentId);
        batchesRes = allBatchesRes;
        
        if (!studentData) {
          toast.error('Student not found');
          navigate('/dashboard');
          return;
        }
      }
      
      setStudent(studentData);
      
      // For "me", batches are already filtered; for parent view, filter them
      const studentBatches = (!studentId || studentId === 'me' || user.role === 'student')
        ? batchesRes.data 
        : batchesRes.data.filter(batch => batch.student_ids && batch.student_ids.includes(studentId));
      setBatches(studentBatches);

      // Fetch tutor information for each batch
      const tutorData = {};
      for (const batch of studentBatches) {
        try {
          const assignmentsRes = await axios.get(`${API}/batches/${batch.id}/tutor-assignments`, { withCredentials: true });
          if (assignmentsRes.data && assignmentsRes.data.length > 0) {
            // Get tutor details for each assignment
            const tutorIds = [...new Set(assignmentsRes.data.map(a => a.tutor_id))];
            const tutors = [];
            for (const tutorId of tutorIds) {
              try {
                const tutorRes = await axios.get(`${API}/tutors/${tutorId}`, { withCredentials: true });
                tutors.push(tutorRes.data);
              } catch (err) {
                console.error('Failed to fetch tutor:', err);
              }
            }
            tutorData[batch.id] = tutors;
          }
        } catch (error) {
          console.error(`Failed to fetch tutors for batch ${batch.id}`);
        }
      }
      setBatchTutors(tutorData);

      // Fetch curriculum for student's subjects
      const curriculumData = {};
      for (const subject of studentData.subjects) {
        try {
          const res = await axios.get(
            `${API}/curriculum?board=${studentData.board}&class_level=${studentData.class_level}&subject=${subject}`,
            { withCredentials: true }
          );
          curriculumData[subject] = res.data;
        } catch (error) {
          console.error(`Failed to fetch curriculum for ${subject}`);
        }
      }
      setCurriculum(curriculumData);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleRemedialRequest = async () => {
    if (!remedialSubject || !remedialTopic || !remedialReason) {
      toast.error('Please fill all fields');
      return;
    }

    setSubmittingRemedial(true);
    try {
      // Find a batch for this subject
      const batch = batches.find(b => b.subject === remedialSubject);
      if (!batch) {
        toast.error('No batch found for this subject');
        return;
      }

      await axios.post(`${API}/remedial/request`, {
        batch_id: batch.id,
        topic: remedialTopic,
        reason: remedialReason
      }, { withCredentials: true });

      toast.success('Remedial request sent to coordinator');
      setShowRemedialDialog(false);
      setRemedialSubject('');
      setRemedialTopic('');
      setRemedialReason('');
    } catch (error) {
      toast.error('Failed to send remedial request');
    } finally {
      setSubmittingRemedial(false);
    }
  };

  const handleJoinClass = (batch) => {
    setSelectedBatch(batch);
    setShowJoinDialog(true);
  };

  const confirmJoinClass = () => {
    if (selectedBatch && selectedBatch.gmeet_link) {
      window.open(selectedBatch.gmeet_link, '_blank');
      setShowJoinDialog(false);
      setSelectedBatch(null);
    } else {
      toast.error('No meeting link available for this batch');
    }
  };

  // Calculate statistics
  const academicBatches = batches.filter(b => ACADEMIC_SUBJECTS.includes(b.subject));
  const nonAcademicBatches = batches.filter(b => NON_ACADEMIC_SUBJECTS.includes(b.subject));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (!student) return null;

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{student.name}</h1>
          <p className="text-gray-600">Code: {student.student_code} | Class {student.class_level} | {student.board} Board</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{batches.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Academic Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{academicBatches.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Non-Academic Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{nonAcademicBatches.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Quick Actions</h2>
          <div className="flex gap-4">
            <Button onClick={() => setShowRemedialDialog(true)} className="bg-gradient-to-r from-orange-500 to-red-500">
              <Send className="h-4 w-4 mr-2" />
              Request Remedial Class
            </Button>
          </div>
        </div>

        {/* Batches */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>My Batches</h2>
          {batches.length === 0 ? (
            <p className="text-gray-600">No active batches yet.</p>
          ) : (
            <div className="grid gap-4">
              {batches.map(batch => (
                <div
                  key={batch.id}
                  data-testid={`batch-${batch.id}`}
                  className="bg-white rounded-xl shadow-lg p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{batch.batch_code}</h3>
                      <p className="text-gray-600">{SUBJECTS[batch.subject]} | Status: {batch.status}</p>
                      <p className="text-sm text-gray-500">Class {batch.class_level} | {batch.board} Board</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleJoinClass(batch)} 
                        variant="outline" 
                        size="sm"
                        className="bg-green-50 hover:bg-green-100"
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Join Class
                      </Button>
                      <Button 
                        data-testid={`view-logboard-${batch.id}`} 
                        onClick={() => navigate(`/logboard/${batch.id}`)} 
                        variant="outline"
                        size="sm"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Log Board
                      </Button>
                    </div>
                  </div>
                  
                  {/* Tutor Information */}
                  {batchTutors[batch.id] && batchTutors[batch.id].length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <GraduationCap className="h-5 w-5 mr-2 text-blue-600" />
                        Your Tutors
                      </h4>
                      <div className="space-y-3">
                        {batchTutors[batch.id].map(tutor => (
                          <div key={tutor.id} className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              {tutor.photo_url ? (
                                <img src={tutor.photo_url} alt={tutor.name} className="w-12 h-12 rounded-full object-cover" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
                                  <GraduationCap className="h-6 w-6 text-blue-600" />
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{tutor.name}</p>
                                <p className="text-sm text-gray-600">{tutor.tutor_code}</p>
                                {tutor.about_yourself && (
                                  <p className="text-sm text-gray-700 mt-2 italic">"{tutor.about_yourself}"</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Curriculum */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Curriculum</h2>
          <div className="space-y-6">
            {student.subjects.map(subject => (
              <div key={subject} data-testid={`curriculum-${subject}`} className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">{SUBJECTS[subject]}</h3>
                {curriculum[subject] && curriculum[subject].length > 0 ? (
                  <div className="space-y-2">
                    {curriculum[subject].map(item => (
                      <div key={item.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <span className="font-semibold text-blue-600 min-w-[30px]">{item.topic_number}.</span>
                        <div>
                          <p className="font-medium text-gray-900">{item.topic_name}</p>
                          {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">Curriculum not available</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Remedial Request Dialog */}
      <Dialog open={showRemedialDialog} onOpenChange={setShowRemedialDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Remedial Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Subject *</Label>
              <Select value={remedialSubject} onValueChange={setRemedialSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {student.subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>
                      {SUBJECTS[subject]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Topic *</Label>
              <Input 
                value={remedialTopic}
                onChange={(e) => setRemedialTopic(e.target.value)}
                placeholder="Enter topic name"
              />
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea 
                value={remedialReason}
                onChange={(e) => setRemedialReason(e.target.value)}
                placeholder="Explain why you need this remedial class..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemedialDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRemedialRequest}
              disabled={submittingRemedial}
              className="bg-gradient-to-r from-orange-500 to-red-500"
            >
              {submittingRemedial ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Class Confirmation Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Join Class</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              Do you want to join the class for <strong>{selectedBatch?.batch_code}</strong>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This will open the Google Meet link in a new tab.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              No, Cancel
            </Button>
            <Button 
              onClick={confirmJoinClass}
              className="bg-green-600 hover:bg-green-700"
            >
              Yes, Join Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
