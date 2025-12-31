import { LoginPage } from "../../pages/LoginPage";
import { AuthProvider } from "@/context/AuthContext";

export default function LoginPageExample() {
  return (
    <AuthProvider>
      <LoginPage onSwitchToSignup={() => console.log("Switch to signup")} />
    </AuthProvider>
  );
}



