// client/src/pages/admin/SystemSettings.jsx
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  Clock, 
  Calculator, 
  ShieldAlert, 
  Mail, 
  Save, 
  CheckCircle2, 
  RefreshCw,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { getSystemSettings, updateSystemSetting } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useNotification } from '../../contexts/NotificationContext';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';

export default function SystemSettings() {
  const { addToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    company_name: 'PeoplePay360 Global Technologies Inc.',
    currency_symbol: '₹',
    currency_code: 'INR',
    timezone: 'Asia/Kolkata (IST, UTC+5:30)',
    standard_working_hours: '8.0',
    standard_working_days: '5',
    variance_threshold_percent: '20',
    payrun_auto_lock_days: '5',
    pf_statutory_limit: '15000',
    pf_employee_rate: '12',
    pf_employer_rate: '12',
    tax_regime_default: 'NEW_REGIME',
    notification_email: 'payroll-alerts@peoplepay360.com'
  });

  const [activeTab, setActiveTab] = useState('general');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await getSystemSettings();
      if (res.data?.success && res.data.settingsMap) {
        setSettings((prev) => ({ ...prev, ...res.data.settingsMap }));
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const keys = Object.keys(settings);
      for (const k of keys) {
        await updateSystemSetting({ key: k, value: String(settings[k]) });
      }
      addToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'System configuration parameters updated and recorded to immutable audit log.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.response?.data?.message || 'Failed to update system settings.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader className="h-10 w-64" />
        <SkeletonLoader className="h-96 w-full" />
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'Company & Regional', icon: <Building2 className="w-4 h-4" /> },
    { id: 'attendance', label: 'Work & Attendance', icon: <Clock className="w-4 h-4" /> },
    { id: 'payroll', label: 'Payroll & Variances', icon: <Calculator className="w-4 h-4" /> },
    { id: 'statutory', label: 'Statutory Compliance', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'email', label: 'Notifications & Dispatch', icon: <Mail className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Configuration</h1>
            <Badge variant="primary" className="text-xs">Enterprise Control</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Global operational rules, calculation constants, statutory thresholds, and automation schedules.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={fetchSettings} icon={<RefreshCw className="w-4 h-4" />}>
            Reset
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleSaveAll} 
            loading={saving} 
            icon={<Save className="w-4 h-4" />}
          >
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Form Content */}
      <Card className="p-6 bg-white shadow-sm border-slate-200">
        <form onSubmit={handleSaveAll} className="space-y-6">
          {/* General & Regional */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Company Profile & Regional Standards
                </h3>
                <p className="text-xs text-slate-500 mt-1">Information displayed on employee payslips, tax certificates, and official reports.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Legal Company Name
                  </label>
                  <Input 
                    value={settings.company_name || ''} 
                    onChange={(e) => handleChange('company_name', e.target.value)} 
                    placeholder="e.g. PeoplePay360 Global Technologies Inc."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Operational Timezone
                  </label>
                  <Select
                    value={settings.timezone || 'Asia/Kolkata (IST, UTC+5:30)'}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                    options={[
                      { value: 'Asia/Kolkata (IST, UTC+5:30)', label: 'Asia/Kolkata (IST, UTC+5:30)' },
                      { value: 'America/New_York (EST, UTC-5:00)', label: 'America/New_York (EST, UTC-5:00)' },
                      { value: 'Europe/London (GMT, UTC+0:00)', label: 'Europe/London (GMT, UTC+0:00)' },
                      { value: 'Asia/Singapore (SGT, UTC+8:00)', label: 'Asia/Singapore (SGT, UTC+8:00)' },
                      { value: 'Asia/Dubai (GST, UTC+4:00)', label: 'Asia/Dubai (GST, UTC+4:00)' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Primary Currency Symbol
                  </label>
                  <Input 
                    value={settings.currency_symbol || '₹'} 
                    onChange={(e) => handleChange('currency_symbol', e.target.value)} 
                    placeholder="e.g. ₹"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Currency ISO Code
                  </label>
                  <Input 
                    value={settings.currency_code || 'INR'} 
                    onChange={(e) => handleChange('currency_code', e.target.value)} 
                    placeholder="INR, USD, EUR, GBP"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Work & Attendance */}
          {activeTab === 'attendance' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Work Schedule & Attendance Baselines
                </h3>
                <p className="text-xs text-slate-500 mt-1">Default shift durations and working days used across contractual calculations.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Standard Daily Shift Hours
                  </label>
                  <Input 
                    type="number"
                    step="0.5"
                    value={settings.standard_working_hours || '8.0'} 
                    onChange={(e) => handleChange('standard_working_hours', e.target.value)} 
                  />
                  <p className="text-xs text-slate-400 mt-1">Used to compute hourly wages and loss of pay prorations.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Standard Working Days / Week
                  </label>
                  <Select
                    value={settings.standard_working_days || '5'}
                    onChange={(e) => handleChange('standard_working_days', e.target.value)}
                    options={[
                      { value: '5', label: '5 Days (Monday – Friday)' },
                      { value: '6', label: '6 Days (Monday – Saturday)' }
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payroll & Variances */}
          {activeTab === 'payroll' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-indigo-600" />
                  Payroll Computation & Anomaly Detection
                </h3>
                <p className="text-xs text-slate-500 mt-1">Thresholds triggering automated variance flags and security freezes.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Variance Alert Threshold (%)
                  </label>
                  <Input 
                    type="number"
                    value={settings.variance_threshold_percent || '20'} 
                    onChange={(e) => handleChange('variance_threshold_percent', e.target.value)} 
                  />
                  <p className="text-xs text-slate-400 mt-1">Flag any employee whose net payout changes by more than this percentage month-over-month.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payrun Auto-Lock Period (Days)
                  </label>
                  <Input 
                    type="number"
                    value={settings.payrun_auto_lock_days || '5'} 
                    onChange={(e) => handleChange('payrun_auto_lock_days', e.target.value)} 
                  />
                  <p className="text-xs text-slate-400 mt-1">Number of days after payment date before payrun changes become permanently read-only.</p>
                </div>
              </div>
            </div>
          )}

          {/* Statutory Compliance */}
          {activeTab === 'statutory' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-indigo-600" />
                  Statutory Deductions & Default Tax Regimes
                </h3>
                <p className="text-xs text-slate-500 mt-1">Statutory ceilings and default taxation parameters.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    PF Statutory Wage Ceiling (₹)
                  </label>
                  <Input 
                    type="number"
                    value={settings.pf_statutory_limit || '15000'} 
                    onChange={(e) => handleChange('pf_statutory_limit', e.target.value)} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Employee PF Rate (%)
                  </label>
                  <Input 
                    type="number"
                    value={settings.pf_employee_rate || '12'} 
                    onChange={(e) => handleChange('pf_employee_rate', e.target.value)} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Employer PF Rate (%)
                  </label>
                  <Input 
                    type="number"
                    value={settings.pf_employer_rate || '12'} 
                    onChange={(e) => handleChange('pf_employer_rate', e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Default Income Tax Regime for New Joiners
                </label>
                <Select
                  value={settings.tax_regime_default || 'NEW_REGIME'}
                  onChange={(e) => handleChange('tax_regime_default', e.target.value)}
                  options={[
                    { value: 'NEW_REGIME', label: 'New Tax Regime (Section 115BAC Default)' },
                    { value: 'OLD_REGIME', label: 'Old Tax Regime (With Deductions/80C/80D)' }
                  ]}
                />
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'email' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-indigo-600" />
                  Notification & Email Dispatch Settings
                </h3>
                <p className="text-xs text-slate-500 mt-1">Sender identity for automated payslip distribution and validation alerts.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sender Email Address
                </label>
                <Input 
                  type="email"
                  value={settings.notification_email || 'payroll-alerts@peoplepay360.com'} 
                  onChange={(e) => handleChange('notification_email', e.target.value)} 
                />
                <p className="text-xs text-slate-400 mt-1">Verified SMTP address for outgoing digital payslips and password resets.</p>
              </div>

              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-900">
                  <p className="font-semibold">Simulated SMTP Relay Active</p>
                  <p className="text-indigo-700 mt-0.5">
                    All payslip emails and validation warnings are recorded to the immutable <code>email_logs</code> table and can be previewed in real-time.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <Button 
              type="submit" 
              variant="primary" 
              loading={saving}
              icon={<Save className="w-4 h-4" />}
            >
              Save System Configuration
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
