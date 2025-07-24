
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Timer,
    MessageSquare,
    UserCheck,
    BarChart,
    Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    {
        href: "/admin",
        label: "Overview",
        icon: LayoutDashboard,
    },
    {
        href: "/admin/pnms",
        label: "PNMs",
        icon: Users,
    },
    {
        href: "/admin/rounds",
        label: "Rounds",
        icon: Timer,
    },
    {
        href: "/admin/comments",
        label: "Comments",
        icon: MessageSquare,
    },
    {
        href: "/admin/userapproval",
        label: "Brother Approval",
        icon: UserCheck,
    },
    {
        href: "/admin/brother-votes",
        label: "Brother Votes",
        icon: BarChart,
    },
    {
        href: "/admin/interactions",
        label: "Interactions",
        icon: BarChart,
    },
    {
        href: "/admin/settings",
        label: "Settings",
        icon: Settings,
    },
];

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname();

    return (
        <div className={cn("pb-12", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Admin
                    </h2>
                    <div className="space-y-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center rounded-lg px-4 py-2 text-sm font-medium",
                                    pathname === item.href
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
} 