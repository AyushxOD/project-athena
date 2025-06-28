// Location: client/app/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import VantaBackground from '../components/VantaBackground';

// Dynamically import the Lobby component to ensure it's a client component.
const ClientLobby = dynamic(() => import('../components/Lobby'), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen flex items-center justify-center text-white bg-gray-900 text-xl">
      Initializing Athena...
    </div>
  ),
});

export default function Home() {
  const session = useSession();
  const supabase = useSupabaseClient();

  return (
    <main className="relative w-screen h-screen">
      <VantaBackground />
      {!session ? (
        // The Login UI for logged-out users
        <div className="w-screen h-screen flex items-center justify-center">
          <div className="w-[400px] bg-black/40 backdrop-blur-lg p-8 rounded-xl border border-gray-700 shadow-2xl">
            <h1 className="text-white text-center text-3xl font-bold mb-8">
              Project Athena
            </h1>
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              theme="dark"
              providers={['github', 'google']}
            />
          </div>
        </div>
      ) : (
        // The new "Awestruck" Lobby for logged-in users
        <ClientLobby />
      )}
    </main>
  );
}