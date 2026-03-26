import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Clock, 
  Users, 
  CheckCircle2, 
  Settings, 
  ShieldCheck,
  Navigation,
  Activity,
  TrendingUp,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  Timestamp,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Toaster, toast } from 'sonner';
import { Subject } from '../types';

interface AttendanceRecord {
  id: string;
  studentUid: string;
  studentName: string;
  timestamp: Timestamp;
  status: string;
}

export default function AttendanceSessionPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [radius, setRadius] = useState(100);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sessionId] = useState('session_' + Date.now());
  const [shortCode] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());

  // Fetch Subject Details
  useEffect(() => {
    if (!subjectId) return;
    const fetchSubject = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'subjects', subjectId));
        if (docSnap.exists()) {
          setSubject({ id: docSnap.id, ...docSnap.data() } as Subject);
        } else {
          toast.error("Subject not found");
          navigate('/teacher/dashboard');
        }
      } catch (error) {
        console.error("Error fetching subject:", error);
        toast.error("Failed to load subject details");
      }
    };
    fetchSubject();
  }, [subjectId, navigate]);

  // 1. Capture Teacher's GPS and Sync Session
  useEffect(() => {
    if (!subjectId) return;
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(newLocation);
          
          // Sync to Firestore
          const sessionRef = doc(db, 'attendance_sessions', sessionId);
          setDoc(sessionRef, {
            id: sessionId,
            shortCode: shortCode,
            subjectId: subjectId,
            date: Timestamp.now(),
            isActive: true,
            location: newLocation,
            radius: radius,
            teacherUid: auth.currentUser?.uid
          }, { merge: true }).catch(err => console.error("Error syncing session:", err));
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Location access required for attendance.");
        },
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [sessionId, radius, subjectId, shortCode]);

  // 2. Live Feed of Attendance Records
  useEffect(() => {
    const q = query(
      collection(db, 'attendance_records'),
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newRecords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AttendanceRecord[];
      setRecords(newRecords);
    });

    return () => unsubscribe();
  }, [sessionId]);

  const endSession = async () => {
    try {
      await updateDoc(doc(db, 'attendance_sessions', sessionId), {
        isActive: false
      });
      toast.success("Session ended successfully");
      navigate('/teacher/dashboard');
    } catch (error) {
      console.error("Error ending session:", error);
      toast.error("Failed to end session properly");
      navigate('/teacher/dashboard');
    }
  };

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto bg-background min-h-screen">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-brand-purple">
            <Activity size={18} className="animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Live Session</span>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/teacher/dashboard')}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
              {subject ? `${subject.code}: ${subject.name}` : 'Loading...'}
            </h1>
          </div>
          <p className="text-slate-500">
            {subject ? `Section ${subject.section}` : ''} • {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={endSession}
            className="bg-white text-red-500 px-6 py-3 rounded-2xl font-bold border border-red-100 shadow-sm hover:bg-red-50 transition-all"
          >
            End Session
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Control & Stats */}
        <div className="space-y-6">
          {/* Session Control Card */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Session Controls</h3>
              <Settings size={20} className="text-slate-400" />
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Geofence Radius</label>
                  <span className="text-brand-purple font-bold">{radius}m</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="200" 
                  step="50"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-purple"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>50M</span>
                  <span>100M</span>
                  <span>200M</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-brand-blue">
                    <Navigation size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">Current Location</p>
                    <p className="text-sm font-mono text-slate-600">
                      {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Detecting...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-brand-purple p-8 rounded-[2.5rem] shadow-xl text-white space-y-6 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 opacity-10 rotate-12">
              <Users size={160} />
            </div>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-white/70 text-sm font-medium uppercase tracking-wider">Attendance Rate</p>
                <h3 className="text-4xl font-bold">{records.length} / {subject?.studentCount || 0}</h3>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <TrendingUp size={24} />
              </div>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(records.length / (subject?.studentCount || 1)) * 100}%` }}
                className="h-full bg-white"
              />
            </div>
          </div>
        </div>

        {/* Center Column: Code Display */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center space-y-8 relative overflow-hidden">
            {/* Glassmorphism Background Elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-brand-purple/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-peach/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />

            <div className="text-center space-y-4 relative z-10">
              <div className="w-20 h-20 bg-brand-purple/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={40} className="text-brand-purple" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900">รหัสเช็คชื่อเข้าเรียน</h3>
              <p className="text-slate-500 text-lg">ให้นักศึกษาพิมพ์รหัสนี้ในหน้า Student Portal</p>
              
              <div className="mt-8 flex flex-col items-center space-y-4">
                <div className="bg-slate-900 text-white px-12 py-6 rounded-[2.5rem] font-mono text-7xl font-bold tracking-[0.3em] shadow-2xl shadow-slate-900/40 border-4 border-brand-purple/20">
                  {shortCode}
                </div>
                <div className="flex items-center space-x-2 text-emerald-500 font-bold bg-emerald-50 px-4 py-2 rounded-full">
                  <MapPin size={18} />
                  <span>ผูกกับพิกัด GPS เรียบร้อยแล้ว</span>
                </div>
              </div>
            </div>

            <div className="w-full max-w-md p-6 bg-blue-50 border border-blue-200 rounded-[2rem] flex items-start space-x-4 text-blue-800 relative z-10">
              <AlertCircle size={24} className="shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-bold text-lg">คำแนะนำสำหรับอาจารย์</p>
                <ul className="list-disc list-inside space-y-1 opacity-90">
                  <li>รหัสนี้จะใช้ได้เฉพาะนักศึกษาที่อยู่ในรัศมี {radius}ม.</li>
                  <li>นักศึกษาต้องอนุญาตให้เข้าถึง GPS ก่อนพิมพ์รหัส</li>
                  <li>หากนักศึกษาแจ้งว่าพิกัดไม่ตรง ให้ลองขยายรัศมี Geofence</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-slate-400 relative z-10">
              <div className="flex items-center space-x-2">
                <Clock size={20} />
                <span className="text-lg font-medium">ระบบกำลังทำงานแบบ Real-time</span>
              </div>
            </div>
          </div>

          {/* Live Feed: Student Bubbles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-bold text-slate-900">Live Feed</h3>
              <span className="text-xs font-bold text-emerald-500 flex items-center space-x-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                <span>{records.length} Present</span>
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <AnimatePresence>
                {records.map((record) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-2xl border border-emerald-100 flex items-center space-x-3 shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-500 font-bold text-xs">
                      {record.studentName?.charAt(0) || 'S'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold leading-tight">{record.studentName || 'Student'}</span>
                      <span className="text-[10px] opacity-70 font-medium">
                        {record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {records.length === 0 && (
                <div className="w-full py-12 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                  <p className="text-slate-400 font-medium">Waiting for students to scan...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
