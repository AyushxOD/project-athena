// Location: client/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession, useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import VantaBackground from '../components/VantaBackground'; // Assuming VantaBackground is in components

type Canvas = {
  id: string;
  title: string;
};

// --- This is the new Lobby Component for Logged-In Users ---
function Lobby() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [newCanvasTitle, setNewCanvasTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCanvases = async () => {
      // NOTE: This now correctly fetches from our backend API
      try {
        const res = await fetch('http://localhost:3001/canvases');
        const data = await res.json();
        if (Array.isArray(data)) {
          setCanvases(data);
        }
      } catch (error) {
         console.error('Error fetching canvases:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCanvases();
  }, []);

  const handleCreateCanvas = async () => {
    if (!newCanvasTitle.trim() || !user) return;
    try {
      const response = await fetch('http://localhost:3001/canvases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newCanvasTitle, userId: user.id }),
      });
      const data = await response.json();
      if (data && data.id) {
        router.push(`/canvas/${data.id}`);
      }
    } catch (error) {
        console.error('Error creating canvas:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh(); // Refresh the page to reset state
  };

  return (
    <div className="w-full min-h-screen text-white p-8 relative z-10">
        <div className="absolute top-4 right-4 text-sm">
            Logged in as: <strong>{user?.email}</strong>
            <button 
              onClick={handleLogout} 
              className="ml-4 bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md transition-colors"
            >
              Logout
            </button>
        </div>

      <h1 className="text-4xl font-bold mb-6 text-center">Project Athena</h1>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 p-6 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700">
          <h2 className="text-2xl mb-3 font-semibold">Create a New Debate Canvas</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCanvasTitle}
              onChange={(e) => setNewCanvasTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCanvas()}
              placeholder="Enter title for your new canvas..."
              className="flex-grow bg-gray-700 p-2 rounded outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={handleCreateCanvas} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded transition-colors font-semibold">
              Create
            </button>
          </div>
        </div>
        <div>
          <h2 className="text-2xl mb-3 font-semibold">Join an Existing Debate</h2>
          {loading ? <p>Loading canvases...</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {canvases.map((canvas) => (
                <Link key={canvas.id} href={`/canvas/${canvas.id}`}>
                  <div className="block p-6 bg-gray-800/50 backdrop-blur-sm hover:bg-gray-700/70 border border-gray-700 rounded-lg transition-colors cursor-pointer">
                    <h3 className="text-lg font-semibold">{canvas.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// --- This is the Main Page Component ---
// It now acts as a gatekeeper, deciding whether to show the Login form or the Lobby.
export default function Home() {
  const session = useSession();
  const supabase = useSupabaseClient();

  return (
    <main>
      <VantaBackground />
      {!session ? (
        // --- THE LOGIN UI ---
        <div className="w-screen h-screen flex items-center justify-center">
          <div className="w-[400px] bg-black/30 backdrop-blur-lg p-8 rounded-xl border border-gray-700">
            <h1 className="text-white text-center text-2xl font-bold mb-6">Project Athena</h1>
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              theme="dark"
              providers={['github', 'google']}
            />
          </div>
        </div>
      ) : (
        // --- THE LOBBY FOR LOGGED-IN USERS ---
        <Lobby />
      )}
    </main>
  );
}