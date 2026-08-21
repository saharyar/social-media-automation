import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckIcon, Loader2Icon, AlertCircleIcon, XIcon } from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import api from "../api/axios";

const PLATFORM_META = [
    { id: "twitter", name: "X / Twitter", supported: true },
    { id: "linkedin", name: "LinkedIn", supported: true },
    { id: "instagram", name: "Instagram", note: "Connects via Facebook", supported: true },
];

// Platforms whose OAuth redirect result comes back as a query param, e.g. ?linkedin=connected
const OAUTH_PLATFORMS = ["linkedin", "twitter", "instagram"];

export default function ConnectedAccounts() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [status, setStatus] = useState({}); // { twitter: bool, linkedin: bool, instagram: bool }
    const [loading, setLoading] = useState(true);
    const [connectingId, setConnectingId] = useState(null);
    const [disconnectingId, setDisconnectingId] = useState(null);
    const [banner, setBanner] = useState(null); // { type: "success" | "error", message: string }

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await api.get("/accounts");
            setStatus(res.data || {});
        } catch (err) {
            console.error("fetchStatus error:", err);
            setBanner({ type: "error", message: "Couldn't load connected accounts." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        // fetchStatus is stable for the lifetime of this component and only needs to run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle the redirect back from an OAuth flow (?linkedin=connected / ?twitter=error, etc.).
    // Setting state synchronously here is intentional: this effect only runs when one of the
    // relevant query params actually changes (once, right after the OAuth redirect lands).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => {
        const platformLabels = { linkedin: "LinkedIn", twitter: "X", instagram: "Instagram" };

        for (const platformId of OAUTH_PLATFORMS) {
            const result = searchParams.get(platformId);
            if (!result) continue;

            const label = platformLabels[platformId] || platformId;

            if (result === "connected") {
                setBanner({ type: "success", message: `${label} connected successfully!` });
                fetchStatus();
            } else if (result === "error") {
                setBanner({ type: "error", message: `Couldn't connect ${label}. Please try again.` });
            }

            // Clean the query param out of the URL so refreshing doesn't re-trigger the banner
            searchParams.delete(platformId);
            setSearchParams(searchParams, { replace: true });

            // Only one OAuth redirect result is expected at a time
            break;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const handleConnect = async (platformId) => {
        if (!OAUTH_PLATFORMS.includes(platformId)) return; // only wired-up platforms

        setConnectingId(platformId);
        setBanner(null);
        try {
            const res = await api.get(`/accounts/${platformId}/connect`);
            window.location.assign(res.data.url); // full page navigation to the provider
        } catch (err) {
            console.error("handleConnect error:", err);
            setBanner({ type: "error", message: "Couldn't start the connection. Please try again." });
            setConnectingId(null);
        }
    };

    const handleDisconnect = async (platformId) => {
        setDisconnectingId(platformId);
        setBanner(null);
        try {
            await api.delete(`/accounts/${platformId}`);
            setStatus((prev) => ({ ...prev, [platformId]: false }));
        } catch (err) {
            console.error("handleDisconnect error:", err);
            setBanner({ type: "error", message: `Couldn't disconnect ${platformId}.` });
        } finally {
            setDisconnectingId(null);
        }
    };

    return (
        <DashboardLayout>
            <h1 className="font-serif text-3xl text-slate-900 mb-1">Connected Accounts</h1>
            <p className="text-gray-500 text-sm mb-6">Connect your social accounts to start publishing.</p>

            {banner && (
                <div
                    className={`mb-6 flex items-center justify-between gap-2 text-sm rounded-lg px-4 py-3 border ${
                        banner.type === "success"
                            ? "text-green-600 bg-green-50 border-green-100"
                            : "text-red-500 bg-red-50 border-red-100"
                    }`}
                >
                    <span className="flex items-center gap-2">
                        {banner.type === "success" ? (
                            <CheckIcon className="size-4 shrink-0" />
                        ) : (
                            <AlertCircleIcon className="size-4 shrink-0" />
                        )}
                        {banner.message}
                    </span>
                    <button onClick={() => setBanner(null)} className="text-current opacity-60 hover:opacity-100">
                        <XIcon className="size-4" />
                    </button>
                </div>
            )}

            <div className="space-y-3">
                {PLATFORM_META.map((p) => {
                    const isConnected = !!status[p.id];
                    const isConnecting = connectingId === p.id;
                    const isDisconnecting = disconnectingId === p.id;

                    return (
                        <div
                            key={p.id}
                            className="bg-white border border-black/[0.06] rounded-xl p-5 flex items-center justify-between"
                        >
                            <div>
                                <div className="font-medium text-slate-900">{p.name}</div>
                                {p.note && <div className="text-xs text-gray-400 mt-0.5">{p.note}</div>}
                                {!p.supported && (
                                    <div className="text-xs text-gray-400 mt-0.5">Coming soon</div>
                                )}
                            </div>

                            {loading ? (
                                <Loader2Icon className="size-4 text-gray-300 animate-spin" />
                            ) : isConnected ? (
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                                        <CheckIcon className="size-4" /> Connected
                                    </span>
                                    <button
                                        onClick={() => handleDisconnect(p.id)}
                                        disabled={isDisconnecting}
                                        className="text-xs text-gray-400 hover:text-red-500 underline underline-offset-2 disabled:opacity-50 transition-colors"
                                    >
                                        {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleConnect(p.id)}
                                    disabled={!p.supported || isConnecting}
                                    className="bg-red-500 text-white rounded-full font-medium hover:bg-red-600 text-sm px-5 py-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                                >
                                    {isConnecting && <Loader2Icon className="size-3.5 animate-spin" />}
                                    {isConnecting ? "Redirecting..." : "Connect"}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </DashboardLayout>
    );
}