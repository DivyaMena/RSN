import { useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AddRoleButton = ({ currentRole, onRoleAdded }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const availableRoles = [
    {
      id: 'parent',
      name: 'Parent',
      icon: '👨‍👩‍👧',
      description: 'Register your children as students',
      needsApproval: false
    },
    {
      id: 'tutor',
      name: 'Tutor',
      icon: '👨‍🏫',
      description: 'Volunteer to teach students',
      needsApproval: true
    },
    {
      id: 'coordinator',
      name: 'Coordinator',
      icon: '📋',
      description: 'Help manage batches and tutors',
      needsApproval: true
    }
  ];

  const handleRequestRole = async (roleId) => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/users/request-role`,
        { requested_role: roleId },
        { withCredentials: true }
      );
      
      if (response.data.auto_approved) {
        toast.success(response.data.message);
        setOpen(false);
        // Reload to update UI
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.success(response.data.message);
        setOpen(false);
        if (onRoleAdded) onRoleAdded();
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to request role';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Filter out current role
  const filteredRoles = availableRoles.filter(r => r.id !== currentRole);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Role</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Additional Role</DialogTitle>
          <DialogDescription>
            Choose a role you'd like to add to your account
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {filteredRoles.map((role) => (
            <div
              key={role.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => !loading && handleRequestRole(role.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <span className="text-2xl">{role.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{role.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                    {role.needsApproval && (
                      <p className="text-xs text-yellow-600 mt-2">
                        ⚠️ Requires admin approval
                      </p>
                    )}
                  </div>
                </div>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                ) : (
                  <Button size="sm" variant="ghost">
                    Select
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddRoleButton;
