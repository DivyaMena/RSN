import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Users, BookOpen, Shield, School } from 'lucide-react';

export default function RoleSelection({ user }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Welcome, {user.name}!
          </h1>
          <p className="text-lg text-gray-600">Choose your role to get started</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button
            data-testid="role-parent-btn"
            onClick={() => navigate('/register/parent')}
            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-500 text-left group"
          >
            <div className="h-16 w-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Parent</h3>
            <p className="text-gray-600">Register your children for free online tuition</p>
          </button>

          <button
            data-testid="role-tutor-btn"
            onClick={() => navigate('/register/tutor')}
            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-green-500 text-left group"
          >
            <div className="h-16 w-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Tutor</h3>
            <p className="text-gray-600">Volunteer to teach and make a difference</p>
          </button>

          <button
            data-testid="role-coordinator-btn"
            onClick={() => navigate('/register/coordinator')}
            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-purple-500 text-left group"
          >
            <div className="h-16 w-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Coordinator</h3>
            <p className="text-gray-600">Manage batches and assist tutors</p>
          </button>

          <button
            data-testid="role-school-btn"
            onClick={() => navigate('/register/school')}
            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-orange-500 text-left group"
          >
            <div className="h-16 w-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <School className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>School</h3>
            <p className="text-gray-600">Request subject tutors for your school for different classes</p>
          </button>
        </div>
      </div>
    </div>
  );
}
