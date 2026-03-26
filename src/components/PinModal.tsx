import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  correctPin: string;
}

export default function PinModal({ isOpen, onSuccess, correctPin }: PinModalProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError(false);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    if (pin.every(digit => digit !== '')) {
      if (pin.join('') === correctPin) {
        onSuccess();
      } else {
        setError(true);
        setPin(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    }
  }, [pin, correctPin, onSuccess]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-[2.5rem] p-10 shadow-2xl max-w-md w-full text-center space-y-8 border border-white/20"
          >
            <div className="w-20 h-20 bg-brand-purple/10 rounded-full flex items-center justify-center mx-auto text-brand-purple">
              <Lock size={32} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Security Check</h2>
              <p className="text-slate-500">Please enter your 4-digit PIN to access the teacher dashboard.</p>
            </div>

            <div className="flex justify-center space-x-4">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="password"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-16 h-16 rounded-full text-center text-2xl font-bold border-2 transition-all outline-none ${
                    error 
                      ? 'border-red-400 bg-red-50 text-red-500 animate-shake' 
                      : 'border-slate-100 bg-slate-50 focus:border-brand-purple focus:bg-white focus:ring-4 focus:ring-brand-purple/10'
                  }`}
                />
              ))}
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 font-medium text-sm"
              >
                Incorrect PIN. Please try again.
              </motion.p>
            )}

            <p className="text-xs text-slate-400">
              Default PIN for testing: 1234
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
