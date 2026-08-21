import { Link } from "react-router-dom";

export default function Navbar() {
    return (
        <nav className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">
            <Link to="/" className="font-serif text-xl text-slate-900">
                Scheduler<span className="text-red-400">.</span>
            </Link>
            <div className="flex items-center gap-3">
                <Link to="/login" className="text-sm text-gray-500 hover:text-slate-900 transition-colors px-4 py-2">
                    Log in
                </Link>
                <Link
                    to="/signup"
                    className="bg-red-500 text-white rounded-full font-medium hover:bg-red-600 text-sm px-5 py-2.5 transition-all"
                >
                    Sign up
                </Link>
            </div>
        </nav>
    );
}