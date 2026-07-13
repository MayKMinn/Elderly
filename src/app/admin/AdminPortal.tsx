import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Dashboard } from "./Dashboard";
import { ManageProfiles } from "./ManageProfiles";
import { Schedules } from "./Schedules";
import { Medications } from "./Medications";
import { Reports } from "./Reports";
import { LoginHistory } from "./LoginHistory";

type Page =
  | "dashboard"
  | "manage-profiles"
  | "schedules"
  | "medications"
  | "reports"
  | "login-history"
  | "settings";

type ProfileTab = "elderly" | "nurse";

interface AdminPortalProps {
  adminName: string;
  adminProfile?: {
    id?: number;
    name: string;
    username?: string;
    email?: string | null;
  };
  signedInAt?: string;
  onSignOut?: () => void;
}

const adminPageStorageKey = "elderease.admin.currentPage";
const adminProfileTabStorageKey = "elderease.admin.profileTab";

const pages: Page[] = ["dashboard", "manage-profiles", "schedules", "medications", "reports", "login-history", "settings"];
const profileTabs: ProfileTab[] = ["elderly", "nurse"];

function readSavedPage() {
  const saved = localStorage.getItem(adminPageStorageKey);
  return pages.includes(saved as Page) ? (saved as Page) : "dashboard";
}

function readSavedProfileTab() {
  const saved = localStorage.getItem(adminProfileTabStorageKey);
  return profileTabs.includes(saved as ProfileTab) ? (saved as ProfileTab) : "elderly";
}

export function AdminPortal({ adminName, adminProfile, signedInAt, onSignOut }: AdminPortalProps) {
  const [currentPage, setCurrentPageState] = useState<Page>(readSavedPage);
  const [profileTab, setProfileTabState] = useState<ProfileTab>(readSavedProfileTab);

  function setCurrentPage(page: Page) {
    localStorage.setItem(adminPageStorageKey, page);
    setCurrentPageState(page);
  }

  function setProfileTab(tab: ProfileTab) {
    localStorage.setItem(adminProfileTabStorageKey, tab);
    setProfileTabState(tab);
  }

  const pageTitle: Record<Page, string> = {
    dashboard: "Admin Dashboard",
    "manage-profiles": "Manage Profiles",
    schedules: "Set Up Schedules",
    medications: "Assign Medications",
    reports: "Generate Reports",
    "login-history": "Login History",
    settings: "Settings",
  };

  const pageSubtitle: Record<Page, string> = {
    dashboard: `Welcome back, ${adminName}! Here's what's happening today.`,
    "manage-profiles": "View and manage elderly residents and caregiver profiles.",
    schedules: "Dashboard > Schedules > Set Up Schedules",
    medications: "Dashboard > Medications > Assign Medications",
    reports: "Dashboard > Reports > Generate Reports",
    "login-history": "View admin sign-in history.",
    settings: "Configure system settings.",
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: "#f0f4f8" }}>
      <Sidebar
        currentPage={currentPage}
        profileTab={profileTab}
        onNavigate={setCurrentPage}
        onProfileTabChange={(tab) => {
          setProfileTab(tab);
          setCurrentPage("manage-profiles");
        }}
        signedInAt={signedInAt}
        onLogout={onSignOut}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title={pageTitle[currentPage]}
          adminName={adminName}
          adminProfile={adminProfile}
          signedInAt={signedInAt}
          onSignOut={onSignOut}
          subtitle={
            currentPage === "schedules" || currentPage === "medications" || currentPage === "reports"
              ? undefined
              : pageSubtitle[currentPage]
          }
        />

        {currentPage === "dashboard" && (
          <Dashboard
            onNavigate={setCurrentPage}
            onProfileTabChange={setProfileTab}
          />
        )}
        {currentPage === "manage-profiles" && (
          <ManageProfiles
            activeTab={profileTab}
            onTabChange={setProfileTab}
            onNavigate={setCurrentPage}
          />
        )}
        {currentPage === "schedules" && (
          <Schedules
            onNavigate={setCurrentPage}
            onOpenNurses={() => {
              setProfileTab("nurse");
              setCurrentPage("manage-profiles");
            }}
          />
        )}
        {currentPage === "medications" && <Medications onNavigate={setCurrentPage} />}
        {currentPage === "reports" && <Reports onNavigate={setCurrentPage} />}
        {currentPage === "login-history" && <LoginHistory />}
        {currentPage === "settings" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#eff6ff" }}>
                <span className="text-2xl">⚙️</span>
              </div>
              <p className="text-sm" style={{ color: "#6b7a99" }}>Settings coming soon.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
