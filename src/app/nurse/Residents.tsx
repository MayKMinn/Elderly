import { useEffect, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Phone } from "lucide-react";

export type Status = "stable" | "attention" | "critical";

export interface Resident {
  id: number;
  name: string;
  age: number;
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
  onSelect?: (id: number) => void;
}) {
  return (
    <aside className="w-72 border-r border-border p-4 hidden md:block">
      <h4 className="text-sm font-semibold mb-3">Assigned Residents</h4>
      <div className="space-y-2">
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
              onClick={() => onSelect?.(resident.id)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all ${selectedId === resident.id ? "bg-primary/5 ring-1 ring-primary/10" : "hover:bg-muted"}`}
            >
              <div className="w-11 h-11 rounded-full overflow-hidden bg-muted flex-shrink-0">
                <img src={resident.photo} alt={resident.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{resident.name}</p>
                <p className="text-xs text-muted-foreground">Room {resident.room} · Age {resident.age}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {todays.length > 0 ? `Today: ${todays.length}` : next ? `Next: ${next.visitDate} ${next.visitTime}` : "No upcoming visits"}
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
        <h3 className="text-lg font-semibold text-foreground">Select a resident</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Choose an assigned resident from the left to view their profile, allergies, and upcoming visits.
        </p>
      </div>
    );
  }

  const upcomingSchedules = (scheduleAssignments || []).filter(
    (s) => String(s.elderlyId) === String(resident.id) && s.scheduleStatus === "scheduled"
  );

  return (
    <div className="flex h-full flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 rounded-2xl bg-muted/40 p-4 sm:flex-row sm:items-start">
        <div className="h-16 w-16 overflow-hidden rounded-2xl bg-muted shadow-sm">
          <img src={resident.photo} alt={resident.name} className="h-full w-full object-cover" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              {resident.name}
            </h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusColor[resident.status]}`}>
              {resident.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Age {resident.age} · Room {resident.room} · {resident.bloodType}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {resident.conditions.length > 0 ? resident.conditions.map((condition) => (
              <span key={condition} className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700">
                {condition}
              </span>
            )) : <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">No listed conditions</span>}
          </div>
        </div>
      </div>

      {resident.allergies.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">Known Allergies</p>
          </div>
          <p className="mt-2 text-sm text-amber-700">{resident.allergies.join(", ")}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-background/70 p-4">
          <h4 className="mb-3 text-sm font-semibold text-foreground">Emergency Contact</h4>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials(resident.emergencyContact.name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{resident.emergencyContact.name}</p>
              <p className="text-xs text-muted-foreground">{resident.emergencyContact.relation}</p>
            </div>
          </div>
          <a href={`tel:${resident.emergencyContact.phone}`} className="mt-3 flex items-center gap-2 text-sm text-primary hover:underline">
            <Phone size={13} />{resident.emergencyContact.phone || "No phone provided"}
          </a>
        </div>

        <div className="rounded-2xl border border-border bg-background/70 p-4">
          <h4 className="mb-3 text-sm font-semibold text-foreground">Upcoming Visits</h4>
          {upcomingSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming visits scheduled.</p>
          ) : (
            <div className="space-y-2">
              {upcomingSchedules.slice(0, 4).map((schedule) => (
                <div key={`${schedule.id}-${schedule.visitDate}-${schedule.visitTime}`} className="rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{schedule.visitDate}</p>
                  <p className="mt-0.5">{schedule.visitTime || "Time not set"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
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
          <ChevronLeft size={14} /> Back to residents
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
              <p className="text-sm text-muted-foreground mb-3">Age {selected.age} · Room {selected.room} · {selected.bloodType}</p>
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
      <p className="text-sm text-muted-foreground">{residents.length} residents assigned to you</p>
      {isLoading && (
        <div className="bg-card border border-border rounded-2xl px-4 py-8 text-center text-sm text-muted-foreground">
          Loading assigned residents...
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
                <p className="text-sm text-muted-foreground">Age {resident.age} · Room {resident.room} · {resident.bloodType}</p>
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
