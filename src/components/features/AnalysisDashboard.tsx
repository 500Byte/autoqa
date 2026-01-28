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
    globalResult: any;
    selectedUrlsSize: number;
    concurrency: number;
    onStopAnalysis: () => void;
    onGoBack: () => void;
}

export function AnalysisDashboard({
    analyzing,
    currentAnalyzingUrl,
    logs,
    results,
    globalResult,
    selectedUrlsSize,
    concurrency,
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
            {/* Columna Izquierda: Estado */}
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
                            <Button onClick={onStopAnalysis} className="w-full bg-red-600 hover:bg-red-700 text-white shadow-lg active:scale-[0.98] transition-all">
                                <Square className="h-4 w-4 mr-2 fill-current" /> Detener Análisis
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Análisis completado</span>
                            </div>
                        )}

                        <div className="bg-gray-900 rounded-xl p-3 max-h-[300px] overflow-hidden flex flex-col border border-gray-800 shadow-inner">
                            <div className="flex items-center gap-2 text-gray-400 border-b border-gray-800 pb-2 mb-2">
                                <Terminal className="h-3 w-3" />
                                <span className="text-xs font-mono uppercase tracking-tighter">Console</span>
                            </div>
                            <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1 custom-scrollbar">
                                {logs.map((log, i) => (
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

            {/* Columna Derecha: Resultados */}
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
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Resultados</h2>
                    </div>
                    <Badge variant="outline" className="font-mono">
                        {results.length} / {selectedUrlsSize}
                    </Badge>
                </div>

                <div className="space-y-4">
                    {/* Tarjeta de Analítica Global */}
                    {globalResult && globalResult.analytics && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            <AnalyticsCard analytics={globalResult.analytics} url="Configuración Global" />
                        </div>
                    )}

                    {!globalResult && analyzing && (
                        <Card className="border-dashed border-2">
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                                <div className="p-3 bg-blue-50 rounded-full animate-pulse">
                                    <Globe className="h-6 w-6 text-blue-600 animate-spin-slow" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold text-gray-900">Configuración Global</h3>
                                    <p className="text-xs text-gray-500">Analizando DNS, Search Console y Analíticas...</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Resultados reales */}
                    {results.map((result, idx) => (
                        <Card key={idx} className="border-l-4 border-l-blue-600 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-md transition-shadow">
                            <CardHeader className="bg-gray-50/50 pb-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <Globe className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                            <a href={result.url} target="_blank" className="hover:underline truncate text-gray-900">
                                                {new URL(result.url).pathname}
                                            </a>
                                        </CardTitle>
                                        <CardDescription className="text-xs truncate mt-1 text-gray-500 font-mono italic">{result.url}</CardDescription>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <Badge variant={(result.seoIssues || []).length ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0 uppercase">
                                            SEO: {(result.seoIssues || []).length}
                                        </Badge>
                                        <Badge
                                            variant={(result.accessibilityIssues || []).length ? "destructive" : "secondary"}
                                            className="text-[10px] px-1.5 py-0 uppercase"
                                            title={`${(result.accessibilityIssues || []).length} reglas, ${(result.accessibilityIssues || []).reduce((acc, curr) => acc + (curr.nodes?.length || 0), 0)} instancias`}
                                        >
                                            A11y: {(result.accessibilityIssues || []).reduce((acc, curr) => acc + (curr.nodes?.length || 0), 0)}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            {/* ... rest of the content ... */}
                            {((result.seoIssues || []).length > 0 || (result.accessibilityIssues || []).length > 0) && (
                                <CardContent className="pt-4 space-y-4">
                                    {(result.seoIssues || []).length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-semibold flex items-center gap-2 text-gray-800">
                                                <Search className="h-4 w-4 text-blue-500" /> Problemas de SEO
                                            </h4>
                                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {result.seoIssues.map((issue, i) => (
                                                    <li key={i} className="text-xs text-gray-600 flex items-start gap-2 bg-red-50/30 p-2 rounded-lg border border-red-100/50">
                                                        <span className="h-1 w-1 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                                                        {issue}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {(result.accessibilityIssues || []).length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-semibold flex items-center gap-2 text-gray-800">
                                                <AlertCircle className="h-4 w-4 text-amber-500" /> Accesibilidad
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {(result.accessibilityIssues || []).slice(0, 4).map((issue, i) => (
                                                    <div key={i} className="bg-white border p-3 rounded-xl text-sm transition-all duration-200 hover:shadow-md relative overflow-hidden group">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-gray-900 tracking-tight text-xs">{issue.id}</span>
                                                                <span className="text-[10px] text-gray-400 font-mono mt-0.5">{issue.nodes?.length || 0} {issue.nodes?.length === 1 ? 'instancia' : 'instancias'}</span>
                                                            </div>
                                                            <Badge variant="outline" className={cn(
                                                                "text-[9px] font-bold uppercase shrink-0",
                                                                issue.impact === 'critical' ? "text-red-700 border-red-200 bg-red-50" :
                                                                    issue.impact === 'serious' ? "text-orange-700 border-orange-200 bg-orange-50" :
                                                                        issue.impact === 'moderate' ? "text-amber-700 border-amber-200 bg-amber-50" :
                                                                            "text-gray-600 bg-gray-50"
                                                            )}>{issue.impact}</Badge>
                                                        </div>
                                                        <p className="text-gray-600 text-[11px] leading-snug">{issue.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            {(result.accessibilityIssues || []).length > 4 && (
                                                <div className="space-y-3">
                                                    {expandedResults.has(idx) && (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                                            {(result.accessibilityIssues || []).slice(4).map((issue, i) => (
                                                                <div key={i + 4} className="bg-white border p-3 rounded-xl text-sm transition-all duration-200 hover:shadow-md relative overflow-hidden">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-gray-900 tracking-tight text-xs">{issue.id}</span>
                                                                            <span className="text-[10px] text-gray-400 font-mono mt-0.5">{issue.nodes?.length || 0} {issue.nodes?.length === 1 ? 'instancia' : 'instancias'}</span>
                                                                        </div>
                                                                        <Badge variant="outline" className="text-[9px] font-bold uppercase shrink-0">{issue.impact}</Badge>
                                                                    </div>
                                                                    <p className="text-gray-600 text-[11px] leading-snug">{issue.description}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => toggleExpand(idx)}
                                                        className="text-xs text-blue-600 hover:text-blue-700 font-bold w-full text-center py-2.5 hover:bg-blue-50 rounded-xl border border-dashed border-blue-200 transition-all uppercase tracking-wider"
                                                    >
                                                        {expandedResults.has(idx) ? '− Ocultar problemas' : `+ Ver ${(result.accessibilityIssues || []).length - 4} problemas más`}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    ))}

                    {/* Mostrar esqueletos de carga basados en concurrencia */}
                    {analyzing && selectedUrlsSize > results.length && Array.from({ length: Math.min(concurrency, selectedUrlsSize - results.length) }).map((_, i) => (
                        <Card key={`skeleton-${i}`} className="border-l-4 border-l-gray-200">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Skeleton className="h-6 w-16 rounded-full" />
                                        <Skeleton className="h-6 w-16 rounded-full" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-32 w-full rounded-xl" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
