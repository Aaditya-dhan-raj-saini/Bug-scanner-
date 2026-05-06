/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldAlert, 
  Terminal as TerminalIcon, 
  Search, 
  History, 
  Info, 
  ShieldCheck, 
  Activity, 
  Lock, 
  Zap,
  Globe,
  Database,
  Cpu,
  AlertTriangle,
  FileText
} from "lucide-react";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

// Initialization of Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Types
interface ScanResult {
  dns: any;
  headers: any;
  eduSuggestions?: string;
  target: string;
  status: "idle" | "loading" | "complete" | "error";
  timestamp: number;
}

export default function App() {
  const [hasConsented, setHasConsented] = useState(false);
  const [currentScan, setCurrentScan] = useState<ScanResult | null>(null);
  const [logs, setLogs] = useState<string[]>(["[SYSTEM] AetherSec OS v1.0.4 initialized.", "[SYSTEM] Waiting for authorized scan request..."]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleScan = async (target: string) => {
    if (!target) return;
    
    addLog(`Initiating scan on target: ${target}`);
    setCurrentScan({ 
      dns: null, 
      headers: null, 
      target, 
      status: "loading", 
      timestamp: Date.now() 
    });

    try {
      addLog("Phase 1: Querying DNS infrastructure...");
      const dnsRes = await axios.get(`/api/scan/dns?target=${target}`);
      addLog("Phase 2: Auditing HTTP security headers...");
      const headerRes = await axios.get(`/api/scan/headers?target=${target}`);
      
      addLog("Phase 3: Synthesizing educational remediation using Core-AI...");
      
      // AI Educational Insight
      const prompt = `Analyze these security scan results for ${target} and provide educational suggestions (low/medium/high risk) on how to fix common issues. Focus on headers and DNS best practices. Do not provide exploit strings. Find inconsistencies in: ${JSON.stringify({ dns: dnsRes.data, headers: headerRes.data })}`;
      
      const aiResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setCurrentScan({
        dns: dnsRes.data,
        headers: headerRes.data,
        eduSuggestions: aiResponse.text,
        target,
        status: "complete",
        timestamp: Date.now()
      });
      addLog("Scan complete. Dashboard updated.");
    } catch (err: any) {
      addLog(`ERR: ${err.response?.data?.error || err.message}`);
      setCurrentScan(prev => prev ? { ...prev, status: "error" } : null);
    }
  };

  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    if (trimmed.startsWith("scan ")) {
      const target = trimmed.split(" ")[1];
      handleScan(target);
    } else if (trimmed === "clear") {
      setLogs([]);
    } else if (trimmed === "help") {
      addLog("Available commands:");
      addLog("  scan <domain>  - Run a passive security audit");
      addLog("  clear          - Clear terminal logs");
      addLog("  help           - Show this message");
    } else {
      addLog(`Unknown command: ${trimmed}`);
    }
    setInput("");
  };

  if (!hasConsented) {
    return <EthicsWall onAccept={() => setHasConsented(true)} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row p-4 gap-4 overflow-hidden h-screen bg-terminal-bg">
      {/* Side Terminal */}
      <div className="w-full md:w-1/3 flex flex-col gap-4 h-full">
        <header className="flex items-center gap-3 p-4 border border-white/5 rounded-lg bg-terminal-card/50">
          <ShieldAlert className="text-matrix-green w-8 h-8" />
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase font-display text-white glow-green">
              AetherSec Console
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Authorized Security Environment</p>
          </div>
        </header>

        <section className="flex-1 border border-white/5 bg-terminal-card/30 rounded-lg flex flex-col overflow-hidden">
          <div className="bg-white/5 p-2 flex items-center justify-between border-b border-white/5">
            <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-2">
              <TerminalIcon size={12} /> System Logs
            </span>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-red-900" />
              <div className="w-2 h-2 rounded-full bg-yellow-900" />
              <div className="w-2 h-2 rounded-full bg-green-900" />
            </div>
          </div>
          
          <div ref={scrollRef} className="flex-1 p-4 text-[11px] overflow-y-auto custom-scrollbar font-mono leading-relaxed">
            {logs.map((log, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                key={i} 
                className={`mb-1 ${log.includes("ERR") ? "text-cracked-red" : log.includes("SYSTEM") ? "text-neon-blue" : "text-gray-400"}`}
              >
                {log}
              </motion.div>
            ))}
          </div>

          <div className="p-2 bg-black/50 border-t border-white/5 flex items-center gap-2">
            <span className="text-matrix-green ml-2 font-bold select-none">$</span>
            <input 
              autoFocus
              className="bg-transparent border-none outline-none text-white text-[11px] flex-1 font-mono"
              placeholder="Enter command... (help for details)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && executeCommand(input)}
            />
          </div>
        </section>
      </div>

      {/* Main Dashboard Area */}
      <main className="flex-1 border border-white/5 bg-terminal-card/20 rounded-xl overflow-y-auto custom-scrollbar p-6">
        <AnimatePresence mode="wait">
          {!currentScan ? (
            <LandingView onScan={handleScan} />
          ) : (
            <motion.div
              key={currentScan.target}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
                <div>
                  <h2 className="text-3xl font-display font-medium text-white flex items-center gap-3">
                    <Globe className="text-neon-blue" />
                    {currentScan.target}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">
                    Scan Initiated: {new Date(currentScan.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                  currentScan.status === "loading" ? "border-neon-blue/50 text-neon-blue animate-pulse" :
                  currentScan.status === "complete" ? "border-matrix-green/50 text-matrix-green" :
                  "border-cracked-red/50 text-cracked-red"
                }`}>
                  Status: {currentScan.status}
                </div>
              </div>

              {currentScan.status === "loading" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 rounded-lg bg-white/5 animate-pulse" />
                  ))}
                </div>
              )}

              {currentScan.status === "complete" && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-20">
                  {/* DNS Panel */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-neon-blue font-display text-sm uppercase font-bold tracking-widest">
                      <Database size={16} /> DNS Records
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                       {Object.entries(currentScan.dns).map(([type, records]: any) => (
                         <div key={type} className="bg-white/5 border border-white/5 p-4 rounded-lg">
                           <div className="text-[10px] text-gray-500 uppercase font-black mb-2">{type} Information</div>
                           <div className="space-y-1">
                             {Array.isArray(records) && records.length > 0 ? (
                               records.map((r, idx) => (
                                 <div key={idx} className="text-xs font-mono text-white break-all">
                                   {typeof r === 'string' ? r : JSON.stringify(r)}
                                 </div>
                               ))
                             ) : <span className="text-xs text-gray-600 italic">No records found</span>}
                           </div>
                         </div>
                       ))}
                    </div>
                  </div>

                  {/* HTTP Audit Panel */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-matrix-green font-display text-sm uppercase font-bold tracking-widest">
                      <Lock size={16} /> Security Headers Audit
                    </div>
                    <div className="bg-white/5 border border-white/5 p-6 rounded-lg overflow-hidden relative">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                          <HeaderItem label="HSTS" active={currentScan.headers.hsts} desc="Strict-Transport-Security" />
                          <HeaderItem label="CSP" active={currentScan.headers.csp} desc="Content-Security-Policy" />
                          <HeaderItem label="X-Frame" active={currentScan.headers.xframe} desc="X-Frame-Options" />
                          <HeaderItem label="No-Sniff" active={currentScan.headers.nosniff} desc="X-Content-Type-Options" />
                       </div>
                       <div className="mt-8 pt-8 border-t border-white/5">
                          <div className="text-[10px] text-gray-500 uppercase font-black mb-2">Detected Web Engine</div>
                          <div className="text-sm font-mono text-neon-blue">{currentScan.headers.server}</div>
                       </div>
                    </div>

                    {/* Educational Insight - AI Driven */}
                    <div className="space-y-4 mt-6">
                      <div className="flex items-center gap-2 text-neon-blue font-display text-sm uppercase font-bold tracking-widest">
                        <FileText size={16} /> Educational Mitigation Guide
                      </div>
                      <div className="bg-white/5 border border-white/10 p-6 rounded-lg leading-relaxed text-sm text-gray-300 font-sans markdown-body">
                        {currentScan.eduSuggestions?.split('\n').map((line, i) => (
                          <p key={i} className="mb-2">{line}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function HeaderItem({ label, active, desc }: { label: string; active: boolean; desc: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-lg border flex items-center justify-center transition-all ${
        active ? "border-matrix-green/50 bg-matrix-green/10 text-matrix-green glow-green" : "border-cracked-red/30 bg-cracked-red/5 text-cracked-red"
      }`}>
        {active ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
      </div>
      <div>
        <div className="text-xs font-bold text-white tracking-widest uppercase">{label}</div>
        <div className="text-[10px] text-gray-500 font-mono truncate max-w-[120px]">{desc}</div>
      </div>
    </div>
  );
}

function LandingView({ onScan }: { onScan: (t: string) => void }) {
  const [url, setUrl] = useState("");
  return (
    <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 bg-matrix-green/5 border border-matrix-green/20 rounded-2xl"
      >
        <ShieldCheck className="w-16 h-16 text-matrix-green mx-auto mb-4 glow-green" />
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-widest mb-2">
          Passive Recon Engine
        </h2>
        <p className="text-sm text-gray-400 font-mono">
          Enter a domain or organization URL below to perform a safe, metadata-based security audit. No intrusive payload will be sent.
        </p>
      </motion.div>

      <div className="w-full flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            className="w-full bg-white/5 border border-white/10 rounded-lg py-4 pl-12 pr-4 text-white focus:outline-none focus:border-neon-blue/50 transition-all font-mono"
            placeholder="target-domain.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onScan(url)}
          />
        </div>
        <button 
          onClick={() => onScan(url)}
          className="bg-matrix-green hover:bg-matrix-green/80 text-black font-bold uppercase px-8 rounded-lg transition-all tracking-widest text-xs flex items-center gap-2"
        >
          <Zap size={16} /> Execute
        </button>
      </div>

      <div className="grid grid-cols-3 gap-8 pt-8 opacity-40">
        <FeatureBrief icon={<Database />} title="DNS Recon" />
        <FeatureBrief icon={<Lock />} title="Header Audit" />
        <FeatureBrief icon={<Cpu />} title="AI Insights" />
      </div>
    </div>
  );
}

function FeatureBrief({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-[10px] uppercase font-bold tracking-tighter">
      {icon}
      <span>{title}</span>
    </div>
  );
}

function EthicsWall({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden text-[8px] font-mono leading-tight whitespace-nowrap">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="translate-x-[calc(sin(i)*10px)]">
            AETHERSEC OS SYSTEM BOOT SEQUENCE... SECURE... AUTHORIZED... ETHICAL... {Math.random().toString(36).substring(7)}
          </div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-terminal-card border border-white/10 p-8 rounded-2xl max-w-lg w-full relative z-10 shadow-2xl"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-cracked-red/10 rounded-xl border border-cracked-red/30">
            <ShieldAlert className="text-cracked-red animate-pulse" size={32} />
          </div>
          <h2 className="text-xl font-display font-bold text-white tracking-widest uppercase">
            Mandatory Disclaimer
          </h2>
        </div>

        <div className="space-y-4 text-sm text-gray-400 font-mono mb-8 leading-relaxed">
          <p>This toolkit is designed for <span className="text-white">learning and authorized security testing</span> only.</p>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="text-matrix-green">/01</span> 
              <span>You confirm you have explicit permission to scan the target.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-matrix-green">/02</span>
              <span>You understand that scanning without permission is illegal.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-matrix-green">/03</span>
              <span>This tool uses passive methods only; no disruption will occur.</span>
            </li>
          </ul>
        </div>

        <button 
          onClick={onAccept}
          className="w-full bg-matrix-green hover:bg-matrix-green/80 text-black font-black uppercase py-4 rounded-lg transition-all tracking-widest text-sm glow-green"
        >
          I Accept Environmental Terms
        </button>
      </motion.div>
    </div>
  );
}

