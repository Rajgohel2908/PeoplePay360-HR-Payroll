// client/src/pages/schedules/ScheduleList.jsx
import React, { useState, useEffect } from 'react';
import { Clock, Plus, Check, X } from 'lucide-react';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export function ScheduleList() {
  const [schedules, setSchedules] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { showSuccess, showError } = useNotifications();
  const { hasRole } = useAuth();

  const [name, setName] = useState('General Day Shift (40h)');
  const [scheduleType, setScheduleType] = useState('standard');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [days, setDays] = useState([
    { day_of_week: 'monday', is_working: true, start_time: '09:00', end_time: '18:00', break_duration_mins: 60, expected_hours: 8.0 },
    { day_of_week: 'tuesday', is_working: true, start_time: '09:00', end_time: '18:00', break_duration_mins: 60, expected_hours: 8.0 },
    { day_of_week: 'wednesday', is_working: true, start_time: '09:00', end_time: '18:00', break_duration_mins: 60, expected_hours: 8.0 },
    { day_of_week: 'thursday', is_working: true, start_time: '09:00', end_time: '18:00', break_duration_mins: 60, expected_hours: 8.0 },
    { day_of_week: 'friday', is_working: true, start_time: '09:00', end_time: '18:00', break_duration_mins: 60, expected_hours: 8.0 },
    { day_of_week: 'saturday', is_working: false, start_time: '00:00', end_time: '00:00', break_duration_mins: 0, expected_hours: 0 },
    { day_of_week: 'sunday', is_working: false, start_time: '00:00', end_time: '00:00', break_duration_mins: 0, expected_hours: 0 }
  ]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/schedules');
      if (res.success) {
        setSchedules(res.data);
      }
    } catch (err) {
      showError(err.message || 'Failed to load schedules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleDayChange = (index, field, value) => {
    setDays(prev => {
      const copy = [...prev];
      copy[index][field] = value;
      if (field === 'is_working' && !value) {
        copy[index].expected_hours = 0;
      } else if (field === 'is_working' && value && copy[index].expected_hours === 0) {
        copy[index].expected_hours = 8.0;
      }
      return copy;
    });
  };

  const calculatedWeeklyHours = days.reduce((acc, d) => acc + (d.is_working ? parseFloat(d.expected_hours || 0) : 0), 0);

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/schedules', {
        name,
        schedule_type: scheduleType,
        timezone,
        days
      });
      if (res.success) {
        showSuccess('Working schedule created successfully!');
        setShowCreateModal(false);
        loadSchedules();
      }
    } catch (err) {
      showError(err.message || 'Failed to create schedule.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Working Schedules
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure shift timings, weekly expected working hours, and rest day policies
          </p>
        </div>

        {hasRole(['admin', 'hr_manager']) && (
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setShowCreateModal(true)}
          >
            New Schedule
          </Button>
        )}
      </div>

      {/* Schedules Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {schedules.slice((currentPage - 1) * 10, currentPage * 10).map((s) => (
          <Card key={s.id} title={s.name} subtitle={`Timezone: ${s.timezone}`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-800">
                <span className="font-semibold">Auto-Calculated Weekly Capacity:</span>
                <span className="text-base font-black text-emerald-700">{s.weekly_hours} Hours/Week</span>
              </div>

              {/* 7-Day Matrix */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {s.days?.map((d) => (
                  <div
                    key={d.day_of_week}
                    className={`p-2 rounded-lg border ${
                      d.is_working ? 'bg-white border-slate-200' : 'bg-slate-100 border-dashed border-slate-300 text-slate-400'
                    }`}
                  >
                    <p className="font-bold text-[10px] uppercase truncate">{d.day_of_week.slice(0, 3)}</p>
                    <p className="font-bold mt-1 text-xs">{d.is_working ? `${d.expected_hours}h` : 'Off'}</p>
                    {d.is_working && (
                      <p className="text-[9px] text-slate-400 mt-0.5">{d.start_time}-{d.end_time}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <PaginationControls
        currentPage={currentPage}
        pageSize={10}
        totalItems={schedules.length}
        onPageChange={setCurrentPage}
        itemLabel="schedules"
        className="bg-white rounded-xl border border-slate-200"
      />

      {/* Create Schedule Modal with 7-Day Configurator */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Working Schedule"
        subtitle="Configure daily work shift hours"
        size="lg"
      >
        <form onSubmit={handleCreateSchedule} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Schedule Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Select
              label="Type"
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value)}
              options={[
                { value: 'standard', label: 'Standard' },
                { value: 'flexible', label: 'Flexible' },
                { value: 'shift', label: 'Shift Rotation' }
              ]}
            />
          </div>

          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Weekly Shift Matrix</h4>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Total: {calculatedWeeklyHours} Hours/Week
              </span>
            </div>

            <div className="space-y-2">
              {days.map((d, idx) => (
                <div key={d.day_of_week} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <input
                    type="checkbox"
                    checked={d.is_working}
                    onChange={(e) => handleDayChange(idx, 'is_working', e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="font-bold uppercase w-24 text-slate-800">{d.day_of_week}</span>

                  {d.is_working ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={d.start_time}
                        onChange={(e) => handleDayChange(idx, 'start_time', e.target.value)}
                        className="p-1 rounded border border-slate-300 text-xs bg-white"
                      />
                      <span className="text-slate-400">&rarr;</span>
                      <input
                        type="time"
                        value={d.end_time}
                        onChange={(e) => handleDayChange(idx, 'end_time', e.target.value)}
                        className="p-1 rounded border border-slate-300 text-xs bg-white"
                      />
                      <span className="text-slate-500 ml-auto font-semibold">{d.expected_hours}h</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Non-working Day / Weekend Off</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Working Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ScheduleList;
