import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await signup(name, email, password);
            navigate("/verify-otp", { state: { email } });
        } catch (err) {
            setError(err.response?.data?.message || "Could not create account");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-5">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <Link to="/" className="font-serif text-2xl text-slate-900">
                        Scheduler<span className="text-red-400">.</span>
                    </Link>
                    <p className="text-gray-500 text-sm mt-2">Create your free account</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white border border-black/[0.06] rounded-2xl p-6 space-y-4">
                    {error && (
                        <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-slate-900 block mb-1.5">Name</label>
                        <input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-black/10 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-300"
                            placeholder="Jane Doe"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-900 block mb-1.5">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-black/10 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-300"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-900 block mb-1.5">Password</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-black/10 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-300"
                            placeholder="At least 6 characters"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-red-500 text-white rounded-full font-medium hover:bg-red-600 py-2.5 text-sm transition-all disabled:opacity-60"
                    >
                        {loading ? "Creating account..." : "Create account"}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-5">
                    Already have an account?{" "}
                    <Link to="/login" className="text-red-500 font-medium hover:text-red-600">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    );
}