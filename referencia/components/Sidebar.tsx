import React from 'react';
import { Home, Search, Library, Activity, Disc, Zap } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path ? 'text-white bg-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/5';

  return (
    <div className="w-64 h-full bg-zinc-950 flex flex-col border-r border-zinc-800">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
            <Zap className="w-8 h-8 text-indigo-500 fill-indigo-500" />
            <h1 className="text-2xl font-bold tracking-tighter text-white">ZUNO</h1>
        </div>

        <nav className="space-y-2">
          <Link to="/" className={`flex items-center gap-4 px-4 py-3 rounded-md transition font-medium ${isActive('/')}`}>
            <Home size={20} />
            Home
          </Link>
          <Link to="/search" className={`flex items-center gap-4 px-4 py-3 rounded-md transition font-medium ${isActive('/search')}`}>
            <Search size={20} />
            Search
          </Link>
          <Link to="/library" className={`flex items-center gap-4 px-4 py-3 rounded-md transition font-medium ${isActive('/library')}`}>
            <Library size={20} />
            Library
          </Link>
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-zinc-800">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Dev Tools</h3>
        <Link to="/brain" className={`flex items-center gap-4 px-4 py-3 rounded-md transition font-medium ${isActive('/brain')}`}>
            <Activity size={20} className={location.pathname === '/brain' ? 'text-indigo-400' : ''} />
            ZUNO Brain
          </Link>
      </div>
    </div>
  );
};

export default Sidebar;