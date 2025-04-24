'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function PendingPage() {
  const [user, setUser] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    fetchUser()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Account Pending Approval</CardTitle>
          <CardDescription>
            Your account is waiting for administrator approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Thank you for signing up! Your account is currently pending approval from an administrator.
            </p>
            <p className="text-sm text-gray-600">
              Once approved, you'll be able to access the full functionality of the platform.
            </p>
            <p className="text-sm font-medium mt-4">
              Registered Email: <span className="text-blue-600">{user?.email}</span>
            </p>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              If you believe this is an error or have any questions, please contact your administrator.
            </p>
            <Button variant="outline" onClick={handleSignOut} className="mt-4">
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 