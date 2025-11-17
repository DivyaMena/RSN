import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RegisterCoordinator({ setUser }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
  const toggleLanguage = (lang) => {
    setFormData(prev => {
      const exists = prev.languages.includes(lang);
      return {
        ...prev,
        languages: exists
          ? prev.languages.filter(l => l !== lang)
          : [...prev.languages, lang]
      };
    });
  };

    state: '',
    name: '',
    address: '',
    mobile: '',
    altMobile: '',
    pincode: '',
    selfie: null,
    aadhaar: null,
    languages: [],
    accept_terms: false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.state || !formData.name || !formData.address || !formData.mobile || !formData.pincode || !formData.selfie || !formData.aadhaar || !formData.accept_terms) {
      toast.error('Please fill all required fields and accept Terms & Conditions');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/users/register/coordinator`,
        {
          state: formData.state,
          name: formData.name,
          address: formData.address,
          mobile: formData.mobile,
          altMobile: formData.altMobile,
          pincode: formData.pincode,
          languages: formData.languages,
          // For now we send file placeholders/URLs – file upload pipeline can be added later
          selfie_url: formData.selfie?.name || null,
          aadhaar_url: formData.aadhaar?.name || null,
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Register as Coordinator
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Photo *</label>
            <Input
              data-testid="coordinator-photo-input"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files[0])}
            />
            <p className="text-xs text-gray-500 mt-1">Recent photo for profile</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger data-testid="coordinator-state-select" className="w-full">
                <SelectValue placeholder="Select your state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TS">Telangana (TS)</SelectItem>
                <SelectItem value="AP">Andhra Pradesh (AP)</SelectItem>
                <SelectItem value="TN">Tamil Nadu (TN)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            data-testid="submit-coordinator-registration"
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
