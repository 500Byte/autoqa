import { useRef, useEffect, useState } from 'react';
import {
    Activity,
    Square,
    CheckCircle2,
    Terminal,
    CornerUpLeft,
    Globe,
    Search,
    AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalysisResult } from "@/types";
import { cn } from "@/lib/utils";
import { AnalyticsCard } from "@/components/features/AnalyticsCard";

interface AnalysisDashboardProps {
    analyzing: boolean;
    currentAnalyzingUrl: string;
    logs: string[];
    results: AnalysisResult[];
    selectedUrlsSize: number;
    onStopAnalysis: () => void;
    onGoBack: () => void;
}

export function AnalysisDashboard({
    analyzing,
    currentAnalyzingUrl,
    logs,
    results,
    selectedUrlsSize,
    onStopAnalysis,
    onGoBack
}: AnalysisDashboardProps) {
    const logEndRef = useRef<HTMLDivElement>(null);
    const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
    const progressPercentage = selectedUrlsSize > 0 ? (results.length / selectedUrlsSize) * 100 : 0;

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const toggleExpand = (idx: number) => {
        const newExpanded = new Set(expandedResults);
        if (newExpanded.has(idx)) {
            newExpanded.delete(idx);
        } else {
            newExpanded.add(idx);
        }
        setExpandedResults(newExpanded);
    };

    return (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Status */}
            <div className="lg:col-span-1 space-y-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-600" />
                            Estado en Vivo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">Progreso</span>
                                <span className="text-sm font-semibold">{Math.round(progressPercentage)}%</span>
                            </div>
                            <Progress value={progressPercentage} />
                            <p className="text-xs text-gray-500 mt-2">
                                {results.length} de {selectedUrlsSize} completadas
                            </p>
                        </div>

                        {currentAnalyzingUrl && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md animate-in fade-in duration-300">
                                <p className="text-xs font-medium text-blue-900 mb-1">Analizando actualmente:</p>
                                <p className="text-xs text-blue-700 truncate">{currentAnalyzingUrl}</p>
                            </div>
                        )}

                        {analyzing ? (
                            <Button onClick={onStopAnalysis} className="w-full bg-red-600 hover:bg-red-700 text-white">
                                <Square className="h-4 w-4 mr-2 fill-current" /> Detener Análisis
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Análisis completado</span>
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
                    <div className="flex items-center gap-3">
                        {!analyzing && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onGoBack}
                                className="h-8 w-8 hover:bg-gray-100 rounded-full"
                                title="Nueva Selección"
                            >
                                <CornerUpLeft className="h-4 w-4 text-gray-500" />
                            </Button>
                        )}
                        <h2 className="text-xl font-bold text-gray-900">Resultados</h2>
                    </div>
                    <Badge variant="outline">
                        {results.length} / {selectedUrlsSize}
                    </Badge>
                </div>

                <div className="space-y-3">
                    {/* Analytics Card - Show for first result only */}
                    {results.length > 0 && results[0].analytics && (
                        <AnalyticsCard analytics={results[0].analytics} url={results[0].url} />
                    )}

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
                                                <Search className="h-4 w-4" /> Problemas de SEO
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
                                                <AlertCircle className="h-4 w-4" /> Accesibilidad
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
                                                            onClick={() => toggleExpand(idx)}
                                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium w-full text-center py-2 hover:bg-blue-50 rounded-md transition-colors"
                                                        >
                                                            {expandedResults.has(idx) ? '− Mostrar menos' : `+ Mostrar ${(result.accessibilityIssues || []).length - 3} más`}
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
                    {analyzing && selectedUrlsSize > results.length && Array.from({ length: Math.min(3, selectedUrlsSize - results.length) }).map((_, i) => (
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
    );
}
