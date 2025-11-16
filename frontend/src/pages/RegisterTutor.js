import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CLASSES = [6, 7, 8, 9, 10];
const SUBJECTS = [
  { value: 'MAT', label: 'Mathematics' },
  { value: 'PHY', label: 'Physics' },
  { value: 'SCI', label: 'Science' },
  { value: 'BIO', label: 'Biology' },
  { value: 'ENG', label: 'English' }
];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function RegisterTutor({ setUser }) {
  const navigate = useNavigate();
  const [state, setState] = useState('');
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleItem = (item, list, setList) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!state || classes.length === 0 || subjects.length === 0 || days.length === 0) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/users/register/tutor`,
        {
          state,
          classes_can_teach: classes,
          subjects_can_teach: subjects,
          available_days: days
        },
        { withCredentials: true }
      );
      setUser(response.data);
      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Register as Tutor
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger data-testid="tutor-state-select" className="w-full">
                <SelectValue placeholder="Select your state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TS">Telangana (TS)</SelectItem>
                <SelectItem value="AP">Andhra Pradesh (AP)</SelectItem>
                <SelectItem value="TN">Tamil Nadu (TN)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Classes You Can Teach</label>
            <div className="grid grid-cols-5 gap-3">
              {CLASSES.map(cls => (
                <div key={cls} className="flex items-center space-x-2">
                  <Checkbox
                    data-testid={`class-${cls}-checkbox`}
                    id={`class-${cls}`}
                    checked={classes.includes(cls)}
                    onCheckedChange={() => toggleItem(cls, classes, setClasses)}
                  />
                  <label htmlFor={`class-${cls}`} className="text-sm cursor-pointer">Class {cls}</label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Subjects You Can Teach</label>
            <div className="space-y-2">
              {SUBJECTS.map(subject => (
                <div key={subject.value} className="flex items-center space-x-2">
                  <Checkbox
                    data-testid={`subject-${subject.value}-checkbox`}
                    id={`subject-${subject.value}`}
                    checked={subjects.includes(subject.value)}
                    onCheckedChange={() => toggleItem(subject.value, subjects, setSubjects)}
                  />
                  <label htmlFor={`subject-${subject.value}`} className="text-sm cursor-pointer">{subject.label}</label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Available Days</label>
            <div className="grid grid-cols-2 gap-2">
              {DAYS.map(day => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    data-testid={`day-${day}-checkbox`}
                    id={`day-${day}`}
                    checked={days.includes(day)}
                    onCheckedChange={() => toggleItem(day, days, setDays)}
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
            className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white hover:from-blue-700 hover:to-green-700 transition-all duration-300"
          >
            {loading ? 'Registering...' : 'Complete Registration'}
          </Button>
        </form>
      </div>
    </div>
  );
}
