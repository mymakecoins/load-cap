import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart } from "recharts";

export default function ProjectCapacity() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const { data: projects, isLoading: projLoading } = trpc.projects.list.useQuery();
  const { data: allocations, isLoading: allocLoading } = trpc.allocations.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: allocationMode } = trpc.settings.getAllocationMode.useQuery();

  const selectedProject = selectedProjectId ? projects?.find(p => p.id === selectedProjectId) : null;
  const projectAllocations = selectedProjectId 
    ? allocations?.filter(a => a.projectId === selectedProjectId) || []
    : [];

  // Calcular estatísticas do projeto baseado no modo configurado
  const totalAllocatedHours = allocationMode === "percentage"
    ? projectAllocations.reduce((sum, a) => {
        const percentage = a.allocatedPercentage ? parseFloat(String(a.allocatedPercentage)) : 0;
        return sum + percentage;
      }, 0)
    : projectAllocations.reduce((sum, a) => sum + a.allocatedHours, 0);
  
  // Distribuição por tipo de profissional
  const allocationByType: Record<string, number> = {};
  projectAllocations.forEach(alloc => {
    const emp = employees?.find(e => e.id === alloc.employeeId);
    if (emp) {
      const value = allocationMode === "percentage"
        ? (alloc.allocatedPercentage ? parseFloat(String(alloc.allocatedPercentage)) : 0)
        : alloc.allocatedHours;
      allocationByType[emp.type] = (allocationByType[emp.type] || 0) + value;
    }
  });

  const allocationByTypeData = Object.entries(allocationByType).map(([type, hours]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    hours,
  }));

  // Dados para gráfico de andamento
  const progressData = [
    {
      name: "Andamento",
      previsto: selectedProject?.plannedProgress || 0,
      realizado: selectedProject?.actualProgress || 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alocação por Projeto</h1>
        <p className="text-muted-foreground mt-2">Visualizar alocação e capacidade de cada projeto</p>
      </div>

      {/* Seletor de Projeto */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Projeto</CardTitle>
          <CardDescription>Escolha um projeto para visualizar sua capacidade e andamento</CardDescription>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedProjectId?.toString() || ""} 
            onValueChange={(value) => setSelectedProjectId(value ? parseInt(value) : null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um projeto" />
            </SelectTrigger>
            <SelectContent>
              {projLoading ? (
                <SelectItem value="loading" disabled>Carregando...</SelectItem>
              ) : projects && projects.length > 0 ? (
                projects.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((proj) => (
                  <SelectItem key={proj.id} value={proj.id.toString()}>
                    {proj.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="empty" disabled>Nenhum projeto cadastrado</SelectItem>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProject && (
        <>
          {/* Informações do Projeto */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Projeto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nome</p>
                  <p className="text-lg font-semibold">{selectedProject.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                  <p className="text-lg font-semibold">
                    {clients?.find(c => c.id === selectedProject.clientId)?.name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                  <p className="text-lg font-semibold">
                    {selectedProject.type === "sustentacao" && "Sustentação"}
                    {selectedProject.type === "escopo_fechado" && "Escopo Fechado"}
                    {selectedProject.type === "squad_gerenciada" && "Squad Gerenciada"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="text-lg font-semibold">
                    {selectedProject.status === "planejamento" && "Planejamento"}
                    {selectedProject.status === "em_andamento" && "Em Andamento"}
                    {selectedProject.status === "concluido" && "Concluído"}
                    {selectedProject.status === "pausado" && "Pausado"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Alocado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {allocationMode === "percentage"
                    ? `${totalAllocatedHours.toFixed(1)}%`
                    : `${totalAllocatedHours} h`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {allocationMode === "percentage" ? "percentual" : "horas/mês"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Andamento Previsto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedProject.plannedProgress}%</div>
                <Progress value={selectedProject.plannedProgress} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Andamento Realizado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedProject.actualProgress}%</div>
                <Progress value={selectedProject.actualProgress} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Alocação por Tipo de Profissional</CardTitle>
                <CardDescription>
                  {allocationMode === "percentage" 
                    ? "Distribuição de percentual por especialidade" 
                    : "Distribuição de horas por especialidade"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allocLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : allocationByTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={allocationByTypeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="hours" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Nenhuma alocação cadastrada
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Andamento: Previsto vs Realizado</CardTitle>
                <CardDescription>Comparação de andamento do projeto</CardDescription>
              </CardHeader>
              <CardContent>
                {projLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="previsto" fill="#f59e0b" name="Previsto" />
                      <Bar dataKey="realizado" fill="#10b981" name="Realizado" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Colaboradores Alocados */}
          <Card>
            <CardHeader>
              <CardTitle>Colaboradores Alocados</CardTitle>
              <CardDescription>Todos os colaboradores alocados a este projeto</CardDescription>
            </CardHeader>
            <CardContent>
              {allocLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>{allocationMode === "percentage" ? "Percentual" : "Horas Alocadas"}</TableHead>
                        <TableHead>Data de Início</TableHead>
                        <TableHead>Data de Fim</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectAllocations && projectAllocations.length > 0 ? (
                        projectAllocations.map((alloc) => {
                          const emp = employees?.find(e => e.id === alloc.employeeId);
                          return (
                            <TableRow key={alloc.id}>
                              <TableCell className="font-medium">{emp?.name || "-"}</TableCell>
                              <TableCell>
                                {emp?.type.charAt(0).toUpperCase()}
                                {emp?.type.slice(1)}
                              </TableCell>
                              <TableCell>
                                {allocationMode === "percentage"
                                  ? (alloc.allocatedPercentage ? `${parseFloat(String(alloc.allocatedPercentage)).toFixed(2)}%` : "-")
                                  : `${alloc.allocatedHours}h`}
                              </TableCell>
                              <TableCell>
                                {new Date(alloc.startDate).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell>
                                {alloc.endDate ? new Date(alloc.endDate).toLocaleDateString('pt-BR') : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Nenhum colaborador alocado a este projeto
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

