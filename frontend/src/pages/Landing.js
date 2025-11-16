import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { BookOpen, Users, Heart } from 'lucide-react';

const REDIRECT_URL = window.location.origin + '/dashboard';
const AUTH_URL = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(REDIRECT_URL)}`;

export default function Landing() {
  const navigate = useNavigate();

  const handleLogin = () => {
    window.location.href = AUTH_URL;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-green-500 rounded-xl flex items-center justify-center">
              <BookOpen className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Rising Stars Nation</span>
          </div>
          <Button data-testid="header-login-btn" onClick={handleLogin} className="bg-gradient-to-r from-blue-600 to-green-600 text-white hover:from-blue-700 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl px-6">
            Login with Google
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6 text-sm font-medium">
            <Heart className="h-4 w-4" />
            <span>Free Education for Underprivileged Students</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-green-600 to-blue-600 bg-clip-text text-transparent leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Free Online Tuition For Students Who Need Extra Support
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
            Helping students who struggle to understand subjects, can't speak up in crowded classrooms, or attend schools with teacher shortages. Free online tuition for classes 6-10 by volunteer tutors.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button data-testid="get-started-btn" onClick={handleLogin} size="lg" className="bg-gradient-to-r from-blue-600 to-green-600 text-white hover:from-blue-700 hover:to-green-700 transition-all duration-300 shadow-xl hover:shadow-2xl px-8 py-6 text-lg">
              Get Started
            </Button>
            <Button data-testid="learn-more-btn" variant="outline" size="lg" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-all duration-300 px-8 py-6 text-lg">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div data-testid="feature-card-students" className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>For Students</h3>
            <p className="text-gray-600 leading-relaxed">
              Access quality education in Mathematics, Science, Physics, Biology, and English. Learn from dedicated volunteer tutors in small batches of 25 students.
            </p>
          </div>

          <div data-testid="feature-card-tutors" className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
            <div className="h-16 w-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mb-6">
              <BookOpen className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>For Tutors</h3>
            <p className="text-gray-600 leading-relaxed">
              Volunteer 1-2 hours on your chosen days. Make a real difference in students' lives while sharing your knowledge and expertise.
            </p>
          </div>

          <div data-testid="feature-card-parents" className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
            <div className="h-16 w-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mb-6">
              <Heart className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>For Parents</h3>
            <p className="text-gray-600 leading-relaxed">
              Register up to 2 children for free online tuition. Track their progress, view curriculum coverage, and support their educational journey.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gradient-to-r from-blue-600 to-green-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center text-white">
            <div data-testid="stat-students">
              <div className="text-5xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>100+</div>
              <div className="text-xl opacity-90">Students Enrolled</div>
            </div>
            <div data-testid="stat-tutors">
              <div className="text-5xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>50+</div>
              <div className="text-xl opacity-90">Volunteer Tutors</div>
            </div>
            <div data-testid="stat-classes">
              <div className="text-5xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>5</div>
              <div className="text-xl opacity-90">Subjects Offered</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-xl flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Rising Stars Nation</span>
          </div>
          <p className="text-gray-400 mb-4">Empowering underprivileged students through quality education</p>
          <p className="text-sm text-gray-500">© 2025 Rising Stars Nation. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
