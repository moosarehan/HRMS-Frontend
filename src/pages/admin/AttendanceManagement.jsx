import { useState, useEffect, useMemo } from 'react'
import {
  getAllEmployees,
  getAllShifts,
  createShift,
  updateShift,
  deleteShift,
  assignEmployeeShift,
  getEmployeeWorkingDays,
  updateEmployeeWorkingDays
} from '../../api/hrmsApi'

// Material Symbols icon component
const Icon = ({ name, filled = false, className = '' }) => (
  <span 
    className={`material-symbols-outlined ${className}`}
    style={{ fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0" }}
  >
    {name}
  </span>
);

// Shift Card Component
const ShiftCard = ({ shift, onAdd, onEdit, onDelete }) => {
  const shiftConfigs = {
    1: { icon: 'light_mode', color: 'bg-yellow-100', textColor: 'text-yellow-700', dotColor: 'bg-yellow-500' },
    2: { icon: 'dark_mode', color: 'bg-purple-100', textColor: 'text-purple-700', dotColor: 'bg-purple-500' },
    3: { icon: 'laptop', color: 'bg-blue-100', textColor: 'text-blue-700', dotColor: 'bg-blue-500' }
  };

  const config = shiftConfigs[shift.id] || { icon: 'schedule', color: 'bg-gray-100', textColor: 'text-gray-700', dotColor: 'bg-gray-500' };
  const hasTime = shift.startTime && shift.endTime;
  const startTime = shift.startTime ? `${shift.startTime.substring(0, 5)}` : '';
  const endTime = shift.endTime ? `${shift.endTime.substring(0, 5)}` : '';
  const assignedCount = shift.assignedCount || 0;
  const shiftName = (shift.name || shift.Name || '').toLowerCase().trim();
  const isFixedShift = [1, 2, 3].includes(shift.id || shift.Id) ||
    shiftName.includes('morning') || shiftName.includes('night') || shiftName.includes('remote');

  return (
    <div className={`${config.color} rounded-xl p-6 space-y-3 relative group`}>
      <div className="flex justify-between items-start">
        <Icon name={config.icon} className={`${config.textColor} text-3xl`} />
        <div className="flex gap-1">
          {!hasTime && (
            <button
              onClick={() => onAdd(shift)}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              title="Add Shift Times"
            >
              <Icon name="add" className={`${config.textColor} text-lg`} />
            </button>
          )}
          {hasTime && (
            <button
              onClick={() => onEdit(shift)}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              title="Edit Shift Times"
            >
              <Icon name="edit" className={`${config.textColor} text-lg`} />
            </button>
          )}
          {!isFixedShift && (
            <button
              onClick={() => onDelete(shift)}
              className="p-2 hover:bg-red-200/60 rounded-lg transition-colors text-red-600"
              title="Delete Custom Shift"
            >
              <Icon name="delete" className="text-lg" />
            </button>
          )}
        </div>
      </div>
      
      <div>
        <h3 className={`${config.textColor} font-bold text-lg`}>{shift.name}</h3>
        {hasTime && (
          <div className={`${config.textColor} text-sm flex items-center gap-1 mt-1`}>
            <Icon name="schedule" className="text-sm" />
            <span>{startTime} - {endTime}</span>
          </div>
        )}
      </div>

    </div>
  );
};

// Edit Shift Modal
const EditShiftModal = ({ isOpen, onClose, shift, onSave }) => {
  const [formData, setFormData] = useState({
    startTime: shift?.startTime?.substring(0, 5) || '',
    endTime: shift?.endTime?.substring(0, 5) || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (shift) {
      setFormData({
        startTime: shift.startTime?.substring(0, 5) || '',
        endTime: shift.endTime?.substring(0, 5) || ''
      });
      setError('');
    }
  }, [shift]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.startTime || !formData.endTime) {
      setError('Please set both start and end times');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Pass existing limit so backend doesn't change it
      await onSave(shift.id, { ...formData, limit: shift.limit || 100 });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save shift');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Set {shift?.name} Times</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <Icon name="error" className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">Shift Name</label>
            <input type="text" disabled value={shift?.name || ''} className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">Start Time *</label>
              <input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">End Time *</label>
              <input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <Icon name="info" className="text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-800">Overnight shifts (e.g. 8 PM – 2 AM) are fully supported. Times update immediately.</p>
          </div>
        </form>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">{loading ? 'Saving...' : 'Save Times'}</button>
        </div>
      </div>
    </div>
  );
};

// Create Shift Modal
const CreateShiftModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Please enter a shift name');
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      setError('Please set both start and end times');
      return;
    }

    if (formData.startTime === formData.endTime) {
      setError('Start time and end time cannot be equal');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Default limit to 100 since we no longer show it in UI
      await onSave({ ...formData, limit: 100 });
      setFormData({ name: '', startTime: '', endTime: '' });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create shift');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Create New Shift</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <Icon name="error" className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">Shift Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Evening Shift, Night Shift"
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">Start Time *</label>
              <input 
                type="time" 
                value={formData.startTime} 
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">End Time *</label>
              <input 
                type="time" 
                value={formData.endTime} 
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <Icon name="info" className="text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-800">Overnight shifts (e.g. 8 PM – 2 AM) are fully supported.</p>
          </div>
        </form>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">{loading ? 'Creating...' : 'Create Shift'}</button>
        </div>
      </div>
    </div>
  );
};

// Assign Shift Modal
const AssignShiftModal = ({ isOpen, onClose, employee, shifts, onAssign }) => {
  const [selectedShift, setSelectedShift] = useState(employee?.shiftId || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setSelectedShift(employee.shiftId || '');
    }
  }, [employee]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAssign(employee.id, selectedShift ? parseInt(selectedShift) : null);
      onClose();
    } catch (err) {
      console.error('Error assigning shift:', err);
      alert('Failed to assign shift: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900">Assign Shift</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <Icon name="close" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 font-bold text-lg">{employee.fullName?.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="font-bold text-gray-900">{employee.fullName}</p>
              <p className="text-sm text-gray-600">{employee.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">Select Shift</label>
            <div className="grid grid-cols-1 gap-2">
              <label className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="radio" name="shift" value="" checked={!selectedShift} onChange={(e) => setSelectedShift(e.target.value)} className="w-4 h-4" />
                <span className="ml-3 text-gray-900 font-medium">No Shift</span>
              </label>
              {shifts.map((shift) => (
                <label key={shift.id} className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="radio" name="shift" value={shift.id} checked={String(selectedShift) === String(shift.id)} onChange={(e) => setSelectedShift(e.target.value)} className="w-4 h-4" />
                  <div className="ml-3">
                    <p className="text-gray-900 font-medium">{shift.name}</p>
                    {shift.startTime && shift.endTime && <p className="text-xs text-gray-600">{shift.startTime.substring(0, 5)} - {shift.endTime.substring(0, 5)}</p>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-2xl flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">{loading ? 'Assigning...' : 'Assign Shift'}</button>
        </div>
      </div>
    </div>
  );
};

// Edit Working Days Modal
const EditWorkingDaysModal = ({ isOpen, onClose, employee, onSave }) => {
  const [workingDays, setWorkingDays] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (employee && isOpen) {
      loadWorkingDays();
    }
  }, [employee, isOpen]);

  const loadWorkingDays = async () => {
    try {
      const res = await getEmployeeWorkingDays(employee.id);
      const scheduleResponse = res.data.data;
      const wd = scheduleResponse?.pendingSchedule || scheduleResponse?.currentSchedule || scheduleResponse?.PendingSchedule || scheduleResponse?.CurrentSchedule;
      if (wd) {
        setWorkingDays({
          monday: wd.monday ?? wd.Monday ?? true,
          tuesday: wd.tuesday ?? wd.Tuesday ?? true,
          wednesday: wd.wednesday ?? wd.Wednesday ?? true,
          thursday: wd.thursday ?? wd.Thursday ?? true,
          friday: wd.friday ?? wd.Friday ?? true,
          saturday: wd.saturday ?? wd.Saturday ?? false,
          sunday: wd.sunday ?? wd.Sunday ?? false
        });
      }
    } catch (err) {
      console.error('Error loading working days:', err);
      setWorkingDays({
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      });
    }
  };

  const handleToggle = (day) => {
    setWorkingDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const handleSelectAll = () => {
    setWorkingDays({
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true
    });
  };

  const handleClearAll = () => {
    setWorkingDays({
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSave(employee.id, workingDays);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save working days');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !employee) return null;

  const days = [
    { key: 'monday', label: 'Monday', subtitle: 'Working Day' },
    { key: 'tuesday', label: 'Tuesday', subtitle: 'Working Day' },
    { key: 'wednesday', label: 'Wednesday', subtitle: 'Working Day' },
    { key: 'thursday', label: 'Thursday', subtitle: 'Working Day' },
    { key: 'friday', label: 'Friday', subtitle: 'Working Day' },
    { key: 'saturday', label: 'Saturday', subtitle: 'Off Day' },
    { key: 'sunday', label: 'Sunday', subtitle: 'Off Day' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Working Days Schedule</h2>
          <p className="text-sm text-gray-600 mt-1">Define the standard working week. These settings will apply to selected employees or branch defaults.</p>
          
          <div className="flex gap-3 mt-4">
            <span className="text-xs font-semibold text-gray-500">Bulk Actions:</span>
            <button 
              type="button" 
              onClick={handleSelectAll} 
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Select All
            </button>
            <button 
              type="button" 
              onClick={handleClearAll} 
              className="text-xs font-semibold text-gray-600 hover:text-gray-700"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="px-8 py-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 mb-4">
              <Icon name="error" className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {days.map((day) => (
            <div key={day.key} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Icon name="calendar_today" className="text-indigo-500 text-xl flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">{day.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{day.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(day.key)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                  workingDays[day.key] ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    workingDays[day.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 rounded-b-2xl flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function AttendanceManagement() {
  const [activeTab, setActiveTab] = useState('shifts');
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingShift, setEditingShift] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditWorkingDaysOpen, setIsEditWorkingDaysOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeWorkingDays, setEmployeeWorkingDays] = useState({});

  useEffect(() => {
    loadShifts();
    loadEmployees();
  }, []);

  const normalizeWorkingDays = (wd) => ({
    monday: wd.monday ?? wd.Monday ?? true,
    tuesday: wd.tuesday ?? wd.Tuesday ?? true,
    wednesday: wd.wednesday ?? wd.Wednesday ?? true,
    thursday: wd.thursday ?? wd.Thursday ?? true,
    friday: wd.friday ?? wd.Friday ?? true,
    saturday: wd.saturday ?? wd.Saturday ?? false,
    sunday: wd.sunday ?? wd.Sunday ?? false,
    effectiveFromDate: wd.effectiveFromDate ?? wd.EffectiveFromDate ?? null,
    effectiveToDate: wd.effectiveToDate ?? wd.EffectiveToDate ?? null
  });

  const normalizeWorkingDaysResponse = (data) => ({
    current: data?.currentSchedule || data?.CurrentSchedule
      ? normalizeWorkingDays(data.currentSchedule || data.CurrentSchedule)
      : null,
    pending: data?.pendingSchedule || data?.PendingSchedule
      ? normalizeWorkingDays(data.pendingSchedule || data.PendingSchedule)
      : null
  });

  const loadEmployeeWorkingDays = async (employeeId) => {
    try {
      const res = await getEmployeeWorkingDays(employeeId);
      const responseData = res.data.data;
      if (responseData) {
        const normalizedSchedules = normalizeWorkingDaysResponse(responseData);
        setEmployeeWorkingDays(prev => ({
          ...prev,
          [employeeId]: normalizedSchedules
        }));
        return normalizedSchedules;
      }
    } catch (err) {
      console.warn(`Could not load working days for employee ${employeeId}:`, err.message);
      const defaultSchedule = {
        current: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
        pending: null
      };
      setEmployeeWorkingDays(prev => ({
        ...prev,
        [employeeId]: defaultSchedule
      }));
      return defaultSchedule;
    }
    return null;
  };

  const loadShifts = async () => {
    try {
      const res = await getAllShifts();
      const shiftsData = res.data.data || [];
      setShifts(shiftsData);
    } catch (err) {
      console.error('Error loading shifts:', err);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await getAllEmployees();
      const allEmps = res.data.data || [];
      // Admin should not see themselves (or other admins) in employee assignment
      const emps = allEmps.filter(e => e.role !== 'Admin');
      console.log('Filtered employees for assignment:', emps);
      
      const updatedEmps = emps.map(emp => {
        const shiftName = emp.shiftName || (emp.shift?.name) || 'No Shift';
        return {
          ...emp,
          shiftId: emp.shiftId,
          shiftName: shiftName,
          pendingShiftId: emp.pendingShiftId,
          pendingShiftName: emp.pendingShiftName,
          pendingShiftEffectiveFromDate: emp.pendingShiftEffectiveFromDate,
          branchDisplayName: emp.branchName || emp.branch?.name || 'N/A',
          departmentDisplayName: emp.departmentName || emp.department?.name || 'N/A',
          shift: emp.shift || { name: shiftName } // Ensure shift object exists
        };
      });
      
      setEmployees([...updatedEmps]);
      await Promise.all(updatedEmps.map(emp => loadEmployeeWorkingDays(emp.id)));
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  };

  useEffect(() => {
    if (shifts.length > 0 && employees.length > 0) {
      const updatedShifts = shifts.map(shift => ({
        ...shift,
        assignedCount: employees.filter(e => e.shiftId === shift.id).length
      }));
      setShifts(updatedShifts);
    }
  }, [employees]);

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setIsEditModalOpen(true);
  };

  const handleSaveShift = async (shiftId, data) => {
    try {
      const payload = { startTime: data.startTime, endTime: data.endTime, limit: data.limit };
      await updateShift(shiftId, payload);
      await loadShifts();
    } catch (err) {
      console.error('Error saving shift:', err);
      throw err;
    }
  };

  const handleCreateShift = async (data) => {
    try {
      const payload = { 
        name: data.name, 
        startTime: data.startTime, 
        endTime: data.endTime, 
        limit: data.limit 
      };
      await createShift(payload);
      await loadShifts();
    } catch (err) {
      console.error('Error creating shift:', err);
      throw err;
    }
  };

  const handleDeleteShift = async (shift) => {
    if (!window.confirm(`Are you sure you want to delete custom shift "${shift.name}"?`)) {
      return;
    }
    try {
      await deleteShift(shift.id);
      await loadShifts();
      await loadEmployees();
    } catch (err) {
      console.error('Error deleting shift:', err);
      alert(err.response?.data?.message || err.message || 'Failed to delete shift');
    }
  };

  const handleAssignShift = (employee) => {
    setSelectedEmployee(employee);
    setIsAssignModalOpen(true);
  };

  const handleSaveShiftAssignment = async (employeeId, shiftId) => {
    try {
      console.log('=== SHIFT ASSIGNMENT DEBUG START ===');
      console.log('Assigning shift:', { employeeId, shiftId });
      
      // Log employee data before assignment
      const currentEmployee = employees.find(e => e.id === employeeId);
      console.log('Current employee data before assignment:', currentEmployee);
      
      const response = await assignEmployeeShift(employeeId, shiftId);
      const updatedEmployee = response?.data?.data;

      if (updatedEmployee) {
        setEmployees(prev => prev.map(emp =>
          emp.id === employeeId
            ? {
                ...emp,
                ...updatedEmployee,
                shiftId: updatedEmployee.shiftId,
                shiftName: updatedEmployee.shiftName || 'No Shift',
                pendingShiftId: updatedEmployee.pendingShiftId,
                pendingShiftName: updatedEmployee.pendingShiftName,
                pendingShiftEffectiveFromDate: updatedEmployee.pendingShiftEffectiveFromDate,
                branchDisplayName: updatedEmployee.branchName || emp.branchDisplayName || 'N/A',
                departmentDisplayName: updatedEmployee.departmentName || emp.departmentDisplayName || 'N/A'
              }
            : emp
        ));
      } else {
        await loadEmployees();
      }

      setSelectedEmployee(null);
      setIsAssignModalOpen(false);

      // Tell admin if the change was applied now or scheduled for tomorrow
      if (updatedEmployee?.pendingShiftEffectiveFromDate) {
        const effectiveDate = new Date(updatedEmployee.pendingShiftEffectiveFromDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        alert(`Shift change scheduled for ${effectiveDate}.\nThis employee has already clocked in/out today, so the new shift takes effect from tomorrow.`);
      } else {
        alert('Shift assigned successfully!');
      }
      console.log('=== SHIFT ASSIGNMENT DEBUG END ===');
    } catch (err) {
      console.error('Error assigning shift:', err.response?.data || err.message);
      alert('Failed to assign shift: ' + (err.response?.data?.message || err.message));
      throw err;
    }
  };

  const handleEditWorkingDays = (employee) => {
    setSelectedEmployee(employee);
    setIsEditWorkingDaysOpen(true);
  };

  const handleSaveWorkingDays = async (employeeId, workingDaysData) => {
    try {
      console.log('Saving working days:', { employeeId, workingDaysData });
      const response = await updateEmployeeWorkingDays(employeeId, workingDaysData);
      console.log('Working days response:', response);
      await loadEmployeeWorkingDays(employeeId);
      setSelectedEmployee(null);
      setIsEditWorkingDaysOpen(false);
      alert('Working days updated successfully!');
    } catch (err) {
      console.error('Error saving working days:', err.response?.data || err.message);
      alert('Failed to update working days: ' + (err.response?.data?.message || err.message));
      throw err;
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp =>
      emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  const workingDaysLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const workingDaysKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const getDisplayWorkingDays = (empId) => {
    const schedules = employeeWorkingDays[empId];
    return schedules?.pending || schedules?.current || null;
  };

  const getWorkingDayBubble = (empId, dayIndex) => {
    const schedule = getDisplayWorkingDays(empId);
    const dayKey = workingDaysKeys[dayIndex];
    const isWorkingDay = schedule ? (schedule[dayKey] ?? (dayIndex < 5)) : (dayIndex < 5);
    return isWorkingDay;
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shift Management</h1>
          <p className="text-gray-600">Manage shifts, employee assignments, and working days across all branches.</p>
        </div>
      </div>

      <div className="flex gap-8 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('shifts')}
          className={`pb-3 font-semibold transition-colors ${
            activeTab === 'shifts' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Shifts
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`pb-3 font-semibold transition-colors ${
            activeTab === 'assignments' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Employee Assignments
        </button>
      </div>

      {activeTab === 'shifts' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Shift Types</h2>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Icon name="add" className="text-lg" />
              Create Custom Shift
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {shifts.map((shift) => (
              <ShiftCard key={shift.id} shift={shift} onAdd={handleEditShift} onEdit={handleEditShift} onDelete={handleDeleteShift} />
            ))}
          </div>
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <Icon name="info" className="text-lg" />
            Click "Add" to set times for default shifts, or "Create Custom Shift" to add new shift types.
          </p>
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Employee Name or ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Employee</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Branch</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Department</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Current Shift</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Working Days</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 font-bold">{emp.fullName?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{emp.fullName}</p>
                          <p className="text-xs text-gray-600">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{emp.branchDisplayName}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{emp.departmentDisplayName}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">{emp.role}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${emp.shiftId && emp.shiftName && emp.shiftName !== 'No Shift' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                          {emp.shiftId && emp.shiftName && emp.shiftName !== 'No Shift' ? emp.shiftName : 'N/A'}
                        </span>
                        {emp.pendingShiftName && (
                          <div className="text-xs text-blue-700 font-medium">
                            Pending: {emp.pendingShiftName}
                            {emp.pendingShiftEffectiveFromDate ? ` from ${emp.pendingShiftEffectiveFromDate}` : ''}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          {workingDaysLabels.map((day, idx) => {
                            const isWorkingDay = getWorkingDayBubble(emp.id, idx);
                            return (
                              <span
                                key={`${emp.id}-${idx}`}
                                className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                                  isWorkingDay
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {day}
                              </span>
                            );
                          })}
                        </div>
                        {employeeWorkingDays[emp.id]?.pending?.effectiveFromDate && (
                          <div className="text-xs text-blue-700 font-medium">
                            Pending from {employeeWorkingDays[emp.id].pending.effectiveFromDate}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleAssignShift(emp)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Assign Shift"
                      >
                        <Icon name="assignment_ind" />
                      </button>
                      <button
                        onClick={() => handleEditWorkingDays(emp)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit Working Days"
                      >
                        <Icon name="edit_calendar" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-8 text-gray-500">No employees found matching your search.</div>
          )}
        </div>
      )}

      <EditShiftModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} shift={editingShift} onSave={handleSaveShift} />
      <CreateShiftModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSave={handleCreateShift} />
      <AssignShiftModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} employee={selectedEmployee} shifts={shifts} onAssign={handleSaveShiftAssignment} />
      <EditWorkingDaysModal isOpen={isEditWorkingDaysOpen} onClose={() => setIsEditWorkingDaysOpen(false)} employee={selectedEmployee} onSave={handleSaveWorkingDays} />
    </div>
  );
}
