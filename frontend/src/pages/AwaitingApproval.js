import { Button } from '../components/ui/button';
import { Clock, LogOut, Mail } from 'lucide-react';

export default function AwaitingApproval({ user, logout, role = 'coordinator' }) {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <div
      data-testid="awaiting-approval-page"
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 px-4"
    >
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-10 text-center">
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
          <Clock className="h-10 w-10 text-yellow-600" />
        </div>

        <h1
          className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          Awaiting Admin Approval
        </h1>

        <p className="text-gray-700 mb-6 leading-relaxed">
          Hi <span className="font-semibold">{user?.name || roleLabel}</span> — your
          {' '}{roleLabel.toLowerCase()} registration was submitted successfully.
          An RSN admin will review your details and activate your account shortly.
          You will be able to access the {roleLabel} dashboard once approved.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-left text-sm text-blue-900 mb-6">
          <div className="flex gap-2 items-start">
            <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Watch your inbox at <span className="font-semibold">{user?.email}</span> —
              we'll email you once your account is approved. You can close this tab and come
              back anytime.
            </p>
          </div>
        </div>

        <Button
          data-testid="awaiting-approval-logout-btn"
          onClick={logout}
          variant="outline"
          className="w-full"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
