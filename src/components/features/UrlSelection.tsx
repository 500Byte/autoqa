import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Check, ArrowRight, Search, ArrowUpAZ, ArrowDownAZ } from 'lucide-react';
import { cn } from "@/lib/utils";

/**
 * Props for the UrlSelection component.
 */
interface UrlSelectionProps {
    sitemapUrls: string[];
    selectedUrls: Set<string>;
    onToggleUrl: (url: string, index: number, event: React.MouseEvent) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onGoBack: () => void;
    onAnalyze: () => void;
}

/**
 * Component for selecting which URLs to analyze from a discovered sitemap.
 * Supports filtering, sorting, and batch selection.
 *
 * @param props - Component props.
 * @returns React component.
 */
export function UrlSelection({
    sitemapUrls,
    selectedUrls,
    onToggleUrl,
    onSelectAll,
    onDeselectAll,
    onGoBack,
    onAnalyze
}: UrlSelectionProps) {
    const [filterText, setFilterText] = useState('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const filteredUrls = useMemo(() => {
        let urls = [...sitemapUrls];

        // Filter
        if (filterText) {
            const lowerFilter = filterText.toLowerCase();
            urls = urls.filter(url => url.toLowerCase().includes(lowerFilter));
        }

        // Sort
        urls.sort((a, b) => {
            if (sortDirection === 'asc') return a.localeCompare(b);
            return b.localeCompare(a);
        });

        return urls;
    }, [sitemapUrls, filterText, sortDirection]);

    // handleSelectCurrent logic was commented out/incomplete in source, removed.

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
                    <Button onClick={onAnalyze} disabled={selectedUrls.size === 0} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg font-semibold">
                        Analizar {selectedUrls.size} <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>

            <Card>
                <div className="p-4 border-b bg-gray-50/50 space-y-3">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Filtrar URLs..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="pl-9 bg-white"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                            title={sortDirection === 'asc' ? "Orden A-Z" : "Orden Z-A"}
                        >
                            {sortDirection === 'asc' ? <ArrowUpAZ className="h-4 w-4" /> : <ArrowDownAZ className="h-4 w-4" />}
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Acciones rápidas:</span>
                        <button onClick={onSelectAll} className="hover:text-blue-600 font-medium px-2 py-1 hover:bg-blue-50 rounded">
                            Todas ({sitemapUrls.length})
                        </button>
                        <span className="text-gray-300">|</span>
                        <button onClick={onDeselectAll} className="hover:text-blue-600 font-medium px-2 py-1 hover:bg-blue-50 rounded">
                            Ninguna
                        </button>
                    </div>
                </div>
                <CardContent className="p-0">
                    <div className="max-h-[500px] overflow-y-auto space-y-0.5 p-2">
                        {filteredUrls.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 text-sm">
                                No se encontraron URLs que coincidan con &quot;{filterText}&quot;
                            </div>
                        ) : (
                            filteredUrls.map((url) => (
                                <div
                                    key={url}
                                    onClick={(e) => onToggleUrl(url, sitemapUrls.indexOf(url), e)}
                                    // Note: access original index for shift-click logic to work correctly 
                                    // if the parent depends on original indices.
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all duration-200 text-sm select-none border border-transparent",
                                        selectedUrls.has(url)
                                            ? "bg-blue-50 text-blue-900 border-blue-100"
                                            : "hover:bg-gray-50 hover:border-gray-200"
                                    )}
                                >
                                    <div className={cn(
                                        "h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-200",
                                        selectedUrls.has(url) ? "bg-blue-600 border-blue-600 scale-110 shadow-sm" : "border-gray-300"
                                    )}>
                                        {selectedUrls.has(url) && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <span className="truncate flex-1">{url}</span>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
