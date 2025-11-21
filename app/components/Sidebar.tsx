"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/games", label: "Games"},
  { href: "/teams", label: "Teams" },
  { href: "/scrims", label: "Scrims" },
  { href: "/settings", label: "Settings" },
];

type SidebarProps = {
  collapsed: boolean;
};

export default function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`
        bg-stone-900 border-r border-black text-white min-h-screen flex flex-col
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
            className={`transition-all duration-200 ${collapsed ? "rounded-full" : "rounded"}`}
          />
        </Link>
      </div>

      <nav className="flex flex-col px-3 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center rounded text-sm
                px-2 py-2
                transition-colors duration-150
                ${
                  isActive
                    ? "bg-gray-700 text-white font-semibold"
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                }
              `}
            >
              <span className="w-6 text-center text-base">
                {item.label.charAt(0).toUpperCase()}
              </span>

              <span
                className={`
                  ml-2 whitespace-nowrap overflow-hidden
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
