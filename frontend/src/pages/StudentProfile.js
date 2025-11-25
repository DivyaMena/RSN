import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { BookOpen, LogOut, ArrowLeft, Save, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ACADEMIC_SUBJECTS = {
  'MAT': 'Mathematics',
  'PHY': 'Physics',
  'SCI': 'Science',
  'BIO': 'Biology',
  'ENG': 'English'
};

const NON_ACADEMIC_COURSES = {
  'CHS': 'Chess',
  'CUB': "Rubik's Cube",
  'CON': 'Confidence Club',
  'CAR': 'Career Guidance'
};

// Function to get available academic subjects based on class level
const getAvailableAcademicSubjects = (classLevel) => {
  const subjects = {};
  
  // Classes 6-7: MAT, SCI, ENG (no PHY, no BIO)
  if (classLevel === 6 || classLevel === 7) {
    subjects['MAT'] = ACADEMIC_SUBJECTS['MAT'];
    subjects['SCI'] = ACADEMIC_SUBJECTS['SCI'];
    subjects['ENG'] = ACADEMIC_SUBJECTS['ENG'];
  }
  // Classes 8-10: MAT, PHY, BIO, ENG (no SCI)
  else if (classLevel === 8 || classLevel === 9 || classLevel === 10) {
    subjects['MAT'] = ACADEMIC_SUBJECTS['MAT'];
    subjects['PHY'] = ACADEMIC_SUBJECTS['PHY'];
    subjects['BIO'] = ACADEMIC_SUBJECTS['BIO'];
    subjects['ENG'] = ACADEMIC_SUBJECTS['ENG'];
  }
  
  return subjects;
};

export default function StudentProfile({ user, logout }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [subjects, setSubjects] = useState([]);
  const [schoolName, setSchoolName] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState({});
  
  const [daysUntilNextEdit, setDaysUntilNextEdit] = useState(null);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/students/me`, { withCredentials: true });
      setProfile(res.data);
      setSubjects(res.data.subjects || []);
      setSchoolName(res.data.school_name || '');
      
      // Set available academic subjects based on class level
      const availAcademicSubjects = getAvailableAcademicSubjects(res.data.class_level);
      setAvailableSubjects(availAcademicSubjects);
      
      // Calculate if editing is allowed
      if (res.data.last_profile_update) {
        const lastUpdate = new Date(res.data.last_profile_update);
        const now = new Date();
        const daysSince = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
        const daysRemaining = 15 - daysSince;
        
        if (daysRemaining > 0) {
          setCanEdit(false);
          setDaysUntilNextEdit(daysRemaining);
        } else {
          setCanEdit(true);
          setDaysUntilNextEdit(null);
        }
      } else {
        // No previous update - can edit
        setCanEdit(true);
      }
    } catch (error) {
      toast.error('Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      toast.error(`You can edit your profile again in ${daysUntilNextEdit} days`);
      return;
    }

    if (subjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    if (!schoolName.trim()) {
      toast.error('School name is required');
      return;
    }

    setSaving(true);
    try {
      await axios.put(
        `${API}/students/me/profile`,
        { 
          subjects: subjects,
          school_name: schoolName 
        },
        { withCredentials: true }
      );
      toast.success('Profile updated successfully! Next edit available in 15 days.');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleSubject = (subject) => {
    if (!canEdit) return;
    if (subjects.includes(subject)) {
      setSubjects(subjects.filter(s => s !== subject));
    } else {
      setSubjects([...subjects, subject]);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img src="/logo.jpg" alt="Rising Stars Nation" className="h-10 w-10 object-cover rounded-xl" />
              <span className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>My Profile</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Button onClick={logout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Edit Restriction Notice */}
        {!canEdit && daysUntilNextEdit !== null && (
          <div className="mb-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-yellow-600 mr-3" />
              <div>
                <p className="font-semibold text-yellow-900">Profile editing is restricted</p>
                <p className="text-sm text-yellow-800">
                  You can edit your profile again in <strong>{daysUntilNextEdit} days</strong>. 
                  Profile updates are allowed once every 15 days.
                </p>
              </div>
            </div>
          </div>
        )}

        {canEdit && (
          <div className="mb-6 bg-green-50 border border-green-300 rounded-lg p-4">
            <p className="text-sm text-green-800">
              ✓ You can update your profile now. After saving, you'll need to wait 15 days for the next edit.
            </p>
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
            <p className="text-sm text-gray-600">Name and basic details cannot be changed</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">{profile?.name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student Code</label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">{profile?.student_code}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">Class {profile?.class_level}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Board</label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">{profile?.board}</div>
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Editable Information</h2>
            <p className="text-sm text-gray-600">Update your school and subject preferences</p>
          </div>

          {/* School Name */}
          <div>
            <Label htmlFor="school" className="text-gray-900">School Name *</Label>
            <Input
              id="school"
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              disabled={!canEdit}
              placeholder="Enter your school name"
              className={!canEdit ? 'bg-gray-100' : ''}
            />
          </div>

          {/* Academic Subjects */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">Academic Subjects *</label>
            <p className="text-xs text-gray-500 mb-3">
              {profile?.class_level <= 7 
                ? 'Available for Classes 6-7: Mathematics, Science, English' 
                : 'Available for Classes 8-10: Mathematics, Physics, Biology, English'}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(availableSubjects).map(([code, name]) => (
                <div key={code} className="flex items-center space-x-2">
                  <Checkbox
                    checked={subjects.includes(code)}
                    onCheckedChange={() => toggleSubject(code)}
                    disabled={!canEdit}
                  />
                  <Label className={!canEdit ? 'text-gray-400' : 'text-gray-700'}>{name}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Non-Academic Courses */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">Non-Academic Courses (Optional)</label>
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
              {Object.entries(NON_ACADEMIC_COURSES).map(([code, name]) => (
                <div key={code} className="flex items-center space-x-2">
                  <Checkbox
                    checked={subjects.includes(code)}
                    onCheckedChange={() => toggleSubject(code)}
                    disabled={!canEdit}
                  />
                  <Label className={!canEdit ? 'text-gray-400' : 'text-gray-700'}>{name}</Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Courses: CHS - Chess, CUB - Rubik's Cube, CON - Confidence Club, CAR - Career Guidance
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={!canEdit || saving}
              className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-8"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
