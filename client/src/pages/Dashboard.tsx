import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Label } from "recharts";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

// Custom tooltip to show absolute values
const CustomTooltip = (props: any) => {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-300 rounded shadow">
        <p className="text-sm font-semibold">{payload[0].payload.name}</p>
        <p className="text-sm">{payload[0].value} colaboradores</p>
      </div>
    );
  }
  return null;
};

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

  const typeLabels: Record<string, string> = {
    frontend: "Frontend",
    mobile: "Mobile",
    backend: "Backend",
    fullstack: "Fullstack",
    qa: "QA",
    manager: "Gerente",
    requirements_analyst: "A. Requisitos",
  };

  const totalEmployees = Object.values(employeesByType).reduce((sum, count) => sum + count, 0);
  const employeeTypeData = Object.entries(employeesByType).map(([type, count]) => {
    const pct = totalEmployees > 0 ? parseFloat(((count / totalEmployees) * 100).toFixed(1)) : 0;
    return {
      name: typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      percentage: pct,
    };
  });

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
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo de Profissional</CardTitle>
            <CardDescription>Quantidade de colaboradores por especialidade</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : employeeTypeData.length > 0 ? (
              <div className="relative">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={employeeTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="absolute top-8 left-0 right-0 flex justify-around px-12 pointer-events-none">
                  {employeeTypeData.map((entry: any, index: number) => (
                    <div key={`pct-${index}`} className="text-center text-sm font-bold text-gray-900">
                      {entry.percentage}%
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Alocação por Projeto</CardTitle>
            <CardDescription>Horas alocadas em cada projeto</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : projectData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
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

