import { useEffect, useRef, useState } from "react";
import { Bell, Camera, ChevronDown, LogOut, Pill, Trash2, UserCircle } from "lucide-react";
import { getAdminProfile, updateAdminAvatar } from "../api/auth";
import type { AdminProfile } from "../api/auth";
import { getMedicationAssignments } from "../api/medications";
import type { MedicationAssignment } from "../api/medications";

interface TopBarProps {
  title: string;
  subtitle?: string;
  adminName: string;
  adminProfile?: {
    id?: number;
    name: string;
    username?: string;
    email?: string | null;
    avatar?: string;
  };
  signedInAt?: string;
  onSignOut?: () => void;
}

function formatSignedInAt(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

export function TopBar({ title, subtitle, adminName, adminProfile, signedInAt, onSignOut }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(
    adminProfile?.username
      ? {
          id: adminProfile.id || 0,
          username: adminProfile.username,
          name: adminProfile.name,
          email: adminProfile.email || null,
          avatar: adminProfile.avatar || "",
          status: "active",
        }
      : null
  );
  const [photoSaving, setPhotoSaving] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [medicationNotifications, setMedicationNotifications] = useState<MedicationAssignment[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const avatarSrc = profile
    ? profile.avatar || "https://i.pravatar.cc/80?img=33"
    : adminProfile?.avatar || "https://i.pravatar.cc/80?img=33";
  const profileUsername = profile?.username || adminProfile?.username || adminName;
  const pendingMedicationCount = medicationNotifications.filter((item) =>
    item.complianceStatus === "Pending" || item.complianceStatus === "Due Soon"
  ).length;

  useEffect(() => {
    if (!menuOpen && !notificationsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (!menuRef.current?.contains(target)) {
        setMenuOpen(false);
      }

      if (!notificationsRef.current?.contains(target)) {
        setNotificationsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen, notificationsOpen]);

  useEffect(() => {
    const username = adminProfile?.username || adminName;
    if (!username) return;

    let ignore = false;

    getAdminProfile(username)
      .then((nextProfile) => {
        if (!ignore) setProfile(nextProfile);
      })
      .catch((error) => {
        console.error("Failed to load admin profile.", error);
      });

    return () => {
      ignore = true;
    };
  }, [adminName, adminProfile?.username]);

  useEffect(() => {
    let ignore = false;

    const loadNotifications = () => {
      getMedicationAssignments()
        .then(({ medications }) => {
          if (!ignore) setMedicationNotifications(medications.slice(0, 8));
        })
        .catch((error) => {
          console.error("Failed to load medication notifications.", error);
        });
    };

    loadNotifications();
    const interval = window.setInterval(loadNotifications, 15000);

    return () => {
      ignore = true;
      window.clearInterval(interval);
    };
  }, []);

  const saveAvatar = async (avatar: string) => {
    const adminId = profile?.id || adminProfile?.id;
    if (!adminId) return;

    setPhotoSaving(true);
    try {
      const nextProfile = await updateAdminAvatar(adminId, avatar);
      setProfile(nextProfile);
    } catch (error) {
      console.error("Failed to update admin photo.", error);
    } finally {
      setPhotoSaving(false);
    }
  };

  const handlePhotoUpload = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        saveAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="flex items-center justify-between px-6 py-3 border-b bg-white flex-shrink-0"
      style={{ borderColor: "rgba(0,0,0,0.07)" }}
    >
      <div>
        <h1 className="text-lg" style={{ color: "#1a2b42", fontWeight: 700 }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs" style={{ color: "#6b7a99" }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((open) => !open)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors hover:bg-gray-50"
            style={{ borderColor: "rgba(0,0,0,0.08)", color: "#6b7a99" }}
            title="Medication notifications"
          >
            <Bell size={17} />
            {pendingMedicationCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] text-white" style={{ backgroundColor: "#ef4444" }}>
                {pendingMedicationCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-white shadow-xl" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <div className="border-b px-4 py-3" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                <div className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Medication notifications</div>
                <div className="text-xs" style={{ color: "#6b7a99" }}>Assigned medications and nurse report status</div>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {medicationNotifications.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs" style={{ color: "#6b7a99" }}>No medication notifications.</div>
                ) : (
                  medicationNotifications.map((item) => (
                    <div key={item.id} className="rounded-lg px-3 py-2 hover:bg-gray-50">
                      <div className="flex items-start gap-2">
                        <Pill size={14} className="mt-0.5 flex-shrink-0" style={{ color: "#2563eb" }} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>{item.medicationName}</div>
                          <div className="text-xs" style={{ color: "#6b7a99" }}>{item.elderlyName} · {item.nurseName}</div>
                          <div className="text-xs" style={{ color: "#6b7a99" }}>{item.scheduledDate} at {item.scheduledTime}</div>
                        </div>
                        <span className="rounded-full px-2 py-0.5 text-[10px]" style={{
                          backgroundColor: item.complianceStatus === "Taken" ? "#dcfce7" : item.complianceStatus === "Missed" ? "#fee2e2" : "#fef3c7",
                          color: item.complianceStatus === "Taken" ? "#15803d" : item.complianceStatus === "Missed" ? "#dc2626" : "#d97706",
                          fontWeight: 700,
                        }}>
                          {item.complianceStatus}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-gray-50"
          >
            <img
              src={avatarSrc}
              alt={adminName}
              className="w-9 h-9 rounded-full object-cover border-2"
              style={{ borderColor: "#dbeafe" }}
            />
            <div className="hidden sm:block text-left">
              <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>
                {adminName}
              </div>
              <div className="text-xs" style={{ color: "#6b7a99" }}>
                Admin
              </div>
            </div>
            <ChevronDown
              size={13}
              className="transition-transform"
              style={{ color: "#9ca3af", transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border bg-white shadow-xl"
              style={{ borderColor: "rgba(0,0,0,0.08)" }}
            >
              <div className="p-4 border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                <div className="flex items-center gap-3">
                  <img
                    src={avatarSrc}
                    alt={adminName}
                    className="h-14 w-14 rounded-full border-2 object-cover"
                    style={{ borderColor: "#dbeafe" }}
                  />
                  <label
                    className="absolute ml-9 mt-8 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 bg-white shadow-sm hover:bg-blue-50"
                    style={{ borderColor: "#fff", color: "#2563eb" }}
                    title="Upload admin photo"
                  >
                    <Camera size={13} />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handlePhotoUpload(event.target.files?.[0])}
                    />
                  </label>
                  <div className="min-w-0">
                    <div className="truncate text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>
                      {profileUsername}
                    </div>
                    <div className="truncate text-xs" style={{ color: "#6b7a99" }}>
                      {profile?.name || adminProfile?.name || "Admin"}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => saveAvatar("")}
                    disabled={photoSaving || !(profile?.avatar || adminProfile?.avatar)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ color: "#dc2626" }}
                  >
                    <Trash2 size={12} />
                    {photoSaving ? "Saving..." : "Remove photo"}
                  </button>
                </div>
              </div>

              <div className="p-3">
                <div className="mb-2 flex items-center gap-2 px-2 text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>
                  <UserCircle size={14} style={{ color: "#2563eb" }} />
                  Admin profile details
                </div>
                <ProfileRow label="Admin ID" value={profile?.id ? String(profile.id) : adminProfile?.id ? String(adminProfile.id) : "-"} />
                <ProfileRow label="Username" value={profileUsername} />
                <ProfileRow label="Name" value={profile?.name || adminProfile?.name || "-"} />
                <ProfileRow label="Email" value={profile?.email || adminProfile?.email || "-"} />
                <ProfileRow label="Signed in" value={formatSignedInAt(signedInAt)} />
              </div>

              <div className="border-t p-2" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut?.();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-red-50"
                  style={{ color: "#dc2626", fontWeight: 600 }}
                >
                  <LogOut size={14} />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5">
      <span className="text-xs" style={{ color: "#6b7a99" }}>{label}</span>
      <span className="max-w-[150px] break-words text-right text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}
