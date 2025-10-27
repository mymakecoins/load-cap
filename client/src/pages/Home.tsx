import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      setLocation("/");
    }
  }, [isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md px-6 py-12 text-center">
        {APP_LOGO && <img src={APP_LOGO} alt="Logo" className="h-16 mx-auto mb-6" />}
        <h1 className="text-3xl font-bold text-white mb-2">{APP_TITLE}</h1>
        <p className="text-slate-300 mb-8">Sistema de Gestao de Times para Fabrica de Software</p>
        
        <a href={getLoginUrl()}>
          <Button size="lg" className="w-full">
            Fazer Login
          </Button>
        </a>
        
        <p className="text-xs text-slate-400 mt-6">
          Acesse com sua conta para gerenciar times, projetos e alocacoes
        </p>
      </div>
    </div>
  );
}

