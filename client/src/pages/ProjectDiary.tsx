import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function ProjectDiary() {
  const [, setLocation] = useLocation();
  const { data: projects, isLoading, error } = trpc.projectLog.listProjects.useQuery();

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

  if (!projects || projects.length === 0) {
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setLocation(`/diario-bordo/${project.id}`)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{project.name}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardTitle>
              <CardDescription>
                Status: {getStatusLabel(project.status)}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
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

