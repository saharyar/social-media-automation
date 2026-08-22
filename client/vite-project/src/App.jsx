import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/login";
import Signup from "./pages/Signup";
import VerifyOtp from "./pages/VerifyOtp";
import Dashboard from "./pages/Dashboard";
import Composer from "./pages/Composer";
import Calendar from "./pages/Calendar";
import ConnectedAccounts from "./pages/ConnectedAccounts";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

export default function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/verify-otp" element={<VerifyOtp />} />

                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/composer" element={<ProtectedRoute><Composer /></ProtectedRoute>} />
                <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
                <Route path="/accounts" element={<ProtectedRoute><ConnectedAccounts /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
            </Routes>
        </AuthProvider>
    );
}