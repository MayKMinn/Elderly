import { useEffect, useState } from "react";
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Droplets, HeartPulse, IdCard, Phone, ShieldAlert, UserRound } from "lucide-react";

export type Status = "stable" | "attention" | "critical";

export interface Resident {
  id: number;
  name: string;
  age: number;
  gender: string;
  birthdate: string;
  room: string;
  photo: string;
  conditions: string[];
  allergies: string[];
  bloodType: string;
  status: Status;
  emergencyContact: { name: string; relation: string; phone: string };
}

const statusColor: Record<Status, string> = {
  stable: "bg-emerald-100 text-emerald-700",
  attention: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

const statusDot: Record<Status, string> = {
  stable: "bg-emerald-500",
  attention: "bg-amber-400",
  critical: "bg-red-500",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AssignedResidentsSidebar({
  residents,
  scheduleAssignments,
  selectedId,
  onSelect,
}: {
  residents: Resident[];
  scheduleAssignments?: { elderlyId: number | string; visitDate?: string; visitTime?: string; scheduleStatus?: string }[];
  selectedId?: number | null;
  onSelect?: (id: number | null) => void;
}) {
  return (
    <aside className="w-full rounded-3xl border border-border bg-card p-4 lg:w-[340px] lg:flex-shrink-0">
      <div className="mb-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Assigned Elderly</p>
            <p className="text-xs text-muted-foreground mt-1">Select a person to review their essential care information.</p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{residents.length} total</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {residents.map((resident) => {
          const today = new Date().toISOString().slice(0, 10);
          const todays = (scheduleAssignments || []).filter(
            (s) => String(s.elderlyId) === String(resident.id) && s.visitDate === today && s.scheduleStatus === "scheduled"
          );
          const next = (scheduleAssignments || [])
            .filter((s) => String(s.elderlyId) === String(resident.id) && s.scheduleStatus === "scheduled")
            .sort((a, b) => (a.visitDate + (a.visitTime || "")) < (b.visitDate + (b.visitTime || "")) ? -1 : 1)[0];

          return (
            <button
              key={resident.id}
              onClick={() => onSelect?.(selectedId === resident.id ? null : resident.id)}
              aria-pressed={selectedId === resident.id}
              className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${selectedId === resident.id ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/10" : "border-border bg-background hover:border-primary/40 hover:shadow-sm"}`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-muted">
                  <img src={resident.photo} alt={resident.name} className="w-full h-full object-cover" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-card ${statusDot[resident.status]}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{resident.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Age {resident.age}</p>
                <p className="text-xs text-muted-foreground mt-2 truncate">
                  {todays.length > 0 ? `Today · ${todays.length} check${todays.length > 1 ? "s" : ""}` : next ? `Next ${next.visitDate} ${next.visitTime}` : "No upcoming visits"}
                </p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export function ResidentDetailsPanel({
  resident,
  scheduleAssignments = [],
}: {
  resident: Resident | null;
  scheduleAssignments?: { id: number; nurseId: number | string; elderlyId: number | string; visitDate: string; visitTime?: string; scheduleStatus?: string }[];
}) {
  if (!resident) {
    return (
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-gradient-to-br from-background to-muted/30 p-8 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ChevronRight size={20} />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Select an elderly profile</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Choose an assigned elderly person to view their identity and essential medical information.
        </p>
      </div>
    );
  }

  const upcomingSchedules = (scheduleAssignments || []).filter(
    (s) => String(s.elderlyId) === String(resident.id) && s.scheduleStatus === "scheduled"
  );

  return (
    <div className="flex h-full flex-col gap-5 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-background p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-3xl bg-muted shadow-sm ring-4 ring-background">
              <img src={resident.photo} alt={resident.name} className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Elderly profile</p>
              <h2 className="mt-1 text-2xl font-bold text-foreground">{resident.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">ID: {resident.id}</p>
            </div>
          </div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusColor[resident.status]}`}>
              {resident.status}
            </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-background/70 p-5">
            <p className="mb-4 text-sm font-semibold text-foreground">Personal information</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "ID", value: String(resident.id), icon: IdCard },
                { label: "Full name", value: resident.name, icon: UserRound },
                { label: "Age", value: resident.age ? `${resident.age} years` : "Not recorded", icon: CalendarDays },
                { label: "Gender", value: resident.gender || "Not recorded", icon: UserRound },
                { label: "Birthdate", value: resident.birthdate || "Not recorded", icon: CalendarDays },
                { label: "Blood type", value: resident.bloodType || "Not recorded", icon: Droplets },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-3.5">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={17} /></div>
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 break-words text-sm font-semibold text-foreground">{value}</p></div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-5">
              <div className="flex items-center gap-2 text-rose-800"><HeartPulse size={17} /><p className="text-sm font-semibold">Medical conditions</p></div>
              <p className="mt-3 text-sm leading-6 text-rose-700">{resident.conditions.length > 0 ? resident.conditions.join(", ") : "No conditions recorded"}</p>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5">
              <div className="flex items-center gap-2 text-amber-800"><ShieldAlert size={17} /><p className="text-sm font-semibold">Allergies</p></div>
              <p className="mt-3 text-sm leading-6 text-amber-700">{resident.allergies.length > 0 ? resident.allergies.join(", ") : "No allergies recorded"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-background/70 p-5">
            <p className="text-sm font-semibold text-foreground">Emergency Contact</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary font-semibold">
                {initials(resident.emergencyContact.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{resident.emergencyContact.name}</p>
                <p className="text-xs text-muted-foreground">{resident.emergencyContact.relation}</p>
              </div>
            </div>
            <a href={`tel:${resident.emergencyContact.phone}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              <Phone size={14} />
              {resident.emergencyContact.phone || "No phone provided"}
            </a>
          </div>

          <div className="rounded-3xl border border-border bg-background/70 p-5">
            <p className="text-sm font-semibold text-foreground">Upcoming Visits</p>
            <div className="mt-4 space-y-3">
              {upcomingSchedules.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming visits scheduled.</p>
              ) : (
                upcomingSchedules.slice(0, 4).map((schedule) => (
                  <div key={`${schedule.id}-${schedule.visitDate}-${schedule.visitTime}`} className="rounded-3xl border border-border bg-card/70 px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{schedule.visitDate}</p>
                    <p className="text-xs text-muted-foreground mt-1">{schedule.visitTime || "Time not set"}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-background/90 p-5">
        <p className="text-sm font-semibold text-foreground">Care notes</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Keep this view handy to share vital resident details quickly and make note of any recent care changes while you are on shift.
        </p>
      </div>
    </div>
  );
}

export function ResidentsPage({
  residents,
  isLoading = false,
  error = "",
  scheduleAssignments = [],
  selectedResidentId: externalSelectedResidentId,
  onSelectResident,
}: {
  residents: Resident[];
  isLoading?: boolean;
  error?: string;
  scheduleAssignments?: { id: number; nurseId: number | string; elderlyId: number | string; visitDate: string; visitTime?: string; scheduleStatus?: string }[];
  selectedResidentId?: number | null;
  onSelectResident?: (id: number | null) => void;
}) {
  const [selected, setSelected] = useState<Resident | null>(
    externalSelectedResidentId ? residents.find((resident) => resident.id === externalSelectedResidentId) ?? null : null
  );

  useEffect(() => {
    if (externalSelectedResidentId) {
      setSelected(residents.find((resident) => resident.id === externalSelectedResidentId) ?? null);
      return;
    }

    setSelected(null);
  }, [externalSelectedResidentId, residents]);

  if (selected) {
    return (
      <div className="flex flex-col gap-5">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit">
          <ChevronLeft size={14} /> Back to elderly
        </button>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex-shrink-0">
              <img src={selected.photo} alt={selected.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{selected.name}</h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${statusColor[selected.status]}`}>{selected.status}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">Age {selected.age} · {selected.bloodType}</p>
              <div className="flex flex-wrap gap-1.5">
                {selected.conditions.map((condition) => (
                  <span key={condition} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full">{condition}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        {selected.allergies.length > 0 && (
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Known Allergies</p>
              <p className="text-sm text-amber-700">{selected.allergies.join(", ")}</p>
            </div>
          </div>
        )}
        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="font-semibold text-foreground mb-3" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Emergency Contact</h4>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
              {initials(selected.emergencyContact.name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{selected.emergencyContact.name}</p>
              <p className="text-xs text-muted-foreground">{selected.emergencyContact.relation}</p>
            </div>
          </div>
          <a href={`tel:${selected.emergencyContact.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline mt-3">
            <Phone size={13} />{selected.emergencyContact.phone}
          </a>
          {scheduleAssignments && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">Upcoming schedules</h4>
              {(() => {
                const list = scheduleAssignments.filter((s) => String(s.elderlyId) === String(selected.id) && s.scheduleStatus === "scheduled");
                if (list.length === 0) return <p className="text-sm text-muted-foreground">No upcoming schedules.</p>;
                return (
                  <div className="space-y-2">
                    {list.slice(0, 5).map((s) => (
                      <div key={`${s.id}-${s.visitDate}-${s.visitTime}`} className="text-sm text-muted-foreground">{s.visitDate} · {s.visitTime} · {s.scheduleStatus}</div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{residents.length} elderly people assigned to you</p>
      {isLoading && (
        <div className="bg-card border border-border rounded-2xl px-4 py-8 text-center text-sm text-muted-foreground">
          Loading assigned elderly...
        </div>
      )}
      {!isLoading && error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4 text-sm text-red-700">{error}</div>
      )}
      {!isLoading && !error && residents.length === 0 && (
        <div className="bg-card border border-border rounded-2xl px-4 py-8 text-center text-sm text-muted-foreground">
          No elderly residents are assigned to you yet.
        </div>
      )}
      <div className="space-y-3">
        {residents.map((resident) => (
          <button
            key={resident.id}
            onClick={() => {
              setSelected(resident);
              onSelectResident?.(resident.id);
            }}
            className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:shadow-md hover:border-primary/20 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-muted">
                  <img src={resident.photo} alt={resident.name} className="w-full h-full object-cover" />
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${statusDot[resident.status]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{resident.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor[resident.status]}`}>{resident.status}</span>
                </div>
                <p className="text-sm text-muted-foreground">Age {resident.age} · {resident.bloodType}</p>
                <div className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const today = new Date().toISOString().slice(0, 10);
                    const todays = scheduleAssignments.filter((s) => String(s.elderlyId) === String(resident.id) && s.visitDate === today && s.scheduleStatus === "scheduled");
                    const next = scheduleAssignments.filter((s) => String(s.elderlyId) === String(resident.id) && s.scheduleStatus === "scheduled").sort((a, b) => (a.visitDate + (a.visitTime || "")) < (b.visitDate + (b.visitTime || "")) ? -1 : 1)[0];
                    return (
                      <>
                        {todays.length > 0 ? <span className="mr-2">Today: {todays.length} visit{todays.length > 1 ? "s" : ""}</span> : null}
                        {next ? <span>Next: {next.visitDate} {next.visitTime}</span> : <span className="text-muted-foreground">No upcoming visits</span>}
                      </>
                    );
                  })()}
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {resident.conditions.map((condition) => (
                    <span key={condition} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{condition}</span>
                  ))}
                </div>
              </div>
              <ChevronRight size={15} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </div>
            {resident.allergies.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                <AlertCircle size={10} /> Allergies: {resident.allergies.join(", ")}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ResidentsPage;
