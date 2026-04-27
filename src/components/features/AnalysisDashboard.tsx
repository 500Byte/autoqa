import { useRef } from 'react';
import {
    Activity,
    Square,
    CheckCircle2,
    Terminal,
    CornerUpLeft,
    Globe
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalysisResult, AnalyticsData } from "@/types";
import { AnalyticsCard } from "@/components/features/AnalyticsCard";
import { AnalysisResultCard } from "@/components/features/AnalysisResultCard";

/**
 * Props for the AnalysisDashboard component.
 */
interface AnalysisDashboardProps {
    analyzing: boolean;
    currentAnalyzingUrl: string;
    logs: string[];
    results: AnalysisResult[];
    globalResult: { analytics: AnalyticsData } | null;
    selectedUrlsSize: number;
    concurrency: number;
    onStopAnalysis: () => void;
    onGoBack: () => void;
}

/**
 * Main dashboard component that displays live analysis status, logs, and results.
 *
 * @param props - Component props.
 * @returns React component.
 */
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
                <Card aria-label="Estado del análisis">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
                            Estado en Vivo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div aria-live="polite" aria-atomic="true">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Progreso</span>
                                <span className="text-sm font-semibold">{Math.round(progressPercentage)}%</span>
                            </div>
                            <Progress value={progressPercentage} aria-label="Progreso total del análisis" />
                            <p className="text-xs text-muted-foreground mt-2">
                                {results.length} de {selectedUrlsSize} completadas
                            </p>
                        </div>

                        {currentAnalyzingUrl && (
                            <div 
                                className="p-3 bg-primary/10 border border-primary/20 rounded-md animate-in fade-in duration-300"
                                aria-live="assertive"
                            >
                                <p className="text-xs font-medium text-primary mb-1">Analizando actualmente:</p>
                                <p className="text-xs text-primary/80 truncate">{currentAnalyzingUrl}</p>
                            </div>
                        )}

                        {analyzing ? (
                            <Button 
                                onClick={onStopAnalysis} 
                                variant="destructive"
                                className="w-full shadow-lg active:scale-[0.98] transition-all"
                                aria-label="Detener el análisis actual"
                            >
                                <Square className="h-4 w-4 mr-2 fill-current" aria-hidden="true" /> Detener Análisis
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-green-600 font-medium" role="status">
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                <span>Análisis completado</span>
                            </div>
                        )}

                        <div 
                            className="bg-zinc-950 rounded-xl p-3 max-h-[300px] overflow-hidden flex flex-col border border-zinc-800 shadow-inner"
                            aria-label="Registro de actividad de la consola"
                            role="log"
                        >
                            <div className="flex items-center gap-2 text-zinc-500 border-b border-zinc-800 pb-2 mb-2">
                                <Terminal className="h-3 w-3" aria-hidden="true" />
                                <span className="text-xs font-mono uppercase tracking-tighter">Console</span>
                            </div>
                            <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1 custom-scrollbar">
                                {logs.map((log, i) => (
                                    <div key={i} className="text-zinc-300">
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
                                className="h-8 w-8 hover:bg-secondary rounded-full"
                                title="Nueva Selección"
                            >
                                <CornerUpLeft className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        )}
                        <h2 className="text-xl font-bold text-foreground tracking-tight">Resultados</h2>
                    </div>
                    <Badge variant="outline" className="font-mono">
                        {results.length} / {selectedUrlsSize}
                    </Badge>
                </div>

                <div className="space-y-4">
                    {/* Tarjeta de Analítica Global */}
                    {globalResult && globalResult.analytics && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            <AnalyticsCard analytics={globalResult.analytics} />
                        </div>
                    )}

                    {!globalResult && analyzing && (
                        <Card className="border-dashed border-2">
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                                <div className="p-3 bg-primary/10 rounded-full animate-pulse">
                                    <Globe className="h-6 w-6 text-primary animate-spin-slow" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold text-foreground">Configuración Global</h3>
                                    <p className="text-xs text-muted-foreground">Analizando DNS, Search Console y Analíticas...</p>
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
                        <Card key={`skeleton-${i}`} className="border-l-4 border-l-muted">
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
