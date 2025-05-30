import './globals.css'
import { Inter } from 'next/font/google'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Navbar from '@/components/layout/Navbar'
import { Toaster } from '@/components/ui/toaster'
import Providers from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'PNM Voting Platform',
  description: 'A platform for voting on Potential New Members',
}

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col bg-gray-50">
          {user && <Navbar user={user} />}
          <main className="flex-1 container mx-auto px-4 py-8">
            <Providers>
              {children}
            </Providers>
          </main>
          <footer className="border-t py-4 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} PNM Voting Platform
          </footer>
          <Toaster />
        </div>
      </body>
    </html>
  )
}
