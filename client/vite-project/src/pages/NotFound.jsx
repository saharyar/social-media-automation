import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-5">
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                className="font-serif text-6xl text-slate-900 mb-3"
            >
                404
            </motion.h1>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-gray-500 mb-6"
            >
                This page doesn't exist.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                <Link to="/" className="bg-red-500 text-white rounded-full font-medium hover:bg-red-600 px-6 py-3 text-sm transition-colors">
                    Back home
                </Link>
            </motion.div>
        </div>
    );
}