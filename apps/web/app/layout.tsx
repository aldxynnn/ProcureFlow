import './globals.css';
import { QueryProvider } from '../lib/query-client';
import { AuthProvider } from '../lib/auth';
export const metadata = { title: 'ProcureFlow', description: 'Procurement & Spend Management Platform' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><QueryProvider><AuthProvider>{children}</AuthProvider></QueryProvider></body></html>; }
