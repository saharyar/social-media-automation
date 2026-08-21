import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "../components/layout/DashboardLayout";
import { SparklesIcon, AlertCircleIcon, CalendarClockIcon, CheckCircle2Icon } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const PLATFORMS = [
    { id: "twitter", label: "X / Twitter" },
    { id: "linkedin", label: "LinkedIn" },
    { id: "instagram", label: "Instagram" },
];

export default function Composer() {
    const [selected, setSelected] = useState(["twitter"]);
    const [topic, setTopic] = useState("");
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null); // { post, captions }

    // Scheduling state
    const [caption, setCaption] = useState("");
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");
    const [scheduling, setScheduling] = useState(false);
    const [scheduleError, setScheduleError] = useState("");
    const [scheduleSuccess, setScheduleSuccess] = useState(false);

    // Image generation state
    const [useImageGen, setUseImageGen] = useState(false);
    const [imageUrl, setImageUrl] = useState(null);
    const [generatingImage, setGeneratingImage] = useState(false);
    const [imageError, setImageError] = useState("");

    const togglePlatform = (id) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
    };

    const generateImageFromTopic = async () => {
        setImageError("");
        setGeneratingImage(true);
        try {
            const res = await api.post("/ai/generate-image", { prompt: topic });
            setImageUrl(res.data.imageUrl);
        } catch (err) {
            setImageError(err.response?.data?.message || "Couldn't generate that image. Try again.");
        } finally {
            setGeneratingImage(false);
        }
    };

    const toggleImageGen = () => {
        if (!useImageGen) {
            // turning ON
            if (!topic.trim()) {
                setImageError("Write what the post is about first — it's used as the image prompt");
                return;
            }
            setUseImageGen(true);
            generateImageFromTopic();
        } else {
            // turning OFF — clear everything so a stale image doesn't get attached later
            setUseImageGen(false);
            setImageUrl(null);
            setImageError("");
        }
    };

    const handleGenerate = async () => {
        if (!topic.trim()) {
            setError("Describe what the post is about first");
            return;
        }
        if (selected.length === 0) {
            setError("Pick at least one platform");
            return;
        }

        setError("");
        setResult(null);
        setScheduleSuccess(false);
        setScheduleError("");
        setGenerating(true);

        try {
            // Backend currently generates for a single platform at a time —
            // use the first selected one. (If you want per-platform results,
            // this would need to loop over `selected` and call once per platform.)
            const res = await api.post("/ai/generate-post", {
                topic,
                platform: selected[0],
            });

            setResult({
                post: res.data.post,
                captions: res.data.captions,
            });
            setCaption(res.data.post || "");
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't generate that. Try again.");
        } finally {
            setGenerating(false);
        }
    };

    const handleSchedule = async () => {
        if (selected.length === 0) {
            setScheduleError("Pick at least one platform");
            return;
        }
        if (selected.includes("instagram") && !imageUrl) {
            setScheduleError("Instagram requires an image — turn on 'Post image' first");
            return;
        }
        if (!caption.trim()) {
            setScheduleError("Caption can't be empty");
            return;
        }
        if (!scheduleDate || !scheduleTime) {
            setScheduleError("Pick a date and time to schedule this post");
            return;
        }

        const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`);
        if (Number.isNaN(scheduledFor.getTime())) {
            setScheduleError("That date/time doesn't look valid");
            return;
        }
        if (scheduledFor.getTime() < Date.now()) {
            setScheduleError("Pick a date/time in the future");
            return;
        }

        setScheduleError("");
        setScheduling(true);
        try {
            await api.post("/posts", {
                caption,
                aiPrompt: topic,
                imageUrl,
                imagePrompt: topic,
                platforms: selected,
                scheduledFor: scheduledFor.toISOString(),
            });
            setScheduleSuccess(true);
        } catch (err) {
            setScheduleError(err.response?.data?.message || "Couldn't schedule that post. Try again.");
        } finally {
            setScheduling(false);
        }
    };

    return (
        <DashboardLayout>
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <h1 className="font-serif text-3xl text-slate-900 mb-1">Create a post</h1>
                <p className="text-gray-500 text-sm mb-8">Describe your topic, generate a post, then schedule it.</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-white border border-black/[0.06] rounded-2xl p-6 space-y-5"
                >
                    <div>
                        <label className="text-sm font-medium text-slate-900 block mb-2">Platforms</label>
                        <div className="flex gap-2 flex-wrap">
                            {PLATFORMS.map((p) => {
                                const active = selected.includes(p.id);
                                return (
                                    <motion.button
                                        key={p.id}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => togglePlatform(p.id)}
                                        animate={{
                                            backgroundColor: active ? "#fef2f2" : "#ffffff",
                                            borderColor: active ? "#fecaca" : "rgba(0,0,0,0.1)",
                                            color: active ? "#ef4444" : "#6b7280",
                                        }}
                                        transition={{ duration: 0.2 }}
                                        className="px-4 py-2 rounded-full text-sm font-medium border"
                                    >
                                        {p.label}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-900 block mb-2">What's this post about?</label>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            rows={4}
                            placeholder="e.g. Announcing our new AI-powered scheduling feature"
                            className="w-full border border-black/10 rounded-lg px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-300 transition-shadow"
                        />
                    </div>

                    {/* Post image toggle — reuses the topic above as the image prompt */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-900">
                                Post image
                                {selected.includes("instagram") && (
                                    <span className="text-red-500 text-xs font-normal"> (required for Instagram)</span>
                                )}
                            </label>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={useImageGen}
                                onClick={toggleImageGen}
                                disabled={generatingImage}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 disabled:opacity-70 ${
                                    useImageGen ? "bg-red-500" : "bg-gray-200"
                                }`}
                            >
                                <motion.span
                                    layout
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    className="inline-block size-3.5 rounded-full bg-white shadow"
                                    style={{ marginLeft: useImageGen ? 18 : 4 }}
                                />
                            </button>
                        </div>

                        <AnimatePresence>
                            {generatingImage && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-center gap-2 text-sm text-gray-500 overflow-hidden"
                                >
                                    <div className="size-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                    Generating image...
                                </motion.div>
                            )}

                            {imageError && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-start gap-2 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 overflow-hidden"
                                >
                                    <AlertCircleIcon className="size-4 mt-0.5 shrink-0" />
                                    <span>{imageError}</span>
                                </motion.div>
                            )}

                            {imageUrl && (
                                <motion.img
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    src={imageUrl}
                                    alt="Generated preview"
                                    className="w-full rounded-lg border border-black/[0.06] object-cover max-h-64"
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-start gap-2 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 overflow-hidden"
                            >
                                <AlertCircleIcon className="size-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGenerate}
                        disabled={generating}
                        className="w-full bg-red-500 text-white rounded-full font-medium hover:bg-red-600 inline-flex items-center justify-center gap-2 text-sm py-3 transition-colors disabled:opacity-70"
                    >
                        <motion.span
                            animate={generating ? { rotate: 360 } : { rotate: 0 }}
                            transition={generating ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                        >
                            <SparklesIcon className="size-4" />
                        </motion.span>
                        {generating ? "Generating..." : "Generate post & caption"}
                    </motion.button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-white border border-black/[0.06] rounded-2xl p-6"
                >
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-4">AI Preview</div>
                    <AnimatePresence mode="wait">
                        {generating ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-16"
                            >
                                <div className="size-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            </motion.div>
                        ) : result ? (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-5"
                            >
                                <div>
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                                        Caption options
                                    </div>
                                    <div className="text-sm text-slate-900 whitespace-pre-line bg-[#fafafa] border border-black/[0.06] rounded-lg p-4">
                                        {result.captions}
                                    </div>
                                </div>

                                {/* Schedule section */}
                                <div className="pt-4 border-t border-black/[0.06] space-y-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                        <CalendarClockIcon className="size-4 text-red-500" />
                                        Schedule this post
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-gray-500 block mb-1.5">
                                            Caption to publish (editable)
                                        </label>
                                        <textarea
                                            value={caption}
                                            onChange={(e) => setCaption(e.target.value)}
                                            rows={4}
                                            className="w-full border border-black/10 rounded-lg px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-300 transition-shadow"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 block mb-1.5">Date</label>
                                            <input
                                                type="date"
                                                value={scheduleDate}
                                                min={new Date().toISOString().split("T")[0]}
                                                onChange={(e) => setScheduleDate(e.target.value)}
                                                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-300 transition-shadow"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 block mb-1.5">Time</label>
                                            <input
                                                type="time"
                                                value={scheduleTime}
                                                onChange={(e) => setScheduleTime(e.target.value)}
                                                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-300 transition-shadow"
                                            />
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {scheduleError && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="flex items-start gap-2 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 overflow-hidden"
                                            >
                                                <AlertCircleIcon className="size-4 mt-0.5 shrink-0" />
                                                <span>{scheduleError}</span>
                                            </motion.div>
                                        )}
                                        {scheduleSuccess && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="flex items-center justify-between gap-2 text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2.5 overflow-hidden"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <CheckCircle2Icon className="size-4 shrink-0" />
                                                    Post scheduled!
                                                </span>
                                                <Link to="/calendar" className="font-medium underline underline-offset-2">
                                                    View calendar
                                                </Link>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <motion.button
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleSchedule}
                                        disabled={scheduling}
                                        className="w-full bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 inline-flex items-center justify-center gap-2 text-sm py-3 transition-colors disabled:opacity-70"
                                    >
                                        <CalendarClockIcon className="size-4" />
                                        {scheduling ? "Scheduling..." : "Schedule post"}
                                    </motion.button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-black/10 rounded-xl"
                            >
                                <p className="text-sm text-gray-400 max-w-xs">
                                    Your generated post and caption options will appear here.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}