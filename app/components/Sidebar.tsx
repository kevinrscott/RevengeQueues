"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Gamepad2, Brackets, Swords } from "lucide-react";

const navItems = [
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/tournaments", label: "Tournaments", icon: Brackets },
  { href: "/scrims", label: "Scrims", icon: Swords },
  { href: "/lfg", label: "LFG", icon: Users },
];

type SidebarProps = {
  collapsed: boolean;
};

export default function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`
        flex min-h-screen flex-col border-r border-slate-900 bg-slate-950/95 text-white
        transition-[width,padding] duration-200
        ${collapsed ? "w-20 pt-6" : "w-64 pt-6"}
      `}
    >
      <div className="mb-6 flex justify-center">
        <Link href="/home">
          <Image
            src="/img/revengequeues.webp"
            alt="RevengeQueues"
            width={collapsed ? 48 : 140}
            height={collapsed ? 48 : 140}
            className={`
              transition-all duration-200 shadow-lg shadow-black/40
              ${collapsed ? "rounded-full" : "rounded-xl"}
            `}
          />
        </Link>
      </div>

      <nav className="flex flex-col space-y-1 px-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`
                relative flex items-center rounded-lg text-sm
                transition-colors duration-150
                ${collapsed ? "justify-center py-3 px-0" : "justify-start py-2 px-2"}
                ${
                  isActive
                    ? "bg-slate-900 text-slate-50 font-semibold"
                    : "text-slate-400 hover:text-slate-50 hover:bg-slate-900/80"
                }
              `}
            >
              <span
                className={`
                  absolute left-0 top-0 h-full rounded-r-full 
                  transition-all duration-150
                  ${isActive ? "w-1 bg-cyan-400" : "w-0 bg-transparent"}
                `}
              />

              <span
                className={`
                  flex items-center justify-center
                  ${collapsed ? "w-full" : "w-7"}
                `}
              >
                <Icon
                  className={`
                    h-5 w-5 transition-colors
                    ${
                      isActive
                        ? "text-cyan-300"
                        : "text-slate-400 group-hover:text-slate-100"
                    }
                  `}
                />
              </span>

              <span
                className={`
                  ml-2 whitespace-nowrap overflow-hidden text-[13px]
                  transition-all duration-200
                  ${collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"}
                `}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
