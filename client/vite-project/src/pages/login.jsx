import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.message || "Invalid email or password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-5">
            <motion.div className="w-full max-w-sm" variants={container} initial="hidden" animate="show">
                <motion.div variants={item} className="text-center mb-8">
                    <Link to="/" className="font-serif text-2xl text-slate-900">
                        Scheduler<span className="text-red-400">.</span>
                    </Link>
                    <p className="text-gray-500 text-sm mt-2">Log in to your account</p>
                </motion.div>

                <motion.form
                    variants={item}
                    onSubmit={handleSubmit}
                    className="bg-white border border-black/6 rounded-2xl p-6 space-y-4"
                >
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 overflow-hidden"
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div>
                        <label className="text-sm font-medium text-slate-900 block mb-1.5">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-black/10 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-300 transition-shadow"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-900 block mb-1.5">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-black/10 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-300 transition-shadow"
                            placeholder="••••••••"
                        />
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full bg-red-500 text-white rounded-full font-medium hover:bg-red-600 py-2.5 text-sm transition-colors disabled:opacity-60"
                    >
                        {loading ? "Logging in..." : "Log in"}
                    </motion.button>
                </motion.form>

                <motion.p variants={item} className="text-center text-sm text-gray-500 mt-5">
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-red-500 font-medium hover:text-red-600">
                        Sign up
                    </Link>
                </motion.p>
            </motion.div>
        </div>
    );
}