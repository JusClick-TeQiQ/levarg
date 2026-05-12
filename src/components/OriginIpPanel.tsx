import React, { useState } from 'react';
import { Radar, Play, RefreshCw, Globe, Server, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface IpCandidate {
  ip: string;
  source: string;
  confidence: string;
  details?: string;
}

interface OriginReport {
  domain: string;
  cdnDetected: string | null;
  candidates: IpCandidate[];
  subdomainResults?: Record<string, string[]>;
  dnsHistory?: Array<{ ip: string; firstSeen?: string; lastSeen?: string }>;
  mxRecords?: string[];
  spfIncludes?: string[];
  tlsSans?: string[];
}

export default function OriginIpPanel() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<OriginReport | null>(null);
  const [error, setError] = useState('');
  const [showSubs, setShowSubs] = useState(false);
  const [showDns, setShowDns] = useState(false);

  const detect = async () => {
    if (!domain) return;
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const res = await fetch('/api/origin-ip/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Detection failed');
      setReport(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-auto p-6 text-zinc-300 font-mono text-sm">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-emerald-300 flex items-center gap-2">
          <Radar className="w-5 h-5" /> Origin IP Detection
        </h2>
        <p className="text-[11px] text-zinc-500 mt-1">
          Discover the real origin IP behind CDN/WAF using DNS history, subdomain scanning, TLS analysis, SPF/MX records, and more.
        </p>
      </div>

      <div className="mt-4 flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-[10px] text-emerald-400/70 uppercase tracking-wider block mb-1">Domain</label>
          <input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            placeholder="example.com"
            className="w-full bg-black/60 border border-emerald-900/50 rounded px-3 py-2 text-emerald-100 text-xs focus:border-emerald-500/70 outline-none"
          />
        </div>
        <button
          onClick={detect}
          disabled={loading || !domain}
          className="flex items-center gap-1.5 text-xs px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-black rounded font-bold disabled:opacity-40"
        >
          {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          Detect Origin
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-800/50 rounded text-red-300 text-xs">
          {error}
        </div>
      )}

      {report && (
        <div className="mt-6 space-y-4">
          <div className="p-4 rounded border border-emerald-700/50 bg-emerald-900/10">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-200">{report.domain}</span>
            </div>
            {report.cdnDetected && (
              <div className="text-xs text-amber-300 flex items-center gap-1 mb-2">
                <AlertTriangle className="w-3 h-3" /> CDN detected: {report.cdnDetected}
              </div>
            )}
          </div>

          {report.candidates && report.candidates.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-emerald-300 mb-3 flex items-center gap-2">
                <Server className="w-4 h-4" /> Origin IP Candidates
              </h3>
              <div className="space-y-2">
                {report.candidates.map((c, i) => (
                  <div key={i} className="p-3 rounded border border-emerald-700/40 bg-black/40 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="text-emerald-200 font-bold">{c.ip}</span>
                      <span className="text-zinc-500 ml-auto">{c.confidence} confidence</span>
                    </div>
                    <div className="mt-1 text-zinc-500 pl-5">Source: {c.source}</div>
                    {c.details && <div className="mt-1 text-zinc-400 pl-5">{c.details}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.candidates && report.candidates.length === 0 && (
            <div className="p-4 border border-dashed border-zinc-700/50 rounded text-xs text-zinc-500 text-center">
              No origin IP candidates found. The target may not be behind a CDN, or all resolution methods returned CDN addresses.
            </div>
          )}

          {report.mxRecords && report.mxRecords.length > 0 && (
            <div className="p-3 bg-black/40 border border-emerald-900/30 rounded">
              <div className="text-[10px] text-emerald-400/70 uppercase tracking-wider mb-2">MX Records</div>
              {report.mxRecords.map((mx, i) => (
                <div key={i} className="text-xs text-zinc-300 py-0.5">{mx}</div>
              ))}
            </div>
          )}

          {report.tlsSans && report.tlsSans.length > 0 && (
            <div className="p-3 bg-black/40 border border-emerald-900/30 rounded">
              <div className="text-[10px] text-emerald-400/70 uppercase tracking-wider mb-2">TLS SANs</div>
              <div className="text-xs text-zinc-300 flex flex-wrap gap-1">
                {report.tlsSans.map((san, i) => (
                  <span key={i} className="bg-emerald-900/30 px-2 py-0.5 rounded">{san}</span>
                ))}
              </div>
            </div>
          )}

          {report.subdomainResults && Object.keys(report.subdomainResults).length > 0 && (
            <div>
              <button onClick={() => setShowSubs(!showSubs)} className="flex items-center gap-2 text-xs text-emerald-400/70 hover:text-emerald-300">
                {showSubs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Subdomain Results ({Object.keys(report.subdomainResults).length} checked)
              </button>
              {showSubs && (
                <div className="mt-2 p-3 bg-black/40 border border-emerald-900/30 rounded text-xs max-h-48 overflow-auto">
                  {Object.entries(report.subdomainResults).map(([sub, ips]) => (
                    <div key={sub} className="py-1 border-b border-emerald-900/20 last:border-0">
                      <span className="text-emerald-300">{sub}</span>
                      <span className="text-zinc-500 ml-2">→ {(ips as string[]).join(', ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {report.dnsHistory && report.dnsHistory.length > 0 && (
            <div>
              <button onClick={() => setShowDns(!showDns)} className="flex items-center gap-2 text-xs text-emerald-400/70 hover:text-emerald-300">
                {showDns ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                DNS History ({report.dnsHistory.length} records)
              </button>
              {showDns && (
                <div className="mt-2 p-3 bg-black/40 border border-emerald-900/30 rounded text-xs max-h-48 overflow-auto">
                  {report.dnsHistory.map((h, i) => (
                    <div key={i} className="py-1 border-b border-emerald-900/20 last:border-0">
                      <span className="text-emerald-300">{h.ip}</span>
                      {h.firstSeen && <span className="text-zinc-500 ml-2">{h.firstSeen} – {h.lastSeen}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
