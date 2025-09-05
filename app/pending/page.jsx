'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Clock, Mail, LogOut, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function PendingPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const checkUserStatus = async () => {
    try {
      setCheckingStatus(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: userRole, error: roleError } = await supabase
        .from('users_metadata')
        .select('role')
        .eq('id', user.id)
        .single()

      if (roleError) {
        throw roleError
      }

      if (userRole?.role !== 'pending') {
        // User has been approved, redirect to home
        router.push('/')
        return
      }

      setUser(user)
    } catch (error) {
      console.error('Error checking user status:', error)
      toast({
        title: "Error",
        description: "Failed to check your status. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setCheckingStatus(false)
    }
  }

  useEffect(() => {
    checkUserStatus()
  }, [supabase])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-md bg-white/90 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full p-3 bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">Account Pending Approval</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Your account is waiting for administrator approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Thanks for signing up. Your account is pending approval from an administrator.
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Once approved, you’ll be able to access the full platform.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
              <Mail className="h-4 w-4" />
              <span>Registered Email: <span className="text-blue-600 dark:text-blue-400 font-medium">{user?.email}</span></span>
            </div>

            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">What happens next?</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1 text-left">
                <li>• An administrator will review your account</li>
                <li>• You’ll receive access once approved</li>
                <li>• Use the button below to check your status</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <Button
              variant="outline"
              onClick={checkUserStatus}
              disabled={checkingStatus}
              className="w-full border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${checkingStatus ? 'animate-spin' : ''}`} />
              {checkingStatus ? 'Checking Status...' : 'Check Status'}
            </Button>

            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If you believe this is an error or have any questions, please contact your administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 