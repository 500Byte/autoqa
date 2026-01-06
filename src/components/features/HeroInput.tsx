import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Globe, Loader2, AlertCircle } from 'lucide-react';

interface HeroInputProps {
    domain: string;
    setDomain: (domain: string) => void;
    loading: boolean;
    error: string;
    onSubmit: (e: React.FormEvent) => void;
}

export function HeroInput({ domain, setDomain, loading, error, onSubmit }: HeroInputProps) {
    return (
        <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="space-y-3">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                    Control de Calidad <br />
                    <span className="text-blue-600">Reinventado.</span>
                </h1>
                <p className="text-lg text-gray-600">
                    Análisis automatizado de SEO, accesibilidad y enlaces para equipos web modernos.
                </p>
            </div>

            <Card className="p-2">
                <form onSubmit={onSubmit} className="flex gap-2">
                    <div className="relative flex-1">
                        <Globe className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <Input
                            className="pl-10 h-10"
                            placeholder="mynaui.com"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            required
                        />
                    </div>
                    <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Iniciar Análisis"}
                    </Button>
                </form>
            </Card>

            {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 p-3 rounded-md text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
