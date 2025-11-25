import { SignupPage } from "../SignupPage";
import { AuthProvider } from "@/context/AuthContext";

export default function SignupPageExample() {
  return (
    <AuthProvider>
      <SignupPage onSwitchToLogin={() => console.log("Switch to login")} />
    </AuthProvider>
  );
}
