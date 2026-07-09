import { useEffect, useMemo, useState, FormEvent } from "react";
import { CalendarDays, Search } from "lucide-react";
import type { ScheduleAssignment } from "../api/schedules";
import { updateScheduleStatus } from "../api/schedules";

interface MySchedulesProps {
  nurseName?: string;
  nurseId?: string;
  selectedScheduleId?: number | null;
}

interface VisitRecord {
  status: string;
  details: string;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function MySchedules({ nurseName = "Nurse", nurseId, selectedScheduleId: selectedScheduleIdProp = null }: MySchedulesProps) {
  const [schedules, setSchedules] = useState<ScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(selectedScheduleIdProp);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [glucoseValue, setGlucoseValue] = useState("");
  const [notes, setNotes] = useState("");
  const [elderlySearch, setElderlySearch] = useState("");
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [visitRecords, setVisitRecords] = useState<Record<number, VisitRecord>>(() => {
    if (typeof window === "undefined") return {};

    try {
      const stored = window.localStorage.getItem("nurse-schedule-records");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const inputCls = "w-full px-3 py-2.5 bg-muted/60 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  useEffect(() => {
    if (!nurseId) {
      setSchedules([]);
      return;
    }

    let ignore = false;
    setLoading(true);

    fetch(`/api/schedules?nurseId=${encodeURIComponent(nurseId)}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await response.text());
        }
        return response.json();
      })
      .then((data) => {
        if (!ignore) {
          setSchedules(data.schedules || []);
        }
      })
      .catch((error) => {
        console.error("Failed to load nurse schedules.", error);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [nurseId]);

  useEffect(() => {
    setSelectedScheduleId(selectedScheduleIdProp);
  }, [selectedScheduleIdProp]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("nurse-schedule-records", JSON.stringify(visitRecords));
    }
  }, [visitRecords]);

  const groupedSchedules = useMemo(() => {
    return schedules.reduce<Record<string, ScheduleAssignment[]>>((groups, schedule) => {
      const key = schedule.elderlyName || "Unassigned elderly";
      const list = groups[key] || [];
      list.push(schedule);
      groups[key] = list;
      return groups;
    }, {});
  }, [schedules]);

  const filteredGroupedSchedules = useMemo(() => {
    const query = elderlySearch.trim().toLowerCase();
    const todayKey = toDateKey(new Date());

    return Object.entries(groupedSchedules).reduce<Record<string, ScheduleAssignment[]>>((groups, [elderlyName, items]) => {
      const filteredItems = showTodayOnly ? items.filter((item) => item.visitDate === todayKey) : items;

      if (filteredItems.length === 0) {
        return groups;
      }

      const matchesSearch = !query || [elderlyName, ...filteredItems.map((item) => [item.purpose, item.visitDate, item.visitTime].join(" "))].some((value) =>
        String(value || "").toLowerCase().includes(query)
      );

      if (matchesSearch) {
        groups[elderlyName] = [...filteredItems].sort((a, b) => a.visitDate.localeCompare(b.visitDate) || a.visitTime.localeCompare(b.visitTime));
      }

      return groups;
    }, {});
  }, [elderlySearch, groupedSchedules, showTodayOnly]);

  const selectedSchedule = schedules.find((item) => item.id === selectedScheduleId) || null;
  const currentDate = new Date();
  const currentDay = currentDate.getDay();
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() - ((currentDay + 6) % 7));
  const weekDays = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });

  const dayKey = (date: Date) => toDateKey(date);
  const dayLabel = (date: Date) => date.toLocaleDateString(undefined, { weekday: "short" });
  const schedulesByDay = useMemo(() => {
    return weekDays.reduce<Record<string, ScheduleAssignment[]>>((groups, date) => {
      const key = dayKey(date);
      groups[key] = schedules.filter((schedule) => schedule.visitDate === key);
      return groups;
    }, {} as Record<string, ScheduleAssignment[]>);
  }, [schedules, weekDays]);

  function resetFormFields() {
    setSystolic("");
    setDiastolic("");
    setGlucoseValue("");
    setNotes("");
    setFormMessage(null);
  }

  function getStatusClass(status: string) {
    if (status === "completed") return "bg-emerald-50 text-emerald-700";
    if (status === "missed") return "bg-amber-50 text-amber-700";
    return "bg-indigo-50 text-indigo-700";
  }

  function buildVisitSummary(purpose: string) {
    if (purpose === "Blood Pressure") {
      if (!systolic || !diastolic) return "";
      return `Blood Pressure: ${systolic}/${diastolic} mmHg`;
    }

    if (purpose === "Blood Glucose") {
      if (!glucoseValue) return "";
      return `Blood Glucose: ${glucoseValue} mg/dL`;
    }

    if (purpose === "Routine Visit") {
      return notes.trim() ? `Notes: ${notes.trim()}` : "";
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSchedule) {
      setFormMessage("No schedule selected.");
      return;
    }

    const summary = buildVisitSummary(selectedSchedule.purpose);
    if (!summary) {
      setFormMessage("Please fill the required details before completing the visit.");
      return;
    }

    setSubmitLoading(true);
    setFormMessage(null);

    try {
      await updateScheduleStatus(selectedSchedule.id, "completed");
      setSchedules((prev) => prev.map((item) => item.id === selectedSchedule.id ? { ...item, scheduleStatus: "completed" } : item));
      setVisitRecords((prev) => ({ ...prev, [selectedSchedule.id]: { status: "completed", details: summary } }));
      setFormMessage("Visit completed.");
      resetFormFields();
    } catch (error) {
      console.error(error);
      setFormMessage("Failed to complete visit.");
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleMarkMissed() {
    if (!selectedSchedule) {
      setFormMessage("No schedule selected.");
      return;
    }

    setSubmitLoading(true);
    setFormMessage(null);

    try {
      await updateScheduleStatus(selectedSchedule.id, "missed");
      setSchedules((prev) => prev.map((item) => item.id === selectedSchedule.id ? { ...item, scheduleStatus: "missed" } : item));
      setVisitRecords((prev) => ({ ...prev, [selectedSchedule.id]: { status: "missed", details: "Marked as missed" } }));
      setFormMessage("Visit marked as missed.");
      resetFormFields();
    } catch (error) {
      console.error(error);
      setFormMessage("Failed to mark visit as missed.");
    } finally {
      setSubmitLoading(false);
    }
  }

  const selectedPurpose = selectedSchedule?.purpose || "";
  const selectedElderlyName = selectedSchedule?.elderlyName || "";
  const selectedDetails = selectedSchedule ? (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Selected schedule</p>
          <h3 className="text-xl font-semibold text-foreground">{selectedPurpose}</h3>
          <p className="text-sm text-muted-foreground">{selectedElderlyName} · {selectedSchedule.visitDate} · {selectedSchedule.visitTime}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusClass(selectedSchedule.scheduleStatus)}`}>
          {selectedSchedule.scheduleStatus}
        </span>
      </div>

      {visitRecords[selectedSchedule.id] && (
        <div className={`mt-4 rounded-xl border px-3 py-3 text-sm ${visitRecords[selectedSchedule.id].status === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
          <p className="font-semibold">{visitRecords[selectedSchedule.id].status === "completed" ? "Recorded result" : "Visit status"}</p>
          <p className="mt-1">{visitRecords[selectedSchedule.id].details}</p>
        </div>
      )}

      {selectedSchedule.scheduleStatus === "scheduled" ? (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {selectedPurpose === "Blood Pressure" && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Systolic (mmHg)</label>
                <input type="number" className={inputCls} placeholder="e.g. 120" value={systolic} onChange={(e) => setSystolic(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Diastolic (mmHg)</label>
                <input type="number" className={inputCls} placeholder="e.g. 80" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} required />
              </div>
            </div>
          )}

          {selectedPurpose === "Blood Glucose" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Blood Glucose (mg/dL)</label>
              <input type="number" className={inputCls} placeholder="e.g. 100" value={glucoseValue} onChange={(e) => setGlucoseValue(e.target.value)} required />
            </div>
          )}

          {selectedPurpose === "Routine Visit" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Visit notes</label>
              <textarea className={`${inputCls} resize-none`} rows={4} placeholder="Enter observations or care notes" value={notes} onChange={(e) => setNotes(e.target.value)} required />
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={submitLoading} className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60">
              {submitLoading ? "Saving…" : selectedPurpose === "Routine Visit" ? "Finish Visit" : "Complete Visit"}
            </button>

            <button type="button" onClick={handleMarkMissed} disabled={submitLoading} className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60">
              {submitLoading ? "Saving…" : "Mark as Missed"}
            </button>
          </div>

          {formMessage && <p className="text-sm text-muted-foreground">{formMessage}</p>}
        </form>
      ) : (
        <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">This visit is already {selectedSchedule.scheduleStatus}.</p>
          <p className="mt-1">No form is needed for this visit anymore.</p>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">My Assigned Elderly</h3>
            <p className="text-sm text-muted-foreground">
              {nurseName} · {schedules.length} scheduled visit{schedules.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
            {schedules.filter((item) => item.scheduleStatus === "scheduled").length} active
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading schedule details...</div>
      ) : schedules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No schedules are currently assigned to this nurse.</div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Assigned records</p>
                <h3 className="text-lg font-semibold text-foreground">Assigned elderly records</h3>
              </div>
              <div className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                {Object.keys(filteredGroupedSchedules).length} records
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px]">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Search size={16} className="text-muted-foreground" />
                  Search elderly or visit type
                </label>
                <input type="text" className={inputCls} placeholder="Search by elderly name, visit purpose, or time" value={elderlySearch} onChange={(event) => setElderlySearch(event.target.value)} />
              </div>
              <button type="button" onClick={() => setShowTodayOnly((value) => !value)} className={`rounded-xl px-3 py-2 text-sm font-medium transition ${showTodayOnly ? "bg-primary text-white" : "border border-border bg-background text-foreground hover:bg-muted"}`}>
                {showTodayOnly ? "Showing Today" : "Today Records"}
              </button>
            </div>

            {Object.keys(filteredGroupedSchedules).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">No assigned elderly records match your search.</div>
            ) : (
              <div className="space-y-3">
                {Object.entries(filteredGroupedSchedules).map(([elderlyName, items]) => (
                  <div key={elderlyName} className="rounded-2xl border border-border/70 bg-background/70 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{elderlyName}</p>
                        <p className="text-xs text-muted-foreground">{items.length} assigned visit{items.length === 1 ? "" : "s"}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        {items[0]?.scheduleStatus || "scheduled"}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {items.map((item) => (
                        <button key={item.id} type="button" onClick={() => setSelectedScheduleId(item.id)} className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition ${selectedScheduleId === item.id ? "border-primary bg-primary/5" : "border-border/70 bg-white hover:bg-slate-50"}`}>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{item.purpose}</div>
                            <div className="text-xs text-muted-foreground">{item.visitDate} · {item.visitTime}</div>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${getStatusClass(item.scheduleStatus)}`}>
                            {item.scheduleStatus}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">This week</p>
                <h3 className="text-lg font-semibold text-foreground">Weekly schedule</h3>
                <p className="text-xs text-muted-foreground mt-1">{weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {weekDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
              </div>
              <div className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                {schedules.filter((item) => item.scheduleStatus === "scheduled").length} active
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
              {weekDays.map((date) => {
                const key = dayKey(date);
                const daySchedules = schedulesByDay[key] || [];
                return (
                  <div key={key} className="rounded-2xl border border-border bg-background p-3">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dayLabel(date)}</div>
                    <div className="text-sm font-semibold text-foreground">{date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                    <div className="mt-3 space-y-2">
                      {daySchedules.length === 0 ? (
                        <div className="text-xs text-muted-foreground">No visits</div>
                      ) : daySchedules.map((item) => (
                        <button key={item.id} type="button" onClick={() => setSelectedScheduleId(item.id)} className={`w-full rounded-2xl border px-3 py-2 text-left transition ${selectedScheduleId === item.id ? "border-primary bg-primary/5" : "border-border/70 bg-white hover:bg-slate-50"}`}>
                          <div className="flex justify-between gap-2">
                            <div>
                              <div className="text-xs font-semibold text-foreground">{item.purpose}</div>
                              <div className="text-[11px] text-muted-foreground">{item.elderlyName}</div>
                              <div className="text-[11px] text-muted-foreground">{item.visitTime}</div>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getStatusClass(item.scheduleStatus)}`}>
                              {item.scheduleStatus}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedSchedule ? (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">{selectedDetails}</div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Select a schedule from the week to open the form.</div>
          )}
        </div>
      )}
    </div>
  );
}
