// client/src/components/attendance/QuickAttendanceWidget.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { LogIn, LogOut, Clock, CheckCircle2, History } from 'lucide-react';
import api from '../../api/client';
import { Button } from '../ui/Button';
import { useNotifications } from '../../contexts/NotificationContext';

export function QuickAttendanceWidget({ onAttendanceChange, variant = 'compact' }) {
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const fetchTodayAttendance = useCallback(async () => {
    try {
      const res = await api.get('/attendance/today');
      if (res.success) {
        setTodayData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch today attendance:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayAttendance();
  }, [fetchTodayAttendance]);

  const handleCheckIn = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await api.post('/attendance/check-in', {});
      if (res.success) {
        showSuccess(res.message);
        await fetchTodayAttendance();
        onAttendanceChange?.();
      }
    } catch (err) {
      showError(err.message || 'Check-in failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await api.post('/attendance/check-out', {});
      if (res.success) {
        showSuccess(res.message);
        await fetchTodayAttendance();
        onAttendanceChange?.();
      }
    } catch (err) {
      showError(err.message || 'Check-out failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const isCheckedIn = !!todayData?.isCheckedIn;
  const hasRecord = !!todayData?.hasRecord;
  const sessions = todayData?.sessions || [];
  const totalWorked = todayData?.totalWorkedHours || 0;
  const latestOut = todayData?.latestCheckOut;
  const currentIn = todayData?.currentSession?.in;

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 rounded-xl border border-slate-200 text-xs text-slate-400">
        <Clock className="w-3.5 h-3.5 animate-spin text-emerald-600" />
        <span>Syncing attendance...</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${variant === 'banner' ? 'bg-white/95 p-2 rounded-2xl border border-sky-200/90 shadow-xs' : 'bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs'}`}>
      {/* Real-time Status Badge */}
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium">
        {isCheckedIn ? (
          <span className="flex items-center gap-1.5 text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Working (In: {currentIn})</span>
          </span>
        ) : hasRecord ? (
          <span className="flex items-center gap-1.5 text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Out: {latestOut || '--:--'} &bull; {totalWorked}h today</span>
          </span>
        ) : (
          <span className="text-slate-500 text-[11px] font-medium">
            Not checked in today
          </span>
        )}

        {/* Multiple Sessions Indicator */}
        {sessions.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSessionsModal(!showSessionsModal)}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline flex items-center gap-1 cursor-pointer transition-colors"
            title="Click to view all check-in/out intervals today"
          >
            <History className="w-3 h-3" />
            <span>{sessions.length} session{sessions.length > 1 ? 's' : ''}</span>
          </button>
        )}
      </div>

      {/* Buttons: Check In / Check Out */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="primary"
          size="sm"
          icon={LogIn}
          onClick={handleCheckIn}
          disabled={isCheckedIn || actionLoading}
          className={`${isCheckedIn ? 'opacity-40 cursor-not-allowed bg-slate-200 text-slate-500 hover:bg-slate-200' : ''}`}
        >
          {sessions.length > 0 && !isCheckedIn ? 'Check In Again' : 'Check In'}
        </Button>

        <Button
          variant={isCheckedIn ? 'secondary' : 'ghost'}
          size="sm"
          icon={LogOut}
          onClick={handleCheckOut}
          disabled={!isCheckedIn || actionLoading}
          className={`${!isCheckedIn ? 'opacity-40 cursor-not-allowed text-slate-400 hover:bg-transparent' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'}`}
        >
          Check Out
        </Button>
      </div>

      {/* Sessions Breakdown Popover/Dropdown */}
      {showSessionsModal && sessions.length > 0 && (
        <div className="absolute z-50 mt-28 right-4 bg-white border border-slate-200 rounded-xl shadow-lg p-3 w-64 text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span className="font-bold text-slate-900">Today's Punch Sessions</span>
            <button
              onClick={() => setShowSessionsModal(false)}
              className="text-slate-400 hover:text-slate-600 font-bold text-sm"
            >
              &times;
            </button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {sessions.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between py-1 px-1.5 rounded bg-slate-50 text-[11px] font-mono">
                <span className="text-slate-600 font-medium">#{idx + 1}</span>
                <span className="text-emerald-700 font-semibold">{s.in}</span>
                <span className="text-slate-400">&rarr;</span>
                <span className={s.out ? 'text-slate-800 font-semibold' : 'text-emerald-600 font-bold animate-pulse'}>
                  {s.out || 'Active'}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-1.5 flex justify-between font-bold text-slate-900">
            <span>Total Worked:</span>
            <span className="text-emerald-700">{totalWorked} Hours</span>
          </div>
        </div>
      )}
    </div>
  );
}
