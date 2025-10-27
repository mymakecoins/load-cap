import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

export default function EmployeeAllocations() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  const { data: employees, isLoading: empLoading } = trpc.employees.list.useQuery();
  const { data: allocations, isLoading: allocLoading } = trpc.allocations.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();

  const selectedEmployee = selectedEmployeeId ? employees?.find(e => e.id === selectedEmployeeId) : null;
  const employeeAllocations = selectedEmployeeId 
    ? allocations?.filter(a => a.employeeId === selectedEmployeeId) || []
    : [];

  // Calcular estatísticas do colaborador
  const totalAllocated = employeeAllocations.reduce((sum, a) => sum + a.allocatedHours, 0);
  const monthlyCapacity = selectedEmployee?.monthlyCapacityHours || 0;
  const utilizationRate = monthlyCapacity > 0 ? ((totalAllocated / monthlyCapacity) * 100).toFixed(1) : 0;
  const availableHours = monthlyCapacity - totalAllocated;

  // Dados para gráfico de alocação
  const allocationChartData = employeeAllocations.map(alloc => ({
    name: projects?.find(p => p.id === alloc.projectId)?.name || `Projeto ${alloc.projectId}`,
    hours: alloc.allocatedHours,
  }));

  // Dados para gráfico de capacidade
  const capacityData = [
    { name: "Alocado", value: totalAllocated },
    { name: "Disponível", value: Math.max(0, availableHours) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alocação por Desenvolvedor</h1>
        <p className="text-muted-foreground mt-2">Visualizar alocação individual de cada colaborador</p>
      </div>

      {/* Seletor de Colaborador */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Colaborador</CardTitle>
          <CardDescription>Escolha um colaborador para visualizar suas alocações</CardDescription>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedEmployeeId?.toString() || ""} 
            onValueChange={(value) => setSelectedEmployeeId(value ? parseInt(value) : null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um colaborador" />
            </SelectTrigger>
            <SelectContent>
              {empLoading ? (
                <SelectItem value="loading" disabled>Carregando...</SelectItem>
              ) : employees && employees.length > 0 ? (
                employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.name} ({emp.type})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="empty" disabled>Nenhum colaborador cadastrado</SelectItem>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedEmployee && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Capacidade Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthlyCapacity} h</div>
                <p className="text-xs text-muted-foreground mt-1">horas/mês</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alocado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAllocated} h</div>
                <p className="text-xs text-muted-foreground mt-1">horas/mês</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disponível</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{availableHours} h</div>
                <p className="text-xs text-muted-foreground mt-1">horas/mês</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Utilização</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{utilizationRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">do total</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Alocação por Projeto</CardTitle>
                <CardDescription>Horas alocadas em cada projeto</CardDescription>
              </CardHeader>
              <CardContent>
                {allocLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : allocationChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={allocationChartData}>
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
                <CardTitle>Capacidade vs Alocação</CardTitle>
                <CardDescription>Comparação de capacidade e alocação</CardDescription>
              </CardHeader>
              <CardContent>
                {allocLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={capacityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Alocações */}
          <Card>
            <CardHeader>
              <CardTitle>Alocações Ativas</CardTitle>
              <CardDescription>Todos os projetos aos quais este colaborador está alocado</CardDescription>
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
                        <TableHead>Projeto</TableHead>
                        <TableHead>Horas Alocadas</TableHead>
                        <TableHead>Data de Início</TableHead>
                        <TableHead>Data de Fim</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeAllocations && employeeAllocations.length > 0 ? (
                        employeeAllocations.map((alloc) => (
                          <TableRow key={alloc.id}>
                            <TableCell className="font-medium">
                              {projects?.find(p => p.id === alloc.projectId)?.name || "-"}
                            </TableCell>
                            <TableCell>{alloc.allocatedHours}h</TableCell>
                            <TableCell>
                              {new Date(alloc.startDate).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              {alloc.endDate ? new Date(alloc.endDate).toLocaleDateString('pt-BR') : "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Nenhuma alocação cadastrada para este colaborador
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

