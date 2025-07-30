"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Users, Search, ChevronRight, Upload, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/utils";

export default function AttendancePage() {
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Create event form state
  const [newEvent, setNewEvent] = useState({
    name: "",
    description: "",
    eventDate: ""
  });
  const [isCreating, setIsCreating] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState(null);

  // Load events
  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/attendance-events");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load events");
      }

      setEvents(data.events || []);
    } catch (error) {
      console.error("Failed to load events:", error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Create new event
  const handleCreateEvent = async (e) => {
    e.preventDefault();

    if (!newEvent.name.trim()) {
      toast({
        title: "Event name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch("/api/attendance-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create event");
      }

      toast({
        title: "Success",
        description: "Event created successfully"
      });

      setNewEvent({ name: "", description: "", eventDate: "" });
      setIsCreateDialogOpen(false);
      loadEvents(); // Refresh events list
    } catch (error) {
      console.error("Failed to create event:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Delete event from dashboard
  const handleDeleteEvent = async (eventId, eventName) => {
    try {
      setDeletingEventId(eventId);

      const response = await fetch(`/api/attendance-events/${eventId}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete event");
      }

      toast({
        title: "Success",
        description: data.message || `Event "${eventName}" deleted successfully`
      });

      loadEvents(); // Refresh events list
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeletingEventId(null);
    }
  };

  // Filter events based on search term
  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Event Attendance</h1>
          <p className="text-muted-foreground">
            Manage events and track PNM attendance
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus size={16} />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Event Name *
                </label>
                <Input
                  placeholder="e.g. Meet the Brothers"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  disabled={isCreating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Textarea
                  placeholder="Event description (optional)"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  disabled={isCreating}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Event Date
                </label>
                <Input
                  type="date"
                  value={newEvent.eventDate}
                  onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })}
                  disabled={isCreating}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isCreating} className="flex-1">
                  {isCreating ? "Creating..." : "Create Event"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Events List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchTerm ? "No events found" : "No events yet"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Create your first event to start tracking attendance"
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus size={16} className="mr-2" />
                Create Event
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{event.name}</CardTitle>
                    {event.event_date && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar size={14} />
                        {formatDate(event.event_date)}
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    <Users size={12} className="mr-1" />
                    {event.attendance_count?.[0]?.count || 0}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                {event.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {event.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Created {formatDate(event.created_at)}
                  </span>

                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive p-2"
                          disabled={deletingEventId === event.id}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Delete Event
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{event.name}"? This will permanently remove the event and all {event.attendance_count?.[0]?.count || 0} attendance records. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteEvent(event.id, event.name)}
                            disabled={deletingEventId === event.id}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletingEventId === event.id ? "Deleting..." : "Delete Event"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Link href={`/admin/attendance/${event.id}`}>
                      <Button variant="outline" size="sm">
                        Manage
                        <ChevronRight size={14} className="ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 