import './globals.css'
import { Inter } from 'next/font/google'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Navbar from '@/components/layout/Navbar'
import { Toaster } from '@/components/ui/toaster'
import Providers from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'GreekVote',
  description: 'A platform for voting on Potential New Members',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  // Only proceed if we have a valid user
  const currentUser = userError ? null : user;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background">
            {currentUser && <Navbar user={currentUser} />}
            <main className={`flex-1 ${currentUser ? 'pt-14' : ''}`}>{children}</main>
            <Toaster />
          </div>
        </Providers>
      </body>
    </html>
  )
}
