import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Trash2, 
  UserPlus,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Mail,
  Hash,
  BookOpen,
  Plus,
  ArrowLeft,
  Upload,
  X,
  FileSpreadsheet,
  ChevronRight,
  LayoutGrid,
  List,
  Key,
  Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import ExcelUpload from './ExcelUpload';
import { Student, Subject } from '../types';
import { 
  db, 
  auth, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  deleteDoc, 
  updateDoc, 
  handleFirestoreError, 
  OperationType
} from '../lib/firebase';
import { Timestamp } from 'firebase/firestore';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    name: '',
    studentId: '',
    email: ''
  });
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsData, setSettingsData] = useState({
    totalClasses: 15,
    totalScore: 100
  });

  useEffect(() => {
    if (!auth.currentUser?.email) return;

    const subjectsQuery = query(
      collection(db, 'subjects'),
      where('teacherEmail', '==', auth.currentUser.email)
    );

    const unsubscribeSubjects = onSnapshot(subjectsQuery, (snapshot) => {
      const subjectsData = snapshot.docs.map(doc => doc.data() as Subject);
      setSubjects(subjectsData);
      
      // Update selected subject if it's currently selected to get latest settings
      if (selectedSubject) {
        const updated = subjectsData.find(s => s.id === selectedSubject.id);
        if (updated) {
          setSelectedSubject(updated);
          setSettingsData({
            totalClasses: updated.totalClasses || 15,
            totalScore: updated.totalScore || 100
          });
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'subjects');
    });

    let unsubscribeStudents = () => {};
    let unsubscribeRecords = () => {};
    let unsubscribeSessions = () => {};
    
    if (selectedSubject) {
      const studentsQuery = query(
        collection(db, 'students'),
        where('subjectId', '==', selectedSubject.id)
      );
      unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
        const studentsData = snapshot.docs.map(doc => doc.data() as Student);
        setStudents(studentsData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'students');
      });

      // Fetch all attendance records for this subject to calculate scores
      const recordsQuery = query(
        collection(db, 'attendance_records'),
        where('subjectId', '==', selectedSubject.id)
      );
      unsubscribeRecords = onSnapshot(recordsQuery, (snapshot) => {
        const recordsData = snapshot.docs.map(doc => doc.data());
        setAttendanceRecords(recordsData);
      });

      // Fetch today's sessions to show ✅/❌
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const sessionsQuery = query(
        collection(db, 'attendance_sessions'),
        where('subjectId', '==', selectedSubject.id),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      );
      unsubscribeSessions = onSnapshot(sessionsQuery, (snapshot) => {
        const sessionsData = snapshot.docs.map(doc => doc.data());
        setTodaySessions(sessionsData);
      });
    } else {
      const studentsQuery = collection(db, 'students');
      unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
        const studentsData = snapshot.docs.map(doc => doc.data() as Student);
        setStudents(studentsData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'students');
      });
    }

    return () => {
      unsubscribeSubjects();
      unsubscribeStudents();
      unsubscribeRecords();
      unsubscribeSessions();
    };
  }, [selectedSubject?.id]);

  const [newSubject, setNewSubject] = useState({
    code: '',
    name: '',
    section: '',
    totalClasses: 15,
    totalScore: 100
  });
  const [tempStudents, setTempStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const getAttendanceIcon = (studentId: string) => {
    if (todaySessions.length === 0) return null;
    
    const isPresent = attendanceRecords.some(r => 
      r.studentId === studentId && 
      todaySessions.some(s => s.id === r.sessionId)
    );

    if (isPresent) return <span className="text-emerald-500 text-xl">✅</span>;
    
    const anyClosed = todaySessions.some(s => !s.isActive);
    if (anyClosed) return <span className="text-red-500 text-xl">❌</span>;
    
    return null;
  };

  const calculateScore = (studentId: string) => {
    if (!selectedSubject) return '0.0';
    
    const totalClasses = selectedSubject.totalClasses || 15;
    const totalScore = selectedSubject.totalScore || 100;
    
    const presentCount = attendanceRecords.filter(r => r.studentId === studentId).length;
    const score = (presentCount / totalClasses) * totalScore;
    
    return score.toFixed(1);
  };

  const handleUpdateSettings = async () => {
    if (!selectedSubject) return;
    try {
      await updateDoc(doc(db, 'subjects', selectedSubject.id), {
        totalClasses: settingsData.totalClasses,
        totalScore: settingsData.totalScore
      });
      toast.success("Settings updated successfully");
      setIsSettingsOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'subjects');
    }
  };

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = students.filter(s => 
    s.subjectId === selectedSubject?.id && (
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.studentId.includes(searchQuery)
    )
  );

  const handleAddSubject = async () => {
    if (!newSubject.code || !newSubject.name || !newSubject.section) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!auth.currentUser?.email) {
      toast.error('You must be logged in to add a subject');
      return;
    }

    const subjectId = 'sub_' + Date.now();
    const subjectData = {
      id: subjectId,
      ...newSubject,
      studentCount: tempStudents.length,
      teacherEmail: auth.currentUser.email
    };

    try {
      await setDoc(doc(db, 'subjects', subjectId), subjectData);

      const studentsWithSubjectId = tempStudents.map(s => ({ ...s, subjectId }));
      for (const student of studentsWithSubjectId) {
        await setDoc(doc(db, 'students', student.studentId + '_' + subjectId), student);
      }
      
      setIsAddSubjectOpen(false);
      setNewSubject({ code: '', name: '', section: '', totalClasses: 15, totalScore: 100 });
      setTempStudents([]);
      toast.success('Subject added successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'subjects');
    }
  };

  const handleAddStudent = async () => {
    if (!selectedSubject) return;
    if (!newStudentData.name || !newStudentData.studentId) {
      toast.error('กรุณากรอกชื่อและรหัสนักศึกษา');
      return;
    }

    try {
      const studentData: Student = {
        ...newStudentData,
        email: newStudentData.email || `${newStudentData.studentId}@bumail.net`,
        subjectId: selectedSubject.id
      };

      await setDoc(doc(db, 'students', studentData.studentId + '_' + selectedSubject.id), studentData);
      
      const newCount = selectedSubject.studentCount + 1;
      await updateDoc(doc(db, 'subjects', selectedSubject.id), {
        studentCount: newCount
      });
      
      setIsAddStudentOpen(false);
      setNewStudentData({ name: '', studentId: '', email: '' });
      toast.success('เพิ่มนักศึกษาสำเร็จ');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'students');
    }
  };
  const removeStudent = async (studentId: string) => {
    if (!selectedSubject) return;
    
    try {
      await deleteDoc(doc(db, 'students', studentId + '_' + selectedSubject.id));
      
      // Update student count in subject
      const newCount = Math.max(0, selectedSubject.studentCount - 1);
      await updateDoc(doc(db, 'subjects', selectedSubject.id), {
        studentCount: newCount
      });
      
      toast.success('Student removed successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'students');
    }
  };

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto bg-background min-h-screen">
      <Toaster position="top-right" />
      
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-brand-purple">
                  <ShieldCheck size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Teacher Dashboard</span>
                </div>
                <div className="flex items-center space-x-4">
                  {selectedSubject && (
                    <button 
                      onClick={() => setSelectedSubject(null)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      <ArrowLeft size={20} />
                    </button>
                  )}
                  <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
                    {selectedSubject ? selectedSubject.name : 'Student Management'}
                  </h1>
                </div>
                <p className="text-slate-500">
                  {selectedSubject 
                    ? `${selectedSubject.code} • Section ${selectedSubject.section}` 
                    : 'Manage your subjects, students, and track attendance records.'}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {!selectedSubject ? (
                  <button 
                    onClick={() => setIsAddSubjectOpen(true)}
                    className="bg-brand-purple text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-brand-purple/20 hover:scale-[1.02] transition-all flex items-center space-x-2"
                  >
                    <Plus size={18} />
                    <span>เพิ่มรายวิชา</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => navigate(`/attendance/session/${selectedSubject.id}`)}
                      className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all flex items-center space-x-2"
                    >
                      <Key size={18} />
                      <span>เริ่มเช็คชื่อ (รหัส 6 หลัก)</span>
                    </button>
                    <button 
                      onClick={() => setIsAddStudentOpen(true)}
                      className="bg-brand-purple text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-brand-purple/20 hover:scale-[1.02] transition-all flex items-center space-x-2"
                    >
                      <UserPlus size={18} />
                      <span>Add Student</span>
                    </button>
                  </div>
                )}
              </div>
            </header>

            {/* Stats Cards (Only show on main view) */}
            {!selectedSubject && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="bg-brand-purple p-8 rounded-[2rem] shadow-xl text-white space-y-4 relative overflow-hidden"
                >
                  <div className="absolute -right-6 -bottom-6 opacity-10 rotate-12">
                    <BookOpen size={160} />
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm font-medium">Total Subjects</p>
                    <h3 className="text-4xl font-bold">{subjects.length}</h3>
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ y: -5 }}
                  className="bg-brand-blue p-8 rounded-[2rem] shadow-xl text-white space-y-4 relative overflow-hidden"
                >
                  <div className="absolute -right-6 -bottom-6 opacity-10 rotate-12">
                    <Users size={160} />
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm font-medium">Total Students</p>
                    <h3 className="text-4xl font-bold">{students.length}</h3>
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ y: -5 }}
                  className="bg-brand-peach p-8 rounded-[2rem] shadow-xl text-white space-y-4 relative overflow-hidden"
                >
                  <div className="absolute -right-6 -bottom-6 opacity-10 rotate-12">
                    <CheckCircle2 size={160} />
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm font-medium">Avg. Attendance</p>
                    <h3 className="text-4xl font-bold">94.2%</h3>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Main Content */}
            {!selectedSubject ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">Your Subjects</h2>
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-purple transition-colors" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search subjects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 pr-6 py-3 bg-white border border-slate-100 focus:border-brand-purple/30 focus:ring-4 focus:ring-brand-purple/5 rounded-2xl outline-none w-full md:w-64 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSubjects.map((subject) => (
                    <motion.div
                      key={subject.id}
                      whileHover={{ y: -5 }}
                      onClick={() => {
                        setSelectedSubject(subject);
                        setSearchQuery('');
                      }}
                      className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-brand-purple/10 transition-colors" />
                      
                      <div className="space-y-6 relative z-10">
                        <div className="flex justify-between items-start">
                          <div className="w-14 h-14 bg-brand-purple/10 rounded-2xl flex items-center justify-center text-brand-purple">
                            <BookOpen size={28} />
                          </div>
                          <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Section {subject.section}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-purple transition-colors">
                            {subject.name}
                          </h3>
                          <p className="text-slate-500 font-mono text-sm">{subject.code}</p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <div className="flex items-center space-x-2 text-slate-400">
                            <Users size={16} />
                            <span className="text-sm font-medium">{subject.studentCount} Students</span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-purple group-hover:text-white transition-all">
                            <ChevronRight size={18} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {filteredSubjects.length === 0 && (
                  <div className="p-20 text-center space-y-4 bg-white rounded-[3rem] border border-slate-100 border-dashed">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <BookOpen size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900">No subjects found</p>
                      <p className="text-slate-500 text-sm">Create a new subject to start managing attendance.</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Excel Upload Section */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900">Import Data</h3>
                      <p className="text-slate-500 text-sm">Upload student lists for this subject.</p>
                    </div>
                    <ExcelUpload onUploadSuccess={async (newStudents) => {
                      if (!selectedSubject) return;
                      
                      try {
                        const studentsWithId = newStudents.map(s => ({ ...s, subjectId: selectedSubject.id }));
                        for (const student of studentsWithId) {
                          await setDoc(doc(db, 'students', student.studentId + '_' + selectedSubject.id), student);
                        }
                        
                        const newCount = selectedSubject.studentCount + newStudents.length;
                        await updateDoc(doc(db, 'subjects', selectedSubject.id), {
                          studentCount: newCount
                        });
                        
                        toast.success(`Imported ${newStudents.length} students`);
                      } catch (error) {
                        handleFirestoreError(error, OperationType.WRITE, 'students');
                      }
                    }} />
                    <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Instructions</h4>
                      <ul className="text-xs text-slate-500 space-y-2">
                        <li className="flex items-start space-x-2">
                          <div className="w-4 h-4 rounded-full bg-brand-purple/20 flex items-center justify-center text-brand-purple text-[10px] mt-0.5">1</div>
                          <span>Use columns: <b>studentId</b>, <b>name</b>, <b>email</b></span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Student Table Section */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
                    <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-slate-900">Student List</h3>
                        <p className="text-slate-500 text-sm">Showing {filteredStudents.length} students • {new Date().toLocaleDateString('th-TH')}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={() => setIsSettingsOpen(true)}
                          className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"
                        >
                          <Settings size={20} />
                        </button>
                        <div className="relative group">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-purple transition-colors" size={18} />
                          <input 
                            type="text" 
                            placeholder="Search by name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 pr-6 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-brand-purple/30 focus:ring-4 focus:ring-brand-purple/5 rounded-2xl outline-none w-full md:w-64 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50">
                            <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Student</th>
                            <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">ID Number</th>
                            <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Attendance</th>
                            <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Score</th>
                            <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredStudents.map((student) => (
                            <motion.tr 
                              layout
                              key={student.studentId}
                              className="hover:bg-slate-50/50 transition-colors group"
                            >
                              <td className="px-8 py-5">
                                <div className="flex items-center space-x-4">
                                  <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue font-bold text-lg">
                                    {student.name.charAt(0)}
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="font-bold text-slate-900">{student.name}</p>
                                    <div className="flex items-center text-xs text-slate-400 space-x-1">
                                      <Mail size={12} />
                                      <span>{student.email}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex items-center space-x-2 text-slate-600 font-mono font-medium">
                                  <Hash size={14} className="text-slate-300" />
                                  <span>{student.studentId}</span>
                                </div>
                              </td>
                              <td className="px-8 py-5 text-center">
                                {getAttendanceIcon(student.studentId)}
                              </td>
                              <td className="px-8 py-5 text-center font-bold text-slate-700">
                                {calculateScore(student.studentId)}
                              </td>
                              <td className="px-8 py-5 text-right">
                                <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button className="p-2 text-slate-400 hover:text-brand-purple hover:bg-brand-purple/10 rounded-xl transition-all">
                                    <MoreHorizontal size={18} />
                                  </button>
                                  <button 
                                    onClick={() => removeStudent(student.studentId)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {filteredStudents.length === 0 && (
                        <div className="p-20 text-center space-y-4">
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                            <Search size={32} />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900">No students found</p>
                            <p className="text-slate-500 text-sm">Try adjusting your search or import a new list.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
      </AnimatePresence>

      {/* Add Subject Modal */}
      <AnimatePresence>
        {isAddSubjectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddSubjectOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-brand-purple rounded-xl flex items-center justify-center text-white">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">เพิ่มรายวิชาใหม่</h3>
                    <p className="text-xs text-slate-500 font-medium">Create a new subject and import students.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddSubjectOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">รหัสวิชา</label>
                    <input 
                      type="text" 
                      placeholder="e.g. CS301"
                      value={newSubject.code}
                      onChange={(e) => setNewSubject(prev => ({ ...prev, code: e.target.value }))}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-brand-purple/5 outline-none transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">เซคชั่น</label>
                    <input 
                      type="text" 
                      placeholder="e.g. A"
                      value={newSubject.section}
                      onChange={(e) => setNewSubject(prev => ({ ...prev, section: e.target.value }))}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-brand-purple/5 outline-none transition-all"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">ชื่อวิชา</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Web Development"
                      value={newSubject.name}
                      onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-brand-purple/5 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">จำนวนครั้งที่เช็คชื่อทั้งหมด</label>
                    <input 
                      type="number" 
                      value={newSubject.totalClasses}
                      onChange={(e) => setNewSubject(prev => ({ ...prev, totalClasses: parseInt(e.target.value) }))}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-brand-purple/5 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">คะแนนรวมทั้งหมด</label>
                    <input 
                      type="number" 
                      value={newSubject.totalScore}
                      onChange={(e) => setNewSubject(prev => ({ ...prev, totalScore: parseInt(e.target.value) }))}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-brand-purple/5 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">รายชื่อนักศึกษา</label>
                  {tempStudents.length > 0 ? (
                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-[2rem] flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-emerald-900">Imported Successfully</p>
                          <p className="text-sm text-emerald-700">{tempStudents.length} students ready to be added.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setTempStudents([])}
                        className="text-xs font-bold text-emerald-600 hover:underline"
                      >
                        Change File
                      </button>
                    </div>
                  ) : (
                    <ExcelUpload onUploadSuccess={(students) => setTempStudents(students)} />
                  )}
                </div>
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end space-x-4">
                <button 
                  onClick={() => setIsAddSubjectOpen(false)}
                  className="px-8 py-4 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddSubject}
                  className="bg-brand-purple text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-brand-purple/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Add Student Modal */}
      <AnimatePresence>
        {isAddStudentOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddStudentOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-brand-purple rounded-xl flex items-center justify-center text-white">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">เพิ่มนักศึกษา</h3>
                    <p className="text-xs text-slate-500 font-medium">Add a student manually to this subject.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddStudentOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">ชื่อ-นามสกุล</label>
                  <input 
                    type="text" 
                    placeholder="e.g. สมชาย ใจดี"
                    value={newStudentData.name}
                    onChange={(e) => setNewStudentData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-brand-purple/5 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">รหัสนักศึกษา</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 1650700000"
                    value={newStudentData.studentId}
                    onChange={(e) => setNewStudentData(prev => ({ ...prev, studentId: e.target.value }))}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-brand-purple/5 outline-none transition-all font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">อีเมล (ถ้ามี)</label>
                  <input 
                    type="email" 
                    placeholder="e.g. student@bumail.net"
                    value={newStudentData.email}
                    onChange={(e) => setNewStudentData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-brand-purple/5 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end space-x-4">
                <button 
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-8 py-4 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddStudent}
                  className="bg-brand-purple text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-brand-purple/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Add Student
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-brand-purple rounded-xl flex items-center justify-center text-white">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">ตั้งค่ารายวิชา</h3>
                    <p className="text-xs text-slate-500 font-medium">Configure attendance and scoring for this subject.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">จำนวนครั้งที่เช็คชื่อทั้งหมด</label>
                  <input 
                    type="number" 
                    value={settingsData.totalClasses}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, totalClasses: parseInt(e.target.value) }))}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-brand-purple/5 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">คะแนนรวมทั้งหมด</label>
                  <input 
                    type="number" 
                    value={settingsData.totalScore}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, totalScore: parseInt(e.target.value) }))}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-brand-purple/5 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end space-x-4">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-8 py-4 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateSettings}
                  className="bg-brand-purple text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-brand-purple/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

