import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { APP_LOGO, APP_TITLE } from "@/const";
import { Mail, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  // Redirecionar para o dashboard se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      if (data.success) {
        toast.success("Login realizado com sucesso!");
        
        // Invalidar cache para forçar atualização
        utils.auth.me.invalidate();
        
        // Aguardar um momento para garantir que o cookie foi definido
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Fazer refetch para atualizar o estado de autenticação
        await utils.auth.me.refetch();
        
        // Redirecionar para o dashboard
        // Usar window.location para garantir reload completo e atualização do Router
        window.location.href = "/";
      }
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await loginMutation.mutateAsync({
        email,
        password,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage = error?.data?.message || error?.message || "Erro ao fazer login";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          {APP_LOGO && (
            <div className="flex justify-center">
              <img src={APP_LOGO} alt="Logo" className="h-12 w-auto" />
            </div>
          )}
          <div>
            <CardTitle className="text-2xl">{APP_TITLE}</CardTitle>
            <CardDescription>Faça login para acessar o sistema</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email || !password}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

