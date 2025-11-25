import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const RoleSwitcher = ({ currentRole }) => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [primaryRole, setPrimaryRole] = useState(currentRole);
  const [pendingRoles, setPendingRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/users/my-roles`, {
        withCredentials: true
      });
      setRoles(response.data.current_roles || []);
      setPrimaryRole(response.data.primary_role);
      setPendingRoles(response.data.pending_roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleSwitchRole = async (role) => {
    if (role === primaryRole) return;
    
    setLoading(true);
    try {
      await axios.post(
        `${BACKEND_URL}/api/users/switch-role?role=${role}`,
        {},
        { withCredentials: true }
      );
      
      toast.success(`Switched to ${getRoleLabel(role)} dashboard`);
      
      // Navigate to appropriate dashboard
      const dashboardMap = {
        'admin': '/dashboard',
        'coordinator': '/coordinator',
        'tutor': '/tutor',
        'parent': '/parent',
        'student': '/student',
        'school': '/school'
      };
      
      window.location.href = dashboardMap[role] || '/dashboard';
    } catch (error) {
      toast.error('Failed to switch role');
      console.error('Error switching role:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      'admin': 'Admin',
      'coordinator': 'Coordinator',
      'tutor': 'Tutor',
      'parent': 'Parent',
      'student': 'Student',
      'school': 'School'
    };
    return labels[role] || role;
  };

  const getRoleIcon = (role) => {
    const icons = {
      'admin': '👔',
      'coordinator': '📋',
      'tutor': '👨‍🏫',
      'parent': '👨‍👩‍👧',
      'student': '🎓',
      'school': '🏫'
    };
    return icons[role] || '👤';
  };

  if (roles.length <= 1 && pendingRoles.length === 0) {
    return null; // Don't show switcher if user has only one role
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1" disabled={loading}>
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span className="hidden sm:inline">{getRoleIcon(primaryRole)} {getRoleLabel(primaryRole)}</span>
              <span className="sm:hidden">{getRoleIcon(primaryRole)}</span>
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">Switch Dashboard</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => handleSwitchRole(role)}
            className={`cursor-pointer ${role === primaryRole ? 'bg-blue-50 font-medium' : ''}`}
          >
            <span className="mr-2">{getRoleIcon(role)}</span>
            {getRoleLabel(role)}
            {role === primaryRole && <span className="ml-auto text-xs text-blue-600">✓</span>}
          </DropdownMenuItem>
        ))}
        {pendingRoles.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-gray-500">Pending Approval</DropdownMenuLabel>
            {pendingRoles.map((role) => (
              <DropdownMenuItem key={role} disabled className="opacity-60">
                <span className="mr-2">{getRoleIcon(role)}</span>
                {getRoleLabel(role)}
                <span className="ml-auto text-xs text-yellow-600">⏳</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RoleSwitcher;
