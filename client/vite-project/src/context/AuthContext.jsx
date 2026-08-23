import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            setLoading(false);
            return;
        }
        api.get("/auth/me")
            .then((res) => setUser(res.data.user))
            .catch(() => localStorage.removeItem("token"))
            .finally(() => setLoading(false));
    }, []);

    const login = async (email, password) => {
        const res = await api.post("/auth/login", { email, password });
        localStorage.setItem("token", res.data.token);
        setUser(res.data.user);
        return res.data.user;
    };

    const signup = async (name, email, password) => {
        const res = await api.post("/auth/register", { name, email, password });
        localStorage.setItem("token", res.data.token);
        setUser(res.data.user);
        return res.data.user;
    };

    // Called after successful OTP verification — logs the user in
    // the same way login()/signup() do, so ProtectedRoute recognizes them immediately.
    const setAuthFromVerification = (token, user) => {
        localStorage.setItem("token", token);
        setUser(user);
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout, setAuthFromVerification }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);