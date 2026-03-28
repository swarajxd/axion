import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Timer, 
  GraduationCap, 
  BarChart3, 
  Calendar, 
  MessageSquare, 
  User, 
  Settings, 
  HelpCircle,
  Plus
} from 'lucide-react';
import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: FileText, label: 'Notes', path: '/notes' },
  { icon: Timer, label: 'Pomodoro', path: '/pomodoro' },
  { icon: GraduationCap, label: 'Tests', path: '/tests' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Calendar, label: 'Study Planner', path: '/planner' },
  { icon: MessageSquare, label: 'AI Chat', path: '/chat' },
];

export const Sidebar = () => {
  const location = useLocation();
  const { user } = useUser();
  const [greetingName, setGreetingName] = useState(user?.firstName ?? 'Student');
  return (
    <aside className="h-screen w-72 fixed left-0 top-0 bg-surface-container-low flex flex-col p-6 gap-4 font-headline rounded-r-xl shadow-sm z-50">
      <div className="px-2 py-4 mb-2">
        <h1 className="text-xl font-bold text-on-surface tracking-tighter">Axion</h1>
        <p className="text-xs text-on-surface-variant mt-1">Academic Sanctuary</p>
      </div>

      <div className="flex items-center gap-3 px-4 py-4 mb-6 bg-white rounded-2xl shadow-sm">
        <img 
          src="https://picsum.photos/seed/student/100/100" 
          alt="Profile" 
          className="w-10 h-10 rounded-full object-cover"
        />
        <div>
          <p className="text-primary font-bold text-sm">Welcome back</p>
          <p className="text-on-surface-variant text-[10px] uppercase tracking-wider font-bold">{greetingName}</p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-300 font-semibold ${
                isActive 
                  ? 'bg-white text-primary shadow-sm translate-x-1' 
                  : 'text-on-surface-variant hover:bg-white/50 hover:translate-x-1'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 pt-6 border-t border-outline-variant/10">
        <button className="mb-4 w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2">
          <Plus size={18} />
          New Session
        </button>
        
        <Link to="/profile" className="flex items-center gap-3 px-5 py-2 text-on-surface-variant hover:text-primary transition-colors">
          <User size={18} />
          <span className="text-sm font-semibold">Profile</span>
        </Link>
        <a href="#" className="flex items-center gap-3 px-5 py-2 text-on-surface-variant hover:text-primary transition-colors">
          <Settings size={18} />
          <span className="text-sm font-semibold">Settings</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-5 py-2 text-on-surface-variant hover:text-primary transition-colors">
          <HelpCircle size={18} />
          <span className="text-sm font-semibold">Help</span>
        </a>
      </div>
    </aside>
  );
};
