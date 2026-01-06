import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Check, Minus, ArrowRight } from 'lucide-react';
import { cn } from "@/lib/utils";

interface UrlSelectionProps {
    sitemapUrls: string[];
    selectedUrls: Set<string>;
    onToggleUrl: (url: string, index: number, event: React.MouseEvent) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onGoBack: () => void;
    onAnalyze: () => void;
}

export function UrlSelection({
    sitemapUrls,
    selectedUrls,
    onToggleUrl,
    onSelectAll,
    onDeselectAll,
    onGoBack,
    onAnalyze
}: UrlSelectionProps) {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onGoBack}
                        className="mt-1 h-8 w-8 hover:bg-gray-100 rounded-full"
                        title="Volver"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-500" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Seleccionar Páginas</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Se encontraron {sitemapUrls.length} URLs • {selectedUrls.size} seleccionadas
                            <span className="text-gray-400 ml-2">• Shift+Click para selección por lote</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onSelectAll}>
                        <Check className="h-4 w-4 mr-1" /> Todas
                    </Button>
                    <Button variant="outline" onClick={onDeselectAll}>
                        <Minus className="h-4 w-4 mr-1" /> Ninguna
                    </Button>
                    <Button onClick={onAnalyze} disabled={selectedUrls.size === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
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
                                onClick={(e) => onToggleUrl(url, index, e)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all duration-200 text-sm select-none",
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
    );
}
