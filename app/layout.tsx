import type { Metadata } from 'next';
import './globals.css';
import './login.css';
import './records.css';
import './parity.css';
export const metadata: Metadata={title:'FlowControl AI',description:'Zamówienia, wysyłki i decyzje operacyjne wspierane przez agentów AI'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pl"><body>{children}</body></html>}
