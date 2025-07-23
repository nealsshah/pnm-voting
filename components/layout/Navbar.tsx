
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
    LogOut,
    User as UserIcon,
    Users,
    Settings,
    LayoutGrid,
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

interface NavItem {
    href: string;
    label: string;
    icon: JSX.Element;
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
    const router = useRouter();
    const supabase = createClientComponentClient();

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
            href: "/gallery",
            label: "Gallery",
            icon: <LayoutGrid className="h-4 w-4" />,
            roles: ["admin", "brother"],
        },
        {
            href: "/candidate",
            label: "Candidates",
            icon: <Users className="h-4 w-4" />,
            roles: ["admin", "brother"],
        },
        {
            href: "/admin",
            label: "Admin",
            icon: <Settings className="h-4 w-4" />,
            roles: ["admin"],
        },
    ];

    return (
        <>
            <nav className="border-b bg-background">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="flex items-center gap-2">
                            <BarChart className="h-6 w-6" />
                            <span className="font-bold">PNM Voting</span>
                        </Link>
                        <div className="hidden items-center gap-4 md:flex">
                            {navItems.map((item) => {
                                if (!item.roles.includes(userRole || "")) return null;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`text-sm font-medium transition-colors hover:text-primary ${pathname === item.href
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                            }`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger>
                                <Avatar>
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
            </nav>
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