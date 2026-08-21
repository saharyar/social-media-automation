import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
    PenSquareIcon,
    DotIcon,
    CalendarClockIcon,
    CheckCircle2Icon,
    LinkIcon,
    Loader2Icon,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const STAT_META = [
    { key: "scheduled", label: "Scheduled", icon: CalendarClockIcon },
    { key: "published", label: "Published", icon: CheckCircle2Icon },
    { key: "accounts", label: "Accounts Connected", icon: LinkIcon },
];

const STATUS_STYLES = {
    draft: { label: "Draft", chip: "bg-gray-50 text-gray-500 border-gray-100" },
    scheduled: { label: "Scheduled", chip: "bg-sky-50 text-sky-600 border-sky-100" },
    published: { label: "Published", chip: "bg-green-50 text-green-600 border-green-100" },
    failed: { label: "Failed", chip: "bg-red-50 text-red-600 border-red-100" },
};

function timeAgo(dateInput) {
    const seconds = Math.floor((Date.now() - new Date(dateInput).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

function formatScheduledFor(dateInput) {
    return new Date(dateInput).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default function Dashboard() {
    const statRefs = useRef([]);
    const emptyIconRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [counts, setCounts] = useState({ scheduled: 0, published: 0, accounts: 0 });
    const [recentPosts, setRecentPosts] = useState([]);

    useEffect(() => {
        let cancelled = false;

        const loadDashboard = async () => {
            setLoading(true);
            setError("");
            try {
                const [postsRes, accountsRes] = await Promise.all([
                    api.get("/posts"),
                    api.get("/accounts"),
                ]);
                if (cancelled) return;

                const posts = postsRes.data.posts || [];
                const accounts = accountsRes.data || {};

                const scheduled = posts.filter((p) => p.status === "scheduled").length;
                const published = posts.filter((p) => p.status === "published").length;
                const connectedCount = Object.values(accounts).filter(Boolean).length;

                setCounts({ scheduled, published, accounts: connectedCount });
                setRecentPosts(posts.slice(0, 5)); // getPosts already sorts by createdAt desc
            } catch (err) {
                if (!cancelled) {
                    setError(err.response?.data?.message || "Couldn't load dashboard data.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadDashboard();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (loading) return;

        const ctx = gsap.context(() => {
            STAT_META.forEach((stat, i) => {
                const el = statRefs.current[i];
                if (!el) return;
                const counter = { value: 0 };
                gsap.to(counter, {
                    value: counts[stat.key],
                    duration: 1,
                    delay: 0.2 + i * 0.1,
                    ease: "power2.out",
                    onUpdate: () => (el.textContent = Math.round(counter.value)),
                });
            });

            if (emptyIconRef.current) {
                gsap.to(emptyIconRef.current, {
                    y: -6,
                    duration: 1.6,
                    repeat: -1,
                    yoyo: true,
                    ease: "sine.inOut",
                });
            }
        });
        return () => ctx.revert();
    }, [loading, counts]);

    return (
        <DashboardLayout>
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center justify-between mb-8"
            >
                <div>
                    <h1 className="font-serif text-3xl text-slate-900">Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">Here's what's happening with your posts.</p>
                </div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link
                        to="/composer"
                        className="bg-red-500 text-white rounded-full font-medium hover:bg-red-600 inline-flex items-center gap-2 text-sm px-5 py-2.5 transition-colors"
                    >
                        <PenSquareIcon className="size-4" />
                        New post
                    </Link>
                </motion.div>
            </motion.div>

            {error && (
                <div className="mb-6 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-3 gap-4 mb-6">
                {STAT_META.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                            className="rounded-xl p-5 bg-white border border-black/[0.06]"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div ref={(el) => (statRefs.current[i] = el)} className="text-2xl font-bold text-gray-900 tabular-nums">
                                    0
                                </div>
                                <Icon className="size-4 text-gray-300" />
                            </div>
                            <div className="text-xs text-gray-400">{stat.label}</div>
                        </motion.div>
                    );
                })}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="rounded-xl p-6 bg-white border border-black/[0.06]"
            >
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-4">Recent Activity</div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Loader2Icon className="size-6 animate-spin mb-2" />
                        <p className="text-sm">Loading...</p>
                    </div>
                ) : recentPosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div ref={emptyIconRef}>
                            <DotIcon className="size-8 text-gray-200 mb-2" />
                        </div>
                        <p className="text-sm text-gray-400">No activity yet. Create your first post to get started.</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {recentPosts.map((post) => {
                            const statusStyle = STATUS_STYLES[post.status] || STATUS_STYLES.draft;
                            return (
                                <div
                                    key={post._id}
                                    className="flex items-center justify-between gap-4 py-3 border-b border-black/[0.04] last:border-0"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-slate-900 truncate">{post.caption}</p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span
                                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusStyle.chip}`}
                                            >
                                                {statusStyle.label}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {(post.platforms || []).join(", ")}
                                            </span>
                                            {post.scheduledFor && (
                                                <span className="text-xs text-gray-400">
                                                    · {formatScheduledFor(post.scheduledFor)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(post.createdAt)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </motion.div>
        </DashboardLayout>
    );
}