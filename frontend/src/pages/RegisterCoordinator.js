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
      setUser(response.data.user || response.data);
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
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Which state do you belong to? *</label>
              <Select
                value={formData.state}
                onValueChange={(val) => setFormData(prev => ({ ...prev, state: val }))}
              >
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter your full address"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile No. *</label>
                <Input
                  value={formData.mobile}
                  onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                  placeholder="Primary mobile number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alternate Mobile No.</label>
                <Input
                  value={formData.altMobile}
                  onChange={(e) => setFormData(prev => ({ ...prev, altMobile: e.target.value }))}
                  placeholder="Alternate mobile number (optional)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
              <Input
                value={formData.pincode}
                onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                placeholder="Enter your pincode"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">KYC – Selfie *</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFormData(prev => ({ ...prev, selfie: e.target.files[0] }))}
              />
              <p className="text-xs text-gray-500 mt-1">Upload a clear selfie for KYC</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">KYC – Aadhaar *</label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFormData(prev => ({ ...prev, aadhaar: e.target.files[0] }))}
              />
              <p className="text-xs text-gray-500 mt-1">Upload Aadhaar card (image or PDF)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Languages Known *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Telugu',
                  'Hindi',
                  'English',
                  'Marathi',
                  'Tamil',
                  'Kannada',
                  'Malayalam',
                  'Odiya',
                ].map(lang => (
                  <label key={lang} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={formData.languages.includes(lang)}
                      onChange={() => toggleLanguage(lang)}
                    />
                    <span>{lang}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={formData.accept_terms}
                onChange={(e) => setFormData(prev => ({ ...prev, accept_terms: e.target.checked }))}
              />
              <span className="text-xs text-gray-600">
                I accept the{' '}
                <a
                  href="https://example.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  terms and conditions
                </a>
              </span>
            </div>
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
