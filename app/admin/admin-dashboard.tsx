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
import { Users, Calendar, Clock, ArrowRight, TrendingUp, Activity, BarChart3, Settings as SettingsIcon, Vote } from "lucide-react";
import Link from "next/link";
import RoundStatusBadge from "@/components/rounds/RoundStatusBadge";

interface AdminDashboardProps {
    pnmCount: number;
    currentRound: any;
    userId: string;
    statsPublished: boolean;
    voteCount: number;
}

export function AdminDashboard({
    pnmCount,
    currentRound,
    userId,
    statsPublished,
    voteCount,
}: AdminDashboardProps) {
    const roundName = currentRound?.name || "No active round";
    const roundEvent = currentRound?.event;

    return (
        <div className="space-y-8">
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 rounded-lg blur-3xl"></div>
                <div className="relative">
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Admin Overview
                    </h1>
                    <p className="mt-3 text-muted-foreground text-lg">
                        Welcome back, here's a summary of the current state.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total PNMs</CardTitle>
                        <div className="p-2 bg-muted rounded-lg group-hover:bg-muted/80 transition-colors">
                            <Users className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{pnmCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Potential New Members
                        </p>
                    </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                            Current Round
                        </CardTitle>
                        <div className="p-2 bg-muted rounded-lg group-hover:bg-muted/80 transition-colors">
                            <Activity className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{roundName}</div>
                        <p className="text-xs text-muted-foreground">
                            {currentRound ? 'Active voting round' : ''}
                        </p>
                    </CardContent>
                </Card>

                {roundEvent && (
                    <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 border-l-4 border-l-green-500">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                Round Details
                            </CardTitle>
                            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                                <Calendar className="h-5 w-5 text-green-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-semibold text-green-700">{roundEvent.title}</div>
                            <p className="text-xs text-muted-foreground">
                                {new Date(roundEvent.starts_at).toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {currentRound && (
                    <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Votes Cast
                            </CardTitle>
                            <div className="p-2 bg-muted rounded-lg group-hover:bg-muted/80 transition-colors">
                                <Vote className="h-5 w-5" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{voteCount}</div>
                            <p className="text-xs text-muted-foreground">
                                This round
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
                            <Button variant="outline" className="group hover:bg-green-50 hover:border-green-300 transition-colors">
                                <SettingsIcon className="mr-2 h-4 w-4" />
                                Settings
                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 border-l-4 border-l-orange-500">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                                <Users className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <CardTitle>Manage PNMs</CardTitle>
                                <CardDescription>
                                    View, edit, and manage all Potential New Members.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Link href="/admin/pnms">
                            <Button className="group/btn hover:bg-orange-600 transition-colors">
                                Go to PNMs
                                <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 border-l-4 border-l-indigo-500">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                                <BarChart3 className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <CardTitle>Manage Rounds</CardTitle>
                                <CardDescription>
                                    Create, manage, and monitor voting rounds.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Link href="/admin/rounds">
                            <Button className="group/btn hover:bg-indigo-600 transition-colors">
                                Go to Rounds
                                <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 