import { motion } from 'motion/react';
import { 
  Users, 
  BookOpen, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  ArrowUpRight,
  Calendar,
  Settings
} from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto">
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900">Welcome back, Professor</h1>
          <p className="text-slate-500">Here's what's happening with your classes today.</p>
        </div>
        <div className="flex -space-x-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
              <img src={`https://picsum.photos/seed/${i}/40/40`} alt="User" referrerPolicy="no-referrer" />
            </div>
          ))}
          <div className="w-10 h-10 rounded-full border-2 border-white bg-brand-blue flex items-center justify-center text-white text-xs font-bold">
            +12
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Stats Cards */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
            <Users size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Total Students</p>
            <h3 className="text-2xl font-bold">1,284</h3>
          </div>
          <div className="flex items-center text-emerald-500 text-xs font-bold space-x-1">
            <TrendingUp size={14} />
            <span>+12% from last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="w-12 h-12 bg-brand-purple/10 rounded-2xl flex items-center justify-center text-brand-purple">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Active Subjects</p>
            <h3 className="text-2xl font-bold">12</h3>
          </div>
          <div className="flex items-center text-slate-400 text-xs font-bold space-x-1">
            <span>Stable</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Avg. Attendance</p>
            <h3 className="text-2xl font-bold">94.2%</h3>
          </div>
          <div className="flex items-center text-emerald-500 text-xs font-bold space-x-1">
            <TrendingUp size={14} />
            <span>+2.4%</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="w-12 h-12 bg-brand-peach/10 rounded-2xl flex items-center justify-center text-brand-peach">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Pending Records</p>
            <h3 className="text-2xl font-bold">48</h3>
          </div>
          <div className="flex items-center text-amber-500 text-xs font-bold space-x-1">
            <span>Needs review</span>
          </div>
        </div>

        {/* Large Bento Items */}
        <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-[300px]">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="text-xl font-bold">Recent Activity</h3>
              <p className="text-slate-500 text-sm">Real-time attendance updates</p>
            </div>
            <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
              <ArrowUpRight size={20} className="text-slate-400" />
            </button>
          </div>
          
          <div className="space-y-4 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm overflow-hidden">
                    <img src={`https://picsum.photos/seed/user${i}/40/40`} alt="User" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Student Name {i}</p>
                    <p className="text-xs text-slate-500">Marked present in CS301</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-400">2m ago</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-brand-blue p-8 rounded-3xl shadow-xl text-white flex flex-col justify-between min-h-[300px] relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-20 rotate-12">
            <Calendar size={200} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">Upcoming Session</h3>
            <p className="text-white/80 text-sm">Advanced Web Development</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs text-white/60">Time</p>
                <p className="font-bold">14:30 - 16:00</p>
              </div>
            </div>
            <button className="w-full py-3 bg-white text-brand-blue font-bold rounded-2xl shadow-lg shadow-brand-blue/20 hover:scale-[1.02] transition-transform">
              Generate QR Code
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-[300px]">
          <h3 className="text-xl font-bold">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <button className="p-4 rounded-2xl bg-brand-purple/5 hover:bg-brand-purple/10 transition-colors flex flex-col items-center space-y-2 group">
              <BookOpen className="text-brand-purple group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-brand-purple">New Subject</span>
            </button>
            <button className="p-4 rounded-2xl bg-brand-peach/5 hover:bg-brand-peach/10 transition-colors flex flex-col items-center space-y-2 group">
              <Users className="text-brand-peach group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-brand-peach">Add Section</span>
            </button>
            <button className="p-4 rounded-2xl bg-brand-blue/5 hover:bg-brand-blue/10 transition-colors flex flex-col items-center space-y-2 group">
              <Calendar className="text-brand-blue group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-brand-blue">History</span>
            </button>
            <button className="p-4 rounded-2xl bg-slate-100 hover:bg-slate-200 transition-colors flex flex-col items-center space-y-2 group">
              <Settings className="text-slate-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-500">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
