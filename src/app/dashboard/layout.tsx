// app/dashboard/layout.tsx

import Sidebar from "@/components/layout/Sidebar";



export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 bg-gray-50 p-4 h-screen overflow-y-auto">{children}</main>
    </div>
  );
}
