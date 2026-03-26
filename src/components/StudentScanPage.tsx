import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, MapPin, ArrowLeft, XCircle, Loader2, LogIn, Key } from 'lucide-react';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  Timestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db, auth, signInWithGoogle } from '../lib/firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast, Toaster } from 'sonner';

// Haversine Formula for Distance Calculation
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth's radius in metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export default function StudentScanPage() {
  const [step, setStep] = useState<'enter_code' | 'verifying' | 'login_required' | 'success' | 'error'>('enter_code');
  const [manualCode, setManualCode] = useState('');
  const [isError, setIsError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Helper to get location with high accuracy
  const getPreciseLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(new Error("เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง GPS"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          let msg = "ไม่สามารถเข้าถึงตำแหน่ง GPS ได้";
          if (error.code === error.PERMISSION_DENIED) {
            msg = "กรุณาอนุญาตให้เข้าถึงตำแหน่ง (Location Access) เพื่อเช็คชื่อ";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = "ไม่สามารถระบุตำแหน่งได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง";
          } else if (error.code === error.TIMEOUT) {
            msg = "การระบุตำแหน่งใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง";
          }
          reject(new Error(msg));
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 0 
        }
      );
    });
  };

  // 1. Handle QR Scan Data
  useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      try {
        const parsed = JSON.parse(decodeURIComponent(data));
        if (parsed.sessionId) {
          handleVerifyBySessionId(parsed.sessionId);
        }
      } catch (e) {
        console.error("Invalid QR data", e);
        setIsError("ข้อมูล QR Code ไม่ถูกต้อง");
        setStep('error');
      }
    }
  }, [searchParams]);

  const handleVerifyBySessionId = async (sessionId: string) => {
    setStep('verifying');
    try {
      // Get location first with high accuracy
      const loc = await getPreciseLocation();
      setUserLocation(loc);

      const sessionDoc = await getDoc(doc(db, 'attendance_sessions', sessionId));
      if (!sessionDoc.exists()) throw new Error("ไม่พบข้อมูลการเช็คชื่อนี้ (Session not found)");
      
      const sessionData = sessionDoc.data();
      if (!sessionData.isActive) throw new Error("การเช็คชื่อนี้สิ้นสุดลงแล้ว");
      
      setActiveSession({ id: sessionDoc.id, ...sessionData });
      await verifyDistanceAndAuth(sessionDoc.id, sessionData, loc);
    } catch (error: any) {
      setIsError(error.message);
      setStep('error');
    }
  };

  const verifyDistanceAndAuth = async (sessionId: string, sessionData: any, loc: { lat: number; lng: number }) => {
    const teacherLoc = sessionData.location;
    const allowedRadius = sessionData.radius || 100;
    const distance = getDistance(
      loc.lat, loc.lng,
      teacherLoc.lat, teacherLoc.lng
    );

    if (distance > allowedRadius) {
      throw new Error(`คุณไม่ได้อยู่ในห้องเรียน (ระยะห่าง ${Math.round(distance)}ม.)`);
    }

    if (!auth.currentUser) {
      setStep('login_required');
    } else {
      await markAttendance(sessionId, sessionData.subjectId, loc);
    }
  };

  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (manualCode.length !== 6) {
      toast.error("กรุณาใส่รหัส 6 หลัก");
      return;
    }

    setStep('verifying');
    setIsError(null);

    try {
      // Always get fresh precise location
      const loc = await getPreciseLocation();
      setUserLocation(loc);
      await verifyWithLocation(manualCode, loc);
    } catch (error: any) {
      console.error("Verification error:", error);
      setIsError(error.message || "การตรวจสอบล้มเหลว");
      setStep('error');
    }
  };

  const verifyWithLocation = async (code: string, loc: { lat: number; lng: number }) => {
    // 2. Find active session
    const sessionsRef = collection(db, 'attendance_sessions');
    const q = query(
      sessionsRef, 
      where('shortCode', '==', code),
      where('isActive', '==', true)
    );
    
    const querySnap = await getDocs(q);
    if (querySnap.empty) {
      throw new Error("รหัสไม่ถูกต้อง หรือการเช็คชื่อสิ้นสุดลงแล้ว");
    }

    const sessionDoc = querySnap.docs[0];
    const sessionData = sessionDoc.data();
    setActiveSession({ id: sessionDoc.id, ...sessionData });

    await verifyDistanceAndAuth(sessionDoc.id, sessionData, loc);
  };

  const markAttendance = async (sessionId: string, subjectId: string, loc: { lat: number; lng: number }) => {
    try {
      if (!auth.currentUser) throw new Error("กรุณาล็อกอินก่อนเช็คชื่อ");

      const recordId = `${auth.currentUser.uid}_${sessionId}`;
      await setDoc(doc(db, 'attendance_records', recordId), {
        sessionId: sessionId,
        subjectId: subjectId,
        studentUid: auth.currentUser.uid,
        studentName: auth.currentUser.displayName || 'Student',
        timestamp: Timestamp.now(),
        status: 'present',
        location: loc
      });

      setStep('success');
      toast.success("เช็คชื่อสำเร็จ!");
    } catch (error: any) {
      setIsError(error.message);
      setStep('error');
    }
  };

  const handleLoginAndMark = async () => {
    try {
      await signInWithGoogle('@bumail.net');
      // After login, we need to check if we have the session and location
      if (activeSession && userLocation) {
        await markAttendance(activeSession.id, activeSession.subjectId, userLocation);
      } else {
        // If lost state, go back to enter code
        setStep('enter_code');
      }
    } catch (e: any) {
      toast.error(e.message || "การล็อกอินล้มเหลว");
    }
  };

  if (step === 'success') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-emerald-500 flex flex-col items-center justify-center p-8 z-50 text-white text-center"
      >
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}>
          <CheckCircle2 size={120} className="mb-8" />
        </motion.div>
        <h1 className="text-5xl font-bold mb-4">เช็คชื่อสำเร็จ</h1>
        <p className="text-xl opacity-90 mb-12">บันทึกข้อมูลการเข้าเรียนของคุณเรียบร้อยแล้ว</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-white text-emerald-600 px-12 py-4 rounded-3xl font-bold text-lg shadow-xl hover:bg-emerald-50 transition-all"
        >
          กลับหน้าหลัก
        </button>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-white relative">
      <Toaster position="top-center" />
      
      <div className="absolute top-8 left-8">
        <button onClick={() => navigate('/')} className="p-2 bg-white/10 rounded-full backdrop-blur-md">
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="w-full max-w-md space-y-12">
        {step === 'enter_code' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 text-center">
            <div className="w-24 h-24 bg-brand-purple/20 rounded-[2rem] flex items-center justify-center mx-auto">
              <Key size={48} className="text-brand-purple" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">เช็คชื่อเข้าเรียน</h1>
              <p className="text-slate-400">กรุณาใส่รหัส 6 หลักที่ได้รับจากอาจารย์ในห้องเรียน</p>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="relative">
                <input 
                  type="text"
                  maxLength={6}
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full bg-white/5 border-2 border-white/10 rounded-[2rem] py-8 text-center text-6xl font-mono font-bold text-white tracking-[0.2em] focus:outline-none focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/20 transition-all placeholder:text-white/10"
                />
              </div>
              <button 
                type="submit"
                disabled={manualCode.length !== 6}
                className="w-full bg-brand-purple text-white py-5 rounded-[1.5rem] font-bold text-xl shadow-2xl shadow-brand-purple/30 disabled:opacity-50 disabled:grayscale transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-3"
              >
                <MapPin size={24} />
                <span>ตรวจสอบพิกัดและเช็คชื่อ</span>
              </button>
            </form>

            <div className="pt-8 border-t border-white/5">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-4">คำแนะนำ</p>
              <ul className="text-sm text-slate-400 space-y-2 text-left list-disc list-inside opacity-70">
                <li>ต้องเปิด GPS และอนุญาตให้เข้าถึงตำแหน่ง</li>
                <li>ต้องอยู่ในรัศมีที่อาจารย์กำหนดเท่านั้น</li>
                <li>หากรหัสถูกต้องและอยู่ในพิกัด ระบบจะให้ล็อกอิน</li>
              </ul>
            </div>
          </motion.div>
        )}

        {step === 'verifying' && (
          <div className="text-center space-y-6">
            <Loader2 size={64} className="animate-spin text-brand-purple mx-auto" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">กำลังตรวจสอบ...</h2>
              <p className="text-slate-400">กรุณารอสักครู่ ระบบกำลังยืนยันพิกัด GPS ของคุณ</p>
            </div>
          </div>
        )}

        {step === 'login_required' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 text-center">
            <div className="w-24 h-24 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center mx-auto">
              <MapPin size={48} className="text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-emerald-500">ยืนยันพิกัดสำเร็จ!</h2>
              <p className="text-slate-400">คุณอยู่ในห้องเรียนแล้ว กรุณาล็อกอินเพื่อบันทึกชื่อ</p>
            </div>
            <button 
              onClick={handleLoginAndMark}
              className="w-full bg-brand-purple text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-brand-purple/20 flex items-center justify-center space-x-3"
            >
              <LogIn size={20} />
              <span>Login with Google</span>
            </button>
          </motion.div>
        )}

        {step === 'error' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 text-center">
            <div className="w-24 h-24 bg-red-500/20 rounded-[2rem] flex items-center justify-center mx-auto">
              <XCircle size={48} className="text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-red-500">ไม่สามารถเช็คชื่อได้</h2>
              <p className="text-slate-400">{isError}</p>
            </div>
            <button 
              onClick={() => setStep('enter_code')}
              className="w-full bg-white/10 text-white py-4 rounded-2xl font-bold"
            >
              ลองใหม่อีกครั้ง
            </button>
          </motion.div>
        )}
      </div>

      {/* GPS Status Indicator */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex items-center space-x-4 text-white">
          <div className={`w-3 h-3 rounded-full ${userLocation ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">GPS Status</span>
            <span className="text-xs font-medium">
              {userLocation ? 'พบตำแหน่งของคุณแล้ว' : 'กำลังค้นหาสัญญาณ GPS...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
