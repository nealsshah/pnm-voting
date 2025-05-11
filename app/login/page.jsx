"use client"

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Lock, Mail, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login') // 'login' or 'register'
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSubmit = async (e) => {
    console.log('firstName', firstName)
    console.log('lastName', lastName)
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
        // Ensure metadata row exists for sign-in users (in case trigger failed)
        try {
          const { data: existing } = await supabase
            .from('users_metadata')
            .select('id')
            .eq('id', (await supabase.auth.getUser()).data.user.id)
            .maybeSingle()
          if (!existing) {
            await supabase
              .from('users_metadata')
              .insert({ 
                id: userId, 
                role: 'pending', 
                email,
                first_name: firstName,
                last_name: lastName
              })          }
        } catch (metaErr) {
          console.warn('Could not upsert users_metadata after sign in:', metaErr)
        }
        router.push('/')
        router.refresh()
      } else {
        // Register mode
        try {
          // Register the user with Supabase Auth
          const { data: signUpData, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
              data: {
                first_name: firstName,
                last_name: lastName
              }
            },
          })

          if (error) {
            // Handle specific error cases
            if (error.message.includes('already exists')) {
              setError('An account with this email already exists')
            } else {
              throw error
            }
          } else {
            // Fallback: ensure users_metadata row exists
            try {
              const userId = signUpData?.user?.id || (await supabase.auth.getUser()).data.user?.id
              if (userId) {
                await supabase
                  .from('users_metadata')
                  .insert({ 
                    id: userId, 
                    role: 'pending', 
                    email,
                    first_name: firstName,
                    last_name: lastName
                  })
              }
            } catch (metaErr) {
              console.warn('Could not insert users_metadata row:', metaErr)
            }
            setSuccessMessage('Registration successful! Please check your email for confirmation.')
            setMode('login')
          }
        } catch (signupError) {
          console.error('Signup error:', signupError)
          setError(signupError.message || 'Error during sign up. Please try again.')
          setLoading(false)
          return
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            {mode === 'login' ? 'Sign in' : 'Create an account'}
          </CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Enter your credentials to access your account'
              : 'Enter your information to create an account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 bg-red-50 text-red-500 border-red-200">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="mb-4 bg-green-50 text-green-600 border-green-200">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      className="pl-10"
                      type="text"
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      className="pl-10"
                      type="text"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-10"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-10"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading
                ? 'Loading...'
                : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError(null)
              setSuccessMessage(null)
            }}
          >
            {mode === 'login'
              ? "Don't have an account? Sign Up"
              : 'Already have an account? Sign In'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
