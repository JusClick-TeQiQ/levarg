import React, { useState, useEffect } from 'react';
import { ShieldAlert, Play, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface WafDetection {
  name: string;
  vendor: string;
  confidence: number;
  evidence: string[];
}

interface BypassResult {
  technique: string;
  description: string;
  success: boolean;
  statusCode?: number;
  evidence?: string;
}

export default function WafPanel() {
  const [targetUrl, setTargetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [detections, setDetections] = useState<WafDetection[]>([]);
  const [bypasses, setBypasses] = useState<BypassResult[]>([]);
  const [wafDetected, setWafDetected] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [signatures, setSignatures] = useState<any[]>([]);
  const [techniques, setTechniques] = useState<any[]>([]);
  const [showSigs, setShowSigs] = useState(false);
  const [showTechs, setShowTechs] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'fingerprinting' | 'bypassing' | 'done'>('idle');

  useEffect(() => {
    Promise.all([
      fetch('/api/waf/signatures').then(r => r.json()),
      fetch('/api/waf/techniques').then(r => r.json()),
    ]).then(([sigs, techs]) => {
      setSignatures(sigs);
      setTechniques(techs);
    }).catch(() => {});
  }, []);

  const fingerprint = async () => {
    if (!targetUrl) return;
    setLoading(true);
    setError('');
    setDetections([]);
    setBypasses([]);
    setWafDetected(null);
    setPhase('fingerprinting');
    try {
      const res = await fetch('/api/waf/fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fingerprint failed');
      setDetections(data.detections || []);
      setWafDetected((data.detections || []).length > 0);
      setPhase('done');
    } catch (err: any) {
      setError(err.message);
      setPhase('idle');
    } finally {
      setLoading(false);
    }
  };

  const runBypasses = async () => {
    if (!targetUrl) return;
    setLoading(true);
    setError('');
    setBypasses([]);
    setPhase('bypassing');
    try {
      const res = await fetch('/api/waf/bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bypass test failed');
      setDetections(data.wafs || []);
      setWafDetected(data.wafDetected ?? false);
      setBypasses(data.bypasses || []);
      setPhase('done');
    } catch (err: any) {
      setError(err.message);
      setPhase('done');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-auto p-6 text-zinc-300 font-mono text-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-emerald-300 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" /> WAF Analysis
          </h2>
          <p className="text-[11px] text-zinc-500 mt-1">
            Fingerprint WAF vendors and test bypass techniques against a target URL.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-[10px] text-emerald-400/70 uppercase tracking-wider block mb-1">Target URL</label>
          <input
            type="text"
            value={targetUrl}
            onChange={e => setTargetUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-black/60 border border-emerald-900/50 rounded px-3 py-2 text-emerald-100 text-xs focus:border-emerald-500/70 outline-none"
          />
        </div>
        <button
          onClick={fingerprint}
          disabled={loading || !targetUrl}
          className="flex items-center gap-1.5 text-xs px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-black rounded font-bold disabled:opacity-40"
        >
          {loading && phase === 'fingerprinting' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          Fingerprint
        </button>
        <button
          onClick={runBypasses}
          disabled={loading || !targetUrl}
          className="flex items-center gap-1.5 text-xs px-4 py-2 bg-amber-700 hover:bg-amber-600 text-black rounded font-bold disabled:opacity-40"
        >
          {loading && phase === 'bypassing' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
          Fingerprint + Bypass
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-800/50 rounded text-red-300 text-xs">
          {error}
        </div>
      )}

      {wafDetected !== null && (
        <div className="mt-6">
          <div className={`p-4 rounded border ${wafDetected ? 'border-amber-700/50 bg-amber-900/10' : 'border-emerald-700/50 bg-emerald-900/10'}`}>
            <div className="flex items-center gap-2 mb-2">
              {wafDetected ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              <span className="text-sm font-bold">
                {wafDetected ? `WAF Detected: ${detections.map(d => d.name).join(', ')}` : 'No WAF Detected'}
              </span>
            </div>
            {detections.map((d, i) => (
              <div key={i} className="mt-2 pl-6 text-xs text-zinc-400">
                <span className="text-emerald-300 font-bold">{d.name}</span> ({d.vendor}) — confidence: {d.confidence}%
                {d.evidence.length > 0 && (
                  <div className="mt-1 text-zinc-500">
                    Evidence: {d.evidence.join('; ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {bypasses.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-emerald-300 mb-3">Bypass Results</h3>
          <div className="space-y-2">
            {bypasses.map((b, i) => (
              <div key={i} className={`p-3 rounded border text-xs ${b.success ? 'border-emerald-700/50 bg-emerald-900/10' : 'border-zinc-700/50 bg-zinc-900/10'}`}>
                <div className="flex items-center gap-2">
                  {b.success ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-zinc-500 shrink-0" />
                  )}
                  <span className={`font-bold ${b.success ? 'text-emerald-300' : 'text-zinc-400'}`}>
                    {b.technique}
                  </span>
                  {b.statusCode && (
                    <span className="text-zinc-500 ml-auto">HTTP {b.statusCode}</span>
                  )}
                </div>
                {b.description && <div className="mt-1 text-zinc-500 pl-5">{b.description}</div>}
                {b.evidence && <div className="mt-1 text-zinc-400 pl-5 font-mono">{b.evidence}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 space-y-3">
        <button
          onClick={() => setShowSigs(!showSigs)}
          className="flex items-center gap-2 text-xs text-emerald-400/70 hover:text-emerald-300"
        >
          {showSigs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          <Info className="w-3 h-3" /> WAF Signature Database ({signatures.length} vendors)
        </button>
        {showSigs && (
          <div className="p-3 bg-black/40 border border-emerald-900/30 rounded text-xs max-h-48 overflow-auto">
            {signatures.map((s: any, i: number) => (
              <div key={i} className="py-1 border-b border-emerald-900/20 last:border-0">
                <span className="text-emerald-300">{s.name}</span>
                <span className="text-zinc-500 ml-2">({s.vendor})</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowTechs(!showTechs)}
          className="flex items-center gap-2 text-xs text-emerald-400/70 hover:text-emerald-300"
        >
          {showTechs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          <Info className="w-3 h-3" /> Bypass Techniques ({techniques.length} loaded)
        </button>
        {showTechs && (
          <div className="p-3 bg-black/40 border border-emerald-900/30 rounded text-xs max-h-48 overflow-auto">
            {techniques.map((t: any, i: number) => (
              <div key={i} className="py-1 border-b border-emerald-900/20 last:border-0">
                <span className="text-emerald-300">{t.name || t.technique || t}</span>
                {t.description && <span className="text-zinc-500 ml-2">— {t.description}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
