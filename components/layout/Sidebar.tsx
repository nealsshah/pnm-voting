
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
    LayoutDashboard,
    Users,
    Timer,
    MessageSquare,
    UserCheck,
    BarChart,
    Settings,
    Vote,
    Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    {
        href: "/candidate",
        label: "Candidates",
        icon: Vote,
    },
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
        showNotification: true, // This item can show notifications
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
        href: "/admin/attendance",
        label: "Attendance",
        icon: Calendar,
    },
    {
        href: "/admin/settings",
        label: "Settings",
        icon: Settings,
    },
];

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const [pendingCount, setPendingCount] = useState(0);
    const supabase = createClientComponentClient();

    // Fetch pending approval count
    useEffect(() => {
        const fetchPendingCount = async () => {
            try {
                const { data, error } = await supabase
                    .from('users_metadata')
                    .select('id', { count: 'exact' })
                    .eq('role', 'pending');

                if (error) {
                    console.error('Error fetching pending count:', error);
                    return;
                }

                setPendingCount(data?.length || 0);
            } catch (error) {
                console.error('Error fetching pending count:', error);
            }
        };

        fetchPendingCount();

        // Set up real-time subscription for pending users
        const channel = supabase
            .channel('pending-users')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'users_metadata',
                    filter: 'role=eq.pending'
                },
                () => {
                    fetchPendingCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

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
                                    "flex items-center rounded-lg px-4 py-2 text-sm font-medium relative",
                                    pathname === item.href
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                                {item.showNotification && pendingCount > 0 && (
                                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
} 