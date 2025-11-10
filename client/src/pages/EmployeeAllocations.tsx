import { useState, useRef, useEffect } from "react";
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
  const allocationDataRef = useRef<HTMLDivElement>(null);

  const { data: employees, isLoading: empLoading } = trpc.employees.list.useQuery();
  const { data: allocations, isLoading: allocLoading } = trpc.allocations.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: allocationMode } = trpc.settings.getAllocationMode.useQuery();

  // Scroll automático quando um colaborador é selecionado
  useEffect(() => {
    if (selectedEmployeeId && allocationDataRef.current) {
      setTimeout(() => {
        allocationDataRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  }, [selectedEmployeeId]);

  // Filtrar colaboradores por tipo se selecionado
  let filteredEmployees = employees || [];
  if (selectedEmployeeType) {
    filteredEmployees = filteredEmployees.filter(e => e.type === selectedEmployeeType);
  }

  // Calcular taxa de utilização para cada colaborador
  const employeeUtilization = filteredEmployees.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(emp => {
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
    
    // Calcular total alocado baseado no modo configurado
    const totalAllocated = allocationMode === "percentage" 
      ? empAllocations.reduce((sum, a) => {
          const percentage = a.allocatedPercentage ? parseFloat(String(a.allocatedPercentage)) : 0;
          return sum + percentage;
        }, 0)
      : empAllocations.reduce((sum, a) => sum + a.allocatedHours, 0);
    const monthlyCapacity = emp.monthlyCapacityHours || 0;
    const utilizationRate = allocationMode === "percentage"
      ? totalAllocated // Já é percentual
      : monthlyCapacity > 0 ? ((totalAllocated / monthlyCapacity) * 100) : 0;
    
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

  // Calcular estatísticas do colaborador baseado no modo configurado
  const totalAllocated = allocationMode === "percentage"
    ? employeeAllocations.reduce((sum, a) => {
        const percentage = a.allocatedPercentage ? parseFloat(String(a.allocatedPercentage)) : 0;
        return sum + percentage;
      }, 0)
    : employeeAllocations.reduce((sum, a) => sum + a.allocatedHours, 0);
  const monthlyCapacity = selectedEmployee?.monthlyCapacityHours || 0;
  const utilizationRate = allocationMode === "percentage"
    ? totalAllocated.toFixed(1) // Já é percentual
    : monthlyCapacity > 0 ? ((totalAllocated / monthlyCapacity) * 100).toFixed(1) : 0;
  const availableHours = allocationMode === "percentage"
    ? (100 - totalAllocated).toFixed(1) // Percentual disponível
    : monthlyCapacity - totalAllocated;

  // Dados para gráfico de alocação - agrupar por projeto e somar valores
  const allocationByProject: Record<number, number> = {};
  employeeAllocations.forEach(alloc => {
    const value = allocationMode === "percentage"
      ? (alloc.allocatedPercentage ? parseFloat(String(alloc.allocatedPercentage)) : 0)
      : alloc.allocatedHours;
    allocationByProject[alloc.projectId] = (allocationByProject[alloc.projectId] || 0) + value;
  });

  const allocationChartData = Object.entries(allocationByProject).map(([projectId, totalValue]) => ({
    name: projects?.find(p => p.id === parseInt(projectId))?.name || `Projeto ${projectId}`,
    value: totalValue,
  }));

  // Dados para gráfico de capacidade
  const capacityData = [
    { name: "Alocado", value: allocationMode === "percentage" ? totalAllocated : totalAllocated },
    { name: "Disponível", value: Math.max(0, parseFloat(availableHours.toString())) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alocação por Colaborador</h1>
        <p className="text-muted-foreground mt-2">Visualizar alocação individual de cada colaborador</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre colaboradores por período e tipo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div>
              <label className="text-sm font-medium">Tipo de Colaborador</label>
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
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePresetWeek(0)}>
              Semana Atual
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePresetWeek(1)}>
              Próxima Semana
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setStartDate(""); setEndDate(""); setSelectedEmployeeType(""); }}>
              Limpar Filtros
            </Button>
          </div>
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
        <div ref={allocationDataRef}>
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
                <div className="text-2xl font-bold">
                  {allocationMode === "percentage" 
                    ? `${totalAllocated.toFixed(1)}%` 
                    : `${totalAllocated} h`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {allocationMode === "percentage" ? "percentual" : "horas/mês"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disponível</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {allocationMode === "percentage" 
                    ? `${availableHours}%` 
                    : `${availableHours} h`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {allocationMode === "percentage" ? "percentual" : "horas/mês"}
                </p>
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
                <CardDescription>
                  {allocationMode === "percentage" ? "Percentual alocado em cada projeto" : "Horas alocadas em cada projeto"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allocLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : allocationChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={allocationChartData} margin={{ bottom: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-90} 
                        textAnchor="end" 
                        height={100}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" />
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
                        <TableHead>{allocationMode === "percentage" ? "Percentual" : "Horas Alocadas"}</TableHead>
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
        </div>
      )}
    </div>
  );
}

