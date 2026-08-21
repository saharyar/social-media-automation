import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon, DotIcon } from "lucide-react";
import { motion } from "framer-motion";
import { gsap } from "gsap";

const stats = [
    { val: 12, label: "Scheduled" },
    { val: 48, label: "Published" },
    { val: 4, label: "Accounts" },
    { val: 3, label: "AI Rules" },
];

const activity = [
    { text: "Post published to LinkedIn & Twitter", time: "2m ago" },
    { text: "AI replied to 3 comments", time: "15m ago" },
    { text: "New post scheduled for tomorrow 9am", time: "1h ago" },
];

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const item = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export default function Hero() {
    const glowRef = useRef(null);
    const statRefs = useRef([]);

    useEffect(() => {
        const tween = gsap.to(glowRef.current, {
            scale: 1.12,
            opacity: 0.85,
            duration: 3.2,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
        });
        return () => tween.kill();
    }, []);

    useEffect(() => {
        const ctx = gsap.context(() => {
            statRefs.current.forEach((el, i) => {
                if (!el) return;
                const target = stats[i].val;
                const counter = { value: 0 };
                gsap.to(counter, {
                    value: target,
                    duration: 1.4,
                    delay: 0.9 + i * 0.12,
                    ease: "power2.out",
                    onUpdate: () => { el.textContent = Math.round(counter.value); },
                });
            });
        });
        return () => ctx.revert();
    }, []);

    return (
        <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[length:56px_56px] pointer-events-none" />

            <div
                ref={glowRef}
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[560px] bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.08)_0%,transparent_70%)] pointer-events-none"
                style={{ opacity: 0.6 }}
            />

            <motion.div
                className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-20 pb-12 text-center"
                variants={container}
                initial="hidden"
                animate="show"
            >
                <motion.div
                    variants={item}
                    className="inline-flex items-center gap-2 bg-red-50 border border-red-100 text-red-500 text-sm px-3.5 py-1.5 rounded-full mb-8"
                >
                    <motion.span
                        className="size-1.5 bg-red-400 rounded-full"
                        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    />
                    AI-Powered Social Media Automation
                </motion.div>

                <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl xl:text-8xl text-slate-900">
                    <motion.span variants={item} className="block">Schedule smarter.</motion.span>
                    <motion.span variants={item} className="block text-red-400 italic">Grow faster.</motion.span>
                </h1>

                <motion.p variants={item} className="mt-7 text-gray-500 max-w-2xl mx-auto">
                    Scheduler lets you create, schedule, and auto-engage across all your social platforms — powered by AI that writes your captions and replies for you.
                </motion.p>

                <motion.div variants={item} className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                        <Link
                            to="/login"
                            className="bg-red-500 text-white rounded-full font-medium hover:bg-red-600 hover:shadow-[0_8px_24px_rgba(239,68,68,0.35)] inline-flex items-center gap-2 text-[15px] px-8 py-3.5 w-full sm:w-auto justify-center transition-all"
                        >
                            Start for free <ArrowRightIcon className="size-4" />
                        </Link>
                    </motion.div>
                    <motion.a
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        href="#how-it-works"
                        className="bg-transparent text-[#333] border-[1.5px] border-black/10 rounded-full font-medium hover:bg-black/5 hover:border-black/20 inline-flex items-center gap-2 text-[15px] px-8 py-3.5 w-full sm:w-auto backdrop-blur justify-center transition-all"
                    >
                        See how it works
                    </motion.a>
                </motion.div>

                <motion.p variants={item} className="mt-5 text-xs text-gray-400">
                    No credit card required · Free forever plan available
                </motion.p>
            </motion.div>

            <motion.div
                className="relative max-w-5xl mx-auto px-5 sm:px-8 pb-0"
                initial={{ opacity: 0, y: 60, rotateX: 8 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ perspective: 1200 }}
            >
                <div className="rounded-t-2xl overflow-hidden border border-gray-200 border-b-0">
                    <div className="flex items-center gap-2 px-4 py-3" style={{ background: "#f0f0f0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                        <div className="w-3 h-3 rounded-full bg-emerald-400" />
                        <div className="flex-1 mx-4 rounded-md h-5 max-w-xs bg-white/80" />
                    </div>

                    <div className="p-6" style={{ background: "#f7f7f7" }}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                            {stats.map((s, i) => (
                                <motion.div
                                    key={s.label}
                                    className="rounded-xl p-4 bg-white"
                                    style={{ border: "1px solid rgba(0,0,0,0.06)" }}
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.7 + i * 0.08 }}
                                >
                                    <div ref={(el) => (statRefs.current[i] = el)} className="text-2xl font-bold text-gray-900 tabular-nums">0</div>
                                    <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="rounded-xl p-4 space-y-3 bg-white" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Recent Activity</div>
                            {activity.map((it, i) => (
                                <motion.div
                                    key={it.text}
                                    className="flex items-center gap-3"
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.45, delay: 1.1 + i * 0.1 }}
                                >
                                    <DotIcon className="size-5 text-gray-300" />
                                    <span className="text-sm text-gray-600 flex-1">{it.text}</span>
                                    <span className="text-xs text-gray-300 shrink-0">{it.time}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}