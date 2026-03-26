import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Calendar, 
  Settings, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  Activity,
  PieChart,
  Key
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';

const menuItems = [
  { icon: LayoutDashboard, label: 'แดชบอร์ด', path: '/dashboard' },
  { icon: ShieldCheck, label: 'จัดการวิชาเรียน', path: '/teacher/dashboard' },
  { icon: Activity, label: 'เซสชันปัจจุบัน', path: '/attendance/session' },
  { icon: PieChart, label: 'รายงานการเข้าเรียน', path: '/teacher/reports' },
  { icon: Key, label: 'เช็คชื่อเข้าเรียน', path: '/student/scan' },
  { icon: Calendar, label: 'ประวัติการเช็คชื่อ', path: '/attendance' },
  { icon: Settings, label: 'ตั้งค่า', path: '/settings' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const handleLogout = () => signOut(auth);

  return (
    <aside className="w-72 h-screen p-6 sticky top-0 flex flex-col">
      <div className="glass rounded-3xl h-full flex flex-col p-6 shadow-sm border-white/40">
        <div className="flex items-center space-x-3 mb-10 px-2">
          <div className="w-10 h-10 bg-brand-purple rounded-xl flex items-center justify-center text-white font-bold">
            B
          </div>
          <span className="font-bold text-xl tracking-tight">BU Admin</span>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <motion.button
                key={item.label}
                whileHover={{ x: 5 }}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${
                  isActive 
                    ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' 
                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </div>
                {isActive && <ChevronRight size={16} />}
              </motion.button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/20">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 p-3 rounded-2xl text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
