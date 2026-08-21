import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CalendarIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    Trash2Icon,
    ClockIcon,
    Loader2Icon,
} from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import api from "../api/axios";

const PLATFORM_STYLES = {
    twitter: { label: "X / Twitter", dot: "bg-sky-400", chip: "bg-sky-50 text-sky-600 border-sky-100" },
    linkedin: { label: "LinkedIn", dot: "bg-blue-500", chip: "bg-blue-50 text-blue-600 border-blue-100" },
    instagram: { label: "Instagram", dot: "bg-pink-500", chip: "bg-pink-50 text-pink-600 border-pink-100" },
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Country used for public holidays — change to match your audience.
// See https://date.nager.at/Country for supported ISO codes (IN, US, GB, etc.)
const HOLIDAY_COUNTRY_CODE = "IN";

function dateKey(date) {
    // Local YYYY-MM-DD, used to group posts/holidays by calendar day (avoids UTC shift issues)
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function buildMonthGrid(year, month) {
    // month is 0-indexed. Returns a flat array of Date objects covering
    // the full weeks needed to display this month (including lead/trail days).
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay(); // 0 = Sunday
    const gridStart = new Date(year, month, 1 - startOffset);

    const days = [];
    for (let i = 0; i < 42; i++) {
        days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
    }
    return days;
}

function formatTime(dateInput) {
    return new Date(dateInput).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function Calendar() {
    const today = new Date();
    const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [posts, setPosts] = useState([]);
    const [holidays, setHolidays] = useState({}); // dateKey -> holiday name
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedDateKey, setSelectedDateKey] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const fetchPosts = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/posts", { params: { status: "scheduled" } });
            setPosts(res.data.posts || []);
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't load scheduled posts.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch public holidays for the visible year, via our own backend
    // (avoids the browser being blocked by the holiday provider's CORS policy)
    useEffect(() => {
        const year = cursor.getFullYear();
        let cancelled = false;

        api
            .get("/holidays", { params: { year, country: HOLIDAY_COUNTRY_CODE } })
            .then((res) => {
                if (cancelled) return;
                const map = {};
                for (const holiday of res.data.holidays || []) {
                    map[holiday.date] = holiday.localName || holiday.name;
                }
                setHolidays((prev) => ({ ...prev, ...map }));
            })
            .catch(() => {
                // Holidays are a nice-to-have; fail silently if the holiday API is unreachable
            });

        return () => {
            cancelled = true;
        };
    }, [cursor]);

    const postsByDay = useMemo(() => {
        const map = {};
        for (const post of posts) {
            if (!post.scheduledFor) continue;
            const key = dateKey(new Date(post.scheduledFor));
            if (!map[key]) map[key] = [];
            map[key].push(post);
        }
        // Sort each day's posts by time
        Object.values(map).forEach((list) =>
            list.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))
        );
        return map;
    }, [posts]);

    const gridDays = useMemo(
        () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
        [cursor]
    );

    const todayKey = dateKey(today);
    const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    const goToPrevMonth = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
    const goToNextMonth = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
    const goToToday = () => {
        setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
        setSelectedDateKey(todayKey);
    };

    const selectedPosts = selectedDateKey ? postsByDay[selectedDateKey] || [] : [];
    const selectedHoliday = selectedDateKey ? holidays[selectedDateKey] : null;

    const handleDelete = async (postId) => {
        setDeletingId(postId);
        try {
            await api.delete(`/posts/${postId}`);
            setPosts((prev) => prev.filter((p) => p._id !== postId));
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't delete that post.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="font-serif text-3xl text-slate-900 mb-1">Calendar</h1>
                    <p className="text-gray-500 text-sm">View and manage your scheduled posts.</p>
                </div>
                <button
                    onClick={goToToday}
                    className="text-sm font-medium text-red-500 hover:text-red-600 border border-red-100 bg-red-50 rounded-full px-4 py-2 transition-colors"
                >
                    Today
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar grid */}
                <div className="lg:col-span-2 bg-white border border-black/[0.06] rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-medium text-slate-900">{monthLabel}</h2>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={goToPrevMonth}
                                className="size-8 flex items-center justify-center rounded-full border border-black/10 text-gray-500 hover:bg-gray-50 transition-colors"
                                aria-label="Previous month"
                            >
                                <ChevronLeftIcon className="size-4" />
                            </button>
                            <button
                                onClick={goToNextMonth}
                                className="size-8 flex items-center justify-center rounded-full border border-black/10 text-gray-500 hover:bg-gray-50 transition-colors"
                                aria-label="Next month"
                            >
                                <ChevronRightIcon className="size-4" />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <Loader2Icon className="size-6 animate-spin mb-2" />
                            <p className="text-sm">Loading scheduled posts...</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-7 mb-2">
                                {WEEKDAY_LABELS.map((day, i) => {
                                    const isWeekend = i === 0 || i === 6;
                                    return (
                                        <div
                                            key={day}
                                            className={`text-center text-xs font-medium uppercase tracking-wide py-2 ${
                                                isWeekend ? "text-red-400" : "text-gray-400"
                                            }`}
                                        >
                                            {day}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-7 gap-1.5">
                                {gridDays.map((day) => {
                                    const key = dateKey(day);
                                    const isCurrentMonth = day.getMonth() === cursor.getMonth();
                                    const isToday = key === todayKey;
                                    const isSelected = key === selectedDateKey;
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                    const holidayName = holidays[key];
                                    const dayPosts = postsByDay[key] || [];
                                    const firstPostTime = dayPosts[0] ? formatTime(dayPosts[0].scheduledFor) : null;

                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setSelectedDateKey(key)}
                                            title={holidayName || undefined}
                                            className={`relative aspect-square rounded-xl p-2 flex flex-col items-start text-left transition-colors border
                                                ${isSelected ? "border-red-300 bg-red-50" : "border-transparent hover:bg-gray-50"}
                                                ${holidayName && !isSelected ? "bg-amber-50/60" : ""}
                                                ${!isCurrentMonth ? "opacity-35" : ""}
                                            `}
                                        >
                                            <span
                                                className={`text-xs font-medium size-5 flex items-center justify-center rounded-full
                                                    ${isToday ? "bg-red-500 text-white" : isWeekend ? "text-red-500" : "text-slate-700"}
                                                `}
                                            >
                                                {day.getDate()}
                                            </span>

                                            {holidayName && (
                                                <span className="text-[9px] text-amber-600 leading-tight line-clamp-1 mt-0.5">
                                                    {holidayName}
                                                </span>
                                            )}

                                            {dayPosts.length > 0 && (
                                                <div className="mt-auto w-full">
                                                    <div className="flex flex-wrap gap-0.5 mb-0.5">
                                                        {dayPosts.slice(0, 4).map((post) => (
                                                            <span
                                                                key={post._id}
                                                                className={`size-1.5 rounded-full ${
                                                                    PLATFORM_STYLES[post.platforms?.[0]]?.dot || "bg-gray-400"
                                                                }`}
                                                            />
                                                        ))}
                                                        {dayPosts.length > 4 && (
                                                            <span className="text-[9px] text-gray-400 leading-none">
                                                                +{dayPosts.length - 4}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {firstPostTime && (
                                                        <span className="text-[9px] text-gray-400 leading-none">
                                                            {firstPostTime}
                                                            {dayPosts.length > 1 ? ` +${dayPosts.length - 1}` : ""}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-black/[0.06]">
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                    <span className="size-2.5 rounded-full bg-red-400" /> Weekend
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                    <span className="size-2.5 rounded-full bg-amber-300" /> Public holiday
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                    <span className="size-2.5 rounded-full bg-sky-400" /> Scheduled post
                                </div>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="mt-4 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}
                </div>

                {/* Selected day panel */}
                <div className="bg-white border border-black/[0.06] rounded-2xl p-6">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1 flex items-center justify-between">
                        <span>
                            {selectedDateKey
                                ? new Date(selectedDateKey).toLocaleDateString(undefined, {
                                      weekday: "long",
                                      month: "long",
                                      day: "numeric",
                                  })
                                : "Select a day"}
                        </span>
                        {selectedPosts.length > 0 && (
                            <span className="text-red-500 normal-case font-medium">
                                {selectedPosts.length} post{selectedPosts.length > 1 ? "s" : ""}
                            </span>
                        )}
                    </div>
                    {selectedHoliday && (
                        <div className="text-xs text-amber-600 mb-4">{selectedHoliday}</div>
                    )}
                    {!selectedHoliday && selectedDateKey && <div className="mb-4" />}

                    <AnimatePresence mode="wait">
                        {!selectedDateKey ? (
                            <motion.div
                                key="empty-select"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-black/10 rounded-xl"
                            >
                                <CalendarIcon className="size-8 text-gray-200 mb-2" />
                                <p className="text-sm text-gray-400 max-w-xs">
                                    Click a day on the calendar to see what's scheduled.
                                </p>
                            </motion.div>
                        ) : selectedPosts.length === 0 ? (
                            <motion.div
                                key="empty-day"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-black/10 rounded-xl"
                            >
                                <CalendarIcon className="size-8 text-gray-200 mb-2" />
                                <p className="text-sm text-gray-400">No posts scheduled yet.</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="day-posts"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-3"
                            >
                                {selectedPosts.map((post) => (
                                    <div
                                        key={post._id}
                                        className="border border-black/[0.06] rounded-xl p-4 space-y-2.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                                <ClockIcon className="size-3.5" />
                                                {formatTime(post.scheduledFor)}
                                            </div>
                                            <button
                                                onClick={() => handleDelete(post._id)}
                                                disabled={deletingId === post._id}
                                                className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                                                aria-label="Delete post"
                                            >
                                                {deletingId === post._id ? (
                                                    <Loader2Icon className="size-4 animate-spin" />
                                                ) : (
                                                    <Trash2Icon className="size-4" />
                                                )}
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                            {(post.platforms || []).map((platform) => (
                                                <span
                                                    key={platform}
                                                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                                                        PLATFORM_STYLES[platform]?.chip || "bg-gray-50 text-gray-500 border-gray-100"
                                                    }`}
                                                >
                                                    {PLATFORM_STYLES[platform]?.label || platform}
                                                </span>
                                            ))}
                                        </div>

                                        {post.aiPrompt && (
                                            <div className="text-xs text-gray-400">
                                                <span className="font-medium text-gray-500">Topic:</span> {post.aiPrompt}
                                            </div>
                                        )}

                                        {post.imageUrl && (
                                            <img
                                                src={post.imageUrl}
                                                alt="Post visual"
                                                className="w-full rounded-lg border border-black/[0.06]"
                                            />
                                        )}

                                        <p className="text-sm text-slate-900 whitespace-pre-line line-clamp-4">
                                            {post.caption}
                                        </p>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </DashboardLayout>
    );
}