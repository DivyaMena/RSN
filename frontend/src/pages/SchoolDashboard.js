import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { School, LogOut, CheckCircle, Clock, XCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SchoolDashboard({ user, logout }) {
  const [schoolData, setSchoolData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchoolData();
  }, []);

  const fetchSchoolData = async () => {
    try {
      const response = await axios.get(`${API}/admin/schools`, {
        withCredentials: true
      });
      
      // Find school by email
      const school = response.data.find(s => s.email === user.email);
      setSchoolData(school);
    } catch (error) {
      console.error('Error fetching school data:', error);
      toast.error('Failed to load school data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!schoolData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">School data not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <School className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {schoolData.school_name}
              </h1>
              <p className="text-xs text-gray-500">School Dashboard</p>
            </div>
          </div>
          <Button onClick={logout} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Approval Status Banner */}
        <Card className={`mb-6 ${
          schoolData.approval_status === 'approved' ? 'border-green-500 bg-green-50' :
          schoolData.approval_status === 'rejected' ? 'border-red-500 bg-red-50' :
          'border-yellow-500 bg-yellow-50'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {schoolData.approval_status === 'approved' && (
                <>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-900">Registration Approved!</h3>
                    <p className="text-sm text-green-800">Your school has been approved. Our coordinator will contact you soon to assign tutors.</p>
                  </div>
                </>
              )}
              {schoolData.approval_status === 'pending' && (
                <>
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div>
                    <h3 className="font-semibold text-yellow-900">Pending Approval</h3>
                    <p className="text-sm text-yellow-800">Your registration is under review. A coordinator will approve your request shortly.</p>
                  </div>
                </>
              )}
              {schoolData.approval_status === 'rejected' && (
                <>
                  <XCircle className="h-8 w-8 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-900">Registration Rejected</h3>
                    <p className="text-sm text-red-800">Your registration was not approved. Please contact us for more information.</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* School Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>School Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Principal:</span> {schoolData.principal_name}
              </div>
              <div>
                <span className="font-medium">Email:</span> {schoolData.email}
              </div>
              <div>
                <span className="font-medium">Phone:</span> {schoolData.phone}
              </div>
              {schoolData.alternate_phone && (
                <div>
                  <span className="font-medium">Alternate Phone:</span> {schoolData.alternate_phone}
                </div>
              )}
              <div>
                <span className="font-medium">Address:</span> {schoolData.address}, {schoolData.city}, {schoolData.state} - {schoolData.pincode}
              </div>
              <div>
                <span className="font-medium">State Board:</span> {schoolData.state_board}
              </div>
              <div>
                <span className="font-medium">Classes:</span> Class {schoolData.class_from} to Class {schoolData.class_to}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tutor Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Subjects Required:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {schoolData.tutors_required_subjects?.map(subject => (
                    <span key={subject} className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-semibold">
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-medium">Preferred Days:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {schoolData.preferred_days?.map(day => (
                    <span key={day} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                      {day}
                    </span>
                  ))}
                </div>
              </div>
              {schoolData.location_url && (
                <div>
                  <span className="font-medium">Location:</span>
                  <a 
                    href={schoolData.location_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline ml-2"
                  >
                    View on Map
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Next Steps */}
        {schoolData.approval_status === 'pending' && (
          <Card>
            <CardHeader>
              <CardTitle>What Happens Next?</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Our coordinator will review your registration details</li>
                <li>Once approved, we'll match volunteer tutors with your requirements</li>
                <li>Tutors will conduct online classes from their location</li>
                <li>Students can attend from your digital classroom</li>
                <li>You'll receive updates via email and phone</li>
              </ol>
            </CardContent>
          </Card>
        )}

        {schoolData.approval_status === 'approved' && (
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">
                Our coordinator will contact you at <strong>{schoolData.phone}</strong> or <strong>{schoolData.email}</strong> to schedule tutor assignments and discuss the class timetable.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
