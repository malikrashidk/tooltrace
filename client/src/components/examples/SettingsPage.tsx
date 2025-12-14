import { SettingsPage } from "../SettingsPage";
import { AuthProvider } from "@/context/AuthContext";

export default function SettingsPageExample() {
  return (
    <AuthProvider>
      <div className="p-6 bg-background min-h-screen">
        <SettingsPage />
      </div>
    </AuthProvider>
  );
}



