import DashboardLayout from "../components/layout/DashboardLayout";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
    const { user } = useAuth();

    return (
        <DashboardLayout>
            <h1 className="font-serif text-3xl text-slate-900 mb-1">Settings</h1>
            <p className="text-gray-500 text-sm mb-8">Manage your account details.</p>

            <div className="bg-white border border-black/[0.06] rounded-2xl p-6 max-w-lg space-y-4">
                <div>
                    <label className="text-sm font-medium text-slate-900 block mb-1.5">Name</label>
                    <input
                        defaultValue={user?.name}
                        className="w-full border border-black/10 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-300"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-900 block mb-1.5">Email</label>
                    <input
                        defaultValue={user?.email}
                        disabled
                        className="w-full border border-black/10 rounded-lg px-3.5 py-2.5 text-sm bg-gray-50 text-gray-400"
                    />
                </div>
                <button className="bg-red-500 text-white rounded-full font-medium hover:bg-red-600 text-sm px-5 py-2.5 transition-all">
                    Save changes
                </button>
            </div>
        </DashboardLayout>
    );
}