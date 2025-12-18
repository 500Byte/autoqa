'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Globe,
  AlertCircle,
  Search,
  Square,
  Sparkles,
  Zap,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Terminal,
  Activity,
  Check,
  Minus
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SitemapResponse {
  urls: string[];
  count: number;
  sitemapUrl: string;
  error?: string;
}

interface AnalysisResult {
  url: string;
  headings: { tag: string; text: string; level: number }[];
  seoIssues: string[];
  accessibilityIssues: any[];
  brokenLinks: { link: string; status: number; ok: boolean; error?: string }[];
  totalLinksChecked: number;
  totalLinksFound: number;
  error?: string;
}

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
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const logEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
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
              console.error('Error parsing result:', e);
            }
          } else if (line.startsWith('ERROR:')) {
            const errorMessage = line.substring(6);
            throw new Error(errorMessage);
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
  const progressPercentage = selectedUrls.size > 0 ? (results.length / selectedUrls.size) * 100 : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold text-base">AutoQA</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Docs</a>
            <Badge variant="secondary" className="gap-1">
              <Zap className="h-3 w-3" /> Beta
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 pt-24 pb-16">

        {/* State 1: Hero / Input */}
        <div className={cn(
          "transition-all duration-300",
          isInitialState ? "opacity-100" : "opacity-0 hidden"
        )}>
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Quality Assurance <br />
                <span className="text-blue-600">Reimagined.</span>
              </h1>
              <p className="text-lg text-gray-600">
                Automated SEO, accessibility, and link checking for modern web teams.
              </p>
            </div>

            <Card className="p-2">
              <form onSubmit={handleFetchSitemap} className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <Input
                    className="pl-10 h-10"
                    placeholder="mynaui.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={loadingSitemap} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {loadingSitemap ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Analysis"}
                </Button>
              </form>
            </Card>

            {sitemapError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 p-3 rounded-md text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{sitemapError}</span>
              </div>
            )}
          </div>
        </div>

        {/* State 2: Selection */}
        <div className={cn(
          "transition-all duration-300 max-w-4xl mx-auto",
          isSelectionState ? "opacity-100" : "opacity-0 hidden"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Select Pages</h2>
              <p className="text-sm text-gray-600 mt-1">
                Found {sitemapUrls.length} URLs • {selectedUrls.size} selected
                <span className="text-gray-400 ml-2">• Shift+Click para selección por lote</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSelectAll}>
                <Check className="h-4 w-4 mr-1" /> Todas
              </Button>
              <Button variant="outline" onClick={handleDeselectAll}>
                <Minus className="h-4 w-4 mr-1" /> Ninguna
              </Button>
              <Button onClick={handleAnalyze} disabled={selectedUrls.size === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
                Analizar {selectedUrls.size} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="max-h-[500px] overflow-y-auto space-y-1">
                {sitemapUrls.map((url, index) => (
                  <div
                    key={url}
                    onClick={(e) => handleToggleUrl(url, index, e)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all duration-200 text-sm",
                      selectedUrls.has(url)
                        ? "bg-blue-50 text-blue-900 scale-[0.99]"
                        : "hover:bg-gray-50 hover:scale-[1.01]"
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-200",
                      selectedUrls.has(url) ? "bg-blue-600 border-blue-600 scale-110" : "border-gray-300"
                    )}>
                      {selectedUrls.has(url) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="truncate">{url}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* State 3: Analysis Dashboard */}
        <div className={cn(
          "transition-all duration-300",
          isAnalysisState ? "opacity-100" : "opacity-0 hidden"
        )}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: Status */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    Live Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-semibold">{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} />
                    <p className="text-xs text-gray-500 mt-2">
                      {results.length} of {selectedUrls.size} completed
                    </p>
                  </div>

                  {currentAnalyzingUrl && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md animate-in fade-in duration-300">
                      <p className="text-xs font-medium text-blue-900 mb-1">Currently analyzing:</p>
                      <p className="text-xs text-blue-700 truncate">{currentAnalyzingUrl}</p>
                    </div>
                  )}

                  {analyzing ? (
                    <Button onClick={handleStopAnalysis} className="w-full bg-red-600 hover:bg-red-700 text-white">
                      <Square className="h-4 w-4 mr-2 fill-current" /> Stop Analysis
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Analysis complete</span>
                    </div>
                  )}

                  <div className="bg-gray-900 rounded-md p-3 max-h-[300px] overflow-hidden flex flex-col">
                    <div className="flex items-center gap-2 text-gray-400 border-b border-gray-800 pb-2 mb-2">
                      <Terminal className="h-3 w-3" />
                      <span className="text-xs font-mono">Console</span>
                    </div>
                    <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1">
                      {logs.slice(-10).map((log, i) => (
                        <div key={i} className="text-gray-300">
                          {log}
                        </div>
                      ))}
                      <div ref={logEndRef} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Results */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Results</h2>
                <Badge variant="outline">
                  {results.length} / {selectedUrls.size}
                </Badge>
              </div>

              <div className="space-y-3">
                {/* Actual results */}
                {results.map((result, idx) => (
                  <Card key={idx} className="border-l-4 border-l-blue-600 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <CardHeader className="bg-gray-50 pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Globe className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <a href={result.url} target="_blank" className="hover:underline truncate">
                              {new URL(result.url).pathname}
                            </a>
                          </CardTitle>
                          <CardDescription className="text-xs truncate mt-1">{result.url}</CardDescription>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Badge variant={(result.seoIssues || []).length ? "destructive" : "secondary"} className="text-xs">
                            SEO: {(result.seoIssues || []).length}
                          </Badge>
                          <Badge variant={(result.accessibilityIssues || []).length ? "destructive" : "secondary"} className="text-xs">
                            A11y: {(result.accessibilityIssues || []).length}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    {((result.seoIssues || []).length > 0 || (result.accessibilityIssues || []).length > 0) && (
                      <CardContent className="pt-4 space-y-3">
                        {(result.seoIssues || []).length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <Search className="h-4 w-4" /> SEO Issues
                            </h4>
                            <ul className="space-y-1">
                              {result.seoIssues.map((issue, i) => (
                                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                  <span className="h-1 w-1 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {(result.accessibilityIssues || []).length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" /> Accessibility
                            </h4>
                            <div className="space-y-2">
                              {(result.accessibilityIssues || []).slice(0, 3).map((issue, i) => (
                                <div key={i} className="bg-gray-50 border p-3 rounded-md text-sm transition-all duration-200 hover:shadow-sm">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium">{issue.id}</span>
                                    <Badge variant="outline" className="text-[10px]">{issue.impact}</Badge>
                                  </div>
                                  <p className="text-gray-600 text-xs">{issue.description}</p>
                                </div>
                              ))}
                              {(result.accessibilityIssues || []).length > 3 && (
                                <div>
                                  {expandedResults.has(idx) && (result.accessibilityIssues || []).slice(3).map((issue, i) => (
                                    <div key={i + 3} className="bg-gray-50 border p-3 rounded-md text-sm mb-2 transition-all duration-200 hover:shadow-sm animate-in fade-in slide-in-from-top-2">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium">{issue.id}</span>
                                        <Badge variant="outline" className="text-[10px]">{issue.impact}</Badge>
                                      </div>
                                      <p className="text-gray-600 text-xs">{issue.description}</p>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => {
                                      const newExpanded = new Set(expandedResults);
                                      if (newExpanded.has(idx)) {
                                        newExpanded.delete(idx);
                                      } else {
                                        newExpanded.add(idx);
                                      }
                                      setExpandedResults(newExpanded);
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium w-full text-center py-2 hover:bg-blue-50 rounded-md transition-colors"
                                  >
                                    {expandedResults.has(idx) ? '− Show less' : `+ Show ${(result.accessibilityIssues || []).length - 3} more`}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}

                {/* Show skeleton loaders for pending results */}
                {analyzing && selectedUrls.size > results.length && Array.from({ length: Math.min(3, selectedUrls.size - results.length) }).map((_, i) => (
                  <Card key={`skeleton-${i}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-6 w-16" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>

      </main >
    </div >
  );
}
