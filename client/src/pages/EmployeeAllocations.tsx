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

function getWeekDates(weekOffset: number) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(today.setDate(diff + (weekOffset * 7)));
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  return { start: monday, end: friday };
}

const EMPLOYEE_TYPES = [
  { value: "frontend", label: "Frontend" },
  { value: "mobile", label: "Mobile" },
  { value: "backend", label: "Backend" },
  { value: "fullstack", label: "Fullstack" },
  { value: "qa", label: "QA" },
  { value: "manager", label: "Gerente" },
  { value: "requirements_analyst", label: "Analista de Requisitos" },
];

function getEmployeeTypeLabel(type: string): string {
  return EMPLOYEE_TYPES.find(t => t.value === type)?.label || type;
}

export default function EmployeeAllocations() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedEmployeeType, setSelectedEmployeeType] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: employees, isLoading: empLoading } = trpc.employees.list.useQuery();
  const { data: allocations, isLoading: allocLoading } = trpc.allocations.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();

  // Filtrar colaboradores por tipo se selecionado
  let filteredEmployees = employees || [];
  if (selectedEmployeeType) {
    filteredEmployees = filteredEmployees.filter(e => e.type === selectedEmployeeType);
  }

  // Calcular taxa de utilização para cada colaborador
  const employeeUtilization = filteredEmployees.map(emp => {
    let empAllocations = allocations?.filter(a => a.employeeId === emp.id) || [];
    
    // Filtrar por datas se especificadas
    if (startDate || endDate) {
      empAllocations = empAllocations.filter(a => {
        const allocStart = a.startDate ? new Date(a.startDate) : null;
        if (startDate && allocStart && allocStart < new Date(startDate)) return false;
        if (endDate && allocStart && allocStart > new Date(endDate)) return false;
        return true;
      });
    }
    
    const totalAllocated = empAllocations.reduce((sum, a) => sum + a.allocatedHours, 0);
    const monthlyCapacity = emp.monthlyCapacityHours || 0;
    const utilizationRate = monthlyCapacity > 0 ? ((totalAllocated / monthlyCapacity) * 100) : 0;
    
    // Contar quantidade de projetos unicos
    const uniqueProjects = new Set(empAllocations.map(a => a.projectId)).size;
    
    return {
      ...emp,
      totalAllocated,
      utilizationRate: parseFloat(utilizationRate.toFixed(1)),
      projectCount: uniqueProjects,
    };
  });

  const selectedEmployee = selectedEmployeeId ? employees?.find(e => e.id === selectedEmployeeId) : null;
  let employeeAllocations = selectedEmployeeId 
    ? allocations?.filter(a => a.employeeId === selectedEmployeeId) || []
    : [];
  
  // Filtrar por datas se especificadas
  if (startDate || endDate) {
    employeeAllocations = employeeAllocations.filter(a => {
      const allocStart = a.startDate ? new Date(a.startDate) : null;
      if (startDate && allocStart && allocStart < new Date(startDate)) return false;
      if (endDate && allocStart && allocStart > new Date(endDate)) return false;
      return true;
    });
  }
  
  const handlePresetWeek = (weekOffset: number) => {
    const { start, end } = getWeekDates(weekOffset);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

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

      {/* Filtros de Data */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Período</CardTitle>
          <CardDescription>Selecione um período ou use os presets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Data Início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data Fim</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePresetWeek(0)}>
              Semana Atual
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePresetWeek(1)}>
              Próxima Semana
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setStartDate(""); setEndDate(""); }}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filtro por Tipo de Colaborador */}
      <Card>
        <CardHeader>
          <CardTitle>Filtro por Tipo de Colaborador</CardTitle>
          <CardDescription>Selecione um tipo para filtrar colaboradores</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedEmployeeType} onValueChange={setSelectedEmployeeType}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYEE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabela Prévia de Colaboradores */}
      <Card>
        <CardHeader>
          <CardTitle>Colaboradores</CardTitle>
          <CardDescription>Clique em um colaborador para visualizar os gráficos de alocação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Projetos</TableHead>
                  <TableHead className="text-right">Taxa de Utilização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeUtilization.length > 0 ? (
                  employeeUtilization.map((emp) => (
                    <TableRow
                      key={emp.id}
                      onClick={() => setSelectedEmployeeId(emp.id)}
                      className={`cursor-pointer hover:bg-accent transition-colors ${
                        selectedEmployeeId === emp.id ? "bg-accent" : ""
                      }`}
                    >
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{getEmployeeTypeLabel(emp.type)}</TableCell>
                      <TableCell className="text-right font-semibold">{emp.projectCount}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${
                          emp.utilizationRate > 100 ? "text-red-600" :
                          emp.utilizationRate > 80 ? "text-orange-600" :
                          "text-green-600"
                        }`}>
                          {emp.utilizationRate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum colaborador encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Seletor de Colaborador (Oculto, mantido para compatibilidade) */}
      <Card className="hidden">
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
                    {emp.name} ({getEmployeeTypeLabel(emp.type)})
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

