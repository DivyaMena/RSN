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
            <img src="/logo.jpg" alt="Rising Stars Nation" className="h-12 w-12 object-cover rounded-xl" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Rising Stars Nation</span>
          </div>
          <div className="flex items-center space-x-3">
            <Button onClick={() => navigate('/login')} className="bg-gradient-to-r from-blue-600 to-green-600 text-white hover:from-blue-700 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl px-6">
              Login
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6 text-sm font-medium">
              <Heart className="h-4 w-4" />
              <span>India's Platform for Aspiring Students</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-green-600 to-blue-600 bg-clip-text text-transparent leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Free Online Tuition For Students Who Need Extra Support to Succeed
            </h1>
            <p className="text-lg text-gray-600 mb-10 leading-relaxed">
              Helping students who want clearer understanding, personal attention, and a safe space to ask questions — through free online tuition for Classes 6–10 by dedicated volunteer tutors.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button data-testid="get-started-btn" onClick={() => navigate('/login')} size="lg" className="bg-gradient-to-r from-blue-600 to-green-600 text-white hover:from-blue-700 hover:to-green-700 transition-all duration-300 shadow-xl hover:shadow-2xl px-8 py-6 text-lg">
                Get Started
              </Button>
              <Button data-testid="learn-more-btn" variant="outline" size="lg" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-all duration-300 px-8 py-6 text-lg">
                Learn More
              </Button>
            </div>
          </div>
          <div className="relative">
            <img 
              src="/hero.jpg" 
              alt="Rising Stars Nation - Empowering Students" 
              className="rounded-3xl shadow-2xl w-full h-auto object-cover"
            />
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
              Get extra help in Mathematics, Science, Physics, Biology, and English. Small batches of 25 students ensure you get the attention you need from dedicated volunteer tutors.
            </p>
          </div>

          <div data-testid="feature-card-tutors" className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
            <div className="h-16 w-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mb-6">
              <BookOpen className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>For Tutors</h3>
            <p className="text-gray-600 leading-relaxed">
              Volunteer 1-2 hours on your chosen days. Help struggling students from government schools with teacher shortages. Make a real impact by providing the extra support they need.
            </p>
          </div>

          <div data-testid="feature-card-parents" className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
            <div className="h-16 w-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mb-6">
              <Heart className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>For Parents</h3>
            <p className="text-gray-600 leading-relaxed">
              Register your children for free online tuition. Perfect for students needing extra help, struggling with subjects, or shy to ask questions in large classes. Track their progress and support their learning.
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
          <p className="text-gray-400 mb-4">Free online tuition for students who need extra support</p>
          <p className="text-sm text-gray-500">© 2025 Rising Stars Nation. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
