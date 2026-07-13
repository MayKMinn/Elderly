import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Calendar,
  RefreshCw,
  Eye,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { getProfiles } from "../api/profiles";
import { getElderlyMedications } from "../api/medications";
import type { ElderlyMedication } from "../api/medications";
import { createSchedule, deleteSchedule, getSchedules, updateSchedule } from "../api/schedules";
import type { ScheduleAssignment } from "../api/schedules";

type SelectOption = { id: string; name: string; avatar: string };
type NurseElderlyAssignment = { nurseId: string | number; elderlyId: string | number };
type ScheduleSearchSuggestion = SelectOption & { type: "nurse" | "elderly" };

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

const PURPOSES = ["Blood Pressure", "Blood Glucose", "Medication", "Routine Visit"];

const upcomingSchedules = [
  { caregiver: "Sarah Johnson", careId: "NUR-001", elderName: "Robert Brown", elderId: "ELD-008", date: "May 24, 2025", day: "Sat", time: "09:00 AM", purpose: "Blood Pressure", status: "Scheduled", recurring: "—" },
  { caregiver: "Mary Wilson", careId: "NUR-002", elderName: "Patricia Smith", elderId: "ELD-005", date: "May 24, 2025", day: "Sat", time: "11:00 AM", purpose: "Medication", status: "Scheduled", recurring: "Weekly" },
  { caregiver: "John Taylor", careId: "NUR-003", elderName: "James Miller", elderId: "ELD-006", date: "May 24, 2025", day: "Sat", time: "01:00 PM", purpose: "Blood Glucose", status: "Completed", recurring: "Weekly" },
  { caregiver: "Linda Davis", careId: "NUR-004", elderName: "Michael Lee", elderId: "ELD-007", date: "May 24, 2025", day: "Sat", time: "02:00 PM", purpose: "Routine Visit", status: "Missed", recurring: "—" },
  { caregiver: "Emily Clark", careId: "NUR-005", elderName: "Elizabeth Johnson", elderId: "ELD-001", date: "May 24, 2025", day: "Sat", time: "10:00 AM", purpose: "Routine Visit", status: "Cancelled", recurring: "—" },
];

const calendarEvents: Record<string, { name: string; time: string; purpose: string; color: string }[]> = {
  Sun: [],
  Mon: [
    { name: "Robert Brown", time: "9:00 AM", purpose: "Blood Pressure", color: "#dbeafe" },
  ],
  Tue: [
    { name: "Patricia Smith", time: "8:00 AM", purpose: "Routine Visit", color: "#f3e8ff" },
    { name: "Mary Wilson", time: "10:00 AM", purpose: "Medication", color: "#fef9c3" },
    { name: "James Miller", time: "1:00 PM", purpose: "Blood Glucose", color: "#d1fae5" },
  ],
  Wed: [
    { name: "Linda Davis", time: "9:00 AM", purpose: "Blood Pressure", color: "#dbeafe" },
    { name: "Michael Lee", time: "11:00 AM", purpose: "Medication", color: "#fef9c3" },
  ],
  Thu: [
    { name: "Elizabeth Johnson", time: "10:00 AM", purpose: "Routine Visit", color: "#f3e8ff" },
  ],
  Fri: [
    { name: "John Taylor", time: "8:00 AM", purpose: "Routine Visit", color: "#f3e8ff" },
  ],
  Sat: [
    { name: "Sarah Johnson", time: "2:00 PM", purpose: "Medication", color: "#fef9c3" },
    { name: "Emily Clark", time: "10:00 AM", purpose: "Routine Visit", color: "#fef9c3" },
  ],
};

const timeSlots = Array.from({ length: 24 }, (_, index) => index);
const CALENDAR_PREVIEW_LIMIT = 2;
const NURSE_VISIT_MIN_INTERVAL_MINUTES = 10;

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

function recurringDates(startDate: string, count: number, frequency: "daily" | "weekly") {
  const firstDate = dateFromKey(startDate);
  if (!firstDate) return [startDate];

  const intervalDays = frequency === "daily" ? 1 : 7;
  return Array.from({ length: count }, (_, index) => toDateKey(addDays(firstDate, index * intervalDays)));
}

function inferRecurringFrequency(series: ScheduleAssignment[]) {
  const sortedDates = series
    .map((schedule) => dateFromKey(schedule.visitDate))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (sortedDates.length < 2) return "weekly";

  const dayDiff = Math.round((sortedDates[1].getTime() - sortedDates[0].getTime()) / 86400000);
  return dayDiff === 1 ? "daily" : "weekly";
}

function minutesFromTime(value: string) {
  const match = /^(\d{2}):(\d{2})/.exec(String(value || ""));
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function findNurseIntervalConflict(
  schedules: ScheduleAssignment[],
  nurseId: string,
  visitDate: string,
  visitTime: string,
  options: { excludeScheduleId?: number | null; excludeRecurringGroupId?: string | null } = {}
) {
  const targetMinutes = minutesFromTime(visitTime);
  if (targetMinutes === null) return null;

  return schedules.find((schedule) => {
    if (String(schedule.nurseId) !== String(nurseId)) return false;
    if (schedule.visitDate !== visitDate) return false;
    if (schedule.scheduleStatus === "cancelled") return false;
    if (options.excludeScheduleId && schedule.id === options.excludeScheduleId) return false;
    if (
      options.excludeRecurringGroupId &&
      schedule.recurringGroupId === options.excludeRecurringGroupId
    ) {
      return false;
    }

    const scheduleMinutes = minutesFromTime(schedule.visitTime);
    return scheduleMinutes !== null && Math.abs(scheduleMinutes - targetMinutes) < NURSE_VISIT_MIN_INTERVAL_MINUTES;
  }) || null;
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
  if (purpose === "Blood Glucose") return "#d1fae5";
  if (purpose === "Medication") return "#fef9c3";
  if (purpose === "Routine Visit") return "#f3e8ff";
  return "#dbeafe";
}

function toAssignmentMap(assignments: NurseElderlyAssignment[] = []) {
  return assignments.reduce<Record<string, string[]>>((map, assignment) => {
    const nurseId = String(assignment.nurseId);
    const elderlyId = String(assignment.elderlyId);

    map[nurseId] = [...(map[nurseId] || []), elderlyId];
    return map;
  }, {});
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

function normalizeScheduleSearchValue(value: string) {
  return value.replace(/^(nurse|elderly):\s*/i, "").trim().toLowerCase();
}

type Page = "dashboard" | "manage-profiles" | "schedules" | "medications" | "reports" | "login-history" | "settings";

interface SchedulesProps {
  onNavigate: (page: Page) => void;
}

export function Schedules({ onNavigate }: SchedulesProps) {
  const scheduleFormRef = useRef<HTMLDivElement | null>(null);
  const [nurses, setNurses] = useState<SelectOption[]>([]);
  const [elders, setElders] = useState<SelectOption[]>([]);
  const [assignmentMap, setAssignmentMap] = useState<Record<string, string[]>>({});
  const [elderlyMedicationMap, setElderlyMedicationMap] = useState<Record<string, ElderlyMedication[]>>({});
  const [schedules, setSchedules] = useState<ScheduleAssignment[]>([]);
  const [nurse, setNurse] = useState("");
  const [elder, setElder] = useState("");
  const [purpose, setPurpose] = useState("Blood Pressure");
  const [visitDate, setVisitDate] = useState(todayInputValue());
  const [visitTime, setVisitTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<"daily" | "weekly">("weekly");
  const [repeatWeeks, setRepeatWeeks] = useState(4);
  const [view, setView] = useState<"Week" | "Day">("Week");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleAssignment | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [scheduleSearchOpen, setScheduleSearchOpen] = useState(false);
  const [showAllSchedules, setShowAllSchedules] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleAssignment | null>(null);
  const [activeCalendarSlot, setActiveCalendarSlot] = useState<{ dateKey: string; hour: number } | null>(null);
  const [createSlotLock, setCreateSlotLock] = useState<{ dateKey: string; hour: number } | null>(null);
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
    const query = normalizeScheduleSearchValue(scheduleSearch);

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
  const activeSlotSchedules = useMemo(() => {
    if (!activeCalendarSlot) return [];

    return filteredSchedules
      .filter((schedule) => {
        const scheduleHour = Number(String(schedule.visitTime || "").slice(0, 2));
        return schedule.visitDate === activeCalendarSlot.dateKey && scheduleHour === activeCalendarSlot.hour;
      })
      .sort((a, b) => a.visitTime.localeCompare(b.visitTime) || a.elderlyName.localeCompare(b.elderlyName));
  }, [activeCalendarSlot, filteredSchedules]);
  const currentWeekSchedules = useMemo(() => {
    const currentWeekStart = getWeekStart(new Date());
    const currentWeekKeys = new Set(
      Array.from({ length: 7 }, (_, index) => toDateKey(addDays(currentWeekStart, index)))
    );

    return filteredSchedules
      .filter((schedule) => currentWeekKeys.has(schedule.visitDate) && schedule.scheduleStatus !== "cancelled")
      .sort((a, b) => a.visitDate.localeCompare(b.visitDate) || a.visitTime.localeCompare(b.visitTime));
  }, [filteredSchedules]);
  const tableSchedules = showAllSchedules ? filteredSchedules : currentWeekSchedules;
  const scheduleSearchSuggestions = useMemo(() => {
    const query = normalizeScheduleSearchValue(scheduleSearch);
    const suggestions: ScheduleSearchSuggestion[] = [
      ...nurses.map((item) => ({ ...item, type: "nurse" as const })),
      ...elders.map((item) => ({ ...item, type: "elderly" as const })),
    ];

    return suggestions
      .filter((item) => !query || item.name.toLowerCase().includes(query) || item.id.toLowerCase().includes(query))
      .slice(0, 8);
  }, [elders, nurses, scheduleSearch]);
  const elderlyOptionsForNurse = useMemo(() => {
    const assignedIds = assignmentMap[nurse] || [];

    const assignedSet = new Set(assignedIds.map(String));
    return elders.filter((elderly) => assignedSet.has(String(elderly.id)));
  }, [assignmentMap, elders, nurse]);
  const elderlyOptionsForForm = useMemo(() => {
    if (
      !editingSchedule ||
      String(editingSchedule.nurseId) !== String(nurse) ||
      elderlyOptionsForNurse.some((elderly) => elderly.id === String(editingSchedule.elderlyId))
    ) {
      return elderlyOptionsForNurse;
    }

    return [
      {
        id: String(editingSchedule.elderlyId),
        name: editingSchedule.elderlyName || String(editingSchedule.elderlyId),
        avatar: editingSchedule.elderlyAvatar || "",
      },
      ...elderlyOptionsForNurse,
    ];
  }, [editingSchedule, elderlyOptionsForNurse, nurse]);
  const selectedElderlyMedications = useMemo(() => {
    return (elderlyMedicationMap[elder] || []).filter((medication) => String(medication.status).toLowerCase() === "active");
  }, [elder, elderlyMedicationMap]);

  function hydrateScheduleNames(schedule: ScheduleAssignment): ScheduleAssignment {
    const matchingNurse = nurses.find((item) => item.id === String(schedule.nurseId));
    const matchingElder = elders.find((item) => item.id === String(schedule.elderlyId));

    return {
      ...schedule,
      nurseId: String(schedule.nurseId),
      elderlyId: String(schedule.elderlyId),
      nurseName: matchingNurse?.name || schedule.nurseName || String(schedule.nurseId),
      nurseAvatar: matchingNurse?.avatar || schedule.nurseAvatar,
      elderlyName: matchingElder?.name || schedule.elderlyName || String(schedule.elderlyId),
      elderlyAvatar: matchingElder?.avatar || schedule.elderlyAvatar,
    };
  }

  const summaryStats = useMemo(() => {
    const currentWeekStart = getWeekStart(new Date());
    const currentWeekKeys = new Set(
      Array.from({ length: 7 }, (_, index) => toDateKey(addDays(currentWeekStart, index)))
    );
    const todayVisits = schedules.filter((schedule) => schedule.visitDate === todayKey).length;
    const upcomingVisits = schedules.filter((schedule) => (
      currentWeekKeys.has(schedule.visitDate) && schedule.scheduleStatus !== "cancelled"
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
  }, [nurses.length, schedules, todayKey]);

  async function loadScheduleData() {
    setLoading(true);
    setError("");

    try {
      const [profileResponse, scheduleResponse, medicationResponse] = await Promise.all([
        getProfiles(),
        getSchedules(),
        getElderlyMedications(),
      ]);
      const nextNurses = profileResponse.nurses
        .filter((profile) => profile.status === "Active" && String(profile.nurseStatus || "Active") === "Active")
        .map((profile) => ({
          id: String(profile.nurseId || profile.id),
          name: profile.name,
          avatar: profile.avatar,
        }));
      const nextElders = profileResponse.elderly
        .filter((profile) => profile.status === "Active")
        .map((profile) => ({
          id: String(profile.id),
          name: profile.name,
          avatar: profile.avatar,
        }));

      setNurses(nextNurses);
      setNurse((current) => nextNurses.some((item) => item.id === current) ? current : nextNurses[0]?.id || "");

      setElders(nextElders);
      setElder((current) => nextElders.some((item) => item.id === current) ? current : nextElders[0]?.id || "");
      setAssignmentMap(toAssignmentMap(profileResponse.nurseElderlyAssignments || []));
      setElderlyMedicationMap(
        medicationResponse.medications.reduce<Record<string, ElderlyMedication[]>>((map, medication) => {
          const elderlyId = String(medication.elderlyId);
          map[elderlyId] = [...(map[elderlyId] || []), medication];
          return map;
        }, {})
      );

      setSchedules(scheduleResponse.schedules);
    } catch (loadError) {
      console.error("Failed to load schedule data.", loadError);
      setError("Could not load schedules.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshElderlyMedications() {
    try {
      const medicationResponse = await getElderlyMedications();
      setElderlyMedicationMap(
        medicationResponse.medications.reduce<Record<string, ElderlyMedication[]>>((map, medication) => {
          const elderlyId = String(medication.elderlyId);
          map[elderlyId] = [...(map[elderlyId] || []), medication];
          return map;
        }, {})
      );
    } catch (loadError) {
      console.error("Failed to refresh elderly medications.", loadError);
    }
  }

  useEffect(() => {
    loadScheduleData();
  }, []);

  useEffect(() => {
    setElder((current) => elderlyOptionsForForm.some((item) => item.id === current)
      ? current
      : elderlyOptionsForForm[0]?.id || "");
  }, [elderlyOptionsForForm]);

  function firstAssignedElderId(nurseId: string) {
    const assignedIds = new Set((assignmentMap[nurseId] || []).map(String));
    return elders.find((item) => assignedIds.has(item.id))?.id || "";
  }

  function resetForm() {
    const defaultNurseId = nurses[0]?.id || "";
    setNurse(defaultNurseId);
    setElder(firstAssignedElderId(defaultNurseId));
    setPurpose("Blood Pressure");
    setVisitDate(todayInputValue());
    setVisitTime("09:00");
    setNotes("");
    setRecurring(false);
    setRecurrenceFrequency("weekly");
    setRepeatWeeks(4);
    setEditingSchedule(null);
    setCreateSlotLock(null);
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
    setActiveCalendarSlot(null);
  }

  function handleScheduleSearch(value: string) {
    setScheduleSearch(value);
    setScheduleSearchOpen(true);
    const query = normalizeScheduleSearchValue(value);

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
    refreshElderlyMedications();
    const recurringSeries = row.recurringGroupId
      ? schedules.filter((schedule) => schedule.recurringGroupId === row.recurringGroupId)
      : [];
    setNurse(String(row.nurseId));
    setElder(String(row.elderlyId));
    setPurpose(row.purpose);
    setVisitDate(row.visitDate);
    setVisitTime(row.visitTime);
    setNotes("");
    setRecurring(Boolean(row.recurringGroupId));
    setRecurrenceFrequency(row.recurringGroupId ? inferRecurringFrequency(recurringSeries) : "weekly");
    setRepeatWeeks(row.recurringGroupId ? Math.max(recurringSeries.length, Number(row.recurringSequence) || 1) : 4);
    setEditingSchedule(row);
    setCreateSlotLock(null);
    setShowCreateForm(true);
    setActiveCalendarSlot(null);
    setActionMenuId(null);
    setMessage("");
    setError("");

  }

  function startCreateSchedule(date: Date, hour = 9, lockToSlot = false) {
    refreshElderlyMedications();
    const dateKey = toDateKey(date);
    const defaultNurseId = nurses.some((item) => item.id === nurse) ? nurse : nurses[0]?.id || "";
    setNurse(defaultNurseId);
    setElder(firstAssignedElderId(defaultNurseId));
    setPurpose("Blood Pressure");
    setVisitDate(dateKey);
    setVisitTime(`${String(hour).padStart(2, "0")}:00`);
    setNotes("");
    setRecurring(false);
    setRecurrenceFrequency("weekly");
    setRepeatWeeks(4);
    setEditingSchedule(null);
    setCreateSlotLock(lockToSlot ? { dateKey, hour } : null);
    setSelectedDateKey(dateKey);
    setWeekStart(getWeekStart(date));
    setShowAllSchedules(false);
    setShowCreateForm(true);
    setSelectedSchedule(null);
    setActiveCalendarSlot(null);
    setActionMenuId(null);
    setMessage("");
    setError("");

  }

  async function handleSaveSchedule() {
    setSaving(true);
    setMessage("");
    setError("");
    const selectedNurse = nurses.find((item) => item.id === nurse);
    const selectedElder = elderlyOptionsForForm.find((item) => item.id === elder);
    const assignedElderIds = (assignmentMap[nurse] || []).map(String);
    const visitHour = Number(String(visitTime || "").slice(0, 2));

    if (assignedElderIds.length === 0) {
      setSaving(false);
      setError("There is no assigned elder. Please assign first.");
      return;
    }

    if (!elder) {
      setSaving(false);
      setError("Select an assigned elderly profile before saving a schedule.");
      return;
    }

    if (!assignedElderIds.includes(String(elder))) {
      setSaving(false);
      setError("Selected elderly is not assigned to this caregiver. Please update assigned elders first.");
      return;
    }

    if (!editingSchedule && createSlotLock) {
      if (visitDate !== createSlotLock.dateKey || visitHour !== createSlotLock.hour) {
        setSaving(false);
        setError(`This schedule must stay within ${toDisplayDate(createSlotLock.dateKey)} at ${formatHour(createSlotLock.hour)}.`);
        return;
      }

    }

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
        recurrenceIntervalDays: recurrenceFrequency === "daily" ? 1 : 7,
        slotLockDate: !editingSchedule && createSlotLock ? createSlotLock.dateKey : undefined,
        slotLockHour: !editingSchedule && createSlotLock ? String(createSlotLock.hour).padStart(2, "0") : undefined,
      };

      const addingRecurringFromEdit = Boolean(editingSchedule) && !editingSchedule?.recurringGroupId && recurring;
      const resizingRecurringEdit = Boolean(editingSchedule?.recurringGroupId) && recurring;
      const repeatCount = recurring && (!editingSchedule || addingRecurringFromEdit || resizingRecurringEdit)
        ? Math.min(12, Math.max(1, Number(repeatWeeks) || 1))
        : 1;
      const visitDates = recurringDates(visitDate, repeatCount, recurrenceFrequency);
      const recurrenceIntervalDays = recurrenceFrequency === "daily" ? 1 : 7;
      const editingSequence = Math.max(1, Number(editingSchedule?.recurringSequence) || 1);
      const recurringDateForSequence = (sequence: number) => {
        const baseDate = dateFromKey(visitDate);
        if (!baseDate) return visitDate;
        return toDateKey(addDays(baseDate, (sequence - editingSequence) * recurrenceIntervalDays));
      };
      const localConflict = visitDates
        .map((nextVisitDate) => findNurseIntervalConflict(schedules, nurse, nextVisitDate, visitTime, {
          excludeScheduleId: editingSchedule?.recurringGroupId ? null : editingSchedule?.id,
          excludeRecurringGroupId: editingSchedule?.recurringGroupId || null,
        }))
        .find(Boolean);

      if (localConflict) {
        setSaving(false);
        setError(
          `${localConflict.nurseName} already has a visit on ${toDisplayDate(localConflict.visitDate)} at ${localConflict.visitTime}. Keep at least ${NURSE_VISIT_MIN_INTERVAL_MINUTES} minutes between visits.`
        );
        return;
      }

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
          const desiredCount = repeatCount;

          if (desiredCount > existingCount) {
            for (let nextSequence = existingCount + 1; nextSequence <= desiredCount; nextSequence += 1) {
              savedSchedules.push(await createSchedule({
                ...payload,
                visitDate: recurringDateForSequence(nextSequence),
                recurringGroupId: editingSchedule.recurringGroupId,
                recurringSequence: nextSequence,
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
        for (const [index, nextVisitDate] of visitDates.entries()) {
          const occurrencePayload = {
            ...payload,
            visitDate: nextVisitDate,
            recurringGroupId,
            recurringSequence: recurringGroupId ? savedSchedules.length + 1 : null,
          };

          if (index > 0) {
            delete occurrencePayload.slotLockDate;
            delete occurrencePayload.slotLockHour;
          }

          savedSchedules.push(await createSchedule({
            ...occurrencePayload,
          }));
        }
      }

      const hydratedSavedSchedules = savedSchedules.map(hydrateScheduleNames);
      const saved =
        (editingSchedule
          ? hydratedSavedSchedules.find((schedule) => schedule.id === editingSchedule.id)
          : hydratedSavedSchedules[0]) || hydratedSavedSchedules[0];

      setSchedules((current) => editingSchedule
        ? [
            ...current
              .filter((schedule) => {
                if (editingSchedule.recurringGroupId && !recurring) {
                  return schedule.recurringGroupId !== editingSchedule.recurringGroupId || schedule.id === editingSchedule.id;
                }

                if (resizingRecurringEdit && editingSchedule.recurringGroupId) {
                  return (
                    schedule.recurringGroupId !== editingSchedule.recurringGroupId
                  );
                }

                return true;
              })
              .map((schedule) => hydratedSavedSchedules.find((item) => item.id === schedule.id) || schedule),
            ...hydratedSavedSchedules.filter((item) => !current.some((schedule) => schedule.id === item.id)),
          ]
        : [...hydratedSavedSchedules, ...current]
      );
      setMessage(
        editingSchedule
          ? editingSchedule.recurringGroupId && !recurring
            ? "Recurring schedule stopped. This visit was kept."
            : addingRecurringFromEdit && savedSchedules.length > 1
              ? `${savedSchedules.length} ${recurrenceFrequency} schedules saved.`
            : resizingRecurringEdit
              ? `Recurring period updated to ${repeatCount} ${recurrenceFrequency === "daily" ? "day" : "week"}${repeatCount === 1 ? "" : "s"}.`
            : "Schedule updated."
          : savedSchedules.length > 1
            ? `${savedSchedules.length} ${recurrenceFrequency} schedules saved.`
            : "Schedule saved."
      );
      if (editingSchedule) {
        setEditingSchedule(saved);
        if (saved?.recurringGroupId) {
          setRepeatWeeks(Math.max(hydratedSavedSchedules.length, Number(saved.recurringSequence) || 1));
        }
      }
      if (!editingSchedule) {
        setCreateSlotLock(null);
      }
      if (saved?.visitDate) {
        const savedDate = dateFromKey(saved.visitDate) || new Date();
        setSelectedDateKey(saved.visitDate);
        setWeekStart(getWeekStart(savedDate));
        setShowAllSchedules(false);
        setActiveCalendarSlot(null);
      }
      const refreshedSchedules = await getSchedules();
      const hydratedRefreshedSchedules = refreshedSchedules.schedules.map(hydrateScheduleNames);
      setSchedules(hydratedRefreshedSchedules);
      if (saved?.recurringGroupId) {
        const refreshedSeries = hydratedRefreshedSchedules
          .filter((schedule) => schedule.recurringGroupId === saved.recurringGroupId)
          .sort((a, b) => (a.recurringSequence || 0) - (b.recurringSequence || 0));
        const firstInSeries = refreshedSeries[0];
        if (firstInSeries?.visitDate) {
          const firstDate = dateFromKey(firstInSeries.visitDate) || new Date();
          setSelectedDateKey(firstInSeries.visitDate);
          setWeekStart(getWeekStart(firstDate));
        }
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
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className="rounded px-1 py-0.5 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-200"
            style={{ color: "#6b7a99" }}
          >
            Dashboard
          </button><span>/</span>
          <span>Schedules</span><span>/</span>
          <span style={{ color: "#1a2b42", fontWeight: 500 }}>Set Up Schedules</span>
        </div>
        <button
          onClick={() => startCreateSchedule(dateFromKey(selectedDateKey) || new Date(), 9)}
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

      <div>
        {/* Create Schedule Form */}
        {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
        <div ref={scheduleFormRef} className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-xl border p-4 shadow-xl" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
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
              <X size={15} />
            </button>
          </div>

          <div className="space-y-3">
            <FormGroup label="Select Caregiver / Nurse">
              <AvatarSelect
                value={nurse}
                options={nurses}
                onChange={(value) => {
                  setNurse(value);
                  setElder(firstAssignedElderId(value));
                }}
              />
            </FormGroup>

            <FormGroup label="Select Elderly">
              <AvatarSelect
                value={elder}
                options={elderlyOptionsForForm}
                onChange={setElder}
              />
              {(assignmentMap[nurse] || []).length > 0 ? (
                <p className="mt-1 text-xs" style={{ color: "#6b7a99" }}>
                  Showing elderly assigned to this caregiver.
                </p>
              ) : (
                <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>
                  There is no assigned elder. Please assign first.
                </p>
              )}
            </FormGroup>

            <div className="grid grid-cols-1 gap-3">
              <FormGroup label="Visit Date">
                  <input
                    type="date"
                    value={visitDate}
                    min={!editingSchedule ? todayInputValue() : undefined}
                    readOnly={Boolean(createSlotLock)}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none"
                    style={{
                      borderColor: "rgba(0,0,0,0.12)",
                      color: "#1a2b42",
                      backgroundColor: createSlotLock ? "#f8fafc" : "#fff",
                    }}
                  />
              </FormGroup>
              <FormGroup label="Visit Time">
                <input
                  type="time"
                  value={visitTime}
                  min={createSlotLock ? `${String(createSlotLock.hour).padStart(2, "0")}:00` : undefined}
                  max={createSlotLock ? `${String(createSlotLock.hour).padStart(2, "0")}:59` : undefined}
                  onChange={(e) => setVisitTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none"
                  style={{ borderColor: "rgba(0,0,0,0.12)", color: "#1a2b42" }}
                />
              </FormGroup>
            </div>
            {createSlotLock && !editingSchedule && (
              <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "#bfdbfe", backgroundColor: "#eff6ff", color: "#1d4ed8" }}>
                Add within {toDisplayDate(createSlotLock.dateKey)} at {formatHour(createSlotLock.hour)} only.
              </div>
            )}

            <FormGroup label="Purpose">
              <div className="relative">
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full appearance-none rounded-lg border px-3 py-2 pr-9 text-xs outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  style={{ borderColor: "rgba(0,0,0,0.12)", backgroundColor: "#f8fafc", color: "#1a2b42" }}
                >
                  {PURPOSES.map((p) => <option key={p}>{p}</option>)}
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#6b7a99" }}
                />
              </div>
            </FormGroup>

            {purpose === "Medication" && (
              <div className="rounded-lg border px-3 py-2" style={{ borderColor: "#bfdbfe", backgroundColor: "#eff6ff" }}>
                <div className="mb-2 text-xs" style={{ color: "#1d4ed8", fontWeight: 700 }}>
                  Medication info for selected elderly
                </div>
                {selectedElderlyMedications.length > 0 ? (
                  <div className="space-y-2">
                    {selectedElderlyMedications.map((medication) => (
                      <div key={medication.id} className="rounded-lg bg-white px-3 py-2 text-xs" style={{ border: "1px solid rgba(37,99,235,0.14)" }}>
                        <div className="flex items-center justify-between gap-2">
                          <span style={{ color: "#1a2b42", fontWeight: 700 }}>{medication.medicationName}</span>
                          <span style={{ color: "#2563eb", fontWeight: 700 }}>{medication.dosage}</span>
                        </div>
                        <div className="mt-1" style={{ color: "#6b7a99" }}>{medication.instructions}</div>
                        {medication.notes && (
                          <div className="mt-1" style={{ color: "#64748b" }}>{medication.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: "#1d4ed8" }}>
                    No active medications assigned to this elderly yet. Add them from the Medications page first.
                  </p>
                )}
              </div>
            )}

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
                  onClick={() => {
                    setRecurring(!recurring);
                  }}
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
                <div className="mt-2 space-y-2">
                  <div>
                    <label className="text-xs block mb-1" style={{ color: "#6b7a99" }}>Repeat Every</label>
                    <div className="grid grid-cols-2 gap-1 rounded-lg border p-1" style={{ borderColor: "rgba(0,0,0,0.12)" }}>
                      {(["daily", "weekly"] as const).map((frequency) => (
                        <button
                          key={frequency}
                          type="button"
                          onClick={() => setRecurrenceFrequency(frequency)}
                          className="rounded-md px-2 py-1.5 text-xs capitalize transition-colors"
                          style={{
                            backgroundColor: recurrenceFrequency === frequency ? "#2563eb" : "transparent",
                            color: recurrenceFrequency === frequency ? "#fff" : "#6b7a99",
                          }}
                        >
                          {frequency}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                  <label className="text-xs block mb-1" style={{ color: "#6b7a99" }}>
                    Repeat {recurrenceFrequency === "daily" ? "Days" : "Weeks"}
                  </label>
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
              disabled={saving || !nurse}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-white"
              style={{ backgroundColor: "#2563eb", opacity: saving || !nurse ? 0.7 : 1 }}
            >
              <Calendar size={12} /> {saving ? "Saving..." : editingSchedule ? "Update Schedule" : "Save Schedule"}
            </button>
          </div>
        </div>
        </div>
        )}

        {/* Calendar + Table */}
        <div className="space-y-4">
          {/* Weekly Calendar */}
          <div className="relative bg-white rounded-xl border overflow-visible" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
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
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7a99" }} />
                <input
                  value={scheduleSearch}
                  onFocus={() => setScheduleSearchOpen(true)}
                  onBlur={() => window.setTimeout(() => setScheduleSearchOpen(false), 120)}
                  onChange={(event) => handleScheduleSearch(event.target.value)}
                  placeholder="Search nurse or elderly..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none"
                  style={{ borderColor: "rgba(0,0,0,0.1)", backgroundColor: "#f8fafc", color: "#1a2b42" }}
                />
                  {scheduleSearchOpen && scheduleSearchSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border bg-white py-1 shadow-xl" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
                      {scheduleSearchSuggestions.map((item) => {
                        const isNurse = item.type === "nurse";
                        return (
                          <button
                            key={`${item.type}-${item.id}`}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleScheduleSearch(`${isNurse ? "Nurse" : "Elderly"}: ${item.name}`);
                              setScheduleSearchOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-blue-50"
                            style={{ color: "#1a2b42" }}
                          >
                            <span className="truncate">{item.name}</span>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{
                                backgroundColor: isNurse ? "#dbeafe" : "#dcfce7",
                                color: isNurse ? "#1d4ed8" : "#15803d",
                              }}
                            >
                              {isNurse ? "Nurse" : "Elderly"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                      const previewMatches = matches.slice(0, CALENDAR_PREVIEW_LIMIT);
                      const hiddenCount = matches.length - previewMatches.length;
                      const isActiveSlot = false;

                      return (
                        <div
                          key={`${dateKey}-${hour}`}
                          onClick={() => {
                            const nextDateKey = toDateKey(date);
                            setShowAllSchedules(false);
                            setSelectedDateKey(nextDateKey);
                            setWeekStart(getWeekStart(date));
                            setActiveCalendarSlot(matches.length > 0 ? { dateKey: nextDateKey, hour } : null);
                          }}
                          className="group relative border-b border-r p-1 min-h-[48px] space-y-1 cursor-pointer hover:bg-blue-50"
                          style={{ borderColor: "rgba(0,0,0,0.05)" }}
                        >
                          {previewMatches.map((match) => (
                            <div
                              key={match.id}
                              className="rounded-md px-1.5 py-1 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ backgroundColor: scheduleColor(match.purpose) }}
                              title="View all schedules in this time slot"
                            >
                              <div className="truncate" style={{ color: "#1a2b42", fontWeight: 600, fontSize: "10px" }}>
                                {match.elderlyName}
                              </div>
                              <div style={{ color: "#6b7a99", fontSize: "10px" }}>{match.visitTime}</div>
                              <div style={{ color: "#6b7a99", fontSize: "10px" }}>{match.purpose}</div>
                            </div>
                          ))}
                          {hiddenCount > 0 && (
                            <div
                              className="rounded-md px-1.5 py-1 text-[10px]"
                              style={{ backgroundColor: "#eff6ff", color: "#2563eb", fontWeight: 700 }}
                            >
                              {hiddenCount} more in this slot
                            </div>
                          )}
                          {matches.length === 0 && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                startCreateSchedule(date, hour);
                              }}
                              className="absolute inset-1 flex items-center justify-center gap-1 rounded-md border border-dashed text-[10px] font-semibold opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                              style={{
                                borderColor: "#93c5fd",
                                backgroundColor: "rgba(239, 246, 255, 0.96)",
                                color: "#2563eb",
                              }}
                            >
                              <Plus size={11} /> Add schedule?
                            </button>
                          )}
                          {isActiveSlot && activeSlotSchedules.length > 0 && (
                            <div
                              onClick={(event) => event.stopPropagation()}
                              className="absolute left-1 top-1 z-30 w-72 max-w-[calc(100vw-3rem)] rounded-lg border bg-white p-3 shadow-xl"
                              style={{ borderColor: "rgba(0,0,0,0.08)" }}
                            >
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>
                                    {toDisplayDate(dateKey)} at {formatHour(hour)}
                                  </div>
                                  <div className="text-xs" style={{ color: "#6b7a99" }}>
                                    {activeSlotSchedules.length} schedule{activeSlotSchedules.length === 1 ? "" : "s"}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveCalendarSlot(null)}
                                  className="flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100"
                                  aria-label="Close schedule list"
                                >
                                  <X size={13} style={{ color: "#6b7a99" }} />
                                </button>
                              </div>
                              <div className="max-h-72 space-y-2 overflow-y-auto">
                                {activeSlotSchedules.map((row) => (
                                  <div
                                    key={row.id}
                                    className="rounded-md border p-2"
                                    style={{ borderColor: "rgba(0,0,0,0.08)", backgroundColor: scheduleColor(row.purpose) }}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="truncate text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>
                                          {row.elderlyName}
                                        </div>
                                        <div className="truncate text-xs" style={{ color: "#6b7a99" }}>
                                          {row.visitTime} · {row.purpose}
                                        </div>
                                        <div className="truncate text-xs" style={{ color: "#6b7a99" }}>
                                          Nurse: {row.nurseName}
                                        </div>
                                      </div>
                                      <div className="flex flex-shrink-0 gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveCalendarSlot(null);
                                            setSelectedSchedule(row);
                                          }}
                                          className="flex h-6 w-6 items-center justify-center rounded bg-white/80"
                                          title="View schedule details"
                                          aria-label="View schedule details"
                                        >
                                          <Eye size={12} style={{ color: "#2563eb" }} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveCalendarSlot(null);
                                            startEditSchedule(row);
                                          }}
                                          className="flex h-6 w-6 items-center justify-center rounded bg-white/80"
                                          title="Edit schedule"
                                          aria-label="Edit schedule"
                                        >
                                          <Pencil size={12} style={{ color: "#16a34a" }} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveCalendarSlot(null);
                                            setPendingDeleteSchedule(row);
                                          }}
                                          className="flex h-6 w-6 items-center justify-center rounded bg-white/80"
                                          title="Delete schedule"
                                          aria-label="Delete schedule"
                                        >
                                          <Trash2 size={12} style={{ color: "#dc2626" }} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            {activeCalendarSlot && activeSlotSchedules.length > 0 && (
              <div
                className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 px-4 py-6"
                onClick={() => setActiveCalendarSlot(null)}
              >
                <div
                  className="w-full max-w-xl max-h-[86vh] overflow-y-auto rounded-xl border bg-white p-4 shadow-xl"
                  style={{ borderColor: "rgba(0,0,0,0.08)" }}
                  onClick={(event) => event.stopPropagation()}
                >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>
                      {toDisplayDate(activeCalendarSlot.dateKey)} at {formatHour(activeCalendarSlot.hour)}
                    </h4>
                    <p className="text-xs" style={{ color: "#6b7a99" }}>
                      {activeSlotSchedules.length} schedule{activeSlotSchedules.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const lockedDate = dateFromKey(activeCalendarSlot.dateKey);
                        if (!lockedDate) return;
                        startCreateSchedule(lockedDate, activeCalendarSlot.hour, true);
                      }}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white"
                      style={{ backgroundColor: "#2563eb" }}
                    >
                      <Plus size={12} /> Add Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCalendarSlot(null)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100"
                      aria-label="Close schedule list"
                    >
                      <X size={15} style={{ color: "#6b7a99" }} />
                    </button>
                  </div>
                </div>
                <div className="grid max-h-80 gap-2 overflow-y-auto md:grid-cols-2">
                  {activeSlotSchedules.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-lg border p-3"
                      style={{ borderColor: "rgba(0,0,0,0.08)", backgroundColor: scheduleColor(row.purpose) }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>
                            {row.elderlyName}
                          </div>
                          <div className="truncate text-xs" style={{ color: "#6b7a99" }}>
                            {row.visitTime} - {row.purpose}
                          </div>
                          <div className="truncate text-xs" style={{ color: "#6b7a99" }}>
                            Nurse: {row.nurseName}
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCalendarSlot(null);
                              setSelectedSchedule(row);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded bg-white/80"
                            title="View schedule details"
                            aria-label="View schedule details"
                          >
                            <Eye size={13} style={{ color: "#2563eb" }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCalendarSlot(null);
                              startEditSchedule(row);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded bg-white/80"
                            title="Edit schedule"
                            aria-label="Edit schedule"
                          >
                            <Pencil size={13} style={{ color: "#16a34a" }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCalendarSlot(null);
                              setPendingDeleteSchedule(row);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded bg-white/80"
                            title="Delete schedule"
                            aria-label="Delete schedule"
                          >
                            <Trash2 size={13} style={{ color: "#dc2626" }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              </div>
            )}
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
                        {row.recurringGroupId ? "Recurring" : "-"}
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
                <DetailText label="Recurring" value={selectedSchedule.recurringGroupId ? "Recurring" : "-"} />
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
                    This will delete every visit in this recurring series.
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
      {selected?.avatar && (
        <img
          src={selected.avatar}
          className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 rounded-full"
          alt=""
        />
      )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border py-2 pr-9 text-xs outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          style={{
            borderColor: "rgba(0,0,0,0.12)",
            backgroundColor: "#f8fafc",
            color: "#1a2b42",
            paddingLeft: selected?.avatar ? "40px" : "12px",
          }}
        >
          {options.length === 0 && <option value="">No records found</option>}
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: "#6b7a99" }}
      />
    </div>
  );
}
