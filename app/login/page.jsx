"use client"

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Lock, Mail, User, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login') // 'login' or 'register'
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  // No email verification; ensure clean state
  useEffect(() => {
    setSuccessMessage(null)
  }, [])

  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        const userId = signInData?.user?.id

        // Ensure metadata row exists for sign-in users (in case trigger failed)
        if (userId) {
          try {
            const { data: existing } = await supabase
              .from('users_metadata')
              .select('id')
              .eq('id', userId)
              .maybeSingle()

            if (!existing) {
              await supabase
                .from('users_metadata')
                .insert({
                  id: userId,
                  role: 'pending',
                  email,
                  first_name: firstName,
                  last_name: lastName,
                })
            }
          } catch (metaErr) {
            console.warn('Could not upsert users_metadata after sign in:', metaErr)
          }
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
              // No email confirmation flow
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
            // Immediately direct the user to sign in
            setSuccessMessage('Registration successful! Please sign in to continue.')
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Beautiful gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900"></div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/greekvote black.png"
              alt="Greek Vote"
              width={120}
              height={40}
              className="dark:hidden"
            />
            <Image
              src="/greekvote white.png"
              alt="Greek Vote"
              width={120}
              height={40}
              className="hidden dark:block"
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {mode === 'login' ? 'Sign in to GreekVote' : 'Create your GreekVote account'}
          </p>
        </div>

        {/* Login Card */}
        <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-0 shadow-2xl">
          <CardContent className="p-8">
            {error && (
              <Alert className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="mb-6 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <AlertDescription>{successMessage}</AlertDescription>
                </div>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === 'register' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          className="pl-10 h-12 border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
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
                          className="pl-10 h-12 border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                          type="text"
                          placeholder="Last Name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-10 h-12 border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                    type="email"
                    placeholder="Email address"
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
                    className="pl-10 pr-10 h-12 border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </div>
                ) : (
                  <div className="flex items-center">
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="p-6 pt-0">
            <Button
              variant="ghost"
              className="w-full text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
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

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>Secure authentication powered by Supabase</p>
        </div>
      </div>
    </div>
  )
}
