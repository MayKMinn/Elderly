import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Calendar,
  RefreshCw,
  Eye,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  Trash2,
  X,
} from "lucide-react";
import { getProfiles } from "../api/profiles";
import { createSchedule, deleteSchedule, getSchedules, updateSchedule } from "../api/schedules";
import type { ScheduleAssignment } from "../api/schedules";

type SelectOption = { id: string; name: string; avatar: string };

const FALLBACK_NURSES = [
  { id: "NUR-001", name: "Sarah Johnson", avatar: "https://i.pravatar.cc/32?img=49" },
  { id: "NUR-002", name: "Mary Wilson", avatar: "https://i.pravatar.cc/32?img=47" },
  { id: "NUR-003", name: "John Taylor", avatar: "https://i.pravatar.cc/32?img=52" },
  { id: "NUR-004", name: "Linda Davis", avatar: "https://i.pravatar.cc/32?img=43" },
  { id: "NUR-005", name: "Emily Clark", avatar: "https://i.pravatar.cc/32?img=46" },
];

const FALLBACK_ELDERS = [
  { id: "ELD-008", name: "Robert Brown", avatar: "https://i.pravatar.cc/32?img=12" },
  { id: "ELD-005", name: "Patricia Smith", avatar: "https://i.pravatar.cc/32?img=45" },
  { id: "ELD-006", name: "James Miller", avatar: "https://i.pravatar.cc/32?img=13" },
  { id: "ELD-007", name: "Michael Lee", avatar: "https://i.pravatar.cc/32?img=15" },
  { id: "ELD-001", name: "Elizabeth Johnson", avatar: "https://i.pravatar.cc/32?img=44" },
];

const PURPOSES = ["Vitals Check", "Medication Check", "Emergency Follow-up", "Routine Visit"];

const upcomingSchedules = [
  { caregiver: "Sarah Johnson", careId: "NUR-001", elderName: "Robert Brown", elderId: "ELD-008", date: "May 24, 2025", day: "Sat", time: "09:00 AM", purpose: "Vital Check", status: "Scheduled", recurring: "—" },
  { caregiver: "Mary Wilson", careId: "NUR-002", elderName: "Patricia Smith", elderId: "ELD-005", date: "May 24, 2025", day: "Sat", time: "11:00 AM", purpose: "Medication Check", status: "Scheduled", recurring: "Weekly" },
  { caregiver: "John Taylor", careId: "NUR-003", elderName: "James Miller", elderId: "ELD-006", date: "May 24, 2025", day: "Sat", time: "01:00 PM", purpose: "Vital Check", status: "Completed", recurring: "Weekly" },
  { caregiver: "Linda Davis", careId: "NUR-004", elderName: "Michael Lee", elderId: "ELD-007", date: "May 24, 2025", day: "Sat", time: "02:00 PM", purpose: "Emergency Follow-up", status: "Missed", recurring: "—" },
  { caregiver: "Emily Clark", careId: "NUR-005", elderName: "Elizabeth Johnson", elderId: "ELD-001", date: "May 24, 2025", day: "Sat", time: "10:00 AM", purpose: "Routine Visit", status: "Cancelled", recurring: "—" },
];

const calendarEvents: Record<string, { name: string; time: string; purpose: string; color: string }[]> = {
  Sun: [],
  Mon: [
    { name: "Robert Brown", time: "9:00 AM", purpose: "Vital Check", color: "#dbeafe" },
  ],
  Tue: [
    { name: "Patricia Smith", time: "8:00 AM", purpose: "Routine Visit", color: "#f3e8ff" },
    { name: "Mary Wilson", time: "10:00 AM", purpose: "Medication Check", color: "#d1fae5" },
    { name: "James Miller", time: "1:00 PM", purpose: "Vital Check", color: "#fef9c3" },
  ],
  Wed: [
    { name: "Linda Davis", time: "9:00 AM", purpose: "Vital Check", color: "#dbeafe" },
    { name: "Michael Lee", time: "11:00 AM", purpose: "Medication Check", color: "#d1fae5" },
  ],
  Thu: [
    { name: "Elizabeth Johnson", time: "10:00 AM", purpose: "Routine Visit", color: "#f3e8ff" },
  ],
  Fri: [
    { name: "John Taylor", time: "8:00 AM", purpose: "Emergency Follow-up", color: "#fee2e2" },
  ],
  Sat: [
    { name: "Sarah Johnson", time: "2:00 PM", purpose: "Medication Check", color: "#d1fae5" },
    { name: "Emily Clark", time: "10:00 AM", purpose: "Routine Visit", color: "#fef9c3" },
  ],
};

const timeSlots = Array.from({ length: 15 }, (_, index) => index + 8);

const statusColors: Record<string, { bg: string; color: string }> = {
  Scheduled: { bg: "#dbeafe", color: "#2563eb" },
  Completed: { bg: "#dcfce7", color: "#16a34a" },
  Missed: { bg: "#fee2e2", color: "#dc2626" },
  Cancelled: { bg: "#f3f4f6", color: "#6b7280" },
  scheduled: { bg: "#dbeafe", color: "#2563eb" },
  completed: { bg: "#dcfce7", color: "#16a34a" },
  missed: { bg: "#fee2e2", color: "#dc2626" },
  cancelled: { bg: "#f3f4f6", color: "#6b7280" },
};

const scheduleStatusOptions = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "missed", label: "Missed" },
  { value: "cancelled", label: "Cancelled" },
];

function statusLabel(value: string) {
  return scheduleStatusOptions.find((status) => status.value === value)?.label || value;
}

function todayInputValue() {
  return toDateKey(new Date());
}

function normalizeDateInput(value: string) {
  return value.replace(/[\/\u2010-\u2015\u2212]/g, "-");
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getWeekStart(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function addDays(value: Date, count: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + count);
  return date;
}

function weeklyRecurringDates(startDate: string, count: number) {
  const firstDate = dateFromKey(startDate);
  if (!firstDate) return [startDate];

  return Array.from({ length: count }, (_, index) => toDateKey(addDays(firstDate, index * 7)));
}

function newRecurringGroupId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `recurring-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatHour(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

function formatWeekRange(days: Date[]) {
  const first = days[0];
  const last = days[6];
  const firstLabel = first.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const lastLabel = last.toLocaleDateString(undefined, {
    month: first.getMonth() === last.getMonth() ? undefined : "short",
    day: "numeric",
    year: first.getFullYear() === last.getFullYear() ? undefined : "numeric",
  });
  return `${firstLabel} - ${lastLabel}, ${last.getFullYear()}`;
}

function scheduleColor(purpose: string) {
  if (purpose === "Medication Check") return "#d1fae5";
  if (purpose === "Emergency Follow-up") return "#fee2e2";
  if (purpose === "Routine Visit") return "#f3e8ff";
  return "#dbeafe";
}

function toDisplayDate(value: string) {
  if (!value) return "-";
  const date = dateFromKey(value);
  if (!date) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function toDayLabel(value: string) {
  if (!value) return "";
  const date = dateFromKey(value);
  if (!date) return "";
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

export function Schedules() {
  const scheduleFormRef = useRef<HTMLDivElement | null>(null);
  const [nurses, setNurses] = useState<SelectOption[]>([]);
  const [elders, setElders] = useState<SelectOption[]>([]);
  const [schedules, setSchedules] = useState<ScheduleAssignment[]>([]);
  const [nurse, setNurse] = useState("");
  const [elder, setElder] = useState("");
  const [purpose, setPurpose] = useState("Vitals Check");
  const [visitDate, setVisitDate] = useState(todayInputValue());
  const [visitTime, setVisitTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(4);
  const [view, setView] = useState<"Week" | "Day">("Week");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleAssignment | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [showAllSchedules, setShowAllSchedules] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleAssignment | null>(null);
  const [pendingDeleteSchedule, setPendingDeleteSchedule] = useState<ScheduleAssignment | null>(null);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [updatingScheduleId, setUpdatingScheduleId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const selectedDay = useMemo(() => dateFromKey(selectedDateKey) || new Date(), [selectedDateKey]);
  const calendarDays = view === "Day" ? [selectedDay] : weekDays;
  const todayKey = toDateKey(new Date());
  const filteredSchedules = useMemo(() => {
    const query = scheduleSearch.trim().toLowerCase();

    return schedules.filter((schedule) => {
      const matchesSearch = query
        ? [
            schedule.nurseName,
            schedule.nurseId,
            schedule.elderlyName,
            schedule.elderlyId,
          ].some((value) => String(value || "").toLowerCase().includes(query))
        : true;

      return matchesSearch;
    });
  }, [scheduleSearch, schedules]);
  const overviewSchedules = useMemo(() => {
    const weekKeys = new Set(weekDays.map(toDateKey));
    return filteredSchedules.filter((schedule) => (
      view === "Day" ? schedule.visitDate === selectedDateKey : weekKeys.has(schedule.visitDate)
    ));
  }, [filteredSchedules, selectedDateKey, view, weekDays]);
  const tableSchedules = showAllSchedules ? filteredSchedules : overviewSchedules;
  const summaryStats = useMemo(() => {
    const weekKeys = new Set(weekDays.map(toDateKey));
    const todayVisits = schedules.filter((schedule) => schedule.visitDate === todayKey).length;
    const upcomingVisits = schedules.filter((schedule) => (
      weekKeys.has(schedule.visitDate) && schedule.scheduleStatus !== "cancelled"
    )).length;
    const missedVisits = schedules.filter((schedule) => schedule.scheduleStatus === "missed").length;

    return [
      {
        label: "Today's Visits",
        value: todayVisits,
        sub: `${todayVisits} scheduled today`,
        icon: <CalendarDays size={20} />,
        iconBg: "#eff6ff",
        iconColor: "#818cf8",
        subColor: "#22c55e",
      },
      {
        label: "Upcoming Visits",
        value: upcomingVisits,
        sub: `${upcomingVisits} this week`,
        icon: <Calendar size={20} />,
        iconBg: "#ecfdf5",
        iconColor: "#22c55e",
        subColor: "#22c55e",
      },
      {
        label: "Missed Visits",
        value: missedVisits,
        sub: `${missedVisits} total missed`,
        icon: <AlertCircle size={20} />,
        iconBg: "#fff7ed",
        iconColor: "#f97316",
        subColor: "#ef4444",
      },
      {
        label: "Active Nurses",
        value: nurses.length,
        sub: `${nurses.length} available`,
        icon: <Users size={20} />,
        iconBg: "#eff6ff",
        iconColor: "#2563eb",
        subColor: "#22c55e",
      },
    ];
  }, [nurses.length, schedules, todayKey, weekDays]);

  async function loadScheduleData() {
    setLoading(true);
    setError("");

    try {
      const [profileResponse, scheduleResponse] = await Promise.all([getProfiles(), getSchedules()]);
      const nextNurses = profileResponse.nurses.map((profile) => ({
        id: String(profile.id),
        name: profile.name,
        avatar: profile.avatar,
      }));
      const nextElders = profileResponse.elderly.map((profile) => ({
        id: String(profile.id),
        name: profile.name,
        avatar: profile.avatar,
      }));

      setNurses(nextNurses);
      setNurse((current) => nextNurses.some((item) => item.id === current) ? current : nextNurses[0]?.id || "");

      setElders(nextElders);
      setElder((current) => nextElders.some((item) => item.id === current) ? current : nextElders[0]?.id || "");

      setSchedules(scheduleResponse.schedules);
    } catch (loadError) {
      console.error("Failed to load schedule data.", loadError);
      setError("Could not load schedules from MySQL.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadScheduleData();
  }, []);

  function resetForm() {
    setNurse(nurses[0]?.id || "");
    setElder(elders[0]?.id || "");
    setPurpose("Vitals Check");
    setVisitDate(todayInputValue());
    setVisitTime("09:00");
    setNotes("");
    setRecurring(false);
    setRepeatWeeks(4);
    setEditingSchedule(null);
    setMessage("");
    setError("");
  }

  function closeForm() {
    resetForm();
    setShowCreateForm(false);
  }

  function selectOverviewDate(date: Date) {
    const dateKey = toDateKey(date);
    setShowAllSchedules(false);
    setSelectedDateKey(dateKey);
    setWeekStart(getWeekStart(date));
  }

  function handleScheduleSearch(value: string) {
    setScheduleSearch(value);
    const query = value.trim().toLowerCase();

    if (!query) return;
    setShowAllSchedules(false);

    const matchingSchedules = schedules
      .filter((schedule) => {
        return [
          schedule.nurseName,
          schedule.nurseId,
          schedule.elderlyName,
          schedule.elderlyId,
        ].some((value) => String(value || "").toLowerCase().includes(query));
      })
      .sort((a, b) => a.visitDate.localeCompare(b.visitDate) || a.visitTime.localeCompare(b.visitTime));

    const nextSchedule =
      matchingSchedules.find((schedule) => schedule.visitDate >= todayKey) ||
      matchingSchedules[0];

    if (nextSchedule) {
      const scheduleDate = dateFromKey(nextSchedule.visitDate) || new Date();
      setSelectedDateKey(nextSchedule.visitDate);
      setWeekStart(getWeekStart(scheduleDate));
      setView("Week");
    }
  }

  function startEditSchedule(row: ScheduleAssignment) {
    const recurringSeries = row.recurringGroupId
      ? schedules.filter((schedule) => schedule.recurringGroupId === row.recurringGroupId)
      : [];
    setNurse(row.nurseId);
    setElder(row.elderlyId);
    setPurpose(row.purpose);
    setVisitDate(row.visitDate);
    setVisitTime(row.visitTime);
    setNotes("");
    setRecurring(Boolean(row.recurringGroupId));
    setRepeatWeeks(row.recurringGroupId ? Math.max(recurringSeries.length, Number(row.recurringSequence) || 1) : 4);
    setEditingSchedule(row);
    setShowCreateForm(true);
    setActionMenuId(null);
    setMessage("");
    setError("");

    window.setTimeout(() => {
      scheduleFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  async function handleSaveSchedule() {
    setSaving(true);
    setMessage("");
    setError("");
    const selectedNurse = nurses.find((item) => item.id === nurse);
    const selectedElder = elders.find((item) => item.id === elder);

    try {
      const payload = {
        nurseId: nurse,
        nurseName: selectedNurse?.name,
        elderlyId: elder,
        elderlyName: selectedElder?.name,
        elderlyAvatar: selectedElder?.avatar,
        visitTime,
        visitDate,
        purpose,
        scheduleStatus: "scheduled",
        recurringGroupId: editingSchedule?.recurringGroupId || null,
        recurringSequence: editingSchedule?.recurringSequence || null,
      };

      const addingRecurringFromEdit = Boolean(editingSchedule) && !editingSchedule?.recurringGroupId && recurring;
      const resizingRecurringEdit = Boolean(editingSchedule?.recurringGroupId) && recurring;
      const repeatCount = recurring && (!editingSchedule || addingRecurringFromEdit || resizingRecurringEdit)
        ? Math.min(12, Math.max(1, Number(repeatWeeks) || 1))
        : 1;
      const visitDates = weeklyRecurringDates(visitDate, repeatCount);

      const savedSchedules: ScheduleAssignment[] = [];

      if (editingSchedule) {
        const stopRecurring = Boolean(editingSchedule.recurringGroupId) && !recurring;
        const currentSeries = editingSchedule.recurringGroupId
          ? schedules
              .filter((schedule) => schedule.recurringGroupId === editingSchedule.recurringGroupId)
              .sort((a, b) => (a.recurringSequence || 0) - (b.recurringSequence || 0))
          : [];
        const newGroupId = addingRecurringFromEdit && visitDates.length > 1 ? newRecurringGroupId() : null;
        const updateResult = await updateSchedule(editingSchedule.id, payload, {
          group: Boolean(editingSchedule.recurringGroupId) && recurring,
          stopRecurring,
        });

        if (newGroupId) {
          const firstUpdate = await updateSchedule(editingSchedule.id, {
            ...payload,
            recurringGroupId: newGroupId,
            recurringSequence: 1,
          });
          savedSchedules.push(...("schedules" in firstUpdate ? firstUpdate.schedules : [firstUpdate]));

          for (const nextVisitDate of visitDates.slice(1)) {
            savedSchedules.push(await createSchedule({
              ...payload,
              visitDate: nextVisitDate,
              recurringGroupId: newGroupId,
              recurringSequence: savedSchedules.length + 1,
            }));
          }
        } else if (resizingRecurringEdit && editingSchedule.recurringGroupId) {
          savedSchedules.push(...("schedules" in updateResult ? updateResult.schedules : [updateResult]));

          const existingCount = currentSeries.length;
          const desiredCount = visitDates.length;

          if (desiredCount > existingCount) {
            for (const [index, nextVisitDate] of visitDates.slice(existingCount).entries()) {
              savedSchedules.push(await createSchedule({
                ...payload,
                visitDate: nextVisitDate,
                recurringGroupId: editingSchedule.recurringGroupId,
                recurringSequence: existingCount + index + 1,
              }));
            }
          } else if (desiredCount < existingCount) {
            const schedulesToRemove = currentSeries.slice(desiredCount);

            for (const scheduleToRemove of schedulesToRemove) {
              await deleteSchedule(scheduleToRemove.id);
            }
          }
        } else {
          savedSchedules.push(...("schedules" in updateResult ? updateResult.schedules : [updateResult]));
        }
      } else {
        const recurringGroupId = recurring && visitDates.length > 1 ? newRecurringGroupId() : null;
        for (const nextVisitDate of visitDates) {
          savedSchedules.push(await createSchedule({
            ...payload,
            visitDate: nextVisitDate,
            recurringGroupId,
            recurringSequence: recurringGroupId ? savedSchedules.length + 1 : null,
          }));
        }
      }

      const saved = savedSchedules[0];

      setSchedules((current) => editingSchedule
        ? [
            ...current
              .filter((schedule) => {
                if (editingSchedule.recurringGroupId && !recurring) {
                  return schedule.recurringGroupId !== editingSchedule.recurringGroupId || schedule.id === editingSchedule.id;
                }

                if (resizingRecurringEdit && editingSchedule.recurringGroupId) {
                  return (
                    schedule.recurringGroupId !== editingSchedule.recurringGroupId ||
                    savedSchedules.some((item) => item.id === schedule.id)
                  );
                }

                return true;
              })
              .map((schedule) => savedSchedules.find((item) => item.id === schedule.id) || schedule),
            ...savedSchedules.filter((item) => !current.some((schedule) => schedule.id === item.id)),
          ]
        : [...savedSchedules, ...current]
      );
      setMessage(
        editingSchedule
          ? editingSchedule.recurringGroupId && !recurring
            ? "Recurring schedule stopped. This visit was kept."
            : addingRecurringFromEdit && savedSchedules.length > 1
              ? `${savedSchedules.length} weekly schedules saved to MySQL.`
            : resizingRecurringEdit
              ? `Recurring period updated to ${repeatCount} week${repeatCount === 1 ? "" : "s"}.`
            : "Schedule updated in MySQL."
          : savedSchedules.length > 1
            ? `${savedSchedules.length} weekly schedules saved to MySQL.`
            : "Schedule saved to MySQL."
      );
      if (editingSchedule) {
        setEditingSchedule(saved);
      }
    } catch (saveError) {
      console.error("Failed to save schedule.", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteSchedule(row: ScheduleAssignment) {
    setUpdatingScheduleId(row.id);
    setError("");
    setMessage("");

    try {
      await deleteSchedule(row.id, { group: Boolean(row.recurringGroupId) });
      setSchedules((current) => current.filter((schedule) => (
        row.recurringGroupId ? schedule.recurringGroupId !== row.recurringGroupId : schedule.id !== row.id
      )));
      setSelectedSchedule((current) => current?.id === row.id ? null : current);
      setPendingDeleteSchedule(null);
      setActionMenuId(null);
      setMessage(row.recurringGroupId ? "Recurring schedules deleted." : "Schedule deleted.");
    } catch (deleteError) {
      console.error("Failed to delete schedule.", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete schedule.");
    } finally {
      setUpdatingScheduleId(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "#f0f4f8" }}>
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "#6b7a99" }}>
          <span>Dashboard</span><span>/</span>
          <span>Schedules</span><span>/</span>
          <span style={{ color: "#1a2b42", fontWeight: 500 }}>Set Up Schedules</span>
        </div>
        <button
          onClick={() => {
            setVisitDate(selectedDateKey);
            setShowCreateForm(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white"
          style={{ backgroundColor: "#2563eb" }}
        >
          <Plus size={14} /> Create Schedule
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {summaryStats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: s.iconBg, color: s.iconColor }}>
              {s.icon}
            </div>
            <div className="text-2xl mb-0.5" style={{ color: "#1a2b42", fontWeight: 700 }}>{s.value}</div>
            <div className="text-xs mb-0.5" style={{ color: "#1a2b42" }}>{s.label}</div>
            <div className="text-xs" style={{ color: s.subColor }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        {/* Create Schedule Form */}
        {showCreateForm && (
        <div ref={scheduleFormRef} className="w-80 flex-shrink-0 bg-white rounded-xl border p-4" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>
              {editingSchedule ? "Edit Schedule" : "Create Schedule"}
            </h3>
            <button
              onClick={closeForm}
              className="w-7 h-7 rounded-lg text-sm transition-colors hover:bg-gray-100"
              style={{ color: "#6b7a99" }}
              aria-label="Close schedule form"
            >
              x
            </button>
          </div>

          <div className="space-y-3">
            <FormGroup label="Select Caregiver / Nurse">
              <AvatarSelect
                value={nurse}
                options={nurses}
                onChange={setNurse}
              />
            </FormGroup>

            <FormGroup label="Select Elderly">
              <AvatarSelect
                value={elder}
                options={elders}
                onChange={setElder}
              />
            </FormGroup>

            <div className="grid grid-cols-1 gap-3">
              <FormGroup label="Visit Date">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="YYYY-MM-DD"
                    value={visitDate}
                    onChange={(e) => setVisitDate(normalizeDateInput(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none"
                    style={{ borderColor: "rgba(0,0,0,0.12)", color: "#1a2b42" }}
                  />
              </FormGroup>
              <FormGroup label="Visit Time">
                <input
                  type="time"
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none"
                  style={{ borderColor: "rgba(0,0,0,0.12)", color: "#1a2b42" }}
                />
              </FormGroup>
            </div>

            <FormGroup label="Purpose">
              <div className="flex items-center gap-1.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "rgba(0,0,0,0.12)" }}>
                <span className="text-xs" style={{ color: "#22c55e" }}>♥</span>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="flex-1 text-xs outline-none bg-transparent"
                  style={{ color: "#1a2b42" }}
                >
                  {PURPOSES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </FormGroup>

            <FormGroup label="Notes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add visit notes or special instructions..."
                rows={3}
                className="w-full px-2 py-1.5 border rounded-lg text-xs outline-none resize-none"
                style={{ borderColor: "rgba(0,0,0,0.12)", color: "#1a2b42" }}
              />
              <div className="text-right text-xs" style={{ color: "#6b7a99" }}>{notes.length}/500</div>
            </FormGroup>

            <FormGroup label="Recurring Schedule">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRecurring(!recurring)}
                  className="relative w-9 h-5 rounded-full transition-colors"
                  style={{ backgroundColor: recurring ? "#2563eb" : "#d1d5db" }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                    style={{ left: recurring ? "18px" : "2px" }}
                  />
                </button>
                <span className="text-xs" style={{ color: "#6b7a99" }}>Set this visit to repeat</span>
              </div>
              {editingSchedule?.recurringGroupId && (
                <div className="mt-1 text-xs" style={{ color: "#6b7a99" }}>
                  Turn this off and save to keep only this visit.
                </div>
              )}
              {recurring && (
                <div className="mt-2">
                  <label className="text-xs block mb-1" style={{ color: "#6b7a99" }}>Repeat Weeks</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={repeatWeeks}
                    onChange={(event) => setRepeatWeeks(Math.min(12, Math.max(1, Number(event.target.value) || 1)))}
                    className="w-full px-2 py-1.5 border rounded-lg text-xs outline-none"
                    style={{ borderColor: "rgba(0,0,0,0.12)", color: "#1a2b42" }}
                  />
                </div>
              )}
            </FormGroup>

          </div>

          {(message || error) && (
            <div className="mt-3 text-xs" style={{ color: error ? "#dc2626" : "#16a34a" }}>
              {error || message}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={closeForm}
              className="flex-1 py-2 rounded-lg border text-xs transition-colors hover:bg-gray-50"
              style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSchedule}
              disabled={saving || !nurse || !elder}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-white"
              style={{ backgroundColor: "#2563eb", opacity: saving || !nurse || !elder ? 0.7 : 1 }}
            >
              <Calendar size={12} /> {saving ? "Saving..." : editingSchedule ? "Update Schedule" : "Save Schedule"}
            </button>
          </div>
        </div>
        )}

        {/* Right: Calendar + Table */}
        <div className="flex-1 space-y-4">
          {/* Weekly Calendar */}
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <h3 className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Weekly Schedule Overview</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setShowAllSchedules(false);
                      if (view === "Day") {
                        const nextDay = addDays(selectedDay, -1);
                        setSelectedDateKey(toDateKey(nextDay));
                        setWeekStart(getWeekStart(nextDay));
                        return;
                      }
                      setWeekStart((current) => addDays(current, -7));
                    }}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100"
                  >
                    <ChevronLeft size={13} style={{ color: "#6b7a99" }} />
                  </button>
                  <button
                    onClick={() => {
                      setShowAllSchedules(false);
                      const today = new Date();
                      setSelectedDateKey(toDateKey(today));
                      setWeekStart(getWeekStart(today));
                    }}
                    className="px-2 py-0.5 rounded text-xs border"
                    style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      setShowAllSchedules(false);
                      if (view === "Day") {
                        const nextDay = addDays(selectedDay, 1);
                        setSelectedDateKey(toDateKey(nextDay));
                        setWeekStart(getWeekStart(nextDay));
                        return;
                      }
                      setWeekStart((current) => addDays(current, 7));
                    }}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100"
                  >
                    <ChevronRight size={13} style={{ color: "#6b7a99" }} />
                  </button>
                </div>
                <span className="text-xs" style={{ display: "none" }}>
                  May 18 – May 24, 2025
                </span>
                <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 500 }}>
                  {view === "Day" ? toDisplayDate(selectedDateKey) : formatWeekRange(weekDays)}
                </span>
                <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
                  {(["Week", "Day"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className="px-3 py-1 text-xs transition-colors"
                      style={{
                        backgroundColor: view === v ? "#2563eb" : "transparent",
                        color: view === v ? "#fff" : "#6b7a99",
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <div className="flex-1 min-w-[180px]">
                <input
                  list="schedule-person-search"
                  value={scheduleSearch}
                  onChange={(event) => handleScheduleSearch(event.target.value)}
                  placeholder="Search nurse or elderly..."
                  className="w-full px-3 py-1.5 border rounded-lg text-xs outline-none"
                  style={{ borderColor: "rgba(0,0,0,0.12)", color: "#1a2b42" }}
                />
                <datalist id="schedule-person-search">
                  {nurses.map((item) => (
                    <option key={`nurse-${item.id}`} value={item.name} />
                  ))}
                  {elders.map((item) => (
                    <option key={`elder-${item.id}`} value={item.name} />
                  ))}
                </datalist>
              </div>
              <button
                onClick={() => {
                  setScheduleSearch("");
                }}
                className="px-3 py-1.5 rounded-lg border text-xs"
                style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}
              >
                Clear Search
              </button>
              <button
                onClick={() => {
                  setShowAllSchedules(false);
                  const today = new Date();
                  setSelectedDateKey(toDateKey(today));
                  setWeekStart(getWeekStart(today));
                  setView("Day");
                }}
                className="px-3 py-1.5 rounded-lg border text-xs"
                style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}
              >
                Today
              </button>
              <button
                onClick={() => {
                  setShowAllSchedules(false);
                  setView("Week");
                }}
                className="px-3 py-1.5 rounded-lg border text-xs"
                style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}
              >
                Whole Week
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `48px repeat(${calendarDays.length}, 1fr)`,
                  minWidth: view === "Day" ? "260px" : "600px",
                }}
              >
                {/* Header row */}
                <div className="border-b border-r py-2" style={{ borderColor: "rgba(0,0,0,0.06)" }} />
                {calendarDays.map((date) => {
                  const dateKey = toDateKey(date);
                  return (
                    <button
                      key={dateKey}
                      onClick={() => selectOverviewDate(date)}
                      className="border-b border-r py-2 text-center cursor-pointer hover:bg-blue-50"
                      style={{ borderColor: "rgba(0,0,0,0.06)" }}
                    >
                      <div className="text-xs" style={{ color: "#6b7a99" }}>
                        {date.toLocaleDateString(undefined, { weekday: "short" })}
                      </div>
                      <div
                        className="text-sm mx-auto w-7 h-7 flex items-center justify-center rounded-full mt-0.5"
                        style={{
                          backgroundColor: dateKey === todayKey ? "#2563eb" : dateKey === selectedDateKey ? "#dbeafe" : "transparent",
                          color: dateKey === todayKey ? "#fff" : "#1a2b42",
                          fontWeight: 600,
                        }}
                      >
                        {date.getDate()}
                      </div>
                    </button>
                  );
                })}

                {/* Time slots */}
                {timeSlots.map((hour) => (
                  <div key={hour} className="contents">
                    <div
                      className="border-b border-r px-1 py-2 text-right"
                      style={{ borderColor: "rgba(0,0,0,0.05)" }}
                    >
                      <span className="text-xs" style={{ color: "#9ca3af" }}>{formatHour(hour)}</span>
                    </div>
                    {calendarDays.map((date) => {
                      const dateKey = toDateKey(date);
                      const matches = filteredSchedules.filter((schedule) => {
                        const scheduleHour = Number(String(schedule.visitTime || "").slice(0, 2));
                        return schedule.visitDate === dateKey && scheduleHour === hour;
                      });

                      return (
                        <div
                          key={`${dateKey}-${hour}`}
                          onClick={() => selectOverviewDate(date)}
                          className="border-b border-r p-1 min-h-[48px] space-y-1 cursor-pointer hover:bg-blue-50"
                          style={{ borderColor: "rgba(0,0,0,0.05)" }}
                        >
                          {matches.map((match) => (
                            <div
                              key={match.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedSchedule(match);
                              }}
                              className="rounded-md px-1.5 py-1 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ backgroundColor: scheduleColor(match.purpose) }}
                              title="View schedule details"
                            >
                              <div className="truncate" style={{ color: "#1a2b42", fontWeight: 600, fontSize: "10px" }}>
                                {match.elderlyName}
                              </div>
                              <div style={{ color: "#6b7a99", fontSize: "10px" }}>{match.visitTime}</div>
                              <div style={{ color: "#6b7a99", fontSize: "10px" }}>{match.purpose}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Schedules Table */}
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <h3 className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Upcoming Schedules</h3>
              <button
                onClick={() => {
                  setScheduleSearch("");
                  setShowAllSchedules((current) => !current);
                  if (showAllSchedules) setView("Week");
                }}
                className="text-xs"
                style={{ color: "#2563eb" }}
              >
                {showAllSchedules ? "View week" : "View all"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc" }}>
                    {["Caregiver", "Elderly", "Date", "Time", "Purpose", "Status", "Recurring", "Action"].map((c) => (
                      <th key={c} className="px-3 py-2.5 text-left text-xs" style={{ color: "#6b7a99", fontWeight: 600 }}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-xs" style={{ color: "#6b7a99" }}>
                        Loading schedules...
                      </td>
                    </tr>
                  ) : tableSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-xs" style={{ color: "#6b7a99" }}>
                        No schedules found for this filter.
                      </td>
                    </tr>
                  ) : tableSchedules.map((row) => (
                    <tr key={row.id} className="border-t" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <img src={row.nurseAvatar} className="w-6 h-6 rounded-full" alt="" />
                          <div>
                            <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 500 }}>{row.nurseName}</div>
                            <div className="text-xs" style={{ color: "#6b7a99" }}>{row.nurseId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <img src={row.elderlyAvatar} className="w-6 h-6 rounded-full" alt="" />
                          <div>
                            <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 500 }}>{row.elderlyName}</div>
                            <div className="text-xs" style={{ color: "#6b7a99" }}>{row.elderlyId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs" style={{ color: "#1a2b42" }}>{toDisplayDate(row.visitDate)}</div>
                        <div className="text-xs" style={{ color: "#6b7a99" }}>{toDayLabel(row.visitDate)}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.visitTime}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 text-xs">
                          <span style={{ color: "#22c55e" }}>♥</span>
                          <span style={{ color: "#1a2b42" }}>{row.purpose}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: statusColors[row.scheduleStatus]?.bg,
                            color: statusColors[row.scheduleStatus]?.color,
                          }}
                        >
                          {statusLabel(row.scheduleStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: "#6b7a99" }}>
                        {row.recurringGroupId ? "Weekly" : "-"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="relative flex items-center gap-1">
                          <button
                            onClick={() => setSelectedSchedule(row)}
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{ backgroundColor: "#eff6ff" }}
                            title="View schedule details"
                            aria-label="View schedule details"
                          >
                            <Eye size={12} style={{ color: "#2563eb" }} />
                          </button>
                          <button
                            onClick={() => setActionMenuId((current) => current === row.id ? null : row.id)}
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{ backgroundColor: "#f8fafc" }}
                            title="Schedule actions"
                            aria-label="Schedule actions"
                          >
                            <MoreVertical size={12} style={{ color: "#6b7a99" }} />
                          </button>
                          {actionMenuId === row.id && (
                            <div
                              className="absolute right-0 top-7 z-20 w-32 rounded-lg border bg-white py-1 shadow-lg"
                              style={{ borderColor: "rgba(0,0,0,0.08)" }}
                            >
                              <button
                                onClick={() => startEditSchedule(row)}
                                disabled={updatingScheduleId === row.id}
                                className="block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 disabled:opacity-50"
                                style={{ color: "#1a2b42" }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setPendingDeleteSchedule(row);
                                  setActionMenuId(null);
                                }}
                                disabled={updatingScheduleId === row.id}
                                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs hover:bg-red-50 disabled:opacity-50"
                                style={{ color: "#dc2626" }}
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t text-xs" style={{ borderColor: "rgba(0,0,0,0.06)", color: "#6b7a99" }}>
              <CheckCircle2 size={12} className="inline mr-1.5" style={{ color: "#22c55e" }} />
              All data is secure and HIPAA compliant
            </div>
          </div>
        </div>
      </div>
      {selectedSchedule && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <div>
                <h3 className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Schedule Details</h3>
                <p className="text-xs" style={{ color: "#6b7a99" }}>{toDisplayDate(selectedSchedule.visitDate)} at {selectedSchedule.visitTime}</p>
              </div>
              <button
                onClick={() => setSelectedSchedule(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100"
                aria-label="Close schedule details"
              >
                <X size={15} style={{ color: "#6b7a99" }} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <DetailCard label="Caregiver" value={selectedSchedule.nurseName} sub={selectedSchedule.nurseId} avatar={selectedSchedule.nurseAvatar} />
                <DetailCard label="Elderly" value={selectedSchedule.elderlyName} sub={selectedSchedule.elderlyId} avatar={selectedSchedule.elderlyAvatar} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <DetailText label="Date" value={`${toDisplayDate(selectedSchedule.visitDate)} (${toDayLabel(selectedSchedule.visitDate)})`} />
                <DetailText label="Time" value={selectedSchedule.visitTime} />
                <DetailText label="Purpose" value={selectedSchedule.purpose} />
                <DetailText label="Status" value={statusLabel(selectedSchedule.scheduleStatus)} />
                <DetailText label="Recurring" value={selectedSchedule.recurringGroupId ? "Weekly" : "-"} />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-5 py-3" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <button
                onClick={() => {
                  startEditSchedule(selectedSchedule);
                  setSelectedSchedule(null);
                }}
                className="rounded-lg px-3 py-1.5 text-xs text-white"
                style={{ backgroundColor: "#2563eb" }}
              >
                Edit
              </button>
              <button
                onClick={() => {
                  setPendingDeleteSchedule(selectedSchedule);
                  setSelectedSchedule(null);
                }}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-red-50"
                style={{ borderColor: "rgba(220,38,38,0.22)", color: "#dc2626" }}
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingDeleteSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <div>
                <h3 className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Delete Schedule</h3>
                <p className="text-xs" style={{ color: "#6b7a99" }}>This action cannot be undone.</p>
              </div>
              <button
                onClick={() => setPendingDeleteSchedule(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100"
                aria-label="Close delete confirmation"
              >
                <X size={15} style={{ color: "#6b7a99" }} />
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="rounded-lg border p-3" style={{ borderColor: "rgba(220,38,38,0.18)", backgroundColor: "#fef2f2" }}>
                <div className="mb-2 flex items-center gap-2">
                  <AlertCircle size={16} style={{ color: "#dc2626" }} />
                  <span className="text-xs" style={{ color: "#991b1b", fontWeight: 700 }}>Confirm delete</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#7f1d1d" }}>
                  Delete {pendingDeleteSchedule.elderlyName}'s visit with {pendingDeleteSchedule.nurseName} on{" "}
                  {toDisplayDate(pendingDeleteSchedule.visitDate)} at {pendingDeleteSchedule.visitTime}?
                </p>
                {pendingDeleteSchedule.recurringGroupId && (
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: "#991b1b" }}>
                    This will delete every weekly visit in this recurring series.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-5 py-3" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <button
                onClick={() => setPendingDeleteSchedule(null)}
                disabled={updatingScheduleId === pendingDeleteSchedule.id}
                className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDeleteSchedule(pendingDeleteSchedule)}
                disabled={updatingScheduleId === pendingDeleteSchedule.id}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white disabled:opacity-60"
                style={{ backgroundColor: "#dc2626" }}
              >
                <Trash2 size={12} /> {updatingScheduleId === pendingDeleteSchedule.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailCard({ label, value, sub, avatar }: { label: string; value: string; sub: string; avatar: string }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
      <div className="mb-2 text-xs" style={{ color: "#6b7a99" }}>{label}</div>
      <div className="flex items-center gap-2">
        <img src={avatar} className="h-8 w-8 rounded-full" alt="" />
        <div className="min-w-0">
          <div className="truncate text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>{value}</div>
          <div className="truncate text-xs" style={{ color: "#6b7a99" }}>{sub}</div>
        </div>
      </div>
    </div>
  );
}

function DetailText({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-xs" style={{ color: "#6b7a99" }}>{label}</div>
      <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs block mb-1" style={{ color: "#6b7a99" }}>{label}</label>
      {children}
    </div>
  );
}

function AvatarSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
}) {
  const selected = options.find((o) => o.id === value) || options[0];
  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 px-2 py-1.5 border rounded-lg cursor-pointer"
        style={{ borderColor: "rgba(0,0,0,0.12)" }}
      >
        {selected && <img src={selected.avatar} className="w-5 h-5 rounded-full" alt="" />}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-xs outline-none bg-transparent"
          style={{ color: "#1a2b42" }}
        >
          {options.length === 0 && <option value="">No records found</option>}
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
