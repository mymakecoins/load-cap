import { useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen, ChevronRight, FileText } from "lucide-react";
import { toast } from "sonner";

type ProjectWithEntryCount = {
  id: number;
  name: string;
  status: string;
  entryCount?: number;
};

export default function ProjectDiary() {
  const [, setLocation] = useLocation();
  const { data: projects, isLoading, error } = trpc.projectLog.listProjects.useQuery();

  // Ordena projetos: não concluídos primeiro (ordem alfabética), depois concluídos (ordem alfabética)
  const sortedProjects = useMemo(() => {
    if (!projects) return [];
    
    const activeProjects = projects.filter((p) => p.status !== 'concluido');
    const completedProjects = projects.filter((p) => p.status === 'concluido');
    
    // Ordena ambos os grupos alfabeticamente
    activeProjects.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    completedProjects.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    
    // Retorna ativos primeiro, depois concluídos
    return [...activeProjects, ...completedProjects];
  }, [projects]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    toast.error("Erro ao carregar projetos");
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Erro ao carregar projetos</p>
      </div>
    );
  }

  if (!sortedProjects || sortedProjects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Diário de Bordo</h1>
          <p className="text-muted-foreground mt-2">
            Publique atualizações importantes sobre seus projetos
          </p>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum projeto disponível para criar entradas no diário
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Diário de Bordo</h1>
        <p className="text-muted-foreground mt-2">
          Selecione um projeto para visualizar ou criar entradas no diário
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {sortedProjects.map((project) => {
          const statusColors = getStatusColor(project.status);
          return (
            <Card
              key={project.id}
              className="hover:shadow-md transition-shadow cursor-pointer border-l-4"
              style={{
                borderLeftColor: statusColors.border,
                backgroundColor: statusColors.bg,
              }}
              onClick={() => setLocation(`/diario-bordo/${project.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{project.name}</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </CardTitle>
                <CardDescription className="space-y-1">
                  <div>Status: {getStatusLabel(project.status)}</div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {(project as ProjectWithEntryCount).entryCount || 0} {((project as ProjectWithEntryCount).entryCount || 0) === 1 ? 'nota' : 'notas'}
                    </span>
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    planejamento: "Planejamento",
    discovery: "Discovery",
    em_andamento: "Em Andamento",
    homologacao: "Homologação",
    delivery: "Delivery",
    go_live: "Go Live",
    concluido: "Concluído",
    pausado: "Pausado",
  };
  return labels[status] || status;
}

function getStatusColor(status: string): { border: string; bg: string } {
  const colors: Record<string, { border: string; bg: string }> = {
    planejamento: {
      border: "#ffb6aa", // Salmão/Laranja pastel
      bg: "#ffe6e2", // Background salmão muito claro
    },
    discovery: {
      border: "#eaa5d6", // Roxo/Lavanda pastel
      bg: "#ffe2f1", // Background roxo muito claro
    },
    em_andamento: {
      border: "#b3d4fc", // Azul pastel claro
      bg: "#e8f2ff", // Background azul muito claro
    },
    homologacao: {
      border: "#fefab6", // Amarelo pastel
      bg: "#fffeed", // Background amarelo muito claro
    },
    delivery: {
      border: "#b7ffce", // Verde pastel
      bg: "#d1fadd", // Background verde muito claro
    },
    go_live: {
      border: "#d8ff8b", // Verde vibrante pastel
      bg: "#ecffc7", // Background verde claro
    },
    concluido: {
      border: "#a7a7a7", // Cinza pastel suave (20% mais escuro)
      bg: "#c4c4c4", // Background cinza muito claro (20% mais escuro)
    },
    pausado: {
      border: "#d8b2ab", // Bege/Cinza pastel
      bg: "#f4f0f0", // Background bege muito claro
    },
  };
  return colors[status] || { border: "#e5e7eb", bg: "#f9fafb" };
}

