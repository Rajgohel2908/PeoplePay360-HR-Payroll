// client/src/pages/admin/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Lock,
  UserCheck,
  CheckCircle2,
  XCircle,
  Users
} from 'lucide-react';
import api from '../../api/client';
import { formatDate } from '../../utils/dateUtils';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { useNotifications } from '../../contexts/NotificationContext';

export function UserManagement() {
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [employees, setEmployees] = useState([]);

  const { showSuccess, showError } = useNotifications();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: 'password123',
    role: 'employee',
    employee_id: ''
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      showError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    async function loadEmps() {
      const res = await api.get('/employees?limit=100');
      if (res.success) setEmployees(res.data);
    }
    loadEmps();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/users', formData);
      if (res.success) {
        showSuccess(`User ${formData.username} provisioned successfully!`);
        setShowCreateModal(false);
        loadUsers();
      }
    } catch (err) {
      showError(err.message || 'Failed to create user.');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/admin/users/${selectedUser.id}`, {
        role: selectedUser.role,
        is_active: selectedUser.is_active
      });
      if (res.success) {
        showSuccess('User access updated.');
        setShowEditModal(false);
        loadUsers();
      }
    } catch (err) {
      showError(err.message || 'Failed to update user.');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return <Badge variant="purple" dot>Admin</Badge>;
      case 'payroll_manager': return <Badge variant="emerald" dot>Payroll Manager</Badge>;
      case 'payroll_user': return <Badge variant="info" dot>Payroll Specialist</Badge>;
      case 'hr_manager': return <Badge variant="warning" dot>HR Manager</Badge>;
      default: return <Badge variant="neutral" dot>Employee</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            User & Role Provisioning
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage system access accounts, granular role permissions, and link employee profiles
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => setShowCreateModal(true)}
        >
          Provision User Account
        </Button>
      </div>

      {/* Users Table */}
      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Username & Email</th>
                <th className="py-3 px-4">Linked Employee</th>
                <th className="py-3 px-4">System Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.slice((currentPage - 1) * 10, currentPage * 10).map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{u.username}</p>
                    <p className="text-slate-500">{u.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    {u.first_name ? (
                      <span className="font-semibold text-slate-800">
                        {u.first_name} {u.last_name} ({u.emp_code})
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Unlinked Admin</span>
                    )}
                  </td>
                  <td className="py-3 px-4">{getRoleBadge(u.role)}</td>
                  <td className="py-3 px-4">
                    <Badge variant={u.is_active ? 'success' : 'danger'} size="sm" dot>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{formatDate(u.created_at)}</td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        setSelectedUser(u);
                        setShowEditModal(true);
                      }}
                    >
                      Edit Role
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls
          currentPage={currentPage}
          pageSize={10}
          totalItems={users.length}
          onPageChange={setCurrentPage}
          itemLabel="users"
        />
      </Card>

      {/* Provision User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Provision New User Account"
        subtitle="Create credentials and assign system roles"
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Username"
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
          <Input
            label="Corporate Email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Initial Password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <Select
            label="System Role"
            required
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: 'employee', label: 'Employee (Self-Service)' },
              { value: 'hr_manager', label: 'HR Operations Manager' },
              { value: 'payroll_user', label: 'HR Payroll Specialist' },
              { value: 'payroll_manager', label: 'HR Payroll Manager' },
              { value: 'admin', label: 'System Administrator' }
            ]}
          />
          <Select
            label="Link Employee Profile (Optional)"
            value={formData.employee_id}
            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
          >
            <option value="">None / Standalone Account</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>
            ))}
          </Select>

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Provision Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      {selectedUser && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Edit Permissions for ${selectedUser.username}`}
          size="md"
        >
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <Select
              label="Assigned System Role"
              value={selectedUser.role}
              onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
              options={[
                { value: 'employee', label: 'Employee' },
                { value: 'hr_manager', label: 'HR Manager' },
                { value: 'payroll_user', label: 'Payroll Specialist' },
                { value: 'payroll_manager', label: 'Payroll Manager' },
                { value: 'admin', label: 'Admin' }
              ]}
            />
            <Select
              label="Account Status"
              value={selectedUser.is_active ? 'true' : 'false'}
              onChange={(e) => setSelectedUser({ ...selectedUser, is_active: e.target.value === 'true' })}
              options={[
                { value: 'true', label: 'Active Account' },
                { value: 'false', label: 'Disabled / Suspended' }
              ]}
            />

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Update Permissions
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default UserManagement;
