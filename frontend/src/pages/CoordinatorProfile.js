import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { BookOpen, LogOut, ArrowLeft, Save, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CoordinatorProfile({ user, logout }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('available');
  const [unavailableFrom, setUnavailableFrom] = useState('');
  const [unavailableTo, setUnavailableTo] = useState('');
  
  const [daysUntilNextEdit, setDaysUntilNextEdit] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setProfile(res.data);
      setPhoneNumber(res.data.phone_number || '');
      setLocation(res.data.location || '');
      setAlternatePhone(res.data.alternate_phone || '');
      setAvailabilityStatus(res.data.availability_status || 'available');
      setUnavailableFrom(res.data.unavailable_from || '');
      setUnavailableTo(res.data.unavailable_to || '');
      
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
      // Validate dates if unavailable
      if (availabilityStatus === 'unavailable') {
        if (!unavailableFrom || !unavailableTo) {
          toast.error('Please select both From Date and To Date for unavailability');
          return;
        }
        if (new Date(unavailableFrom) > new Date(unavailableTo)) {
          toast.error('From Date must be before To Date');
          return;
        }
      }

      await axios.put(
        `${API}/users/me/profile`,
        {
          phone_number: phoneNumber,
          location: location,
          alternate_phone: alternatePhone,
          availability_status: availabilityStatus,
          unavailable_from: availabilityStatus === 'unavailable' ? unavailableFrom : null,
          unavailable_to: availabilityStatus === 'unavailable' ? unavailableTo : null
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
            <p className="text-sm text-gray-600">Name and email cannot be changed</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">{user.name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">{user.email}</div>
            </div>
          </div>
        </div>

        {/* Editable Contact Details */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Contact Details & Availability</h2>

          {/* Phone Number */}
          <div>
            <Label htmlFor="phone" className="text-gray-900">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={!canEdit}
              placeholder="Enter your phone number"
              className={!canEdit ? 'bg-gray-100' : ''}
            />
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location" className="text-gray-900">Location</Label>
            <Input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={!canEdit}
              placeholder="Enter your location (city, state)"
              className={!canEdit ? 'bg-gray-100' : ''}
            />
          </div>

          {/* Alternate Phone */}
          <div>
            <Label htmlFor="altPhone" className="text-gray-900">Alternate Phone Number</Label>
            <Input
              id="altPhone"
              type="tel"
              value={alternatePhone}
              onChange={(e) => setAlternatePhone(e.target.value)}
              disabled={!canEdit}
              placeholder="Enter alternate phone number (optional)"
              className={!canEdit ? 'bg-gray-100' : ''}
            />
          </div>

          {/* Availability Status */}
          <div>
            <Label htmlFor="availability" className="text-gray-900">Availability Status</Label>
            <select
              id="availability"
              value={availabilityStatus}
              onChange={(e) => setAvailabilityStatus(e.target.value)}
              disabled={!canEdit}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${!canEdit ? 'bg-gray-100' : ''}`}
            >
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          {/* Unavailable Date Range - Only show when unavailable is selected */}
          {availabilityStatus === 'unavailable' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unavailableFrom" className="text-gray-900">From Date</Label>
                <Input
                  id="unavailableFrom"
                  type="date"
                  value={unavailableFrom}
                  onChange={(e) => setUnavailableFrom(e.target.value)}
                  disabled={!canEdit}
                  className={!canEdit ? 'bg-gray-100' : ''}
                />
              </div>
              <div>
                <Label htmlFor="unavailableTo" className="text-gray-900">To Date</Label>
                <Input
                  id="unavailableTo"
                  type="date"
                  value={unavailableTo}
                  onChange={(e) => setUnavailableTo(e.target.value)}
                  disabled={!canEdit}
                  className={!canEdit ? 'bg-gray-100' : ''}
                />
              </div>
            </div>
          )}

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
