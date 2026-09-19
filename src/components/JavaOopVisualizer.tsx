/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { JAVA_OOP_CODEBASE } from "../javaCodebase";
import { FileCode, Shield, Check, Copy, Code2, Layers, Cpu } from "lucide-react";
import { synth } from "../utils/sound";

export default function JavaOopVisualizer() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeFile = JAVA_OOP_CODEBASE[activeIdx];

  const handleCopy = () => {
    synth.playClick();
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectTab = (idx: number) => {
    synth.playClick();
    setActiveIdx(idx);
  };

  // Safe simple helper to format a code block into colored lines to approximate syntax highlighting
  const renderHighlightedCode = (codeText: string) => {
    const lines = codeText.split("\n");
    return lines.map((line, idx) => {
      // Basic lexical coloring replacement
      let renderedLine = line;
      
      // Keywords
      const keywords = ["package", "import", "public", "private", "final", "class", "interface", "implements", "extends", "throws", "throw", "new", "return", "if", "else", "try", "catch", "boolean", "int", "long", "void", "static"];
      
      // Escape for display and color
      const words = renderedLine.split(/(\s+|,|\.|\(|\)|\{|\}|\[|\]|;)/);
      const highlightedWords = words.map((w, wIdx) => {
        if (keywords.includes(w)) {
          return <span key={wIdx} className="text-pink-400 font-semibold">{w}</span>;
        }
        if (w.startsWith("\"") && w.endsWith("\"") || w.startsWith("'") && w.endsWith("'")) {
          return <span key={wIdx} className="text-amber-300">{w}</span>;
        }
        if (w.startsWith("@")) {
          return <span key={wIdx} className="text-purple-400 font-medium">{w}</span>;
        }
        if (w.match(/^[0-9]+$/)) {
          return <span key={wIdx} className="text-cyan-300">{w}</span>;
        }
        if (w.startsWith("//") || w.startsWith("/*") || w.startsWith("*")) {
          return <span key={wIdx} className="text-emerald-500 italic">{w}</span>;
        }
        if (w === "SecureAuthService" || w === "LockoutManager" || w === "UserCredential" || w === "NotificationService" || w === "WhatsAppNotificationService" || w === "AccountLockedException" || w === "Instant" || w === "String" || w === "Exception") {
          return <span key={wIdx} className="text-sky-300 font-medium">{w}</span>;
        }
        return w;
      });

      return (
        <div key={idx} className="table-row">
          <span className="table-cell text-slate-600 select-none text-right pr-4 pl-2 text-xs border-r border-slate-800 w-8">
            {idx + 1}
          </span>
          <span className="table-cell pl-4 whitespace-pre text-slate-100 font-mono text-sm leading-relaxed">
            {highlightedWords}
          </span>
        </div>
      );
    });
  };

  return (
    <div id="java-oop-visualizer" className="bg-slate-900 border border-slate-850 rounded-xl overflow-hidden shadow-2xl flex flex-col lg:flex-row h-full min-h-[500px]">
      {/* Sidebar - Files and hierarchy */}
      <div className="w-full lg:w-80 bg-slate-950 p-5 border-b lg:border-b-0 lg:border-r border-slate-850 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-indigo-950/40 text-indigo-400">
              <Code2 className="w-5 h-5" id="java-visualizer-icon-code" />
            </div>
            <div>
              <h2 className="text-md font-bold text-white tracking-tight">Java OOP Architecture</h2>
              <p className="text-xs text-slate-400">Security Module Hierarchy</p>
            </div>
          </div>

          <div className="space-y-1 mb-6">
            <p className="text-xs font-semibold text-slate-500 px-2 uppercase tracking-wider mb-2">Source Packages</p>
            
            {JAVA_OOP_CODEBASE.map((file, idx) => (
              <button
                key={file.name}
                id={`java-file-tab-${idx}`}
                onClick={() => selectTab(idx)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-mono transition-all duration-200 flex items-center justify-between group ${
                  activeIdx === idx
                    ? "bg-slate-900 text-indigo-400 border-l-2 border-indigo-500 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border-l-2 border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileCode className={`w-4 h-4 ${activeIdx === idx ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-305"}`} />
                  <span className="font-semibold text-xs truncate max-w-[150px]">{file.name}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-sans ${
                  activeIdx === idx ? "bg-indigo-950/60 text-indigo-300 font-medium" : "bg-slate-800 text-slate-500"
                }`}>
                  OOP
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Current Class Metadata Detail */}
        <div id="oop-metadata-panel" className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-400 font-medium text-xs">
            <Layers className="w-3.5 h-3.5" />
            <span>Class Role & Mapping</span>
          </div>
          <p className="text-slate-300 font-sans text-xs leading-relaxed">
            {activeFile.role}
          </p>
          <div className="h-px bg-slate-800" />
          <div className="flex items-center gap-2 text-indigo-400 font-medium text-xs">
            <Cpu className="w-3.5 h-3.5" />
            <span>OOP Paradigm Highlight</span>
          </div>
          <p className="text-slate-400 font-sans text-xs italic leading-relaxed">
            {activeFile.oopConcept}
          </p>
        </div>
      </div>

      {/* Main Panel - Code display and explanation */}
      <div className="flex-1 flex flex-col h-[550px] lg:h-[650px] bg-slate-950">
        {/* Code Header bar */}
        <div className="h-14 bg-slate-900 border-b border-slate-850 flex items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
            <span className="text-xs font-mono text-slate-400 ml-2 border-l border-slate-800 pl-4 py-1">
              src/com/security/{activeFile.name}
            </span>
          </div>

          <button
            id={`btn-copy-java-${activeIdx}`}
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-705 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 animate-scale" />
                <span className="text-emerald-400 text-[11px]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px]">Copy Source</span>
              </>
            )}
          </button>
        </div>

        {/* Code editor content (scrollable) */}
        <div className="flex-1 overflow-auto bg-slate-950 py-4 font-mono select-text customs-scrollbar">
          <div className="table w-full border-collapse">
            {renderHighlightedCode(activeFile.code)}
          </div>
        </div>

        {/* OOP Explanatory footer */}
        <div id="oop-explanatory-footer" className="bg-slate-900 border-t border-slate-850 p-5 font-sans">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-950/40 text-indigo-400 rounded-lg mt-0.5">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200 tracking-wide uppercase mb-1">Architecture Concept Analysis</h4>
              <p className="text-xs text-slate-405 leading-relaxed">
                {activeFile.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
