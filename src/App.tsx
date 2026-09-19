/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Terminal, 
  FileCode, 
  Settings, 
  Tv, 
  UserCheck, 
  AlertTriangle,
  Compass,
  ArrowUpRight
} from "lucide-react";
import { SecurityEvent, LoginResponse } from "./types";
import { synth } from "./utils/sound";
import LoginConsole from "./components/LoginConsole";
import SecurityDashboard from "./components/SecurityDashboard";
import JavaOopVisualizer from "./components/JavaOopVisualizer";

export default function App() {
  const [activeTab, setActiveTab] = useState<"gateway" | "java">("gateway");
  
  // State elements
  const [logs, setLogs] = useState<SecurityEvent[]>([]);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [lockedOut, setLockedOut] = useState(false);
  const [lockoutExpiry, setLockoutExpiry] = useState<string | undefined>(undefined);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | undefined>(undefined);
  const [successBanner, setSuccessBanner] = useState<string | undefined>(undefined);
  const [isMuted, setIsMuted] = useState(false);
  const [twilioConfigured, setTwilioConfigured] = useState(false);
  const [twilioConfig, setTwilioConfig] = useState<{
    accountSidPresent: boolean;
    authTokenPresent: boolean;
    fromWhatsapp: string;
    toWhatsapp: string;
  } | null>(null);

  // Sync state and audit reports on boot
  const syncServerState = async () => {
    try {
      const res = await fetch("/api/security-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setAttemptsCount(data.state.failures);
        setRemainingAttempts(Math.max(0, 3 - data.state.failures));
        
        if (data.state.lockedUntil) {
          const exp = new Date(data.state.lockedUntil);
          if (exp.getTime() > Date.now()) {
            setLockedOut(true);
            setLockoutExpiry(data.state.lockedUntil);
          } else {
            setLockedOut(false);
            setLockoutExpiry(undefined);
          }
        } else {
          setLockedOut(false);
          setLockoutExpiry(undefined);
        }

        // Verify if twilio is configured over environment variables
        if (data.twilioConfig) {
          setTwilioConfig(data.twilioConfig);
          setTwilioConfigured(data.twilioConfig.accountSidPresent && data.twilioConfig.authTokenPresent);
        } else {
          const hasTwilio = data.logs.some((log: SecurityEvent) => log.twilioStatus !== "NOT_CONFIGURED" && log.isTwilioSent);
          setTwilioConfigured(hasTwilio);
        }
      }
    } catch (e) {
      console.warn("Server connection failed. Using local mockup simulation triggers.", e);
    }
  };

  useEffect(() => {
    syncServerState();
    // Periodically poll logs to ensure timers display correctly across sessions
    const interval = setInterval(() => {
      syncServerState();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Login handler
  const handleLoginSubmit = async (username: string, pass: string) => {
    setIsSubmitting(true);
    setErrorFeedback(undefined);
    setSuccessBanner(undefined);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password: pass,
          clientIp: "192.168.1.108",
          clientDevice: navigator.userAgent
        })
      });

      const data: LoginResponse = await response.json();
      
      if (response.ok && data.success) {
        // Access granted! Play chime
        synth.playSuccess();
        setSuccessBanner(data.message);
        setAttemptsCount(0);
        setRemainingAttempts(3);
        setLockedOut(false);
      } else {
        // Access denied or lock trigger
        setAttemptsCount(data.attemptsCount);
        setRemainingAttempts(data.remainingAttempts);
        setLockedOut(data.lockedOut);
        setLockoutExpiry(data.lockoutExpiry);
        setErrorFeedback(data.message);

        if (data.lockedOut) {
          // Critical lockout Siren triggered
          synth.playSirenAlert();
        } else {
          // Normal failure buzz
          synth.playAccessDenied();
        }
      }
    } catch (err) {
      // Fallback local emulator in case backend is loading/offline
      if (username === "username" && pass === "password1234") {
        synth.playSuccess();
        setSuccessBanner("Authentication successful (Offline Simulator Check)!");
        setRemainingAttempts(3);
        setAttemptsCount(0);
      } else {
        const nextFail = attemptsCount + 1;
        setAttemptsCount(nextFail);
        const rem = Math.max(0, 3 - nextFail);
        setRemainingAttempts(rem);
        
        if (nextFail >= 3) {
          synth.playSirenAlert();
          setLockedOut(true);
          const localExpiry = new Date(Date.now() + 120 * 1000).toISOString();
          setLockoutExpiry(localExpiry);
          setErrorFeedback("Lockout Activated. Local Twilio outbox simulator triggered.");
        } else {
          synth.playAccessDenied();
          setErrorFeedback(`Incorrect credentials. ${rem} attempts remaining.`);
        }
      }
    } finally {
      setIsSubmitting(false);
      syncServerState();
    }
  };

  // Lockout bypass triggered from security controls
  const handleBypassLockout = async () => {
    setErrorFeedback(undefined);
    setSuccessBanner(undefined);
    try {
      const response = await fetch("/api/reset-lockout", { method: "POST" });
      if (response.ok) {
        const data = await response.json();
        setAttemptsCount(0);
        setRemainingAttempts(3);
        setLockedOut(false);
        setLockoutExpiry(undefined);
        synth.playSuccess();
      }
    } catch (e) {
      // Offline fallback
      setAttemptsCount(0);
      setRemainingAttempts(3);
      setLockedOut(false);
      setLockoutExpiry(undefined);
      synth.playSuccess();
    } finally {
      syncServerState();
    }
  };

  // Lockout countdown timer auto-expired callback
  const handleAutoUnlock = () => {
    setLockedOut(false);
    setLockoutExpiry(undefined);
    setAttemptsCount(0);
    setRemainingAttempts(3);
    setErrorFeedback(undefined);
    syncServerState();
  };

  // Sound mute control
  const handleToggleMute = () => {
    const isMutedNow = synth.toggleMute();
    setIsMuted(isMutedNow);
  };

  const handleClearLogs = () => {
    synth.playClick();
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* PROFESSIONAL UPPER STATUS STRIP */}
      <header className="border-b border-slate-800 bg-slate-900 sticky top-0 z-50 shadow-md py-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-650 rounded-lg shadow-lg shadow-indigo-950/50 text-white animate-scale">
              <ShieldCheck className="w-5 h-5" id="app-logo-shield" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wider text-white uppercase">Secure Login System</h1>
              <p className="text-[10px] text-indigo-400 font-medium font-mono leading-none mt-1">SYSTEM PROTECTED SSO</p>
            </div>
          </div>

          {/* Tab Selector Links */}
          <div className="flex items-center bg-slate-850 border border-slate-800 p-1 rounded-lg">
            <button
              id="tab-btn-gateway"
              onClick={() => {
                synth.playClick();
                setActiveTab("gateway");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "gateway"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-indigo-400 hover:bg-slate-800/50"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Security Gateway</span>
            </button>

            <button
              id="tab-btn-java"
              onClick={() => {
                synth.playClick();
                setActiveTab("java");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "java"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-indigo-400 hover:bg-slate-800/50"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Java OOP Core</span>
            </button>
          </div>

          {/* Server Diagnostic Banner */}
          <div className="hidden md:flex items-center gap-5">
            <div className="flex items-center gap-2 text-right">
              <span className="text-[9px] text-slate-500 font-mono">STATUS DIAGNOSTIC</span>
              <span className="text-xs text-indigo-450 font-bold font-mono">PORT 3000</span>
            </div>
          </div>

        </div>
      </header>

      {/* SYSTEM MAIN CANVAS AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {successBanner ? (
          /* SUCCESS LOGGED IN WELCOME VIEW */
          <div className="max-w-xl mx-auto w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-950/45 text-emerald-400 flex items-center justify-center border border-emerald-900/50 shadow-inner">
                <ShieldCheck className="w-8 h-8 animate-bounce" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Access Token Verified</h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Secure modular handshake finalized. Credentials validated, lockout timers cleared.
              </p>
            </div>

            <div className="p-4 bg-emerald-950/30 border border-emerald-900/40 rounded-xl space-y-2 text-left">
              <div className="flex items-center gap-2 text-xs text-emerald-450 font-bold uppercase tracking-wider">
                <UserCheck className="w-4 h-4" />
                <span>Active Session Credentials</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                Principal: <span className="text-emerald-400 font-bold">username</span> <br />
                Audit event registered successfully on the server outbox.
              </p>
            </div>

            <button
              id="btn-return-login"
              onClick={() => {
                synth.playClick();
                setSuccessBanner(undefined);
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              De-authorize & Return to Terminal
            </button>
          </div>
        ) : (
          /* STANDARD TAB CONTENTS */
          <div className="w-full">
            {activeTab === "gateway" ? (
              <div className="space-y-6 animate-fade-in">
                {/* Visual Gateway Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-md">
                  <div className="space-y-1">
                    <h2 className="text-md font-bold text-white flex items-center gap-2">
                      <Tv className="w-5 h-5 text-indigo-400" />
                      <span>Security Control Dashboard</span>
                    </h2>
                    <p className="text-xs text-slate-400 max-w-md">
                      Test authorization safety boundaries. Fail login password 3 times consecutively to trigger full console defensive lockout and send Twilio WhatsApp messages.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-350 bg-slate-950 px-3.5 py-1.5 rounded-lg border border-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Audit Pipeline: Active</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left panel: Login Terminal */}
                  <div className="lg:col-span-4 flex justify-center lg:justify-start w-full">
                    <LoginConsole
                      onLoginSubmit={handleLoginSubmit}
                      attemptsCount={attemptsCount}
                      remainingAttempts={remainingAttempts}
                      lockedOut={lockedOut}
                      lockoutExpiry={lockoutExpiry}
                      isSubmitting={isSubmitting}
                      errorFeedback={errorFeedback}
                      onAutoUnlock={handleAutoUnlock}
                    />
                  </div>

                  {/* Right panel: Active Alarm tracker + WhatsApp monitor mockup */}
                  <div className="lg:col-span-8">
                    <SecurityDashboard
                      logs={logs}
                      isMuted={isMuted}
                      onToggleMute={handleToggleMute}
                      onClearLogs={handleClearLogs}
                      onBypassLockout={handleBypassLockout}
                      twilioConfigured={twilioConfigured}
                      twilioConfig={twilioConfig}
                      onTwilioConfigUpdated={(newConfig) => {
                        setTwilioConfig(newConfig);
                        setTwilioConfigured(newConfig.accountSidPresent && newConfig.authTokenPresent);
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-fade-in space-y-4">
                <div className="p-5 bg-indigo-950/40 border border-indigo-900/50 text-slate-350 rounded-xl space-y-1">
                  <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-455" />
                    <span>Java OOP Architecture Mode</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    View the backend server-side object logic written in Java OOPS language to evaluate secure structure, custom Exceptions inheritance, and Dependency Inversion.
                  </p>
                </div>
                <JavaOopVisualizer />
              </div>
            )}
          </div>
        )}
      </main>

      {/* COMPACT SECURE FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-905 py-6 mt-12 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>Secure Console Lockout Simulator &copy; 2026. All authorizations audited server-side.</p>
          <div className="flex gap-4">
            <span>Port: 3000</span>
            <span>Ref: SOLID-OOP</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
