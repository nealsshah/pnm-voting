
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
    Menu,
    X,
    Globe,
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
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/contexts/ThemeContext";
import Image from "next/image";

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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const pathname = usePathname();
    const supabase = createClientComponentClient();
    const roundStatus = useContext(RoundStatusContext);
    const { resolvedTheme } = useTheme();

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
            roles: ["admin"],
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
                    {userRole === 'admin' && (
                        <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => setIsAdminPanelOpen(true)}>
                            <Menu className="h-5 w-5" />
                        </Button>
                    )}
                    <div className="flex items-center min-w-0 flex-1">
                        <Link href="/" className="mr-6 flex items-center space-x-2 flex-shrink-0">
                            <div className="h-8 w-8 overflow-hidden rounded">
                                <Image
                                    src={resolvedTheme === 'dark' ? '/greekvote white.png' : '/greekvote black.png'}
                                    alt="GreekVote"
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 scale-125 transform"
                                />
                            </div>
                            <span className="font-bold text-xl">GreekVote</span>
                        </Link>
                        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                            {navItems.map((item) => {
                                if (!item.roles.includes(userRole || "")) return null;
                                const isActive = pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`transition-colors hover:text-accent-teal ${isActive ? "text-accent-teal font-semibold" : "text-foreground/60"
                                            }`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                        {/* Mobile page title - Hidden for candidates/admin pages */}
                        <div className="md:hidden flex-1 min-w-0 ml-4 flex items-center">
                            <h1 className="text-sm font-medium truncate">
                                {/* Don't show titles for candidates or admin pages on mobile */}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center flex-shrink-0">
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
                            <DropdownMenuContent align="end" className="w-[90vw] sm:w-56">
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
                                <ThemeToggle />
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

            {/* Mobile Admin Drawer */}
            {userRole === 'admin' && (
                <>
                    {isAdminPanelOpen && (
                        <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setIsAdminPanelOpen(false)} />
                    )}
                    <aside className={`fixed left-0 top-14 bottom-0 w-64 bg-background border-r shadow-lg z-50 transform transition-transform duration-200 md:hidden ${isAdminPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                        <Sidebar className="w-full" />
                    </aside>
                </>
            )}
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