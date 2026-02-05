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

interface AnalysisResultCardProps {
    result: AnalysisResult;
}

export function AnalysisResultCard({ result }: AnalysisResultCardProps) {
    const [showAllIssues, setShowAllIssues] = useState(false);
    const [showScreenshots, setShowScreenshots] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

    const totalA11yIssues = (result.accessibilityIssues || []).reduce((acc, curr) => acc + (curr.nodes?.length || 0), 0);
    const totalSeoIssues = (result.seoIssues || []).length;
    const hasIssues = totalSeoIssues > 0 || totalA11yIssues > 0;

    return (
        <Card className="border-l-4 border-l-blue-600 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-md transition-shadow">
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
                        <Badge variant={totalSeoIssues ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0 uppercase">
                            SEO: {totalSeoIssues}
                        </Badge>
                        <Badge
                            variant={totalA11yIssues ? "destructive" : "secondary"}
                            className="text-[10px] px-1.5 py-0 uppercase"
                            title={`${(result.accessibilityIssues || []).length} reglas, ${totalA11yIssues} instancias`}
                        >
                            A11y: {totalA11yIssues}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
                {/* Screenshots Section */}
                {result.screenshots && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setShowScreenshots(!showScreenshots)}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <ImageIcon className="h-4 w-4 text-purple-600" />
                                Previsualización responsive
                            </div>
                            {showScreenshots ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </button>

                        {showScreenshots && (
                            <div className="p-3 bg-white border-t border-gray-200">
                                <div className="flex justify-center gap-2 mb-4 bg-gray-100 p-1 rounded-lg w-max mx-auto">
                                    <button
                                        onClick={() => setSelectedDevice('mobile')}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                            selectedDevice === 'mobile' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                                        )}
                                    >
                                        <Smartphone className="h-3 w-3" /> Móvil
                                    </button>
                                    <button
                                        onClick={() => setSelectedDevice('tablet')}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                            selectedDevice === 'tablet' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                                        )}
                                    >
                                        <Tablet className="h-3 w-3" /> Tablet
                                    </button>
                                    <button
                                        onClick={() => setSelectedDevice('desktop')}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                            selectedDevice === 'desktop' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                                        )}
                                    >
                                        <Monitor className="h-3 w-3" /> PC
                                    </button>
                                </div>

                                <div className="relative bg-gray-100 rounded-lg border border-gray-200 flex justify-center h-[500px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                                    {result.screenshots[selectedDevice] ? (
                                        <img
                                            src={result.screenshots[selectedDevice]}
                                            alt={`Screenshot ${selectedDevice}`}
                                            className={cn(
                                                "h-auto shadow-md self-start transition-all duration-300",
                                                selectedDevice === 'mobile' ? "w-[375px] max-w-full" :
                                                    selectedDevice === 'tablet' ? "w-[768px] max-w-full" : "w-full"
                                            )}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-10 text-gray-400 h-full">
                                            <ImageIcon className="h-8 w-8 mb-2 opacity-20" />
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
                                        {showAllIssues && (
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
                                            onClick={() => setShowAllIssues(!showAllIssues)}
                                            className="text-xs text-blue-600 hover:text-blue-700 font-bold w-full text-center py-2.5 hover:bg-blue-50 rounded-xl border border-dashed border-blue-200 transition-all uppercase tracking-wider"
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
