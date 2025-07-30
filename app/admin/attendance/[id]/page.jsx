"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Users, Upload, Search, Download, FileText, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function EventAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  const [event, setEvent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [emailsText, setEmailsText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [deletingAttendeeId, setDeletingAttendeeId] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(false);

  const eventId = params.id;

  // Load event details and attendance
  const loadEventData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/attendance-events/${eventId}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "Event not found",
            description: "The requested event could not be found",
            variant: "destructive"
          });
          router.push("/admin/attendance");
          return;
        }
        throw new Error(data.error || "Failed to load event data");
      }

      setEvent(data.event);
      setAttendance(data.attendance || []);
    } catch (error) {
      console.error("Failed to load event data:", error);
      toast({
        title: "Error",
        description: "Failed to load event data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId]);

  // Upload attendance
  const handleUploadAttendance = async (e) => {
    e.preventDefault();

    if (!emailsText.trim()) {
      toast({
        title: "Please enter at least one email",
        variant: "destructive"
      });
      return;
    }

    const emails = emailsText
      .split(/[,\n]/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);

    if (emails.length === 0) {
      toast({
        title: "Please enter valid email addresses",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadResults(null);

      const response = await fetch(`/api/attendance-events/${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload attendance");
      }

      setUploadResults(data);
      toast({
        title: "Success",
        description: `${data.matched} PNMs added to attendance (${data.unmatchedEmails?.length || 0} emails not matched)`
      });

      setEmailsText("");
      loadEventData(); // Refresh attendance list
    } catch (error) {
      console.error("Failed to upload attendance:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Remove individual attendee
  const handleRemoveAttendee = async (attendeeId, attendeeName) => {
    try {
      setDeletingAttendeeId(attendeeId);

      const response = await fetch(`/api/attendance-events/${eventId}/attendees/${attendeeId}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove attendee");
      }

      toast({
        title: "Success",
        description: data.message || `Removed ${attendeeName} from attendance`
      });

      loadEventData(); // Refresh attendance list
    } catch (error) {
      console.error("Failed to remove attendee:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeletingAttendeeId(null);
    }
  };

  // Delete entire event
  const handleDeleteEvent = async () => {
    try {
      setDeletingEvent(true);

      const response = await fetch(`/api/attendance-events/${eventId}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete event");
      }

      toast({
        title: "Success",
        description: data.message || "Event deleted successfully"
      });

      router.push("/admin/attendance");
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeletingEvent(false);
    }
  };

  // Filter attendance based on search term
  const filteredAttendance = attendance.filter(record =>
    record.pnms?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.pnms?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.pnms?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Event not found</h2>
        <Link href="/admin/attendance">
          <Button>
            <ArrowLeft size={16} className="mr-2" />
            Back to Events
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/attendance">
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{event.name}</h1>
          <div className="flex items-center gap-4 text-muted-foreground mt-1">
            {event.event_date && (
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(event.event_date)}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Users size={14} />
              {attendance.length} attendees
            </div>
          </div>
        </div>

        {/* Delete Event Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 size={16} className="mr-2" />
              Delete Event
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Event
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{event.name}"? This will permanently remove the event and all {attendance.length} attendance records. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteEvent}
                disabled={deletingEvent}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletingEvent ? "Deleting..." : "Delete Event"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Attendance List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Description */}
          {event.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{event.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Attendance List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Attendance ({attendance.length})</CardTitle>
                {attendance.length > 0 && (
                  <Badge variant="secondary">
                    {attendance.length} PNMs
                  </Badge>
                )}
              </div>
              {attendance.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder="Search attendees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {filteredAttendance.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchTerm ? "No attendees found" : "No attendance recorded"}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "Upload emails to start tracking attendance for this event"
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAttendance.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">
                          {record.pnms?.first_name} {record.pnms?.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {record.pnms?.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground">
                          Added {formatDate(record.created_at)}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive h-8 w-8 p-0"
                              disabled={deletingAttendeeId === record.id}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Attendee</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove <strong>{record.pnms?.first_name} {record.pnms?.last_name}</strong> from this event's attendance? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveAttendee(
                                  record.id,
                                  `${record.pnms?.first_name} ${record.pnms?.last_name}`
                                )}
                                disabled={deletingAttendeeId === record.id}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deletingAttendeeId === record.id ? "Removing..." : "Remove"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Upload Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload size={18} />
                Upload Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUploadAttendance} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email Addresses
                  </label>
                  <Textarea
                    placeholder="john@vt.edu, jane@vt.edu&#10;or one per line"
                    rows={8}
                    value={emailsText}
                    onChange={(e) => setEmailsText(e.target.value)}
                    disabled={isUploading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter email addresses separated by commas or one per line. Duplicates will be automatically ignored.
                  </p>
                </div>

                <Button type="submit" disabled={isUploading} className="w-full">
                  {isUploading ? "Processing..." : "Upload Attendance"}
                </Button>
              </form>

              {/* Upload Results */}
              {uploadResults && (
                <div className="mt-4 space-y-3">
                  <Separator />
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div>
                          <strong>Upload Results:</strong>
                        </div>
                        <div className="text-sm">
                          • {uploadResults.matched} PNMs matched and added
                          {uploadResults.unmatchedEmails?.length > 0 && (
                            <>
                              <br />• {uploadResults.unmatchedEmails.length} emails not matched
                            </>
                          )}
                        </div>
                        {uploadResults.unmatchedEmails?.length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer">View unmatched emails</summary>
                            <div className="mt-2 p-2 bg-gray-50 rounded">
                              {uploadResults.unmatchedEmails.join(", ")}
                            </div>
                          </details>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(event.created_at)}</p>
              </div>
              {event.event_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Event Date</p>
                  <p className="font-medium">{formatDate(event.event_date)}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Total Attendees</p>
                <p className="font-medium">{attendance.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 