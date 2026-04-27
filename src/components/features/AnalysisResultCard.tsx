import { useState } from 'react';
import {
    Globe,
    Search,
    AlertCircle,
    Image as ImageIcon, // Renamed to avoid alias conflict if Image component exists
    Monitor,
    Tablet,
    Smartphone,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalysisResult } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Props for the AnalysisResultCard component.
 */
interface AnalysisResultCardProps {
    result: AnalysisResult;
}

/**
 * Component that displays the analysis results for a single URL.
 * Includes SEO issues, accessibility violations, and responsive screenshots.
 *
 * @param props - Component props containing the analysis result.
 * @returns React component.
 */
export function AnalysisResultCard({ result }: AnalysisResultCardProps) {
    const [showAllIssues, setShowAllIssues] = useState(false);
    const [showScreenshots, setShowScreenshots] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

    const totalA11yIssues = (result.accessibilityIssues || []).reduce((acc, curr) => acc + (curr.nodes?.length || 0), 0);
    const totalSeoIssues = (result.seoIssues || []).length;
    // hasIssues was unused

    return (
        <Card className="border-l-4 border-l-primary overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-md transition-shadow">
            <CardHeader className="bg-muted/50 pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                            <a 
                                href={result.url} 
                                target="_blank" 
                                className="hover:underline truncate text-foreground"
                                aria-label={`Visitar sitio analizado: ${new URL(result.url).hostname}`}
                            >
                                {new URL(result.url).pathname}
                            </a>
                        </CardTitle>
                        <CardDescription className="text-xs truncate mt-1 text-muted-foreground font-mono italic">{result.url}</CardDescription>
                    </div>
                    <div className="flex gap-2 flex-shrink-0" role="group" aria-label="Resumen de problemas">
                        <Badge variant={totalSeoIssues ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0 uppercase">
                            SEO: {totalSeoIssues}
                        </Badge>
                        <Badge
                            variant={totalA11yIssues ? "destructive" : "secondary"}
                            className="text-[10px] px-1.5 py-0 uppercase"
                            title={`${(result.accessibilityIssues || []).length} reglas, ${totalA11yIssues} instancias`}
                            aria-label={`${totalA11yIssues} problemas de accesibilidad detectados`}
                        >
                            A11y: {totalA11yIssues}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
                {/* Screenshots Section */}
                {result.screenshots && (
                    <div className="border border-border rounded-xl overflow-hidden">
                        <button
                            onClick={() => setShowScreenshots(!showScreenshots)}
                            className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors min-h-[44px]"
                            aria-expanded={showScreenshots}
                            aria-controls={`screenshots-${result.url}`}
                            aria-label={showScreenshots ? "Ocultar capturas de pantalla" : "Mostrar capturas de pantalla responsive"}
                        >
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                                <ImageIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                                Previsualización responsive
                            </div>
                            {showScreenshots ? <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                        </button>

                        {showScreenshots && (
                            <div id={`screenshots-${result.url}`} className="p-3 bg-background border-t border-border">
                                <div 
                                    className="flex justify-center gap-2 mb-4 bg-muted p-1 rounded-lg w-max mx-auto"
                                    role="radiogroup"
                                    aria-label="Seleccionar dispositivo"
                                >
                                    <button
                                        onClick={() => setSelectedDevice('mobile')}
                                        role="radio"
                                        aria-checked={selectedDevice === 'mobile'}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all min-h-[44px] min-w-[44px] justify-center",
                                            selectedDevice === 'mobile' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                        )}
                                        aria-label="Vista móvil"
                                    >
                                        <Smartphone className="h-3 w-3" aria-hidden="true" /> Móvil
                                    </button>
                                    <button
                                        onClick={() => setSelectedDevice('tablet')}
                                        role="radio"
                                        aria-checked={selectedDevice === 'tablet'}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all min-h-[44px] min-w-[44px] justify-center",
                                            selectedDevice === 'tablet' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                        )}
                                        aria-label="Vista tablet"
                                    >
                                        <Tablet className="h-3 w-3" aria-hidden="true" /> Tablet
                                    </button>
                                    <button
                                        onClick={() => setSelectedDevice('desktop')}
                                        role="radio"
                                        aria-checked={selectedDevice === 'desktop'}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all min-h-[44px] min-w-[44px] justify-center",
                                            selectedDevice === 'desktop' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                        )}
                                        aria-label="Vista escritorio"
                                    >
                                        <Monitor className="h-3 w-3" aria-hidden="true" /> PC
                                    </button>
                                </div>

                                <div className="relative bg-muted/30 rounded-lg border border-border flex justify-center h-[500px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                                    {result.screenshots[selectedDevice] ? (
                                        <img
                                            src={result.screenshots[selectedDevice]}
                                            alt={`Captura de pantalla en vista ${selectedDevice}`}
                                            className={cn(
                                                "h-auto shadow-md self-start transition-all duration-300",
                                                selectedDevice === 'mobile' ? "w-[375px] max-w-full" :
                                                    selectedDevice === 'tablet' ? "w-[768px] max-w-full" : "w-full"
                                            )}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-10 text-muted-foreground h-full">
                                            <ImageIcon className="h-8 w-8 mb-2 opacity-20" aria-hidden="true" />
                                            <span className="text-xs">No hay captura disponible</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Issues Section */}
                {(totalSeoIssues > 0 || totalA11yIssues > 0) && (
                    <div className="space-y-4">
                        {totalSeoIssues > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                                    <Search className="h-4 w-4 text-primary" aria-hidden="true" /> Problemas de SEO
                                </h4>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2" aria-label="Lista de problemas de SEO">
                                    {result.seoIssues.map((issue, i) => (
                                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 bg-destructive/5 p-2 rounded-lg border border-destructive/10">
                                            <span className="h-1 w-1 rounded-full bg-destructive mt-2 flex-shrink-0" aria-hidden="true" />
                                            {issue}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {(result.accessibilityIssues || []).length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                                    <AlertCircle className="h-4 w-4 text-amber-500" aria-hidden="true" /> Accesibilidad
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-label="Lista de problemas de accesibilidad">
                                    {(result.accessibilityIssues || []).slice(0, 4).map((issue, i) => (
                                        <div key={i} className="bg-background border border-border p-3 rounded-xl text-sm transition-all duration-200 hover:shadow-md relative overflow-hidden group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground tracking-tight text-xs">{issue.id}</span>
                                                    <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{issue.nodes?.length || 0} {issue.nodes?.length === 1 ? 'instancia' : 'instancias'}</span>
                                                </div>
                                                <Badge variant="outline" className={cn(
                                                    "text-[9px] font-bold uppercase shrink-0",
                                                    issue.impact === 'critical' ? "text-destructive border-destructive/20 bg-destructive/5" :
                                                        issue.impact === 'serious' ? "text-orange-700 border-orange-200 bg-orange-50" :
                                                            issue.impact === 'moderate' ? "text-amber-700 border-amber-200 bg-amber-50" :
                                                                "text-muted-foreground bg-muted/50"
                                                )}>{issue.impact}</Badge>
                                            </div>
                                            <p className="text-muted-foreground text-[11px] leading-snug">{issue.description}</p>
                                        </div>
                                    ))}
                                </div>
                                {(result.accessibilityIssues || []).length > 4 && (
                                    <div className="space-y-3">
                                        {showAllIssues && (
                                            <div 
                                                id={`extra-issues-${result.url}`}
                                                className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2"
                                                aria-label="Problemas de accesibilidad adicionales"
                                            >
                                                {(result.accessibilityIssues || []).slice(4).map((issue, i) => (
                                                    <div key={i + 4} className="bg-background border border-border p-3 rounded-xl text-sm transition-all duration-200 hover:shadow-md relative overflow-hidden">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-foreground tracking-tight text-xs">{issue.id}</span>
                                                                <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{issue.nodes?.length || 0} {issue.nodes?.length === 1 ? 'instancia' : 'instancias'}</span>
                                                            </div>
                                                            <Badge variant="outline" className="text-[9px] font-bold uppercase shrink-0">{issue.impact}</Badge>
                                                        </div>
                                                        <p className="text-muted-foreground text-[11px] leading-snug">{issue.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setShowAllIssues(!showAllIssues)}
                                            className="text-xs text-primary hover:text-primary/80 font-bold w-full text-center py-4 hover:bg-primary/5 rounded-xl border border-dashed border-primary/20 transition-all uppercase tracking-wider min-h-[44px]"
                                            aria-expanded={showAllIssues}
                                            aria-controls={`extra-issues-${result.url}`}
                                        >
                                            {showAllIssues ? '− Ocultar problemas' : `+ Ver ${(result.accessibilityIssues || []).length - 4} problemas más`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
