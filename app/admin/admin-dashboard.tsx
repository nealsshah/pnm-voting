// @ts-nocheck
"use client";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import RoundStatusBadge from "@/components/rounds/RoundStatusBadge";

interface AdminDashboardProps {
    pnmCount: number;
    currentRound: any;
    userId: string;
    statsPublished: boolean;
}

export function AdminDashboard({
    pnmCount,
    currentRound,
    userId,
    statsPublished,
}: AdminDashboardProps) {
    const roundName = currentRound?.name || "No active round";
    const roundEvent = currentRound?.event;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
                <p className="mt-2 text-muted-foreground">
                    Welcome back, here's a summary of the current state.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total PNMs</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pnmCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Potential New Members
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                            Current Round
                        </CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{roundName}</div>
                        <p className="text-xs text-muted-foreground">
                            {currentRound ? 'Active voting round' : ''}
                        </p>
                    </CardContent>
                </Card>

                {roundEvent && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                Round Details
                            </CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-semibold">{roundEvent.title}</div>
                            <p className="text-xs text-muted-foreground">
                                {new Date(roundEvent.starts_at).toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Results Published Status */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className={statsPublished ? "ring-2 ring-green-500/20 bg-green-50/50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Voting Results</CardTitle>
                        {statsPublished ? (
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                                    <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-400 animate-ping"></div>
                                </div>
                                <span className="text-xs font-bold text-green-600 uppercase tracking-wider">LIVE</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-red-500"></span>
                                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">HIDDEN</span>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-semibold">
                            {statsPublished ? (
                                <span className="text-green-700">Live for Users</span>
                            ) : (
                                <span className="text-red-700">Hidden from Users</span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">
                            {statsPublished ? 'All brothers can view candidate statistics.' : 'Statistics are not visible to regular users.'}
                        </p>
                        <Link href="/admin/settings">
                            <Button variant="outline">
                                Settings
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Manage PNMs</CardTitle>
                        <CardDescription>
                            View, edit, and manage all Potential New Members.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/admin/pnms">
                            <Button>
                                Go to PNMs <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Manage Rounds</CardTitle>
                        <CardDescription>
                            Create, manage, and monitor voting rounds.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/admin/rounds">
                            <Button>
                                Go to Rounds <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 