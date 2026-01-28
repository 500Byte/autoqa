'use client';

import { X, Settings2, Zap, Shield, Clock, Info } from 'lucide-react';
import { cn } from "@/lib/utils";
import { AnalysisSettings } from '@/types';

interface SettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AnalysisSettings;
    onSettingsChange: (settings: AnalysisSettings) => void;
}

export function SettingsDrawer({ isOpen, onClose, settings, onSettingsChange }: SettingsDrawerProps) {
    const updateSetting = <K extends keyof AnalysisSettings>(key: K, value: AnalysisSettings[K]) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={cn(
                    "fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] transition-transform duration-500 ease-in-out transform border-l",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Settings2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Ajustes</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* General Settings */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 uppercase tracking-wider">
                                <Zap className="w-4 h-4" />
                                <span>Rendimiento</span>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-medium text-gray-700">Escaneo en paralelo</label>
                                        <span className="text-sm font-bold text-blue-600">{settings.concurrency} URLs</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        step="1"
                                        value={settings.concurrency}
                                        onChange={(e) => updateSetting('concurrency', parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <p className="text-xs text-gray-500">
                                        Número de páginas analizadas simultáneamente. Valores altos pueden ralentizar tu sistema.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-medium text-gray-700">Tiempo de espera (Timeout)</label>
                                        <span className="text-sm font-bold text-blue-600">{settings.timeout / 1000}s</span>
                                    </div>
                                    <select
                                        value={settings.timeout}
                                        onChange={(e) => updateSetting('timeout', parseInt(e.target.value))}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    >
                                        <option value={15000}>15 segundos (Rápido)</option>
                                        <option value={30000}>30 segundos (Estándar)</option>
                                        <option value={60000}>60 segundos (Exhaustivo)</option>
                                        <option value={120000}>2 minutos (Para sitios pesados)</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Accessibility Settings */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 uppercase tracking-wider">
                                <Shield className="w-4 h-4" />
                                <span>Accesibilidad</span>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Nivel de cumplimiento WCAG</label>
                                    <select
                                        value={settings.accessibilityStandard}
                                        onChange={(e) => updateSetting('accessibilityStandard', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    >
                                        <option value="wcag2a">WCAG 2.0 A</option>
                                        <option value="wcag2aa">WCAG 2.0 AA</option>
                                        <option value="wcag21a">WCAG 2.1 A</option>
                                        <option value="wcag21aa">WCAG 2.1 AA</option>
                                        <option value="wcag22a">WCAG 2.2 A</option>
                                        <option value="wcag22aa">WCAG 2.2 AA</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => updateSetting('bestPractices', !settings.bestPractices)}>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-700">Buenas Prácticas</span>
                                        <span className="text-xs text-gray-500">Valida estándares de UX y calidad</span>
                                    </div>
                                    <div className={cn(
                                        "w-10 h-5 rounded-full transition-colors relative",
                                        settings.bestPractices ? "bg-blue-600" : "bg-gray-300"
                                    )}>
                                        <div className={cn(
                                            "absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform",
                                            settings.bestPractices ? "translate-x-5" : "translate-x-0"
                                        )} />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Info Card */}
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-amber-900">Nota sobre el tiempo</p>
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    Configurar muchos estándares de accesibilidad o un timeout elevado aumentará significativamente el tiempo total del reporte.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t bg-gray-50">
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-lg active:scale-[0.98]"
                        >
                            Guardar y Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
