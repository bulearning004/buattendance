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
import { db, auth, signInWithGoogle, handleRedirectResult } from '../lib/firebase';
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
  const [verifyingStatus, setVerifyingStatus] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<number>(0);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const hasCheckedRedirect = useRef(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Real-time location tracking to keep GPS active and fresh
  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationAccuracy(position.coords.accuracy);
        setLastLocationUpdate(Date.now());
      },
      (error) => {
        console.error("WatchPosition error:", error);
        // Don't clear location, just log error. 
        // If it was found once, we might still want to use it if it's not too old.
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 5000 
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const requestFreshLocation = (resolve: any, reject: any) => {
    setVerifyingStatus("กำลังค้นหาสัญญาณ GPS (ความแม่นยำสูง)...");
    const options = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds for high accuracy
      maximumAge: 0 // Force fresh
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationAccuracy(position.coords.accuracy);
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.warn("High accuracy failed, trying standard accuracy...", error);
        setVerifyingStatus("กำลังค้นหาสัญญาณ GPS (โหมดประหยัดพลังงาน)...");
        
        // Fallback to standard accuracy if high accuracy fails or times out
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocationAccuracy(pos.coords.accuracy);
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
          },
          (err) => {
            let msg = "ไม่สามารถเข้าถึงตำแหน่ง GPS ได้";
            if (err.code === err.PERMISSION_DENIED) {
              msg = "กรุณาอนุญาตให้เข้าถึงตำแหน่ง (Location Access) เพื่อเช็คชื่อ";
            } else if (err.code === err.POSITION_UNAVAILABLE) {
              msg = "ไม่สามารถระบุตำแหน่งได้ในขณะนี้ (สัญญาณ GPS อ่อนหรือปิดอยู่) กรุณาลองใหม่อีกครั้ง";
            } else if (err.code === err.TIMEOUT) {
              msg = "การระบุตำแหน่งใช้เวลานานเกินไป กรุณาตรวจสอบสัญญาณ GPS หรือลองใหม่อีกครั้ง";
            }
            reject(new Error(msg));
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      },
      options
    );
  };

  // Helper to get location with high accuracy and fallback
  const getPreciseLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(new Error("เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง GPS"));
        return;
      }

      // Try to get cached position first (very fast)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // If cached position is fresh enough (less than 1 min), use it immediately
          const age = Date.now() - pos.timestamp;
          if (age < 60000) {
            console.log("Using fresh cached position", age);
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
            return;
          }
          
          // Otherwise proceed to get fresh high accuracy position
          requestFreshLocation(resolve, reject);
        },
        () => {
          // If getting cached fails, just try fresh one
          requestFreshLocation(resolve, reject);
        },
        { enableHighAccuracy: false, timeout: 2000, maximumAge: Infinity }
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
    setVerifyingStatus("กำลังตรวจสอบข้อมูลการเช็คชื่อ...");
    try {
      // Use tracked location if fresh (within 60s), otherwise get fresh one
      let loc = userLocation;
      const isFresh = Date.now() - lastLocationUpdate < 60000;
      
      if (!loc || !isFresh) {
        loc = await getPreciseLocation();
        setUserLocation(loc);
        setLastLocationUpdate(Date.now());
      }

      setVerifyingStatus("กำลังตรวจสอบพิกัดห้องเรียน...");
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

  const verifyDistanceAndAuth = async (sessionId: string, sessionData: any, loc: { lat: number; lng: number }, userOverride?: any) => {
    const teacherLoc = sessionData.location;
    const allowedRadius = sessionData.radius || 100;
    const distance = getDistance(
      loc.lat, loc.lng,
      teacherLoc.lat, teacherLoc.lng
    );

    if (distance > allowedRadius) {
      throw new Error(`คุณไม่ได้อยู่ในห้องเรียน (ระยะห่าง ${Math.round(distance)}ม.)`);
    }

    const currentUser = userOverride || auth.currentUser;

    if (!currentUser) {
      setStep('login_required');
    } else {
      await markAttendance(sessionId, sessionData.subjectId, loc, currentUser);
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
    setVerifyingStatus("กำลังเตรียมการตรวจสอบ...");

    try {
      // Use tracked location if fresh (within 60s), otherwise get fresh one
      let loc = userLocation;
      const isFresh = Date.now() - lastLocationUpdate < 60000;
      
      if (!loc || !isFresh) {
        loc = await getPreciseLocation();
        setUserLocation(loc);
        setLastLocationUpdate(Date.now());
      }
      
      setVerifyingStatus("กำลังตรวจสอบรหัสและพิกัด...");
      await verifyWithLocation(manualCode, loc);
    } catch (error: any) {
      console.error("Verification error:", error);
      setIsError(error.message || "การตรวจสอบล้มเหลว");
      setStep('error');
    }
  };

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    console.error(`Firestore Error [${operation}] at ${path}:`, error);
    const errInfo = {
      error: error.message || String(error),
      operation,
      path,
      auth: auth.currentUser ? {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email
      } : 'not_authenticated'
    };
    return new Error(JSON.stringify(errInfo, null, 2));
  };

  const verifyWithLocation = async (code: string, loc: { lat: number; lng: number }, userOverride?: any) => {
    try {
      // 2. Find session by code
      const sessionsRef = collection(db, 'attendance_sessions');
      const q = query(
        sessionsRef, 
        where('shortCode', '==', code)
      );
      
      const querySnap = await getDocs(q);
      // Filter active sessions in memory to avoid composite index requirement
      const activeDocs = querySnap.docs.filter(d => d.data().isActive === true);
      
      if (activeDocs.length === 0) {
        throw new Error("รหัสไม่ถูกต้อง หรือการเช็คชื่อสิ้นสุดลงแล้ว");
      }

      const sessionDoc = activeDocs[0];
      const sessionData = sessionDoc.data();
      setActiveSession({ id: sessionDoc.id, ...sessionData });

      await verifyDistanceAndAuth(sessionDoc.id, sessionData, loc, userOverride);
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        throw handleFirestoreError(error, 'getDocs', 'attendance_sessions');
      }
      throw error;
    }
  };

  const markAttendance = async (sessionId: string, subjectId: string, loc: { lat: number; lng: number }, userOverride?: any) => {
    try {
      const user = userOverride || auth.currentUser;
      if (!user) throw new Error("กรุณาล็อกอินก่อนเช็คชื่อ");
      if (!user.email) throw new Error("ไม่พบข้อมูลอีเมลของคุณ");

      setVerifyingStatus("กำลังตรวจสอบรายชื่อนักศึกษา...");

      // 1. Check if student is enrolled in this subject
      const studentsRef = collection(db, 'students');
      const studentQuery = query(
        studentsRef,
        where('subjectId', '==', subjectId),
        where('email', '==', user.email)
      );
      
      const studentSnap = await getDocs(studentQuery);
      if (studentSnap.empty) {
        throw new Error("คุณไม่มีรายชื่อในวิชานี้ กรุณาติดต่ออาจารย์ผู้สอน");
      }

      const studentData = studentSnap.docs[0].data();
      const recordId = `${user.uid}_${sessionId}`;
      const recordPath = `attendance_records/${recordId}`;
      
      setVerifyingStatus("กำลังบันทึกข้อมูลการเช็คชื่อ...");

      try {
        await setDoc(doc(db, 'attendance_records', recordId), {
          sessionId: sessionId,
          subjectId: subjectId,
          studentUid: user.uid,
          studentId: studentData.studentId || '', // Use the ID from the database
          studentName: studentData.name || user.displayName || 'Student',
          timestamp: Timestamp.now(),
          status: 'present',
          location: loc
        });
        setStep('success');
        toast.success("เช็คชื่อสำเร็จ!");
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          throw handleFirestoreError(error, 'setDoc', recordPath);
        }
        throw error;
      }
    } catch (error: any) {
      setIsError(error.message);
      setStep('error');
    }
  };

  const handleLoginAndMark = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      // Save state before redirect (for mobile)
      if (manualCode && userLocation) {
        localStorage.setItem('pending_attendance_code', manualCode);
        localStorage.setItem('pending_attendance_loc', JSON.stringify(userLocation));
      }

      const user = await signInWithGoogle(['@bumail.net', '@bu.ac.th']);
      
      // If user is returned (popup mode), proceed immediately
      if (user && activeSession && userLocation) {
        await markAttendance(activeSession.id, activeSession.subjectId, userLocation, user);
      }
      setIsLoggingIn(false);
    } catch (e: any) {
      toast.error(e.message || "การล็อกอินล้มเหลว");
      setIsLoggingIn(false);
    }
  };

  // Handle Redirect Result and Restore State
  useEffect(() => {
    const checkRedirect = async () => {
      if (hasCheckedRedirect.current) return;
      
      const savedCode = localStorage.getItem('pending_attendance_code');
      const savedLoc = localStorage.getItem('pending_attendance_loc');

      if (savedCode && savedLoc) {
        hasCheckedRedirect.current = true;
        setStep('verifying');
        setVerifyingStatus("กำลังกู้คืนสถานะการเช็คชื่อ...");
        
        try {
          const loc = JSON.parse(savedLoc);
          setManualCode(savedCode);
          setUserLocation(loc);
          
          // Check for redirect result
          const user = await handleRedirectResult(['@bumail.net', '@bu.ac.th']);
          
          // Wait a bit for auth state to stabilize if handleRedirectResult returned null
          // but we have saved state (meaning we likely just came back from redirect)
          let finalUser = user;
          if (!finalUser) {
            // Wait up to 2 seconds for auth.currentUser
            for (let i = 0; i < 10; i++) {
              if (auth.currentUser) {
                finalUser = auth.currentUser;
                break;
              }
              await new Promise(r => setTimeout(r, 200));
            }
          }

          if (finalUser) {
            setVerifyingStatus("กำลังดำเนินการเช็คชื่อต่อ...");
            // We need to re-verify the code to get the session data
            await verifyWithLocation(savedCode, loc, finalUser);
          } else {
            // If no user after redirect, go back to enter_code but keep the code
            setStep('enter_code');
            toast.error("กรุณาล็อกอินใหม่อีกครั้ง");
          }
        } catch (error: any) {
          console.error("Redirect recovery error:", error);
          setIsError(error.message);
          setStep('error');
        } finally {
          localStorage.removeItem('pending_attendance_code');
          localStorage.removeItem('pending_attendance_loc');
        }
      }
    };

    checkRedirect();
  }, []);

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
                {userLocation ? <MapPin size={24} /> : <Loader2 size={24} className="animate-spin" />}
                <span>{userLocation ? 'ตรวจสอบพิกัดและเช็คชื่อ' : 'กำลังค้นหา GPS...'}</span>
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
              <p className="text-slate-400">{verifyingStatus || 'กรุณารอสักครู่ ระบบกำลังยืนยันพิกัด GPS ของคุณ'}</p>
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
              disabled={isLoggingIn}
              className="w-full bg-brand-purple text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-brand-purple/20 flex items-center justify-center space-x-3 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <LogIn size={20} />
              )}
              <span>{isLoggingIn ? 'กำลังเข้าสู่ระบบ...' : 'Login with Google'}</span>
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
              {activeSession && userLocation && (
                <p className="text-brand-purple font-bold text-sm animate-pulse">
                  ระยะห่างปัจจุบัน: {Math.round(getDistance(userLocation.lat, userLocation.lng, activeSession.location.lat, activeSession.location.lng))}ม.
                </p>
              )}
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => handleVerifyCode()}
                className="w-full bg-brand-purple text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-purple/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                ตรวจสอบพิกัดอีกครั้ง
              </button>
              <button 
                onClick={() => {
                  setStep('enter_code');
                  setIsError(null);
                }}
                className="w-full bg-white/10 text-white py-4 rounded-2xl font-bold"
              >
                แก้ไขรหัส
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* GPS Status Indicator */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex items-center space-x-4 text-white">
          <div className={`w-3 h-3 rounded-full ${userLocation ? (locationAccuracy && locationAccuracy < 30 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-red-500'} animate-pulse`} />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">GPS Status</span>
            <span className="text-xs font-medium">
              {userLocation 
                ? `พบตำแหน่งแล้ว (${locationAccuracy ? `แม่นยำ ${Math.round(locationAccuracy)}ม.` : 'กำลังคำนวณความแม่นยำ'})` 
                : 'กำลังค้นหาสัญญาณ GPS...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
