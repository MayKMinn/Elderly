import { X, Phone, MapPin, Heart, AlertTriangle, User } from "lucide-react";
import type { ElderlyProfile } from "./data";

interface ViewProfileModalProps {
  profile: ElderlyProfile;
  onClose: () => void;
  onEdit: () => void;
}

export function ViewProfileModal({ profile, onClose, onEdit }: ViewProfileModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <div>
            <h2 style={{ color: "#1a2b42", fontWeight: 700 }}>View Elderly Profile</h2>
            <p className="text-xs mt-0.5" style={{ color: "#6b7a99" }}>
              {profile.id} · Registered {profile.admissionDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X size={16} style={{ color: "#6b7a99" }} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[70vh]">
          {/* Profile Header */}
          <div className="flex items-center gap-3 mb-5">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-14 h-14 rounded-full object-cover border-2"
              style={{ borderColor: "#dbeafe" }}
            />
            <div>
              <div style={{ color: "#1a2b42", fontWeight: 700 }}>{profile.name}</div>
              <div className="text-xs" style={{ color: "#6b7a99" }}>
                {profile.age} yrs · {profile.gender}
              </div>
              <span
                className="inline-block text-xs px-2 py-0.5 rounded-full mt-1"
                style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}
              >
                {profile.status}
              </span>
            </div>
          </div>

          {/* Personal Info */}
          <Section title="Personal Information" icon={<User size={14} />}>
            <InfoRow label="Full Name" value={profile.name} />
            <InfoRow label="Date of Birth" value={profile.dob} />
            <InfoRow label="Gender" value={profile.gender} />
            <div className="flex items-start gap-2 py-2 border-b" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
              <Phone size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#6b7a99" }} />
              <div className="flex-1">
                <span className="text-xs" style={{ color: "#6b7a99" }}>Phone</span>
                <div className="text-xs mt-0.5" style={{ color: "#1a2b42", fontWeight: 500 }}>{profile.phone}</div>
              </div>
            </div>
            <div className="flex items-start gap-2 py-2" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
              <MapPin size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#6b7a99" }} />
              <div className="flex-1">
                <span className="text-xs" style={{ color: "#6b7a99" }}>Address</span>
                <div className="text-xs mt-0.5" style={{ color: "#1a2b42", fontWeight: 500 }}>{profile.address}</div>
              </div>
            </div>
          </Section>

          {/* Medical Info */}
          <Section title="Medical Information" icon={<Heart size={14} />}>
            <InfoRow label="Medical Condition" value={profile.medicalCondition} />
            <InfoRow label="Blood Type" value={profile.bloodType} />
            <div className="flex items-start gap-2 py-2" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#f97316" }} />
              <div className="flex-1">
                <span className="text-xs" style={{ color: "#6b7a99" }}>Allergies</span>
                <div className="text-xs mt-0.5" style={{ color: "#ef4444", fontWeight: 500 }}>{profile.allergies}</div>
              </div>
            </div>
          </Section>

          {/* Emergency Contact */}
          <Section title="Emergency Contact" icon={<Phone size={14} />}>
            <InfoRow label="Contact Name" value={profile.emergencyContact} />
            <InfoRow label="Relationship" value={profile.relationship} />
            <InfoRow label="Phone" value={profile.emergencyPhone} />
          </Section>

          {/* Status */}
          <Section title="Status Details" icon={<User size={14} />}>
            <InfoRow label="Admission Date" value={profile.admissionDate} />
            <InfoRow label="Status" value={profile.status} />
          </Section>
        </div>

        <div
          className="flex gap-2 p-4 border-t"
          style={{ borderColor: "rgba(0,0,0,0.07)" }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border text-sm transition-colors hover:bg-gray-50"
            style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="flex-1 py-2 rounded-lg text-sm text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#2563eb" }}
          >
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div
        className="flex items-center gap-1.5 mb-2 pb-1 border-b"
        style={{ borderColor: "rgba(0,0,0,0.07)" }}
      >
        <span style={{ color: "#2563eb" }}>{icon}</span>
        <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>
          {title}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between items-start py-1.5 border-b"
      style={{ borderColor: "rgba(0,0,0,0.05)" }}
    >
      <span className="text-xs" style={{ color: "#6b7a99" }}>
        {label}
      </span>
      <span className="text-xs text-right ml-4" style={{ color: "#1a2b42", fontWeight: 500 }}>
        {value}
      </span>
    </div>
  );
}
