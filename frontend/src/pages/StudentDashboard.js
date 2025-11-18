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
      const studentBatches = studentId === 'me' 
        ? batchesRes.data 
        : batchesRes.data.filter(batch => batch.student_ids.includes(studentId));
      setBatches(studentBatches);

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
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => navigate(`/logboard/${batch.id}`)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{batch.batch_code}</h3>
                      <p className="text-gray-600">{SUBJECTS[batch.subject]} | Status: {batch.status}</p>
                    </div>
                    <Button data-testid={`view-logboard-${batch.id}`} variant="outline">View Log Board</Button>
                  </div>
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
    </div>
  );
}
