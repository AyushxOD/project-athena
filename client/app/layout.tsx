
/* ======================================================================
    File #2: client/app/layout.tsx (FULL CODE)
    ACTION: This file is corrected by removing the metadata export.
   ====================================================================== */
   'use client'; 

   import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
   import { SessionContextProvider } from '@supabase/auth-helpers-react';
   import { useState } from 'react';
   import { GeistMono } from 'geist/font/mono';
   import { GeistSans } from 'geist/font/sans';
   import "./globals.css";
   
   const geistSans = GeistSans;
   const geistMono = GeistMono;
   
   // The 'metadata' export has been removed to comply with Client Component rules.
   // Document titles can be set using the <Head> component from 'next/head' if needed.
   
   export default function RootLayout({
     children,
   }: Readonly<{
     children: React.ReactNode;
   }>) {
     // Create a new supabase client for the context provider
     const [supabaseClient] = useState(() => createPagesBrowserClient());
   
     return (
       <html lang="en" suppressHydrationWarning={true}>
         <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
           <SessionContextProvider
             supabaseClient={supabaseClient}
             initialSession={null} // We will handle session loading on the client
           >
             {children}
           </SessionContextProvider>
         </body>
       </html>
     );
   }
   