import './globals.css'
import { Inter } from 'next/font/google'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Navbar from '@/components/layout/Navbar'
import { Toaster } from '@/components/ui/toaster'
import Providers from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'GreekVote Platform',
  description: 'A platform for voting on Potential New Members',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
}

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background">
            {user && <Navbar user={user} />}
            <main className={`flex-1 ${user ? 'pt-14' : ''}`}>{children}</main>
            <Toaster />
          </div>
        </Providers>
      </body>
    </html>
  )
}
