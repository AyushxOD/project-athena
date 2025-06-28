'use client';


import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import { LogOut, ArrowRight, Plus, BrainCircuit } from 'lucide-react';

type Canvas = {
  id: string;
  title: string;
};

export default function Lobby() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [newCanvasTitle, setNewCanvasTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCanvases = async () => {
      const { data, error } = await supabase.from('canvases').select('id, title').order('created_at', { ascending: false });
      if (error) console.error('Error fetching canvases:', error);
      else setCanvases(data);
      setLoading(false);
    };
    fetchCanvases();
  }, [supabase]);

  const handleCreateCanvas = async () => {
    if (!newCanvasTitle.trim() || !user) return;
    const { data, error } = await supabase
      .from('canvases')
      .insert({ title: newCanvasTitle, user_id: user.id })
      .select().single();
    if (error) console.error('Error creating canvas:', error);
    else if (data) router.push(`/canvas/${data.id}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };
  
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
  };

  // --- THIS IS THE FIX ---
  // The main div now uses `justify-center` and has less top padding (`pt-20`)
  // to better center the content vertically within the viewport.
  return (
<div className="relative z-10 w-full min-h-screen text-white p-8 flex flex-col items-center justify-center pt-20 bg-gray-900/60 backdrop-blur-sm overflow-hidden">
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        className="absolute top-6 right-6 flex items-center gap-4 text-sm bg-black/20 backdrop-blur-md px-3 py-2 rounded-lg border border-gray-700 shadow-lg"
      >
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
        <span className="text-gray-300">{user?.email}</span>
        <button onClick={handleLogout} className="text-gray-500 hover:text-white transition-colors" title="Logout">
          <LogOut size={16} />
        </button>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-4xl text-center"
      >
        <motion.div variants={itemVariants} className="flex justify-center items-center gap-4 mb-4">
            <BrainCircuit size={52} className="text-indigo-400"/>
        </motion.div>
        <motion.h1
          variants={itemVariants}
          className="text-6xl font-bold mb-2 tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-blue-400"
        >
            Project Athena
        </motion.h1>
        <motion.p variants={itemVariants} className="text-lg bg-clip-text text-transparent bg-gradient-to-br from-white to-yellow-400 mb-10">
          The AI-Powered Collaborative Debate & Reasoning Platform
        </motion.p>
      </motion.div>


    <motion.div
        variants={itemVariants}
        className="w-full max-w-2xl mb-12 p-6 bg-blue/10 backdrop-blur-lg rounded-2xl border border-yellow/20 shadow-lg"
    >
        <motion.h2
            className="text-2xl mb-4 font-semibold text-center bg-clip-text text-transparent bg-gradient-to-br from-white to-blue-400 cursor-pointer"
            whileHover={{ scale: 1.05, textShadow: '0px 0px 8px rgba(255,255,255,0.8)' }}
            transition={{ type: 'spring', stiffness: 300 }}
        >
            Create a New Masterpiece
        </motion.h2>
        <div className="flex gap-4">
            <input
                type="text"
                value={newCanvasTitle}
                onChange={(e) => setNewCanvasTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCanvas()}
                placeholder="Enter a title for your debate..."
                className="flex-grow bg-white/20 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 border border-white/30 text-lg transition placeholder-gray-300"
            />
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateCanvas}
                className="bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 px-6 py-3 rounded-lg transition-all font-semibold text-lg flex items-center gap-2 shadow-lg hover:shadow-indigo-500/40 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!newCanvasTitle.trim()}
            >
                <Plus size={20} /> Create
            </motion.button>
        </div>
    </motion.div>

      <motion.div
        variants={itemVariants}
        className="w-full max-w-5xl"
      >
        <motion.h2
            variants={itemVariants}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.3 }}
            className="text-3xl mb-4 font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400"
        >
            Join an Existing Debate
        </motion.h2>
        <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease: 'easeInOut' }}
            className="origin-left mx-auto mt-2 mb-8 w-24 h-1 bg-gradient-to-r from-pink-400 to-blue-500 rounded-full"
        />
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>
          </div>
        ) : (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
            {canvases.map((canvas) => (
                <motion.div
                    key={canvas.id}
                    variants={itemVariants}
                    whileHover={{ y: -8, scale: 1.03, rotate: 1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 250, damping: 20 }}
                >
                    <Link
                        href={`/canvas/${canvas.id}`}
                        className="relative block p-6 h-full overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black border border-transparent shadow-lg transition-all duration-500 ease-out group hover:from-indigo-600 hover:via-purple-600 hover:to-pink-500 hover:shadow-2xl hover:shadow-indigo-500/40"
                    >
                        {/* subtle light sweep */}
                        <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-30 animate-[pulse_2s_infinite] pointer-events-none rounded-2xl transition-opacity" />
                        <h3 className="relative text-2xl font-bold mb-2 text-blue-300 group-hover:text-indigo-200 transition-colors duration-300">
                            {canvas.title}
                        </h3>
                        <div className="relative flex items-center text-yellow-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm">
                            Open Canvas <ArrowRight size={16} className="ml-2" />
                        </div>
                    </Link>
                </motion.div>
            ))}
        </motion.div>
        )}
      </motion.div>
    </div>
  );
}