'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function CommentModeration() {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchComments()
  }, [activeTab])

  const fetchComments = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('comments')
        .select('*, users_metadata(email)')
        
      if (activeTab === 'pending') {
        query = query.eq('status', 'pending')
      } else if (activeTab === 'approved') {
        query = query.eq('status', 'approved')
      } else if (activeTab === 'rejected') {
        query = query.eq('status', 'rejected')
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateCommentStatus = async (commentId, status) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ status })
        .eq('id', commentId)
      
      if (error) throw error
      
      // Update local state to reflect the change
      setComments(comments.map(comment => 
        comment.id === commentId ? { ...comment, status } : comment
      ))
    } catch (error) {
      console.error('Error updating comment status:', error)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>
      default:
        return null
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Comment Moderation</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab}>
            {loading ? (
              <div className="flex justify-center my-8">
                <Spinner size="medium" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No {activeTab} comments found.</p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border p-4 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{comment.users_metadata?.email || 'Anonymous'}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                      </div>
                      {getStatusBadge(comment.status)}
                    </div>
                    <p className="my-2">{comment.content}</p>
                    <div className="flex gap-2 mt-4">
                      {comment.status === 'pending' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => updateCommentStatus(comment.id, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => updateCommentStatus(comment.id, 'rejected')}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {comment.status !== 'pending' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateCommentStatus(comment.id, 'pending')}
                        >
                          Mark as Pending
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 