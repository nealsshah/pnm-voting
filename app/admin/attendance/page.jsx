"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

export default function AttendancePage() {
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  const [eventName, setEventName] = useState("");
  const [emailsText, setEmailsText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unmatched, setUnmatched] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = eventName.trim();
    if (!trimmedName) {
      toast({ title: "Event name is required", variant: "destructive" });
      return;
    }

    const emails = emailsText
      .split(/[\n,]/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);

    if (emails.length === 0) {
      toast({ title: "Please enter at least one email", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventName: trimmedName, emails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record attendance");

      setUnmatched(data.unmatchedEmails || []);

      toast({
        title: "Success",
        description: `${data.recorded} records added. ${data.unmatchedEmails?.length || 0} unmatched emails`,
      });

      setEmailsText("");
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Record Attendance</h1>
      <p className="text-muted-foreground">Upload a list of PNM emails for a specific event. Emails can be comma-separated or one per line.</p>

      <Card>
        <CardHeader>
          <CardTitle>Add Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="event-name">Event Name</label>
              <Input
                id="event-name"
                placeholder="e.g. Meet the Brothers"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="emails">Emails</label>
              <Textarea
                id="emails"
                rows={6}
                placeholder="john@school.edu, jane@school.edu or one per line"
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Processing…" : "Record Attendance"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {unmatched.length > 0 && (
        <Card className="border-red-300">
          <CardHeader>
            <CardTitle>Unmatched Emails ({unmatched.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">These emails did not match any existing PNM. You can create new PNMs for them or correct any typos.</p>
            <ul className="list-disc list-inside space-y-0.5 text-sm">
              {unmatched.map((em) => (
                <li key={em}>{em}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}