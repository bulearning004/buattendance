import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Student } from '../types';

interface ExcelUploadProps {
  onUploadSuccess: (students: Student[]) => void;
}

export default function ExcelUpload({ onUploadSuccess }: ExcelUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Failed to read file data');
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get all rows as arrays to find the header row manually
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (rows.length === 0) throw new Error('The Excel file is empty.');

        // Keywords for identifying columns
        const idKeywords = ['studentid', 'student id', 'student_id', 'รหัสนักศึกษา', 'รหัสนิสิต', 'รหัส', 'id', 'sid', 'std_id', 'stdid', 'รหัสประจำตัว'];
        const nameKeywords = ['name', 'ชื่อ-นามสกุล', 'ชื่อ', 'full name', 'fullname', 'student name', 'ชื่อนิสิต', 'ชื่อจริง', 'displayname', 'first name', 'firstname', 'ชื่อจริง'];

        // Find the header row by looking for keywords
        let headerRowIndex = -1;
        let idColIndex = -1;
        let nameColIndex = -1;
        let emailColIndex = -1;
        const emailKeywords = ['email', 'อีเมล', 'e-mail', 'mail', 'contact'];

        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          if (!row || !Array.isArray(row)) continue;

          for (let j = 0; j < row.length; j++) {
            const cellValue = String(row[j] || '').toLowerCase().trim();
            if (!cellValue) continue;

            if (idColIndex === -1 && idKeywords.some(kw => cellValue.includes(kw))) idColIndex = j;
            if (nameColIndex === -1 && nameKeywords.some(kw => cellValue.includes(kw))) nameColIndex = j;
            if (emailColIndex === -1 && emailKeywords.some(kw => cellValue.includes(kw))) emailColIndex = j;
          }

          if (idColIndex !== -1 && nameColIndex !== -1) {
            headerRowIndex = i;
            break;
          }
        }

        // If we couldn't find headers by keywords, assume row 0 is header if it has data
        if (headerRowIndex === -1) {
          headerRowIndex = 0;
          idColIndex = 0;
          nameColIndex = 1;
          emailColIndex = 2;
        }

        const normalizedStudents: Student[] = [];
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const studentId = String(row[idColIndex] || '').trim().replace(/-/g, '');
          let name = String(row[nameColIndex] || '').trim();
          const email = emailColIndex !== -1 ? String(row[emailColIndex] || '').trim() : '';

          // If name is still empty and we have a column next to it, maybe it's first/last name
          if (!name && row[nameColIndex + 1]) {
            name = `${String(row[nameColIndex] || '').trim()} ${String(row[nameColIndex + 1] || '').trim()}`.trim();
          }

          if (studentId && name && studentId.length > 3) {
            normalizedStudents.push({ studentId, name, email });
          }
        }

        if (normalizedStudents.length === 0) {
          const firstRow = rows.length > 0 ? rows[0].join(', ') : 'None';
          throw new Error(`No valid student data found. First row detected: [${firstRow}]. Please ensure your Excel has columns for "ID" and "Name".`);
        }

        toast.success(`Successfully imported ${normalizedStudents.length} students`, {
          description: 'Student IDs have been normalized.',
        });

        onUploadSuccess(normalizedStudents);
      } catch (error: any) {
        console.error('Excel processing error:', error);
        toast.error('Failed to process Excel file', {
          description: error.message || 'Please check the file format.',
        });
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read file');
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(file);
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  } as any);

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative group cursor-pointer transition-all duration-300 border-2 border-dashed rounded-[2rem] p-10 text-center flex flex-col items-center justify-center space-y-4 ${
          isDragActive 
            ? 'border-brand-purple bg-brand-purple/5' 
            : 'border-slate-200 hover:border-brand-purple/50 hover:bg-slate-50'
        }`}
      >
        <input {...getInputProps()} />
        
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
          isDragActive ? 'bg-brand-purple text-white scale-110' : 'bg-brand-purple/10 text-brand-purple'
        }`}>
          {isProcessing ? (
            <Loader2 className="animate-spin" size={32} />
          ) : (
            <FileSpreadsheet size={32} />
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900">
            {isDragActive ? 'Drop the file here' : 'Import Student List'}
          </h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Drag and drop your Excel (.xlsx) file here, or click to browse.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-brand-purple bg-brand-purple/10 px-4 py-2 rounded-full">
          <Upload size={14} />
          <span>Supports .xlsx, .xls</span>
        </div>

        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10"
          >
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="animate-spin text-brand-purple" size={40} />
              <p className="font-bold text-brand-purple">Normalizing Student IDs...</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
