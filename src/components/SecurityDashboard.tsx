/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { SecurityEvent } from "../types";
import { 
  BellRing, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  RefreshCw, 
  ShieldAlert, 
  LockOpen, 
  Send, 
  CheckCheck,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { synth } from "../utils/sound";
import { motion, AnimatePresence } from "motion/react";

interface SecurityDashboardProps {
  logs: SecurityEvent[];
  isMuted: boolean;
  onToggleMute: () => void;
  onClearLogs: () => void;
  onBypassLockout: () => Promise<void>;
  twilioConfigured: boolean;
  twilioConfig?: {
    accountSidPresent: boolean;
    authTokenPresent: boolean;
    fromWhatsapp: string;
    toWhatsapp: string;
  } | null;
  onTwilioConfigUpdated?: (newConfig: any) => void;
}

export default function SecurityDashboard({
  logs,
  isMuted,
  onToggleMute,
  onClearLogs,
  onBypassLockout,
  twilioConfigured,
  twilioConfig,
  onTwilioConfigUpdated
}: SecurityDashboardProps) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  // Dynamic credentials inputs state
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [fromNum, setFromNum] = useState(twilioConfig?.fromWhatsapp || "whatsapp:+14155238886");
  const [toNum, setToNum] = useState(twilioConfig?.toWhatsapp || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSaveTwilio = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/configure-twilio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountSid,
          authToken,
          fromWhatsapp: fromNum,
          toWhatsapp: toNum
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveResult({ success: true, message: data.message });
        if (onTwilioConfigUpdated) {
          onTwilioConfigUpdated(data.twilioConfig);
        }
        // Safely reset secret fields
        setAccountSid("");
        setAuthToken("");
      } else {
        setSaveResult({ success: false, message: data.message || "Server error while configuring Twilio." });
      }
    } catch (err: any) {
      setSaveResult({ success: false, message: err.message || "Failed to reach dynamic config server route." });
    } finally {
      setIsSaving(false);
    }
  };

  // Retrieve the latest lockout event to mock inside the phone screen
  const lastWhatsAppEvent = logs.find(log => log.whatsappMessageBody);

  const formatLogTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return "00:00:00";
    }
  };

  return (
    <div id="security-dashboard-container" className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* SECTION 1: SYSTEM CONTROLS & AUDIT EVENT MONITOR */}
      <div className="md:col-span-7 space-y-6 flex flex-col justify-between h-full">
        {/* Header Console */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-950/40 text-indigo-400">
                <BellRing className="w-5 h-5 animate-pulse" id="audit-indicator-bell" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Security Control Hub</h3>
                <p className="text-xs text-slate-400">Live Server Telemetry</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sound toggle controls */}
              <button
                id="btn-toggle-sound"
                onClick={() => {
                  onToggleMute();
                  synth.playClick();
                }}
                className={`p-2 rounded-lg border transition-all duration-200 cursor-pointer ${
                  isMuted 
                    ? "bg-slate-800 hover:bg-slate-750 text-slate-500 border-slate-700" 
                    : "bg-indigo-955/40 text-indigo-400 hover:bg-indigo-900/50 border-indigo-900/40"
                }`}
                title={isMuted ? "Unmute system notifications" : "Mute audio alerts"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Developer override reset */}
              <button
                id="btn-bypass-lockout"
                onClick={onBypassLockout}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-955/20 hover:bg-rose-950/50 text-rose-450 border border-rose-900/40 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer"
                title="Bypass active block state for re-checking"
              >
                <LockOpen className="w-3.5 h-3.5 text-rose-500" />
                <span>Reset Block States</span>
              </button>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-805 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${twilioConfigured ? "bg-emerald-500" : "bg-yellow-500 animate-pulse"}`} />
              <span className="text-[11px] font-mono text-slate-400">
                Twilio WhatsApp Channel: <span className="font-bold text-slate-200">{twilioConfigured ? "REAL SERVICE ROOT" : "SIMULATOR ACTIVE (MOCK)"}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="flex items-center gap-1.5 px-2 py-1 bg-slate-850 hover:bg-slate-800 border border-slate-705 text-slate-300 rounded-md text-[10px] font-mono transition-all font-semibold cursor-pointer"
                title="Troubleshoot and verify credentials"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>{showDiagnostics ? "Hide Installer" : "Setup & Diagnose"}</span>
                {showDiagnostics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {!twilioConfigured && (
                <div className="flex items-center gap-1 text-[10px] text-yellow-450 bg-yellow-950/40 px-2 py-1 rounded border border-yellow-905/50">
                  <AlertCircle className="w-3 h-3" />
                  <span>Simulated</span>
                </div>
              )}
            </div>
          </div>

          {showDiagnostics && (
            <div className="mt-3 p-4 bg-indigo-955/20 border border-indigo-900/40 rounded-lg text-xs space-y-3 font-sans animate-fade-in text-slate-350">
              <div className="font-bold text-indigo-400 border-b border-indigo-100/60 pb-1 flex items-center justify-between">
                <span>WhatsApp Diagnostics Portal</span>
                <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950/45 px-1.5 py-0.5 rounded">Setup Check</span>
              </div>

              {/* Diagnostics checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="p-1.5 bg-slate-950 border border-slate-805 rounded flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Account SID:</span>
                  {twilioConfig?.accountSidPresent ? (
                     <span className="text-emerald-400 font-bold">✅ FOUND</span>
                  ) : (
                     <span className="text-rose-455 font-bold">❌ MISSING</span>
                  )}
                </div>
                <div className="p-1.5 bg-slate-950 border border-slate-805 rounded flex items-center gap-1.5">
                  <span className="text-slate-505 font-medium">Auth Token:</span>
                  {twilioConfig?.authTokenPresent ? (
                     <span className="text-emerald-400 font-bold">✅ FOUND</span>
                  ) : (
                     <span className="text-rose-455 font-bold">❌ MISSING</span>
                  )}
                </div>
                <div className="p-1.5 bg-slate-950 border border-slate-805 rounded flex flex-col sm:col-span-2">
                  <span className="text-slate-505 text-[9px] font-medium">Sender (TWILIO_FROM_WHATSAPP):</span>
                  <span className="text-indigo-305 font-semibold select-all truncate">{twilioConfig?.fromWhatsapp || "whatsapp:+14155238886"}</span>
                </div>
                <div className="p-1.5 bg-slate-955 border border-slate-805 rounded flex flex-col sm:col-span-2">
                  <span className="text-slate-550 text-[9px] font-medium">Recipient (TWILIO_TO_WHATSAPP):</span>
                  <span className="text-indigo-305 font-semibold select-all truncate">
                    {twilioConfig?.toWhatsapp ? `whatsapp:${twilioConfig.toWhatsapp}` : "❌ NOT SET (using fallback simulation)"}
                  </span>
                </div>
              </div>

              {/* Dynamic Credential Injection Form */}
              <form onSubmit={handleSaveTwilio} className="bg-slate-950 p-3.5 rounded-lg border border-slate-805 space-y-3.5">
                <p className="font-bold text-indigo-400 font-sans text-[11px] flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <Send className="w-3.5 h-3.5 text-indigo-455" />
                  <span>Interactive Twilio Configurator</span>
                </p>
                
                <div className="space-y-2.5 text-[11px]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-slate-500 font-mono mb-1 font-semibold text-[9px]">PROJECT ACCOUNT SID</label>
                      <input 
                        type="text"
                        placeholder={twilioConfig?.accountSidPresent ? "•••••••••••••••• (Saved)" : "ACxxxxxxxx..."}
                        value={accountSid}
                        onChange={(e) => setAccountSid(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-805 rounded font-mono text-white placeholder-slate-550 focus:bg-slate-850 focus:outline-none focus:border-indigo-500"
                        title="Twilio Account SID from Console Dashboard"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-mono mb-1 font-semibold text-[9px]">SECRET AUTH TOKEN</label>
                      <input 
                        type="password"
                        placeholder={twilioConfig?.authTokenPresent ? "•••••••••••••••• (Saved)" : "Enter secret..."}
                        value={authToken}
                        onChange={(e) => setAuthToken(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-805 rounded font-mono text-white placeholder-slate-550 focus:bg-slate-850 focus:outline-none focus:border-indigo-505"
                        title="Twilio Auth Token from Console Dashboard"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-slate-500 font-mono mb-1 font-semibold text-[9px]">Sender (From WhatsApp)</label>
                      <input 
                        type="text"
                        placeholder="whatsapp:+14155238886"
                        value={fromNum}
                        onChange={(e) => setFromNum(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-805 rounded font-mono text-white placeholder-slate-550 focus:bg-slate-850 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-mono mb-1 font-semibold text-[9px]">Recipient WhatsApp No</label>
                      <input 
                        type="text"
                        placeholder="e.g. +923001234567"
                        value={toNum}
                        onChange={(e) => setToNum(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-805 rounded font-mono text-white placeholder-slate-550 focus:bg-slate-850 focus:outline-none focus:border-indigo-500"
                        title="Your phone number including country code"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-50">
                  <span className="text-[9px] text-slate-400 italic">
                    Writes back to .env immediately for local / VS Code convenience!
                  </span>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-705 text-white rounded font-mono text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Applying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Save Credentials</span>
                      </>
                    )}
                  </button>
                </div>

                {saveResult && (
                  <div className={`p-2 rounded text-[10px] font-mono leading-relaxed ${
                    saveResult.success ? "bg-emerald-950/20 border border-emerald-900/40 text-emerald-400" : "bg-rose-955/20 border border-rose-900/40 text-rose-400"
                  }`}>
                    <span className="font-bold">{saveResult.success ? "✓ APPLIED" : "✗ ERROR"}:</span> {saveResult.message}
                  </div>
                )}
              </form>

              {/* Instruction Guide */}
              <div className="space-y-1.5 text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-850 leading-relaxed">
                <p className="font-bold text-indigo-400 text-[11px] flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-455" />
                  <span>How to Receive Real Messages:</span>
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[10.5px] pl-0.5">
                  <li>
                    <strong>Opt-In Twilio Sandbox:</strong> Send <code className="bg-slate-900 px-1 py-0.5 rounded font-mono text-[9px] border border-slate-805 text-indigo-300">join &lt;your-sandbox-keyword&gt;</code> over WhatsApp to <strong>+1 415 523 8886</strong> to register your phone number in Twilio.
                  </li>
                  <li>
                    <strong>Input Keys Above:</strong> Put your Account SID, Auth Token, and WhatsApp Receiver Number in the form above and click <strong>Save Credentials</strong>. It will automatically update the running app!
                  </li>
                  <li>
                    <strong>Trigger Guard Lockout:</strong> Provoke a lockout on the login screen by entering wrong credentials <strong>3 times</strong>. An actual WhatsApp security alert is dispatched immediately to your phone!
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Audit reports logger */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex-1 flex flex-col justify-between min-h-[300px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h4 id="audit-log-title" className="text-xs font-bold text-slate-350 uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              <span>Event Audit Log</span>
            </h4>
            <button
              id="btn-clear-logs"
              onClick={onClearLogs}
              className="text-slate-500 hover:text-slate-300 hover:bg-slate-800 px-2 py-1 rounded transition-all text-xs flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Flush Logs</span>
            </button>
          </div>

          {/* Logs List scrollbox */}
          <div className="overflow-y-auto flex-1 my-4 pr-1 max-h-[200px] md:max-h-[290px] space-y-2 customs-scrollbar">
            <AnimatePresence initial={false}>
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-slate-500 text-xs font-mono">No active alerts. Operational state healthy.</p>
                </div>
              ) : (
                logs.map((log) => (
                  <motion.div
                    key={log.id}
                    id={`log-item-${log.id}`}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`p-3 rounded-lg border text-xs font-sans space-y-1 relative ${
                      log.eventType === "SUCCESS"
                        ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-450"
                        : log.eventType === "ALERT"
                        ? "bg-rose-955/20 border-rose-900/40 text-rose-455"
                        : log.eventType === "WARNING"
                        ? "bg-amber-955/20 border-amber-900/40 text-amber-450"
                        : "bg-slate-950 border-slate-805 text-slate-350"
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] mb-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded font-bold ${
                          log.eventType === "SUCCESS" ? "bg-emerald-900/50 text-emerald-400" :
                          log.eventType === "ALERT" ? "bg-rose-900/50 text-rose-400" :
                          log.eventType === "WARNING" ? "bg-amber-900/50 text-amber-400" :
                          "bg-slate-800 text-slate-305"
                        }`}>
                          {log.eventType}
                        </span>
                        <span className="text-slate-500 font-normal">{formatLogTime(log.timestamp)}</span>
                      </div>
                      <span className="text-slate-500 text-[9px]">IP: {log.ipAddress}</span>
                    </div>
                    <p className="font-semibold text-slate-200 mt-1">{log.message}</p>
                    
                    {log.whatsappRecipient && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1.5 text-slate-400">
                        <div className="text-[11px] font-mono flex items-center justify-between">
                          <span>WhatsApp outbox ➜ {log.whatsappRecipient}</span>
                          <span className={`px-1.5 py-0.2 rounded-full font-bold text-[9px] uppercase ${
                            log.twilioStatus === "SENT" ? "bg-emerald-950/50 text-emerald-400" :
                            log.twilioStatus === "FAILED" ? "bg-rose-950/50 text-rose-450" :
                            "bg-indigo-950/50 text-indigo-400"
                          }`}>
                            {log.twilioStatus}
                          </span>
                        </div>
                        {log.twilioError && (
                          <div className="p-2 bg-rose-950/40 border border-rose-905/40 text-rose-400 rounded font-mono text-[9px] leading-normal break-words">
                            <span className="font-bold">Error Info:</span> {log.twilioError}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* SECTION 2: HIGH FIDELITY MOCK MOBILE PHONE DISPLAYING RECEIVED WHATSAPP MESSAGES */}
      <div className="md:col-span-5 flex justify-center">
        <div id="simulated-mobile-device" className="relative w-full max-w-[290px] h-[490px] bg-slate-950 rounded-[40px] border-[6px] border-slate-800 shadow-2xl p-2.5 flex flex-col justify-between overflow-hidden">
          {/* Speaker ear piece, camera punchhole notch */}
          <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-950 rounded-b-2xl z-20 flex items-center justify-center gap-1.5">
            <span className="w-10 h-1 bg-slate-800 rounded-full" />
            <span className="w-2 h-2 bg-slate-900 rounded-full" />
          </div>

          <div className="flex-1 rounded-[32px] bg-sky-950/20 overflow-hidden flex flex-col select-none relative pb-3 border border-slate-900">
            {/* Lockscreen/WhatsApp Header */}
            <div className="bg-[#075e54] text-white pt-6 pb-2.5 px-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full bg-teal-800 text-[10px] font-bold flex items-center justify-center text-slate-100 uppercase">
                    SC
                  </div>
                </div>
                <div>
                  <h5 className="text-[11px] font-bold leading-tight">Security Console Service</h5>
                  <p className="text-[8px] opacity-80 leading-none">Twilio WhatsApp Outbox</p>
                </div>
              </div>

              <div className="flex gap-2 text-[9px] font-mono text-emerald-250">
                <span>SIM-GP</span>
              </div>
            </div>

            {/* Simulated WhatsApp Chat Background */}
            <div className="flex-1 p-3 overflow-y-auto space-y-4 bg-[#ece5dd] bg-opacity-95 text-slate-900 relative">
              {/* Backing decorative watermark/pattern is skipped to keep layout clean */}
              <div className="mx-auto w-max bg-indigo-50/90 text-indigo-950 border border-indigo-200/40 text-[9px] px-3 py-1 rounded-md text-center max-w-[90%] select-none shadow-sm">
                🔒 Messages are generated securely over Twilio WhatsApp Webhooks.
              </div>

              <AnimatePresence mode="popLayout">
                {lastWhatsAppEvent ? (
                  <motion.div
                    id="mock-whatsapp-message-bubble"
                    initial={{ scale: 0.85, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="ml-auto bg-[#dcf8c6] text-slate-800 p-2.5 rounded-xl text-[10px] max-w-[90%] shadow-md border border-emerald-200/45 space-y-1 relative"
                  >
                    <div className="flex items-center gap-1 font-bold text-emerald-800 text-[8px] mb-1">
                      <Send className="w-2.5 h-2.5" />
                      <span>TWILIO STATUS: {lastWhatsAppEvent.twilioStatus}</span>
                    </div>
                    
                    <p className="whitespace-pre-line font-sans leading-normal text-[9px]">
                      {lastWhatsAppEvent.whatsappMessageBody}
                    </p>

                    <div className="flex justify-end items-center gap-0.5 text-[8px] text-slate-500 mt-1 font-mono">
                      <span>{formatLogTime(lastWhatsAppEvent.timestamp)}</span>
                      <CheckCheck className="w-3 h-3 text-sky-500" />
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center text-center px-4 space-y-1.5 mt-10">
                    <Smartphone className="w-8 h-8 text-slate-400/80 animate-wiggle" />
                    <p className="text-slate-500 text-[10px] font-medium leading-relaxed max-w-[150px]">
                      Waiting for a Lockout alert trigger to fire outbox update...
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Input Area Mock */}
            <div className="bg-[#f0f0f0] h-9 px-3 flex items-center justify-between border-t border-slate-200">
              <span className="text-[9px] text-slate-400 font-sans">Reply disabled for admin templates...</span>
              <div className="w-5 h-5 rounded-full bg-[#128c7e] flex items-center justify-center text-white">
                <Send className="w-2.5 h-2.5" />
              </div>
            </div>
          </div>

          {/* Home bar button indicator */}
          <div className="w-20 h-1 bg-slate-700/85 mx-auto rounded-full mt-1.5" />
        </div>
      </div>
    </div>
  );
}
