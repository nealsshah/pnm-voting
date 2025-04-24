"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CsvTemplateButton from "@/components/CsvTemplateButton";
import CsvUploadDropzone from "@/components/CsvUploadDropzone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Spinner } from "@/components/ui/spinner";

export default function AdminPnms() {
  const [pnms, setPnms] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  const fetchPnms = async () => {
    try {
      const { data, error } = await supabase
        .from('pnms')
        .select('*')
        .order('last_name');
      
      if (error) throw error;
      setPnms(data || []);
    } catch (error) {
      console.error('Error fetching PNMs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPnms();

    // Subscribe to changes on the pnms table
    const channel = supabase
      .channel('pnms-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pnms' 
      }, () => {
        fetchPnms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">PNM Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload PNMs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Import PNM data using a CSV file.
            </p>
            <CsvUploadDropzone />
            <div className="mt-4">
              <CsvTemplateButton />
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>PNM Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold">{pnms.length}</h3>
                <p className="text-sm text-gray-500">Total PNMs</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {pnms.reduce((sum, pnm) => sum + (Number(pnm.gpa) || 0), 0) / (pnms.length || 1)}
                </h3>
                <p className="text-sm text-gray-500">Average GPA</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>PNM Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner size="large" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Major</th>
                    <th className="text-left py-3 px-4 font-medium">Year</th>
                    <th className="text-left py-3 px-4 font-medium">GPA</th>
                  </tr>
                </thead>
                <tbody>
                  {pnms.map((pnm) => (
                    <tr key={pnm.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{pnm.first_name} {pnm.last_name}</td>
                      <td className="py-3 px-4">{pnm.email}</td>
                      <td className="py-3 px-4">{pnm.major}</td>
                      <td className="py-3 px-4">{pnm.year}</td>
                      <td className="py-3 px-4">{pnm.gpa}</td>
                    </tr>
                  ))}
                  {pnms.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500">
                        No PNMs yet. Upload CSV data to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 