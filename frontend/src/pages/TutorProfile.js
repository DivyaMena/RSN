import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { BookOpen, LogOut, ArrowLeft, Save, Calendar } from 'lucide-react';
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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const CLASSES = [6, 7, 8, 9, 10];

export default function TutorProfile({ user, logout }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [availableDays, setAvailableDays] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [aboutYourself, setAboutYourself] = useState('');
  
  const [daysUntilNextEdit, setDaysUntilNextEdit] = useState(null);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/tutors/me`, { withCredentials: true });
      setProfile(res.data);
      setAvailableDays(res.data.available_days || []);
      setSubjects(res.data.subjects_can_teach || []);
      setClasses(res.data.classes_can_teach || []);
      setAboutYourself(res.data.about_yourself || '');
      
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

    setSaving(true);
    try {
      await axios.put(
        `${API}/tutors/me/profile`,
        {
          available_days: availableDays,
          subjects_can_teach: subjects,
          classes_can_teach: classes,
          about_yourself: aboutYourself
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

  const toggleDay = (day) => {
    if (!canEdit) return;
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter(d => d !== day));
    } else {
      setAvailableDays([...availableDays, day]);
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

  const toggleClass = (cls) => {
    if (!canEdit) return;
    if (classes.includes(cls)) {
      setClasses(classes.filter(c => c !== cls));
    } else {
      setClasses([...classes, cls]);
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
              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-xl flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
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
            <p className="text-sm text-gray-600">Name and email cannot be changed</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">{user.name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">{user.email}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tutor Code</label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">{profile?.tutor_code}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 capitalize">{profile?.status}</div>
            </div>
          </div>
        </div>

        {/* Editable Preferences */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          <h2 className="text-2xl font-bold text-gray-900">Teaching Preferences</h2>

          {/* Available Days */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">Available Days *</label>
            <div className="grid grid-cols-4 gap-3">
              {DAYS.map(day => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    checked={availableDays.includes(day)}
                    onCheckedChange={() => toggleDay(day)}
                    disabled={!canEdit}
                  />
                  <Label className={!canEdit ? 'text-gray-400' : 'text-gray-700'}>{day}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Subjects */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">Subjects You Can Teach *</label>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(SUBJECTS).map(([code, name]) => (
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

          {/* Classes */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">Classes You Can Teach *</label>
            <div className="grid grid-cols-5 gap-3">
              {CLASSES.map(cls => (
                <div key={cls} className="flex items-center space-x-2">
                  <Checkbox
                    checked={classes.includes(cls)}
                    onCheckedChange={() => toggleClass(cls)}
                    disabled={!canEdit}
                  />
                  <Label className={!canEdit ? 'text-gray-400' : 'text-gray-700'}>Class {cls}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* About Yourself */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">About Yourself</label>
            <Textarea
              value={aboutYourself}
              onChange={(e) => setAboutYourself(e.target.value)}
              disabled={!canEdit}
              placeholder="Tell students about yourself, your teaching style, experience, etc."
              rows={4}
              className={!canEdit ? 'bg-gray-100' : ''}
            />
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
