import { useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, LogOut, Trash2, UserCircle } from "lucide-react";
import { getAdminProfile, updateAdminAvatar } from "../api/auth";
import type { AdminProfile } from "../api/auth";

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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const avatarSrc = profile
    ? profile.avatar || "https://i.pravatar.cc/80?img=33"
    : adminProfile?.avatar || "https://i.pravatar.cc/80?img=33";
  const profileUsername = profile?.username || adminProfile?.username || adminName;

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (!menuRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

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
