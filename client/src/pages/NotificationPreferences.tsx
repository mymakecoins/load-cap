import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function NotificationPreferences() {
  const { data: preferences, refetch } = trpc.notifications.preferences.useQuery();
  const updateMutation = trpc.notifications.updatePreferences.useMutation();
  
  const [settings, setSettings] = useState({
    allocationCreated: true,
    allocationUpdated: true,
    allocationDeleted: true,
    allocationReverted: true,
    emailNotifications: false,
  });
  
  useEffect(() => {
    if (preferences) {
      setSettings({
        allocationCreated: preferences.allocationCreated,
        allocationUpdated: preferences.allocationUpdated,
        allocationDeleted: preferences.allocationDeleted,
        allocationReverted: preferences.allocationReverted,
        emailNotifications: preferences.emailNotifications,
      });
    }
  }, [preferences]);
  
  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(settings);
      toast.success("Preferências salvas com sucesso");
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar preferências");
    }
  };
  
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Preferências de Notificações</h1>
        <p className="text-muted-foreground mt-2">
          Configure quais notificações você deseja receber
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Notificação</CardTitle>
          <CardDescription>
            Selecione quais eventos você quer ser notificado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="allocation-created">Novo Colaborador Alocado</Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando um colaborador é alocado em seus projetos
              </p>
            </div>
            <Switch
              id="allocation-created"
              checked={settings.allocationCreated}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, allocationCreated: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="allocation-updated">Alocação Alterada</Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando uma alocação é modificada
              </p>
            </div>
            <Switch
              id="allocation-updated"
              checked={settings.allocationUpdated}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, allocationUpdated: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="allocation-deleted">Alocação Removida</Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando uma alocação é deletada
              </p>
            </div>
            <Switch
              id="allocation-deleted"
              checked={settings.allocationDeleted}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, allocationDeleted: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="allocation-reverted">Mudança Revertida</Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando uma mudança é revertida
              </p>
            </div>
            <Switch
              id="allocation-reverted"
              checked={settings.allocationReverted}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, allocationReverted: checked })
              }
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Canais de Notificação</CardTitle>
          <CardDescription>
            Escolha como você quer receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="email-notifications">Notificações por Email</Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações também por email (em breve)
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, emailNotifications: checked })
              }
              disabled // Desabilitado por enquanto
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => window.history.back()}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Salvando..." : "Salvar Preferências"}
        </Button>
      </div>
    </div>
  );
}

