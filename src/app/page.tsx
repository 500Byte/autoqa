'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { HeroInput } from "@/components/features/HeroInput";
import { UrlSelection } from "@/components/features/UrlSelection";
import { AnalysisDashboard } from "@/components/features/AnalysisDashboard";
import { SitemapResponse, AnalysisResult } from "@/types";

export default function Home() {
  const [domain, setDomain] = useState('');
  const [loadingSitemap, setLoadingSitemap] = useState(false);
  const [sitemapError, setSitemapError] = useState('');

  const [sitemapUrls, setSitemapUrls] = useState<string[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [currentAnalyzingUrl, setCurrentAnalyzingUrl] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // logEndRef and expandedResults are now managed within AnalysisDashboard
  // useEffect for logs is also moved to AnalysisDashboard

  const handleFetchSitemap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain) return;

    setLoadingSitemap(true);
    setSitemapError('');
    setSitemapUrls([]);
    setSelectedUrls(new Set());

    try {
      const res = await fetch(`/api/sitemap?url=${encodeURIComponent(domain)}`);
      const data: SitemapResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al obtener el sitemap');
      }

      setSitemapUrls(data.urls);
      setSelectedUrls(new Set(data.urls));
    } catch (err: any) {
      setSitemapError(err.message);
    } finally {
      setLoadingSitemap(false);
    }
  };

  const handleToggleUrl = (url: string, index: number, event: React.MouseEvent) => {
    const newSelected = new Set(selectedUrls);

    if (event.shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);

      for (let i = start; i <= end; i++) {
        if (selectedUrls.has(url)) {
          newSelected.delete(sitemapUrls[i]);
        } else {
          newSelected.add(sitemapUrls[i]);
        }
      }
    } else {
      if (newSelected.has(url)) {
        newSelected.delete(url);
      } else {
        newSelected.add(url);
      }
    }

    setSelectedUrls(newSelected);
    setLastClickedIndex(index);
  };

  const handleSelectAll = () => {
    setSelectedUrls(new Set(sitemapUrls));
  };

  const handleDeselectAll = () => {
    setSelectedUrls(new Set());
  };

  const handleGoBackToInput = () => {
    setSitemapUrls([]);
    setSelectedUrls(new Set());
    setDomain('');
  };

  const handleGoBackToSelection = () => {
    setResults([]);
    setAnalyzing(false);
    setLogs([]);
    setCurrentAnalyzingUrl('');
  };

  const handleStopAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setAnalyzing(false);
      setCurrentAnalyzingUrl('');
      setLogs(prev => [...prev, 'LOG: Análisis detenido por el usuario.']);
    }
  };

  const handleAnalyze = async () => {
    if (selectedUrls.size === 0) return;

    setAnalyzing(true);
    setLogs([]);
    setResults([]);
    setCurrentAnalyzingUrl('');

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: Array.from(selectedUrls) }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.body) {
        throw new Error('Sin respuesta del servidor');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.startsWith('LOG:')) {
            const logMessage = line.substring(4);
            setLogs(prev => [...prev, logMessage]);

            if (logMessage.includes('Analyzing')) {
              const urlMatch = logMessage.match(/https?:\/\/[^\s]+/);
              if (urlMatch) {
                setCurrentAnalyzingUrl(urlMatch[0]);
              }
            }
          } else if (line.startsWith('RESULT:')) {
            try {
              const data = JSON.parse(line.substring(7));
              // Si la respuesta viene como { url, result: { ... } }, la aplanamos
              const finalResult = data.result ? { url: data.url, ...data.result } : data;
              setResults(prev => [...prev, finalResult]);
              setCurrentAnalyzingUrl('');
            } catch (e) {
              console.error('Error parsing result chunk:', e);
            }
          } else if (line.startsWith('ERROR:')) {
            const errorMessage = line.substring(6);
            // Don't throw immediately, just log it so we can see partial results
            console.error('Stream Error:', errorMessage);
            setLogs(prev => [...prev, `❌ CRITICAL ERROR: ${errorMessage}`]);
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Fetch aborted');
      } else {
        setSitemapError(err.message);
      }
    } finally {
      setAnalyzing(false);
      setCurrentAnalyzingUrl('');
      abortControllerRef.current = null;
    }
  };

  const isInitialState = sitemapUrls.length === 0;
  const isSelectionState = sitemapUrls.length > 0 && !analyzing && results.length === 0;
  const isAnalysisState = analyzing || results.length > 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center text-white">
              {/* Using a simple div instead of imported icon to keep it light or import Sparkles if needed */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
            </div>
            <span className="font-semibold text-base">AutoQA</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Docs</a>
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> Beta
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 pt-24 pb-16">
        {/* State 1: Hero / Input */}
        <div className={cn(
          "transition-all duration-300",
          isInitialState ? "opacity-100" : "opacity-0 hidden"
        )}>
          <HeroInput
            domain={domain}
            setDomain={setDomain}
            loading={loadingSitemap}
            error={sitemapError}
            onSubmit={handleFetchSitemap}
          />
        </div>

        {/* State 2: Selection */}
        <div className={cn(
          "transition-all duration-300",
          isSelectionState ? "opacity-100" : "opacity-0 hidden"
        )}>
          <UrlSelection
            sitemapUrls={sitemapUrls}
            selectedUrls={selectedUrls}
            onToggleUrl={handleToggleUrl}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onGoBack={handleGoBackToInput}
            onAnalyze={handleAnalyze}
          />
        </div>

        {/* State 3: Analysis Dashboard */}
        <div className={cn(
          "transition-all duration-300",
          isAnalysisState ? "opacity-100" : "opacity-0 hidden"
        )}>
          <AnalysisDashboard
            analyzing={analyzing}
            currentAnalyzingUrl={currentAnalyzingUrl}
            logs={logs}
            results={results}
            selectedUrlsSize={selectedUrls.size}
            onStopAnalysis={handleStopAnalysis}
            onGoBack={handleGoBackToSelection}
          />
        </div>
      </main>
    </div>
  );
}
