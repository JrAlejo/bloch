import { Link, useLocation } from 'react-router';
import { Atom } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Inicio' },
  { path: '/tutorial', label: 'Tutorial' },
  { path: '/lab', label: 'Laboratorio' },
  { path: '/timeline', label: 'Timeline' },
  { path: '/protocols', label: 'Protocolos' },
];

export default function Header() {
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.slice(0, 2).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-[11px] font-medium uppercase tracking-[0.2em] transition-colors duration-300 ${
                location.pathname === item.path ? 'text-white' : 'text-white/40 hover:text-white/80'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Center logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <Atom className="w-5 h-5 text-blue animate-float" />
          <span className="font-serif text-xl font-light italic tracking-tight text-white">
            QIS UV
          </span>
        </Link>

        {/* Right nav */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.slice(2).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-[11px] font-medium uppercase tracking-[0.2em] transition-colors duration-300 ${
                location.pathname === item.path ? 'text-white' : 'text-white/40 hover:text-white/80'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Mobile menu placeholder */}
        <div className="md:hidden">
          <Link to="/" className="text-white/60 text-xs uppercase tracking-widest">Menu</Link>
        </div>
      </div>
    </header>
  );
}
