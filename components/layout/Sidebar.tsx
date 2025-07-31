
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
    const [isMobile, setIsMobile] = useState(false);
    const supabase = createClientComponentClient();

    // Detect if we're on mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // md breakpoint
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

    // Split nav items into candidates and admin sections
    const candidatesItem = navItems.find(item => item.href === "/candidate");
    const adminItems = navItems.filter(item => item.href !== "/candidate");

    // On desktop, don't show candidates option in admin sidebar
    const isAdminPage = pathname.startsWith('/admin');
    const showCandidates = isMobile || !isAdminPage;

    return (
        <div className={cn("pb-12", className)}>
            <div className="space-y-4 py-4">
                {/* Candidates Section - Only show on mobile or when not on admin pages */}
                {showCandidates && candidatesItem && (
                    <div className="px-3 py-2">
                        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                            Main View
                        </h2>
                        <div className="space-y-1">
                            <Link
                                href={candidatesItem.href}
                                className={cn(
                                    "flex items-center rounded-lg px-4 py-2 text-sm font-medium relative",
                                    pathname === candidatesItem.href
                                        ? "bg-accent-teal text-accent-teal-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-accent-teal"
                                )}
                            >
                                <candidatesItem.icon className="mr-2 h-4 w-4" />
                                {candidatesItem.label}
                            </Link>
                        </div>
                    </div>
                )}

                {/* Admin Section */}
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Admin
                    </h2>
                    <div className="space-y-1">
                        {adminItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center rounded-lg px-4 py-2 text-sm font-medium relative",
                                    pathname === item.href
                                        ? "bg-accent-teal text-accent-teal-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-accent-teal"
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