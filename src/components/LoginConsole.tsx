/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Hourglass,
  HelpCircle,
  Clock
} from "lucide-react";
import { synth } from "../utils/sound";
import { motion, AnimatePresence } from "motion/react";

interface LoginConsoleProps {
  onLoginSubmit: (username: string, pass: string) => Promise<void>;
  attemptsCount: number;
  remainingAttempts: number;
  lockedOut: boolean;
  lockoutExpiry?: string;
  isSubmitting: boolean;
  errorFeedback?: string;
  onAutoUnlock: () => void;
}

export default function LoginConsole({
  onLoginSubmit,
  attemptsCount,
  remainingAttempts,
  lockedOut,
  lockoutExpiry,
  isSubmitting,
  errorFeedback,
  onAutoUnlock
}: LoginConsoleProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Lockout countdown execution
  useEffect(() => {
    if (!lockedOut || !lockoutExpiry) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const exp = new Date(lockoutExpiry).getTime();
      const diff = exp - Date.now();
      return Math.max(0, Math.ceil(diff / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onAutoUnlock();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockedOut, lockoutExpiry, onAutoUnlock]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedOut || isSubmitting) return;
    synth.playClick();
    onLoginSubmit(username, password);
  };

  const handleMutedInput = () => {
    synth.playClick();
  };

  return (
    <div id="login-console-box" className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between">
      {/* Red Lockout Banner Gradient accent */}
      <div className={`absolute top-0 left-0 w-full h-1.5 transition-all duration-300 ${
        lockedOut 
          ? "bg-rose-500 shadow-[0_2px_10px_rgba(239,68,68,0.3)] animate-pulse" 
          : remainingAttempts === 1 
          ? "bg-amber-500" 
          : "bg-indigo-600"
      }`} />

      {/* Main Column */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className={`p-3 rounded-full transition-all duration-300 ${
              lockedOut 
                ? "bg-rose-950/40 text-rose-400 border border-rose-900/50" 
                : remainingAttempts === 1 
                ? "bg-amber-950/40 text-amber-400 border border-amber-900/50" 
                : "bg-indigo-950/40 text-indigo-400 border border-indigo-900/50"
            }`}>
              <ShieldAlert className={`w-8 h-8 ${lockedOut ? "animate-pulse" : ""}`} />
            </div>
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide uppercase">Security Terminal</h2>
          <p className="text-xs text-slate-400">Restricted Console Authentication</p>
        </div>

        {/* ATTEMPTS Visual Bar indicators */}
        <div id="attempts-tokens-tracker" className="p-3 bg-slate-950 rounded-xl border border-slate-805 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Remaining Tries:</span>
            <span className={`font-bold ${remainingAttempts <= 1 ? "text-rose-500" : "text-emerald-500"}`}>
              {remainingAttempts} of 3
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((num) => {
              // Peg active status evaluation
              const isActive = num <= remainingAttempts && !lockedOut;
              return (
                <div
                  key={num}
                  id={`attempt-peg-${num}`}
                  className={`h-2.5 flex-1 rounded-sm transition-all duration-300 ${
                    isActive
                      ? remainingAttempts === 1
                        ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                        : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                      : "bg-slate-800"
                  }`}
                />
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {lockedOut ? (
            /* LOCKOUT FORM REPLACEMENT VIEW */
            <motion.div
              id="lockout-screen-overlay"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-5 bg-rose-955/20 border border-rose-900/40 rounded-xl text-center space-y-4"
            >
              <div className="flex justify-center flex-col items-center gap-3">
                <div className="p-2.5 rounded-full bg-rose-950/50 text-rose-450">
                  <Hourglass className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-450 uppercase tracking-widest">Console Lockout Active</h4>
                  <p className="text-[11px] text-rose-500 mt-1">Twilio security alerts dispatched.</p>
                </div>
              </div>

              {/* Countdown Dial circle mock */}
              <div className="flex items-center justify-center py-2">
                <div className="relative w-24 h-24 rounded-full border-4 border-rose-900/60 flex flex-col items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-rose-500 border-t-transparent animate-spin" style={{ animationDuration: '4s' }} />
                  <span className="font-mono text-2xl font-bold text-rose-450">{timeLeft}</span>
                  <span className="text-[9px] font-sans text-rose-500 uppercase tracking-wider font-semibold">Seconds</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 bg-rose-950/40 py-2 rounded-lg border border-rose-900/50 font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>Timer Auto-Reset Active</span>
              </div>
            </motion.div>
          ) : (
            /* ACTIVE LOGIN FORM VIEW */
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 font-sans"
            >
              {/* Username slot */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-550" />
                  <span>Username ID</span>
                </label>
                <input
                  id="input-login-username"
                  type="text"
                  required
                  placeholder="Enter credential username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleMutedInput}
                  disabled={isSubmitting}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-3 pr-3 text-sm text-slate-100 placeholder-slate-605 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 transition-colors"
                />
              </div>

              {/* Password slot */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-550" />
                  <span>Access Code</span>
                </label>
                <div className="relative">
                  <input
                    id="input-login-password"
                    type={showPass ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleMutedInput}
                    disabled={isSubmitting}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-3 pr-10 text-sm text-slate-100 placeholder-slate-605 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 transition-colors"
                  />
                  <button
                    id="btn-toggle-password-visibility"
                    type="button"
                    onClick={() => {
                      synth.playClick();
                      setShowPass(!showPass);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error feedback card */}
              {errorFeedback && (
                <div id="login-error-card" className="p-3 bg-rose-950/30 border border-rose-905/40 rounded-lg flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-rose-450 font-medium leading-relaxed">
                    {errorFeedback}
                  </span>
                </div>
              )}

              {/* Action Submit */}
              <button
                id="btn-login-submit"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-indigo-605 hover:bg-indigo-700 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-lg text-sm font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Initialize Authorization</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Helper credential prompt card below form */}
      <div id="evaluators-helpers-card" className="mt-5 p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold mb-1">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Credential Mapping</span>
        </div>
        <div className="text-[10px] font-mono space-y-0.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Username ID:</span>
            <span className="text-slate-300 font-bold font-mono select-all">username</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Security Code:</span>
            <span className="text-slate-300 font-bold font-mono select-all">password1234</span>
          </div>
        </div>
      </div>
    </div>
  );
}
