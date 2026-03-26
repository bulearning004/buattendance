import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserCheck, LogIn, Key } from 'lucide-react';
import { signInWithGoogle, handleRedirectResult } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const user = await handleRedirectResult('@bu.ac.th');
        if (user) {
          navigate('/teacher/dashboard');
        }
      } catch (error: any) {
        alert(error.message || 'Failed to sign in');
      }
    };
    checkRedirect();
  }, [navigate]);

  const handleTeacherLogin = async () => {
    try {
      await signInWithGoogle('@bu.ac.th');
      navigate('/teacher/dashboard');
    } catch (error: any) {
      alert(error.message || 'Failed to sign in');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">
          BU Attendance <span className="text-brand-purple">System</span>
        </h1>
        <p className="text-slate-500 text-lg max-w-md mx-auto">
          ระบบเช็คชื่อเข้าเรียนแบบ Real-time สำหรับนักศึกษาและอาจารย์
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Teacher Portal Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={handleTeacherLogin}
          className="bg-brand-purple p-8 rounded-3xl shadow-xl cursor-pointer group relative overflow-hidden h-80 flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <UserCheck size={160} />
          </div>
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <UserCheck className="text-white" size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white">Teacher Portal</h2>
            <p className="text-white/80">จัดการวิชาเรียน เซคชัน และติดตามการเช็คชื่อของนักศึกษา</p>
          </div>
          <div className="flex items-center text-white font-medium space-x-2">
            <span>เข้าสู่ระบบอาจารย์</span>
            <LogIn size={18} />
          </div>
        </motion.div>

        {/* Student Portal Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => navigate('/student/scan')}
          className="bg-brand-peach p-8 rounded-3xl shadow-xl cursor-pointer group relative overflow-hidden h-80 flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Key size={160} />
          </div>
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Key className="text-white" size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white">Student Portal</h2>
            <p className="text-white/80">พิมพ์รหัส 6 หลักเพื่อเช็คชื่อเข้าเรียนผ่านพิกัด GPS</p>
          </div>
          <div className="flex items-center text-white font-medium space-x-2">
            <span>ไปหน้าเช็คชื่อ</span>
            <LogIn size={18} />
          </div>
        </motion.div>
      </div>

      <p className="text-slate-400 text-sm">
        รองรับเฉพาะบัญชี @bumail.net เท่านั้น
      </p>
    </div>
  );
}
