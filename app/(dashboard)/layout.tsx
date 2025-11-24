"use client";

import { useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import Topbar from "@/app/components/Topbar";
import { ChevronRight, ChevronDown } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen relative bg-black">
      <Sidebar collapsed={collapsed} />

      <div className="flex-1 flex flex-col">
        <Topbar />
        <main>{children}</main>
      </div>

      <button
        onClick={() => setCollapsed((prev) => !prev)}
        type="button"
        className="absolute top-5.5 z-50 w-7 h-7 flex items-center justify-center
                   rounded-full border border-slate-700 bg-slate-800 text-stone-200
                   hover:bg-slate-900 transition-colors text-xs"
        style={{
          left: collapsed ? "5rem" : "16rem",
          transform: "translateX(-50%)",
        }}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
      </button>
    </div>
  );
}
