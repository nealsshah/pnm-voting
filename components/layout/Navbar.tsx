
"use client";

import { useEffect, useState, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
    LogOut,
    User as UserIcon,
    Users,
    Settings,
    BarChart,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import ProfileDialog from "@/components/profile/ProfileDialog";
import RoundStatusBadge from "@/components/rounds/RoundStatusBadge";
import { RoundStatusContext } from "@/contexts/RoundStatusContext";

interface NavItem {
    href: string;
    label: string;
    roles: string[];
}

interface NavbarProps {
    user: SupabaseUser;
}

export default function Navbar({ user }: NavbarProps) {
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userMetadata, setUserMetadata] = useState<any>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const pathname = usePathname();
    const supabase = createClientComponentClient();
    const roundStatus = useContext(RoundStatusContext);

    useEffect(() => {
        async function getUserData() {
            if (!user?.id) return;

            const { data, error } = await supabase
                .from("users_metadata")
                .select("*")
                .eq("id", user.id)
                .single();

            if (!error && data) {
                setUserRole(data.role);
                setUserMetadata(data);
            }
        }

        getUserData();
    }, [user, supabase]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    const navItems: NavItem[] = [
        {
            href: "/candidate",
            label: "Candidates",
            roles: ["admin", "brother"],
        },
        {
            href: "/admin",
            label: "Admin",
            roles: ["admin"],
        },
    ];

    if (pathname.startsWith("/candidate/")) {
        return null; // Hide navbar on candidate pages to avoid duplicate bars
    }

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-14 items-center px-4">
                    <div className="mr-4 hidden md:flex">
                        <Link href="/" className="mr-6 flex items-center space-x-2">
                            <BarChart className="h-6 w-6" />
                            <span className="hidden font-bold sm:inline-block">
                                PNM Voting
                            </span>
                        </Link>
                        <nav className="flex items-center space-x-6 text-sm font-medium">
                            {navItems.map((item) => {
                                if (!item.roles.includes(userRole || "")) return null;
                                const isActive = pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`transition-colors hover:text-foreground/80 ${isActive ? "text-foreground" : "text-foreground/60"
                                            }`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                    <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger>
                                <Avatar className="h-8 w-8 cursor-pointer">
                                    <AvatarImage
                                        src={userMetadata?.avatar_url}
                                        alt={userMetadata?.full_name}
                                    />
                                    <AvatarFallback>
                                        {getInitials(
                                            userMetadata?.first_name,
                                            userMetadata?.last_name
                                        )}
                                    </AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                                    <UserIcon className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleSignOut}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>
            {userMetadata && (
                <ProfileDialog
                    isOpen={isProfileOpen}
                    onClose={() => setIsProfileOpen(false)}
                    userMetadata={userMetadata}
                />
            )}
        </>
    );
} 