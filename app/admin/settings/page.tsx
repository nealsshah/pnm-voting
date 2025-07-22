
// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { getStatsPublished } from "@/lib/settings";

export default function AdminSettings() {
    const [statsPublished, setStatsPublished] = useState(false);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchSettings() {
            try {
                const published = await getStatsPublished();
                setStatsPublished(published);
            } catch (e) {
                console.error("Failed to fetch settings", e);
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    const handleToggleStats = async (checked: boolean) => {
        // Optimistically update UI
        setStatsPublished(checked);

        try {
            const res = await fetch("/api/settings/stats-published", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ published: checked }),
            });

            if (!res.ok) throw new Error("Request failed");

            toast({
                title: checked ? "Voting statistics published" : "Voting statistics hidden",
                description: checked
                    ? "All users can now see candidate averages and vote counts."
                    : "Voting statistics are no longer visible to regular users.",
            });
        } catch (e) {
            // Revert on failure
            setStatsPublished(!checked);
            toast({
                title: "Error",
                description: "Unable to update visibility of voting statistics.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="mt-2 text-muted-foreground">
                    Manage application-wide settings.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Voting Statistics</CardTitle>
                    <CardDescription>
                        Control the visibility of voting statistics for all users.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="stats-published"
                                checked={statsPublished}
                                onCheckedChange={handleToggleStats}
                            />
                            <Label htmlFor="stats-published">
                                {statsPublished ? "Published" : "Hidden"}
                            </Label>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 