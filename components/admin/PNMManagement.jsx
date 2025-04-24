'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Upload, Download, Image, Edit, Trash2, Plus, Save, X } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { getPhotoPublicUrl } from '@/lib/supabase'
import { downloadCsvTemplate, uploadPnmCsv } from '@/lib/pnm'

export default function PNMManagement() {
  const [pnms, setPnms] = useState([])
  const [filteredPnms, setFilteredPnms] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPnm, setSelectedPnm] = useState(null)
  const [uploadingPnmId, setUploadingPnmId] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)
  const [csvFile, setCsvFile] = useState(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  // Fetch PNMs
  const fetchPnms = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('pnms')
        .select('*')
        .order('last_name')

      if (error) throw error
      setPnms(data || [])
      setFilteredPnms(data || [])
    } catch (error) {
      console.error('Error fetching PNMs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load PNMs.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    fetchPnms()
  }, [fetchPnms])

  // Filter PNMs based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPnms(pnms)
      return
    }

    const term = searchTerm.toLowerCase()
    const filtered = pnms.filter(pnm => {
      return (
        pnm.first_name?.toLowerCase().includes(term) ||
        pnm.last_name?.toLowerCase().includes(term) ||
        pnm.email?.toLowerCase().includes(term) ||
        pnm.major?.toLowerCase().includes(term)
      )
    })
    setFilteredPnms(filtered)
  }, [searchTerm, pnms])

  // CSV import
  const onDropCsv = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setCsvFile(acceptedFiles[0])
    }
  }, [])
  
  const { getRootProps: getCsvRootProps, getInputProps: getCsvInputProps } = useDropzone({
    onDrop: onDropCsv,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1
  })

  const handleCsvUpload = async () => {
    if (!csvFile) return
    
    setCsvUploading(true)
    try {
      const result = await uploadPnmCsv(csvFile)
      
      toast({
        title: 'CSV Imported',
        description: `Imported ${result.summary.inserted} PNMs. ${result.summary.skipped} rows skipped.`,
      })
      
      setCsvFile(null)
      setIsCsvModalOpen(false)
      fetchPnms()
    } catch (error) {
      console.error('Error uploading CSV:', error)
      toast({
        title: 'Import Failed',
        description: error.message || 'An error occurred during CSV import.',
        variant: 'destructive',
      })
    } finally {
      setCsvUploading(false)
    }
  }

  // Photo upload
  const onDrop = useCallback(async (acceptedFiles) => {
    if (!uploadingPnmId || !acceptedFiles.length) return
    
    const file = acceptedFiles[0]
    const fileExt = file.name.split('.').pop()
    const fileName = `${uploadingPnmId}.${fileExt}`
    
    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      // Upload file to storage
      const { data, error } = await supabase.storage
        .from('pnm-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          onUploadProgress: (progress) => {
            setUploadProgress(Math.round((progress.loaded / progress.total) * 100))
          }
        })
      
      if (error) throw error
      
      // Get the public URL
      const publicUrl = getPhotoPublicUrl(fileName)
      
      // Update the PNM record with the photo URL
      const { error: updateError } = await supabase
        .from('pnms')
        .update({ photo_url: fileName })
        .eq('id', uploadingPnmId)
      
      if (updateError) throw updateError
      
      // Update local state
      setPnms(pnms.map(p => p.id === uploadingPnmId ? { ...p, photo_url: fileName } : p))
      
      toast({
        title: 'Photo Uploaded',
        description: 'PNM photo has been uploaded successfully.',
      })
      
      setSelectedPnm(null)
      setUploadingPnmId(null)
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast({
        title: 'Upload Failed',
        description: error.message || 'An error occurred during photo upload.',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }, [uploadingPnmId, pnms, supabase, toast])
  
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1,
    disabled: isUploading || !uploadingPnmId
  })

  // Edit PNM
  const handlePnmUpdate = async () => {
    if (!selectedPnm) return
    
    try {
      const { error } = await supabase
        .from('pnms')
        .update({
          first_name: selectedPnm.first_name,
          last_name: selectedPnm.last_name,
          email: selectedPnm.email,
          major: selectedPnm.major,
          year: selectedPnm.year,
          gpa: selectedPnm.gpa
        })
        .eq('id', selectedPnm.id)
      
      if (error) throw error
      
      // Update local state
      setPnms(pnms.map(p => p.id === selectedPnm.id ? selectedPnm : p))
      
      toast({
        title: 'PNM Updated',
        description: 'PNM information has been updated successfully.',
      })
      
      setSelectedPnm(null)
    } catch (error) {
      console.error('Error updating PNM:', error)
      toast({
        title: 'Update Failed',
        description: error.message || 'An error occurred while updating the PNM.',
        variant: 'destructive',
      })
    }
  }

  // Delete PNM
  const handleDeletePnm = async (id) => {
    if (!confirm('Are you sure you want to delete this PNM? This action cannot be undone.')) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('pnms')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      // Update local state
      setPnms(pnms.filter(p => p.id !== id))
      setFilteredPnms(filteredPnms.filter(p => p.id !== id))
      
      toast({
        title: 'PNM Deleted',
        description: 'PNM has been deleted successfully.',
      })
    } catch (error) {
      console.error('Error deleting PNM:', error)
      toast({
        title: 'Delete Failed',
        description: error.message || 'An error occurred while deleting the PNM.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>PNM Management</CardTitle>
            <CardDescription>Manage potential new members</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setIsCsvModalOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button variant="outline" onClick={downloadCsvTemplate}>
              <Download className="mr-2 h-4 w-4" />
              CSV Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search PNMs..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="text-center py-4">Loading PNMs...</div>
          ) : filteredPnms.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No PNMs found. Import PNMs using the CSV import feature.
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Major</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>GPA</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPnms.map((pnm) => (
                    <TableRow key={pnm.id}>
                      <TableCell className="font-medium">
                        {pnm.first_name} {pnm.last_name}
                      </TableCell>
                      <TableCell>{pnm.email}</TableCell>
                      <TableCell>{pnm.major}</TableCell>
                      <TableCell>{pnm.year}</TableCell>
                      <TableCell>{pnm.gpa}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedPnm(pnm)
                              setUploadingPnmId(null)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setUploadingPnmId(pnm.id)
                              setSelectedPnm(null)
                            }}
                          >
                            <Image className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeletePnm(pnm.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Import PNMs from CSV</CardTitle>
              <CardDescription>Upload a CSV file with PNM information</CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                {...getCsvRootProps()} 
                className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-gray-50"
              >
                <input {...getCsvInputProps()} />
                {csvFile ? (
                  <div>
                    <p className="font-medium">{csvFile.name}</p>
                    <p className="text-sm text-gray-500">{(csvFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p>Drag and drop a CSV file here, or click to select a file</p>
                    <p className="text-sm text-gray-500 mt-1">CSV should contain headers: email, first_name, last_name, major, year, gpa</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => {
                setIsCsvModalOpen(false)
                setCsvFile(null)
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleCsvUpload} 
                disabled={!csvFile || csvUploading}
              >
                {csvUploading ? 'Uploading...' : 'Import PNMs'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Edit PNM Modal */}
      {selectedPnm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit PNM</CardTitle>
              <CardDescription>Update PNM information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input 
                      id="first_name" 
                      value={selectedPnm.first_name || ''} 
                      onChange={(e) => setSelectedPnm({...selectedPnm, first_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input 
                      id="last_name" 
                      value={selectedPnm.last_name || ''} 
                      onChange={(e) => setSelectedPnm({...selectedPnm, last_name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    value={selectedPnm.email || ''} 
                    onChange={(e) => setSelectedPnm({...selectedPnm, email: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="major">Major</Label>
                    <Input 
                      id="major" 
                      value={selectedPnm.major || ''} 
                      onChange={(e) => setSelectedPnm({...selectedPnm, major: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input 
                      id="year" 
                      value={selectedPnm.year || ''} 
                      onChange={(e) => setSelectedPnm({...selectedPnm, year: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gpa">GPA</Label>
                  <Input 
                    id="gpa" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    max="4.0" 
                    value={selectedPnm.gpa || ''} 
                    onChange={(e) => setSelectedPnm({...selectedPnm, gpa: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setSelectedPnm(null)}>
                Cancel
              </Button>
              <Button onClick={handlePnmUpdate}>
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Photo Upload Modal */}
      {uploadingPnmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Upload Photo</CardTitle>
              <CardDescription>
                Upload a photo for {pnms.find(p => p.id === uploadingPnmId)?.first_name} {pnms.find(p => p.id === uploadingPnmId)?.last_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                {...getRootProps()} 
                className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-gray-50"
              >
                <input {...getInputProps()} />
                {isUploading ? (
                  <div className="space-y-2">
                    <p>Uploading...</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm">{uploadProgress}%</p>
                  </div>
                ) : (
                  <div>
                    <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p>Drag and drop an image here, or click to select a file</p>
                    <p className="text-sm text-gray-500 mt-1">Supports JPEG, PNG, and GIF</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setUploadingPnmId(null)}
                disabled={isUploading}
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
} 