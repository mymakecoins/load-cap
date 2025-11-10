import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Settings as SettingsIcon, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Settings() {
  const { user } = useAuth();
  const [allocationMode, setAllocationMode] = useState<"hours" | "percentage">("hours");
  const [isSaving, setIsSaving] = useState(false);

  // Buscar configuração atual
  const { data: currentMode, isLoading } = trpc.settings.getAllocationMode.useQuery();
  const { data: allSettings } = trpc.settings.getAll.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const setSettingMutation = trpc.settings.set.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(`Erro ao salvar configuração: ${error.message}`);
      setIsSaving(false);
    },
  });

  useEffect(() => {
    if (currentMode) {
      setAllocationMode(currentMode);
    }
  }, [currentMode]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setSettingMutation.mutateAsync({
        key: "allocation_mode",
        value: allocationMode,
        description: "Modo de entrada de alocações: 'hours' para horas ou 'percentage' para percentual",
      });
    } catch (error) {
      // Erro já tratado no onError
    }
  };

  // Verificar se é admin
  if (user?.role !== "admin") {
    return (
      <div className="container max-w-4xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Apenas administradores podem acessar as configurações do sistema.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Carregando...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
            <p className="text-muted-foreground">
              Gerencie as configurações globais da aplicação
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modo de Alocação</CardTitle>
          <CardDescription>
            Configure como as alocações de colaboradores devem ser inseridas no sistema.
            Esta configuração afeta todos os formulários de alocação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="allocation-mode">Modo de Entrada</Label>
            <Select
              value={allocationMode}
              onValueChange={(value) => setAllocationMode(value as "hours" | "percentage")}
            >
              <SelectTrigger id="allocation-mode">
                <SelectValue placeholder="Selecione o modo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Horas</SelectItem>
                <SelectItem value="percentage">Percentual</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {allocationMode === "hours" ? (
                <>
                  <strong>Modo Horas:</strong> Os usuários inserem a quantidade de horas alocadas diretamente.
                  O sistema calcula automaticamente o percentual correspondente.
                </>
              ) : (
                <>
                  <strong>Modo Percentual:</strong> Os usuários inserem o percentual de alocação (0-100%).
                  O sistema calcula automaticamente as horas baseado na capacidade mensal do colaborador.
                  A soma dos percentuais não pode exceder 100% por período.
                </>
              )}
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              Ao alterar o modo de alocação, os formulários existentes serão atualizados automaticamente.
              Dados já cadastrados não serão afetados, mas novos cadastros seguirão o modo selecionado.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving || allocationMode === currentMode}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configuração
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {allSettings && allSettings.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Todas as Configurações</CardTitle>
            <CardDescription>
              Lista de todas as configurações do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allSettings.map((setting) => (
                <div key={setting.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{setting.key}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {setting.description || "Sem descrição"}
                    </div>
                    <div className="text-sm font-mono mt-2 bg-muted p-2 rounded">
                      {setting.value}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground ml-4">
                    Atualizado em: {new Date(setting.updatedAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

