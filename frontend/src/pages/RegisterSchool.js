import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { BookOpen, School, MapPin, Upload } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATE_BOARDS = ['TS', 'AP', 'CBSE', 'ICSE', 'KA', 'TN', 'MH'];
const SUBJECTS = ['MAT', 'SCI', 'ENG', 'HINDI', 'TELUGU', 'Computers', 'Arts'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function RegisterSchool() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    school_name: '',
    principal_name: '',
    email: '',
    password: '',
    phone: '',
    alternate_phone: '',
    address: '',
    city: '',
    state: '',
    state_board: '',
    pincode: '',
    class_from: '',
    class_to: '',
    school_board_pic: '',
    location_url: '',
    tutors_required_subjects: [],
    preferred_days: [],
    time_schedule: {},
    terms_accepted: false
  });

  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    setUploadingFile(true);

    try {
      const formDataToUpload = new FormData();
      formDataToUpload.append('file', file);

      const response = await axios.post(`${API}/upload`, formDataToUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true
      });

      // Set the uploaded file URL
      handleChange('school_board_pic', response.data.url);
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
      console.error('Upload error:', error);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubjectToggle = (subject) => {
    setFormData(prev => ({
      ...prev,
      tutors_required_subjects: prev.tutors_required_subjects.includes(subject)
        ? prev.tutors_required_subjects.filter(s => s !== subject)
        : [...prev.tutors_required_subjects, subject]
    }));
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      preferred_days: prev.preferred_days.includes(day)
        ? prev.preferred_days.filter(d => d !== day)
        : [...prev.preferred_days, day]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.school_name || !formData.principal_name || !formData.email || 
        !formData.password || !formData.phone || !formData.address || 
        !formData.city || !formData.state || !formData.state_board || 
        !formData.pincode || !formData.class_from || !formData.class_to) {
      toast.error('Please fill all required fields');
      return;
    }

    if (formData.tutors_required_subjects.length === 0) {
      toast.error('Please select at least one subject for which you need tutors');
      return;
    }

    if (formData.preferred_days.length === 0) {
      toast.error('Please select at least one preferred day');
      return;
    }

    if (!formData.terms_accepted) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(`${API}/schools/register`, {
        school_name: formData.school_name,
        principal_name: formData.principal_name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        alternate_phone: formData.alternate_phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        state_board: formData.state_board,
        pincode: formData.pincode,
        class_from: parseInt(formData.class_from),
        class_to: parseInt(formData.class_to),
        school_board_pic: formData.school_board_pic,
        location_url: formData.location_url,
        tutors_required_subjects: formData.tutors_required_subjects,
        preferred_days: formData.preferred_days,
        time_schedule: formData.time_schedule,
        terms_accepted: formData.terms_accepted
      });

      toast.success('School registration successful! Waiting for coordinator approval.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <School className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            School Registration
          </h1>
          <p className="text-gray-600">Register your school to request volunteer tutors for online classes</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Basic Information */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    value={formData.school_name}
                    onChange={(e) => handleChange('school_name', e.target.value)}
                    placeholder="Enter school name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Principal Name *</label>
                  <Input
                    value={formData.principal_name}
                    onChange={(e) => handleChange('principal_name', e.target.value)}
                    placeholder="Enter principal name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="school@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Password *</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Create a password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Contact Number *</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Alternate Contact Number</label>
                  <Input
                    value={formData.alternate_phone}
                    onChange={(e) => handleChange('alternate_phone', e.target.value)}
                    placeholder="Alternate phone number"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Address Details</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Address *</label>
                  <Input
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">City *</label>
                    <Input
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">State *</label>
                    <Input
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Pincode *</label>
                    <Input
                      value={formData.pincode}
                      onChange={(e) => handleChange('pincode', e.target.value)}
                      placeholder="Pincode"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Location URL (Google Maps)</label>
                  <div className="flex gap-2">
                    <MapPin className="h-5 w-5 text-gray-400 mt-2" />
                    <Input
                      value={formData.location_url}
                      onChange={(e) => handleChange('location_url', e.target.value)}
                      placeholder="https://maps.google.com/..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Board & Classes */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Board & Classes</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">State Board *</label>
                  <Select value={formData.state_board} onValueChange={(val) => handleChange('state_board', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select board" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATE_BOARDS.map(board => (
                        <SelectItem key={board} value={board}>{board}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Classes From *</label>
                  <Select value={formData.class_from} onValueChange={(val) => handleChange('class_from', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10].map(c => (
                        <SelectItem key={c} value={c.toString()}>Class {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Classes To *</label>
                  <Select value={formData.class_to} onValueChange={(val) => handleChange('class_to', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10].map(c => (
                        <SelectItem key={c} value={c.toString()}>Class {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* School Board Picture */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">School Board Picture</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Upload Image File</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm font-medium">{uploadingFile ? 'Uploading...' : 'Choose File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        className="hidden"
                      />
                    </label>
                    {formData.school_board_pic && (
                      <span className="text-xs text-green-600">✓ Image uploaded</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Select an image file (JPG, PNG, etc.) - Max 5MB</p>
                </div>
                
                {formData.school_board_pic && (
                  <div className="mt-3">
                    <img 
                      src={`${BACKEND_URL}${formData.school_board_pic}`} 
                      alt="School Board" 
                      className="max-w-xs h-32 object-contain rounded-lg border"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Tutor Requirements */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Tutor Requirements *</h2>
              <label className="block text-sm font-medium mb-3">Select subjects for which you need tutors:</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SUBJECTS.map(subject => (
                  <div key={subject} className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50">
                    <Checkbox
                      checked={formData.tutors_required_subjects.includes(subject)}
                      onCheckedChange={() => handleSubjectToggle(subject)}
                    />
                    <label className="text-sm cursor-pointer">{subject}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Preferred Days */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Preferred Days *</h2>
              <label className="block text-sm font-medium mb-3">Select days when you need tutors:</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {DAYS.map(day => (
                  <div key={day} className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50">
                    <Checkbox
                      checked={formData.preferred_days.includes(day)}
                      onCheckedChange={() => handleDayToggle(day)}
                    />
                    <label className="text-sm cursor-pointer">{day}</label>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Note: You can provide detailed time schedules after approval by contacting our coordinator.
              </p>
            </div>

            {/* Terms & Conditions */}
            <div className="border-b pb-6">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <Checkbox
                  checked={formData.terms_accepted}
                  onCheckedChange={(checked) => handleChange('terms_accepted', checked)}
                />
                <label className="text-sm cursor-pointer">
                  I accept the{' '}
                  <a 
                    href="https://risingstarsnation.org/terms" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    terms and conditions
                  </a>
                  {' '}mentioned by Rising Stars Nation *
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                {submitting ? 'Submitting...' : 'Register School'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
