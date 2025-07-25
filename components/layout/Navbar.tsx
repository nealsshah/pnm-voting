
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
    ChevronDown,
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
import { Button } from "@/components/ui/button";

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

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-auto p-2 hover:bg-secondary/60">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={userMetadata?.avatar_url} alt={userMetadata?.full_name} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                                {getInitials(userMetadata?.first_name, userMetadata?.last_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="hidden sm:block text-left">
                                            <div className="text-sm font-medium leading-none">
                                                {userMetadata?.first_name ? `${userMetadata.first_name} ${userMetadata.last_name}` : 'Brother'}
                                            </div>
                                            <div className="text-xs text-muted-foreground leading-none mt-1">
                                                {userMetadata?.email || 'brother@example.com'}
                                            </div>
                                        </div>
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <div className="flex items-center gap-3 p-2">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={userMetadata?.avatar_url} alt={userMetadata?.full_name} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                            {getInitials(userMetadata?.first_name, userMetadata?.last_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium leading-none truncate">
                                            {userMetadata?.first_name ? `${userMetadata.first_name} ${userMetadata.last_name}` : 'Brother'}
                                        </div>
                                        <div className="text-xs text-muted-foreground leading-none mt-1 truncate">
                                            {userMetadata?.email || 'brother@example.com'}
                                        </div>
                                    </div>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                                    <UserIcon className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:bg-red-50 focus:text-red-600">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Sign out</span>
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