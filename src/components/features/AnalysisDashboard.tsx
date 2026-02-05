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
import { AnalysisResultCard } from "@/components/features/AnalysisResultCard";

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
    const progressPercentage = selectedUrlsSize > 0 ? (results.length / selectedUrlsSize) * 100 : 0;

    // Auto-scroll desactivado completamente a petición del usuario.
    // El usuario prefiere tener el control manual del scroll.

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
                        <div key={idx}>
                            <AnalysisResultCard result={result} />
                        </div>
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
