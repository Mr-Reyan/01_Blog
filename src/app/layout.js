import { Inter, Source_Serif_4 } from 'next/font/google';
import { Providers } from './providers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans-src', display: 'swap' });
const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-serif-src', display: 'swap' });

export const metadata = {
  title: 'MyBlog - Share Your Stories',
  description: 'Discover stories, thinking, and expertise from writers on any topic',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="flex min-h-screen flex-col bg-white font-sans text-zinc-900 antialiased">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}