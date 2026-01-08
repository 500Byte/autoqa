import { AnalyticsData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface AnalyticsCardProps {
    analytics: AnalyticsData;
    url: string;
}

export function AnalyticsCard({ analytics, url }: AnalyticsCardProps) {
    const { googleAnalytics, searchConsole } = analytics;

    // Check if any analytics or search console methods are detected
    const hasAnyAnalytics = googleAnalytics.hasGA4 || googleAnalytics.hasUniversalAnalytics || googleAnalytics.hasGTM;
    const hasAnySearchConsole = searchConsole.hasMetaTag || searchConsole.hasHtmlFile || searchConsole.hasDnsTxt;

    return (
        <Card className="border-l-4 border-l-purple-600 bg-gradient-to-r from-purple-50 to-white">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Configuración de Analytics y Search Console
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Google Analytics Section */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                        <h4 className="text-sm font-semibold text-gray-900">Google Analytics</h4>
                    </div>

                    {hasAnyAnalytics ? (
                        <div className="space-y-2">
                            {/* GA4 */}
                            <div className="flex items-center gap-2">
                                {googleAnalytics.hasGA4 ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="text-sm text-gray-700">
                                    Google Analytics 4 (GA4)
                                </span>
                                {googleAnalytics.hasGA4 && (
                                    <Badge variant="secondary" className="text-xs">Activo</Badge>
                                )}
                            </div>
                            {googleAnalytics.measurementIds.length > 0 && (
                                <div className="ml-6 space-y-1">
                                    {googleAnalytics.measurementIds.map((id, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-blue-700">
                                                {id}
                                            </code>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Universal Analytics */}
                            <div className="flex items-center gap-2">
                                {googleAnalytics.hasUniversalAnalytics ? (
                                    <>
                                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                                        <span className="text-sm text-gray-700">
                                            Universal Analytics (UA)
                                        </span>
                                        <Badge variant="destructive" className="text-xs">Deprecado</Badge>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm text-gray-700">
                                            Universal Analytics (UA)
                                        </span>
                                    </>
                                )}
                            </div>
                            {googleAnalytics.uaIds.length > 0 && (
                                <div className="ml-6 space-y-1">
                                    {googleAnalytics.uaIds.map((id, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-orange-700">
                                                {id}
                                            </code>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Google Tag Manager */}
                            <div className="flex items-center gap-2">
                                {googleAnalytics.hasGTM ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="text-sm text-gray-700">
                                    Google Tag Manager (GTM)
                                </span>
                                {googleAnalytics.hasGTM && (
                                    <Badge variant="secondary" className="text-xs">Activo</Badge>
                                )}
                            </div>
                            {googleAnalytics.gtmContainers.length > 0 && (
                                <div className="ml-6 space-y-1">
                                    {googleAnalytics.gtmContainers.map((id, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-purple-700">
                                                {id}
                                            </code>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
                            <XCircle className="h-4 w-4" />
                            <span>No se detectó Google Analytics</span>
                        </div>
                    )}
                </div>

                {/* Search Console Section */}
                <div className="space-y-3 border-t pt-3">
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-600" />
                        <h4 className="text-sm font-semibold text-gray-900">Google Search Console</h4>
                    </div>

                    {hasAnySearchConsole ? (
                        <div className="space-y-2">
                            {/* Meta Tag Verification */}
                            <div className="flex items-center gap-2">
                                {searchConsole.hasMetaTag ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="text-sm text-gray-700">
                                    Meta Tag de Verificación
                                </span>
                                {searchConsole.hasMetaTag && (
                                    <Badge variant="secondary" className="text-xs">Detectado</Badge>
                                )}
                            </div>
                            {searchConsole.metaTagContent && (
                                <div className="ml-6">
                                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-green-700 break-all">
                                        {searchConsole.metaTagContent}
                                    </code>
                                </div>
                            )}

                            {/* HTML File Verification */}
                            <div className="flex items-center gap-2">
                                {searchConsole.hasHtmlFile ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="text-sm text-gray-700">
                                    Archivo HTML de Verificación
                                </span>
                            </div>

                            {/* DNS TXT Verification */}
                            <div className="flex items-center gap-2">
                                {searchConsole.hasDnsTxt ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="text-sm text-gray-700">
                                    Registro TXT en DNS
                                </span>
                                {searchConsole.hasDnsTxt && (
                                    <Badge variant="secondary" className="text-xs">Detectado</Badge>
                                )}
                            </div>
                            {searchConsole.dnsTxtContent && (
                                <div className="ml-6">
                                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-green-700 break-all">
                                        {searchConsole.dnsTxtContent}
                                    </code>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
                            <XCircle className="h-4 w-4" />
                            <span>No se detectó verificación de Search Console</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
