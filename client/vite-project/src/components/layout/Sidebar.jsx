import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboardIcon, PenSquareIcon, CalendarIcon, LinkIcon, SettingsIcon, LogOutIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
    { to: "/composer", label: "Composer", icon: PenSquareIcon },
    { to: "/calendar", label: "Calendar", icon: CalendarIcon },
    { to: "/accounts", label: "Connected Accounts", icon: LinkIcon },
    { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-64 shrink-0 h-screen sticky top-0 border-r border-black/[0.06] flex flex-col bg-white"
        >
            <div className="px-6 py-6 border-b border-black/[0.06]">
                <span className="font-serif text-xl text-slate-900">
                    Scheduler<span className="text-red-400">.</span>
                </span>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
                {links.map(({ to, label, icon: Icon }) => {
                    const isActive = location.pathname === to;
                    return (
                        <NavLink key={to} to={to} className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium">
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active"
                                    className="absolute inset-0 bg-red-50 rounded-lg"
                                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                                />
                            )}
                            <span className={`relative flex items-center gap-3 z-10 ${isActive ? "text-red-500" : "text-gray-500"}`}>
                                <Icon className="size-4" />
                                {label}
                            </span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="px-3 py-4 border-t border-black/[0.06]">
                <div className="px-3 py-2 mb-1">
                    <div className="text-sm font-medium text-slate-900 truncate">{user?.name || "Account"}</div>
                    <div className="text-xs text-gray-400 truncate">{user?.email}</div>
                </div>
                <motion.button
                    whileHover={{ x: 3 }}
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-black/[0.03] hover:text-red-500 transition-colors"
                >
                    <LogOutIcon className="size-4" />
                    Log out
                </motion.button>
            </div>
        </motion.aside>
    );
}