import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"];

export default function Dashboard() {
  const { data: allocations, isLoading: allocLoading } = trpc.allocations.list.useQuery();
  const { data: employees, isLoading: empLoading } = trpc.employees.list.useQuery();
  const { data: projects, isLoading: projLoading } = trpc.projects.list.useQuery();

  const isLoading = allocLoading || empLoading || projLoading;

  // Calcular estatísticas
  const totalCapacity = employees?.reduce((sum, emp) => sum + emp.monthlyCapacityHours, 0) || 0;
  const totalAllocated = allocations?.reduce((sum, alloc) => sum + alloc.allocatedHours, 0) || 0;
  const utilizationRate = totalCapacity > 0 ? ((totalAllocated / totalCapacity) * 100).toFixed(1) : 0;

  // Distribuição por tipo de profissional
  const employeesByType = employees?.reduce((acc: Record<string, number>, emp) => {
    acc[emp.type] = (acc[emp.type] || 0) + 1;
    return acc;
  }, {}) || {};

  const employeeTypeData = Object.entries(employeesByType).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
  }));

  // Distribuição por projeto
  const allocationByProject = allocations?.reduce((acc: Record<number, number>, alloc) => {
    acc[alloc.projectId] = (acc[alloc.projectId] || 0) + alloc.allocatedHours;
    return acc;
  }, {}) || {};

  const projectData = projects?.map((proj) => ({
    name: proj.name,
    hours: allocationByProject[proj.id] || 0,
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Visão geral do uso do time</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacidade Total</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalCapacity} h</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">horas/mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alocado</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalAllocated} h</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">horas/mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Utilização</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{utilizationRate}%</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">do total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{employees?.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo de Profissional</CardTitle>
            <CardDescription>Quantidade de colaboradores por especialidade</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : employeeTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={employeeTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {employeeTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alocação por Projeto</CardTitle>
            <CardDescription>Horas alocadas em cada projeto</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : projectData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projectData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

