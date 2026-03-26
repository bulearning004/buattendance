import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Download, 
  TrendingUp, 
  Users, 
  Calendar, 
  Search, 
  Filter,
  ChevronRight,
  FileText,
  PieChart,
  Activity,
  Award,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast, Toaster } from 'sonner';

const COLORS = ['#8B5CF6', '#3B82F6', '#F97316', '#10B981', '#EC4899'];

interface ReportData {
  studentId: string;
  name: string;
  attendance: number;
  total: number;
  score: number;
}

export default function TeacherReportsPage() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock Data for Visualization
  const chartData = [
    { name: 'Week 1', rate: 85 },
    { name: 'Week 2', rate: 92 },
    { name: 'Week 3', rate: 78 },
    { name: 'Week 4', rate: 95 },
    { name: 'Week 5', rate: 88 },
  ];

  const distributionData = [
    { range: '90-100%', count: 12, color: '#10B981' },
    { range: '80-89%', count: 18, color: '#3B82F6' },
    { range: '70-79%', count: 8, color: '#8B5CF6' },
    { range: 'Below 70%', count: 4, color: '#F97316' },
  ];

  useEffect(() => {
    const fetchReports = async () => {
      try {
        // In a real app, we'd aggregate records per student
        // For demo, we'll generate some mock data based on our students
        const studentsSnap = await getDocs(collection(db, 'students'));
        const students = studentsSnap.docs.map(doc => doc.data());
        
        const mockReports = students.map(s => {
          const total = 10; // Total sessions
          const attendance = Math.floor(Math.random() * 11); // Random attendance
          const maxScore = 100;
          const score = (attendance / total) * maxScore;
          
          return {
            studentId: s.studentId,
            name: s.name,
            attendance,
            total,
            score
          };
        });

        setReports(mockReports);
      } catch (error) {
        console.error("Error fetching reports:", error);
        toast.error("Failed to load reports.");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleExport = () => {
    toast.success("Exporting Report...", {
      description: "Your PDF report is being generated.",
    });
  };

  const filteredReports = reports.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.studentId.includes(searchTerm)
  );

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto bg-background min-h-screen">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-brand-purple">
            <PieChart size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Analytics & Reports</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Academic Performance</h1>
          <p className="text-slate-500">Subject: CS301 Web Development • Semester 2/2026</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleExport}
            className="bg-brand-purple text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-brand-purple/20 hover:scale-105 transition-all flex items-center space-x-3"
          >
            <Download size={20} />
            <span>Export Report</span>
          </button>
        </div>
      </header>

      {/* Summary Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Summary Card */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
          
          <div className="space-y-8 relative z-10 flex-1">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-900">Class Overview</h3>
              <p className="text-slate-500">Overall attendance and performance metrics.</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avg. Attendance</p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-5xl font-bold text-brand-purple">88.4%</span>
                  <span className="text-emerald-500 text-sm font-bold flex items-center">
                    <TrendingUp size={14} className="mr-1" /> +2.4%
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avg. Score</p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-5xl font-bold text-brand-blue">82/100</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-900">Weekly Trend</p>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" hide />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="#8B5CF6" 
                      strokeWidth={4} 
                      dot={{ r: 6, fill: '#8B5CF6', strokeWidth: 0 }}
                      activeDot={{ r: 8, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="w-full md:w-64 space-y-6 relative z-10">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Score Distribution</h4>
            <div className="space-y-4">
              {distributionData.map((item) => (
                <div key={item.range} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">{item.range}</span>
                    <span className="text-slate-900">{item.count} Students</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.count / 42) * 100}%` }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <Award size={20} className="text-brand-peach" />
                  <span className="text-sm font-bold">Top Performer</span>
                </div>
                <span className="text-xs font-bold text-slate-400">View All</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Column */}
        <div className="space-y-6">
          <div className="bg-brand-blue p-8 rounded-[2.5rem] shadow-xl text-white space-y-4 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10">
              <Activity size={120} />
            </div>
            <p className="text-white/70 text-sm font-medium uppercase tracking-wider">Active Students</p>
            <h3 className="text-5xl font-bold">42</h3>
            <div className="flex items-center space-x-2 text-emerald-300 text-sm font-bold">
              <TrendingUp size={16} />
              <span>98% Engagement</span>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <h4 className="text-lg font-bold text-slate-900">Recent Alerts</h4>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center space-x-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-900">Low Attendance</p>
                    <p className="text-xs text-red-700">3 students below 70%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-slate-900">Student Performance List</h3>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-purple/20 transition-all w-64"
              />
            </div>
            <button className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
              <Filter size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Student</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Attendance</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Score</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredReports.map((report) => (
                <tr key={report.studentId} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-purple/10 text-brand-purple flex items-center justify-center font-bold">
                        {report.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-900">{report.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-mono text-slate-500">{report.studentId}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-brand-purple rounded-full" 
                          style={{ width: `${(report.attendance / report.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-900">{report.attendance}/{report.total}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-sm font-bold ${report.score >= 80 ? 'text-emerald-500' : report.score >= 50 ? 'text-brand-blue' : 'text-red-500'}`}>
                      {report.score.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      report.score >= 80 ? 'bg-emerald-50 text-emerald-600' : 
                      report.score >= 50 ? 'bg-blue-50 text-blue-600' : 
                      'bg-red-50 text-red-600'
                    }`}>
                      {report.score >= 80 ? 'Excellent' : report.score >= 50 ? 'Good' : 'At Risk'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 text-slate-400 hover:text-brand-purple transition-all">
                      <ChevronRight size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
