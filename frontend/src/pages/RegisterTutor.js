import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CLASSES = [6, 7, 8, 9, 10];
const ACADEMIC_SUBJECTS = [
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
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function RegisterTutor({ setUser }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    board_preference: '',
    current_address: '',
    pincode: '',
    about_yourself: '',
    tutor_photo: null,
    aadhaar_page1: null,
    aadhaar_page2: null,
    classes_can_teach: [],
    subjects_can_teach: [],
    available_days: [],
    preferred_slot: '' // '5pm-6pm' | '6pm-7pm' | 'any'
  });
  const [loading, setLoading] = useState(false);

  const toggleItem = (item, field) => {
    const currentList = formData[field];
    if (currentList.includes(item)) {
      setFormData({ ...formData, [field]: currentList.filter(i => i !== item) });
    } else {
      setFormData({ ...formData, [field]: [...currentList, item] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.board_preference || !formData.current_address || !formData.pincode || 
        !formData.about_yourself || !formData.tutor_photo || !formData.aadhaar_page1 ||
        formData.classes_can_teach.length === 0 || 
        formData.subjects_can_teach.length === 0 || 
        formData.available_days.length === 0 ||
        !formData.preferred_slot) {
      toast.error('Please fill all required fields including photo and preferred slot');
      return;
    }

    setLoading(true);
    try {
      // For now, send data without actual file upload (would need file storage in production)
      let slots = [];
      if (formData.preferred_slot === '5pm-6pm') {
        slots = ['17:00-18:00'];
      } else if (formData.preferred_slot === '6pm-7pm') {
        slots = ['18:00-19:00'];
      } else if (formData.preferred_slot === 'any') {
        slots = ['17:00-18:00', '18:00-19:00'];
      }

      const dataToSend = {
        board_preference: formData.board_preference,
        current_address: formData.current_address,
        pincode: formData.pincode,
        about_yourself: formData.about_yourself,
        aadhaar_number: '000000000000', // Placeholder since backend expects it
        classes_can_teach: formData.classes_can_teach,
        subjects_can_teach: formData.subjects_can_teach,
        available_days: formData.available_days,
        available_slots: slots
      };
      
      const response = await axios.post(
        `${API}/users/register/tutor`,
        dataToSend,
        { withCredentials: true }
      );
      
      toast.success('Registration submitted for coordinator approval!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Registration error:', error);
      const errorMsg = error.response?.data?.detail;
      if (typeof errorMsg === 'string') {
        toast.error(errorMsg);
      } else if (Array.isArray(errorMsg)) {
        toast.error(errorMsg.map(e => e.msg).join(', '));
      } else {
        toast.error('Registration failed. Please check all fields.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Register as Tutor
        </h2>
        <p className="text-center text-gray-600 mb-6 text-sm">Help students who need extra support by volunteering as a tutor</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Board Preference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Which state board curriculum do you want to teach? *
            </label>
            <Select value={formData.board_preference} onValueChange={(val) => setFormData({ ...formData, board_preference: val })}>
              <SelectTrigger data-testid="board-preference-select" className="w-full">
                <SelectValue placeholder="Select board you want to teach" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TS">Telangana (TS) Board</SelectItem>
                <SelectItem value="AP">Andhra Pradesh (AP) Board</SelectItem>
                <SelectItem value="TN">Tamil Nadu (TN) Board</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">This is the board curriculum you'll teach, regardless of where you live</p>
          </div>

          {/* Current Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Address *</label>
            <Textarea
              data-testid="address-input"
              value={formData.current_address}
              onChange={(e) => setFormData({ ...formData, current_address: e.target.value })}
              placeholder="Enter your full address"
              rows={3}
            />
          </div>

          {/* Pincode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
            <Input
              data-testid="pincode-input"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              placeholder="Enter 6-digit pincode"
              maxLength={6}
            />
          </div>

          {/* About Yourself */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tell me about yourself (This is visible to students & parents, Co-Ordinators etc) *</label>
            <Textarea
              data-testid="about-input"
              value={formData.about_yourself}
              onChange={(e) => setFormData({ ...formData, about_yourself: e.target.value })}
              placeholder="Your education background, teaching experience, motivation to volunteer, etc."
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">This helps coordinators understand your background</p>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Photo/Selfie *</label>
            <Input
              data-testid="tutor-photo-input"
              type="file"
              accept="image/*"
              onChange={(e) => setFormData({ ...formData, tutor_photo: e.target.files[0] })}
            />
            <p className="text-xs text-gray-500 mt-1">Recent photo for profile</p>
          </div>

          {/* Aadhaar Upload */}
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-3">
              📋 Aadhaar Card Upload (Required for verification as per law)
            </p>
            <p className="text-xs text-gray-600 mb-4">
              Since you'll be interacting with students, we require identity verification for safety and security purposes as mandated by law.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Card - Page 1 *</label>
                <Input
                  data-testid="aadhaar-page1-input"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFormData({ ...formData, aadhaar_page1: e.target.files[0] })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Card - Page 2 (Optional)</label>
                <Input
                  data-testid="aadhaar-page2-input"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFormData({ ...formData, aadhaar_page2: e.target.files[0] })}
                />
                <p className="text-xs text-gray-500 mt-1">Optional if all details are on page 1</p>
              </div>
            </div>
          </div>

          {/* Classes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Classes You Can Teach *</label>
            <div className="grid grid-cols-5 gap-3">
              {CLASSES.map(cls => (
                <div key={cls} className="flex items-center space-x-2">
                  <Checkbox
                    data-testid={`class-${cls}-checkbox`}
                    id={`class-${cls}`}
                    checked={formData.classes_can_teach.includes(cls)}
                    onCheckedChange={() => toggleItem(cls, 'classes_can_teach')}
                  />
                  <label htmlFor={`class-${cls}`} className="text-sm cursor-pointer">Class {cls}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Subjects */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Subjects You Can Teach *</label>
            <div className="space-y-2">
              {SUBJECTS.map(subject => (
                <div key={subject.value} className="flex items-center space-x-2">
                  <Checkbox
                    data-testid={`subject-${subject.value}-checkbox`}
                    id={`subject-${subject.value}`}
                    checked={formData.subjects_can_teach.includes(subject.value)}
                    onCheckedChange={() => toggleItem(subject.value, 'subjects_can_teach')}
                  />
                  <label htmlFor={`subject-${subject.value}`} className="text-sm cursor-pointer">{subject.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Preferred Slot */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Preferred Slot *</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="radio"
                  name="preferred_slot"
                  value="5pm-6pm"
                  checked={formData.preferred_slot === '5pm-6pm'}
                  onChange={(e) => setFormData({ ...formData, preferred_slot: e.target.value })}
                />
                <span>5pm to 6pm</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="radio"
                  name="preferred_slot"
                  value="6pm-7pm"
                  checked={formData.preferred_slot === '6pm-7pm'}
                  onChange={(e) => setFormData({ ...formData, preferred_slot: e.target.value })}
                />
                <span>6pm to 7pm</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="radio"
                  name="preferred_slot"
                  value="any"
                  checked={formData.preferred_slot === 'any'}
                  onChange={(e) => setFormData({ ...formData, preferred_slot: e.target.value })}
                />
                <span>Any</span>
              </label>
            </div>
          </div>


          {/* Available Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Available Days *</label>
            <div className="grid grid-cols-2 gap-2">
              {DAYS.map(day => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    data-testid={`day-${day}-checkbox`}
                    id={`day-${day}`}
                    checked={formData.available_days.includes(day)}
                    onCheckedChange={() => toggleItem(day, 'available_days')}
                  />
                  <label htmlFor={`day-${day}`} className="text-sm cursor-pointer">{day}</label>
                </div>
              ))}
            </div>
          </div>

          <Button
            data-testid="submit-tutor-registration"
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white hover:from-blue-700 hover:to-green-700 transition-all duration-300 py-6 text-lg"
          >
            {loading ? 'Submitting for Approval...' : 'Submit Registration'}
          </Button>
          
          <p className="text-center text-sm text-gray-600">
            Your registration will be reviewed by a coordinator before approval
          </p>
        </form>
      </div>
    </div>
  );
}
