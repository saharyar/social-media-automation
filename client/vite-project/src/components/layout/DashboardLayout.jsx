import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }) {
    return (
        <div className="flex bg-[#fafafa] h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 px-8 py-8 max-w-6xl overflow-y-auto">{children}</main>
        </div>
    );
}