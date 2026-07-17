import { useEffect, useMemo, useState, FormEvent } from "react";
import { CalendarDays, Clock3, User, HeartPulse } from "lucide-react";
import type { ScheduleAssignment } from "../api/schedules";
import { updateScheduleStatus } from "../api/schedules";
import { createHealthLog } from "../api/health";

interface MySchedulesProps {
  nurseName?: string;
  nurseId?: string;
  selectedScheduleId?: number | null;
}

export function MySchedules({ nurseName = "Nurse", nurseId, selectedScheduleId: selectedScheduleIdProp = null }: MySchedulesProps) {
  const [schedules, setSchedules] = useState<ScheduleAssignment[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(selectedScheduleIdProp);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [glucoseValue, setGlucoseValue] = useState("");
  const [notes, setNotes] = useState("");
  const [medicationDetails, setMedicationDetails] = useState<any[]>([]);
  const inputCls = "w-full px-3 py-2.5 bg-muted/60 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  function toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function normalizeDateKey(value: string) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const datePart = raw.split(/[T ]/)[0].replace(/[\/\u2010-\u2015\u2212]/g, "-");
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return toDateKey(parsed);
    return "";
  }

  function compareDateKeys(left: string, right: string) {
    const normalizedLeft = normalizeDateKey(left);
    const normalizedRight = normalizeDateKey(right);
    if (!normalizedLeft || !normalizedRight) return 0;
    return normalizedLeft.localeCompare(normalizedRight);
  }

  useEffect(() => {
    if (!nurseId) {
      setSchedules([]);
      return;
    }

    let ignore = false;
    let requestInProgress = false;
    setLoading(true);

    const loadSchedules = async (showLoading = false) => {
      if (requestInProgress) return;
      requestInProgress = true;
      if (showLoading && !ignore) setLoading(true);

      try {
        const response = await fetch(`/api/schedules?nurseId=${encodeURIComponent(nurseId)}`);
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = await response.json();
        if (!ignore) {
          setSchedules(data.schedules || []);
        }
      } catch (error) {
        console.error("Failed to load nurse schedules.", error);
      } finally {
        requestInProgress = false;
        if (!ignore) setLoading(false);
      }
    };

    const handleWindowFocus = () => {
      void loadSchedules();
    };

    void loadSchedules(true);
    const intervalId = window.setInterval(() => {
      void loadSchedules();
    }, 5000);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [nurseId]);

  useEffect(() => {
    setSelectedScheduleId(selectedScheduleIdProp);
  }, [selectedScheduleIdProp]);

  // Periodically check for schedules that have passed without completion
  useEffect(() => {
    if (!schedules || schedules.length === 0) return;

    const graceMinutes = 15; // minutes after scheduled time to mark as missed

    const checkMissed = async () => {
      const now = new Date();
      for (const sch of schedules) {
        try {
          if (String(sch.scheduleStatus).toLowerCase() !== "scheduled") continue;

          const datePart = String(sch.visitDate || "").slice(0, 10); // YYYY-MM-DD
          const timePart = String(sch.visitTime || "").split(" ").pop() || ""; // HH:MM or HH:MM:SS
          const [h, m, s] = timePart.split(":").map((v) => Number(v || 0));
          const [yyyy, mm, dd] = (datePart || "").split("-").map((v) => Number(v || 0));
          if (!yyyy || !mm || !dd) continue;

          const scheduledDate = new Date(yyyy, mm - 1, dd, Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, Number.isFinite(s) ? s : 0);

          const diffMinutes = (now.getTime() - scheduledDate.getTime()) / 60000;
          if (diffMinutes > graceMinutes) {
            // mark missed
            try {
              await updateScheduleStatus(sch.id, "missed");
              setSchedules((prev) => prev.map((it) => (it.id === sch.id ? { ...it, scheduleStatus: "missed" } : it)));
              if (selectedScheduleId === sch.id) {
                setSelectedScheduleId((prev) => prev === sch.id ? prev : prev);
              }
            } catch (err) {
              console.error("Failed to mark schedule missed", sch.id, err);
            }
          }
        } catch (err) {
          console.error("Error checking schedule", sch.id, err);
        }
      }
    };

    const id = setInterval(checkMissed, 60 * 1000);
    // run once now
    checkMissed().catch(() => {});

    return () => clearInterval(id);
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    const q = String(searchText || "").trim().toLowerCase();
    if (!q) return schedules;
    return schedules.filter((s) => {
      return (
        String(s.elderlyName || "").toLowerCase().includes(q) ||
        String(s.purpose || "").toLowerCase().includes(q) ||
        String(s.visitDate || "").toLowerCase().includes(q) ||
        String(s.visitTime || "").toLowerCase().includes(q)
      );
    });
  }, [schedules, searchText]);

  const groupedSchedules = useMemo(() => {
    return filteredSchedules.reduce<Record<string, ScheduleAssignment[]>>((groups, schedule) => {
      const key = schedule.elderlyName || "Unassigned elderly";
      const list = groups[key] || [];
      list.push(schedule);
      groups[key] = list;
      return groups;
    }, {});
  }, [filteredSchedules]);

  const selectedSchedule = schedules.find((item) => item.id === selectedScheduleId) || null;
  const normalizedScheduleDates = useMemo(() => {
    return filteredSchedules
      .map((schedule) => normalizeDateKey(String(schedule.visitDate || "")))
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
  }, [filteredSchedules]);

  const weekStart = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    sunday.setHours(0, 0, 0, 0);

    if (normalizedScheduleDates.length === 0) {
      return sunday;
    }

    const currentWeekStart = new Date(sunday);
    const hasCurrentWeek = normalizedScheduleDates.some((date) => {
      const target = new Date(date);
      return target >= currentWeekStart && target <= new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 6);
    });

    if (hasCurrentWeek) {
      return currentWeekStart;
    }

    return sunday;
  }, [normalizedScheduleDates]);

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [weekStart]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const cursor = new Date(weekStart);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= weekEnd) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [weekStart, weekEnd]);

  const dayKey = (date: Date) => toDateKey(date);
  const dayLabel = (date: Date) => date.toLocaleDateString(undefined, { weekday: "short" });

  const schedulesByDay = useMemo(() => {
    return weekDays.reduce<Record<string, ScheduleAssignment[]>>((groups, date) => {
      const key = dayKey(date);
      groups[key] = filteredSchedules.filter((schedule) => normalizeDateKey(String(schedule.visitDate || "")) === key);
      return groups;
    }, {} as Record<string, ScheduleAssignment[]>);
  }, [filteredSchedules, weekDays]);

  function resetFormFields() {
    setSystolic("");
    setDiastolic("");
    setGlucoseValue("");
    setNotes("");
    setFormMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSchedule) {
      setFormMessage("No schedule selected.");
      return;
    }

    const selectedDateKey = normalizeDateKey(String(selectedSchedule.visitDate || ""));
    const todayKey = toDateKey(new Date());
    if (!selectedDateKey || compareDateKeys(selectedDateKey, todayKey) > 0) {
      setFormMessage(`This visit becomes available on ${selectedSchedule.visitDate}.`);
      return;
    }

    setSubmitLoading(true);
    setFormMessage(null);

    let statusUpdated = false;
    try {
      await updateScheduleStatus(selectedSchedule.id, "completed");
      statusUpdated = true;

      const created = await createHealthLog({
        nurseId: Number(nurseId || 0),
        elderlyId: Number(selectedSchedule.elderlyId || 0),
        scheduleId: selectedSchedule.id,
        systolic: systolic ? Number(systolic) : null,
        diastolic: diastolic ? Number(diastolic) : null,
        bloodSugar: glucoseValue ? Number(glucoseValue) : null,
        notes,
        purpose: selectedSchedule.purpose,
        complianceStatus: selectedSchedule.purpose === "Medication" ? "Taken" : undefined,
        medicationName: selectedSchedule.purpose === "Medication" ? selectedSchedule.purpose : undefined,
      });

      if (created && typeof created.log_id !== "undefined") {
        setLatestRecord(created as any);
      }

      setSchedules((prev) => prev.map((item) => item.id === selectedSchedule.id ? { ...item, scheduleStatus: "completed" } : item));
      setFormMessage("Visit completed.");
      resetFormFields();
    } catch (error) {
      console.error("Failed to complete visit", error);
      if (statusUpdated) {
        try {
          await updateScheduleStatus(selectedSchedule.id, "scheduled");
        } catch (revertError) {
          console.error("Failed to revert schedule status after health log error", revertError);
        }
      }
      setFormMessage(error instanceof Error ? error.message : "Failed to complete visit.");
    } finally {
      setSubmitLoading(false);
    }
  }

  const [latestRecord, setLatestRecord] = useState<any | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadMedicationDetails() {
      if (!selectedSchedule || selectedSchedule.purpose !== "Medication") {
        if (!ignore) setMedicationDetails([]);
        return;
      }

      try {
        const res = await fetch(`/api/elderly-medications?elderlyId=${encodeURIComponent(String(selectedSchedule.elderlyId || ""))}`);
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = await res.json();
        if (!ignore) {
          setMedicationDetails(Array.isArray(data?.medications) ? data.medications : []);
        }
      } catch (err) {
        console.error("Failed to load medication details", err);
        if (!ignore) setMedicationDetails([]);
      }
    }

    loadMedicationDetails();
    return () => { ignore = true; };
  }, [selectedSchedule]);

  // Load latest record when a schedule is selected and it's completed
  useEffect(() => {
    let ignore = false;
    async function loadLatest() {
      if (!selectedSchedule || selectedSchedule.scheduleStatus !== "completed") {
        setLatestRecord(null);
        return;
      }

      try {
        const params = new URLSearchParams({ scheduleId: String(selectedSchedule.id), limit: "1" });
        const res = await fetch(`/api/health/logs?${params.toString()}`);
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = await res.json();
        if (!ignore && data?.logs?.length) {
          setLatestRecord(data.logs[0]);
        }
      } catch (err) {
        console.error("Failed to load latest health log", err);
      }
    }

    loadLatest();
    return () => { ignore = true; };
  }, [selectedSchedule, nurseId]);

  function statusBadgeClasses(status: string) {
    const s = String(status || "").toLowerCase();
    switch (s) {
      case "completed":
        return "inline-flex max-w-full items-center justify-center rounded-full whitespace-nowrap bg-emerald-100 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-emerald-700";
      case "missed":
        return "inline-flex max-w-full items-center justify-center rounded-full whitespace-nowrap bg-red-100 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-red-700";
      case "cancelled":
        return "inline-flex max-w-full items-center justify-center rounded-full whitespace-nowrap bg-rose-100 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-rose-700";
      case "scheduled":
        return "inline-flex max-w-full items-center justify-center rounded-full whitespace-nowrap bg-indigo-50 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-indigo-700";
      default:
        return "inline-flex max-w-full items-center justify-center rounded-full whitespace-nowrap bg-muted/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-muted-foreground";
    }
  }

  function statusLabel(status: string) {
    const s = String(status || "").trim().toLowerCase();
    switch (s) {
      case "completed":
        return "Completed";
      case "missed":
        return "Missed";
      case "scheduled":
        return "Scheduled";
      case "cancelled":
        return "Cancelled";
      default:
        return s
          .split(/[-_\s]+/)
          .filter(Boolean)
          .map((word) => word[0].toUpperCase() + word.slice(1))
          .join(" ");
    }
  }

  const selectedPurpose = selectedSchedule?.purpose || "";
  const selectedElderlyName = selectedSchedule?.elderlyName || "";
  const selectedScheduleIsDue = selectedSchedule
    ? compareDateKeys(String(selectedSchedule.visitDate || ""), toDateKey(new Date())) <= 0
    : false;
  const selectedDetails = selectedSchedule ? (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Selected schedule</p>
          <h3 className="text-xl font-semibold text-foreground">{selectedPurpose}</h3>
          <p className="text-sm text-muted-foreground">{selectedElderlyName} · {selectedSchedule.visitDate} · {selectedSchedule.visitTime}</p>
        </div>
        <span className={statusBadgeClasses(selectedSchedule.scheduleStatus)}>
          {statusLabel(selectedSchedule.scheduleStatus)}
        </span>
      </div>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* If schedule already completed, show last saved record instead of form inputs */}
        {selectedSchedule.scheduleStatus === "completed" && (
          <div className="mb-4 rounded-lg border border-border bg-muted/5 p-3">
            <h4 className="text-sm font-semibold">Last recorded vitals</h4>
            <div id="last-record" className="mt-2 text-sm text-muted-foreground">
              {latestRecord ? (
                  <div className="space-y-1">
                  <div>
                    <strong>Recorded at:</strong>{' '}
                    {(() => {
                      const vt = latestRecord.visit_time || latestRecord.visitTime || latestRecord.recorded_time || latestRecord.recordedTime;
                      const vd = latestRecord.visit_date || latestRecord.visitDate || '';
                      if (!vt) return vd || 'Unknown';
                      // If vt looks like a full datetime, parse it; otherwise it's already HH:MM
                      if (vt.includes('-') || vt.includes('T') || vt.length > 5) {
                        try { return new Date(vt).toLocaleString(); } catch { /* fallthrough */ }
                      }
                      return `${vd} ${vt}`.trim();
                    })()}
                  </div>
                  {typeof latestRecord.bloodpressure_systolic !== "undefined" && latestRecord.bloodpressure_systolic > 0 && (
                    <div><strong>Blood Pressure:</strong> {latestRecord.bloodpressure_systolic}/{latestRecord.bloodpressure_diastolic} mmHg</div>
                  )}
                  {typeof latestRecord.blood_sugar !== "undefined" && latestRecord.blood_sugar > 0 && (
                    <div><strong>Blood Glucose:</strong> {latestRecord.blood_sugar} mg/dL</div>
                  )}
                  {latestRecord.condition_notes && (
                    <div><strong>Notes:</strong> {latestRecord.condition_notes}</div>
                  )}
                </div>
              ) : (
                <div>No record found for this visit.</div>
              )}
            </div>
          </div>
        )}
        {selectedSchedule.scheduleStatus === "scheduled" && !selectedScheduleIsDue && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            This visit becomes available on {selectedSchedule.visitDate}. You can complete it after that date.
          </div>
        )}

        {selectedSchedule.scheduleStatus === "scheduled" && selectedScheduleIsDue && (
          <>
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

            {selectedPurpose === "Medication" && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/5 p-3">
                <div className="text-sm text-muted-foreground">
                  This medication visit will be recorded as completed and the medication status will be saved.
                </div>
                {medicationDetails.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medicine & dosage</div>
                    {medicationDetails.map((item) => (
                      <div key={item.id} className="rounded-lg border border-border bg-background/70 p-2.5">
                        <div className="text-sm font-semibold text-foreground">{item.medicationName}</div>
                        <div className="text-sm text-muted-foreground">{item.dosage}</div>
                        {item.instructions ? <div className="mt-1 text-xs text-muted-foreground">{item.instructions}</div> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No medication details found for this resident.</div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitLoading}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {submitLoading ? "Saving…" : selectedPurpose === "Routine Visit" ? "Finish Visit" : "Complete Visit"}
            </button>
          </>
        )}

        {formMessage && (
          <p className="text-sm text-muted-foreground">{formMessage}</p>
        )}
      </form>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">My Assigned Elderly</h3>
            <p className="text-sm text-muted-foreground">
              {nurseName} · {filteredSchedules.length} scheduled visit{filteredSchedules.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              placeholder="Search elder or purpose (e.g. Mary, Blood Pressure)"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="px-3 py-2 rounded-md border border-border bg-muted/50 text-sm w-72 outline-none"
            />
            <div className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
              {filteredSchedules.filter((item) => item.scheduleStatus === "scheduled").length} active
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading schedule details...
        </div>
      ) : schedules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No schedules are currently assigned to this nurse.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">This week</p>
                <h3 className="text-lg font-semibold text-foreground">Weekly schedule</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {weekDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
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
                  <div key={key} className="rounded-2xl border border-border bg-background p-2.5">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {dayLabel(date)}
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                    <div className="mt-3 space-y-2">
                      {daySchedules.length === 0 ? (
                        <div className="text-xs text-muted-foreground">No visits</div>
                      ) : daySchedules.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedScheduleId(item.id)}
                          className={`w-full overflow-hidden rounded-2xl border px-2.5 py-2 text-left transition ${selectedScheduleId === item.id ? "border-primary bg-primary/5" : "border-border/70 bg-white hover:bg-slate-50"}`}
                        >
                          <div className="flex min-w-0 flex-col gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-xs font-semibold text-foreground">{item.purpose}</div>
                              <div className="truncate text-[11px] text-muted-foreground">{item.elderlyName}</div>
                              <div className="text-[11px] text-muted-foreground">{item.visitTime}</div>
                            </div>
                            <div className="flex justify-start">
                              <span className={statusBadgeClasses(item.scheduleStatus)}>
                                {statusLabel(item.scheduleStatus)}
                              </span>
                            </div>
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
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              {selectedDetails}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Select a schedule from the week to open the form.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
