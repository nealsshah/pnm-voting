"use client";

import { useState } from "react";
import { Gallery } from './gallery'
import { Button } from "@/components/ui/button";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "@/components/ui/use-toast";

export default function CandidatesPage() {
  const [isInserting, setIsInserting] = useState(false);

  const insertSamplePNM = async () => {
    setIsInserting(true);
    try {
      const supabase = createClientComponentClient();
      
      const { data, error } = await supabase.from('pnms').insert({
        email: `test${Date.now()}@example.com`,
        first_name: "Test",
        last_name: "User",
        major: "Computer Science",
        year: "Junior",
        gpa: "3.8"
      }).select();
      
      if (error) throw error;
      
      toast({
        title: "Sample PNM added",
        description: "A test PNM has been added to the database."
      });
      
      console.log("Sample PNM inserted:", data);
    } catch (error) {
      console.error("Error inserting sample PNM:", error);
      toast({
        title: "Error",
        description: "Failed to add sample PNM: " + error.message,
        variant: "destructive"
      });
    } finally {
      setIsInserting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">PNM Gallery</h1>
        <Button 
          onClick={insertSamplePNM} 
          disabled={isInserting}
          variant="outline"
          size="sm"
        >
          {isInserting ? "Adding..." : "Add Test PNM"}
        </Button>
      </div>
      <Gallery />
    </div>
  )
} 