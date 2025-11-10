import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function getMonthDates() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return {
    start: firstDay.toISOString().split('T')[0],
    end: lastDay.toISOString().split('T')[0],
  };
}

export default function AllocationHistory() {
  const monthDates = getMonthDates();
  const [filterEmployeeId, setFilterEmployeeId] = useState<number | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(monthDates.start);
  const [endDate, setEndDate] = useState(monthDates.end);

  const { data: employees } = trpc.employees.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  
  // Buscar histórico do colaborador selecionado (sem filtro de projeto) para obter lista de projetos disponíveis
  const { data: employeeHistory } = trpc.allocations.getHistory.useQuery(
    filterEmployeeId ? { employeeId: filterEmployeeId } : undefined,
    { enabled: !!filterEmployeeId } // Só busca se tiver colaborador selecionado
  );
  
  // Passar filtros para a query do histórico principal
  const { data: history, isLoading } = trpc.allocations.getHistory.useQuery({
    employeeId: filterEmployeeId || undefined,
    projectId: filterProjectId || undefined,
  });
  const { data: allocationMode } = trpc.settings.getAllocationMode.useQuery();

  // Limpar projeto quando colaborador mudar
  useEffect(() => {
    if (!filterEmployeeId && filterProjectId) {
      setFilterProjectId(null);
    }
  }, [filterEmployeeId, filterProjectId]);
  
  // Filtrar histórico (agora apenas por período, pois employeeId e projectId já vêm filtrados do backend)
  let filteredHistory = history || [];
  
  // Filtrar projetos disponíveis baseado no colaborador selecionado
  const availableProjects = filterEmployeeId && employeeHistory
    ? employeeHistory
        .map((h: any) => h.projectId)
        .filter((id: number, index: number, self: number[]) => self.indexOf(id) === index) // Remover duplicatas
        .map((projectId: number) => projects?.find((p) => p.id === projectId))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    : projects || [];
  
  // Filtrar por período da alocação (não pela data de criação do registro)
  if (startDate || endDate) {
    const filterStart = startDate ? new Date(startDate) : null;
    if (filterStart) filterStart.setHours(0, 0, 0, 0);
    
    const filterEnd = endDate ? new Date(endDate) : null;
    if (filterEnd) filterEnd.setHours(23, 59, 59, 999);
    
    filteredHistory = filteredHistory.filter((h: any) => {
      const allocStart = new Date(h.startDate);
      allocStart.setHours(0, 0, 0, 0);
      
      // Se a alocação não tem data fim, considerar como data máxima
      const allocEnd = h.endDate ? new Date(h.endDate) : new Date('2099-12-31');
      allocEnd.setHours(23, 59, 59, 999);
      
      // Verificar sobreposição: dois períodos se sobrepõem se:
      // start1 <= end2 && start2 <= end1
      const filterStartTime = filterStart ? filterStart.getTime() : 0;
      const filterEndTime = filterEnd ? filterEnd.getTime() : Number.MAX_SAFE_INTEGER;
      const allocStartTime = allocStart.getTime();
      const allocEndTime = allocEnd.getTime();
      
      // Sobreposição ocorre se: allocStart <= filterEnd && filterStart <= allocEnd
      return allocStartTime <= filterEndTime && filterStartTime <= allocEndTime;
    });
  }

  // Agrupar por data para gráfico baseado no modo configurado
  const historyByDate: Record<string, number> = {};
  filteredHistory.forEach((h: any) => {
    const date = new Date(h.createdAt).toLocaleDateString('pt-BR');
    const value = allocationMode === "percentage"
      ? (h.allocatedPercentage ? parseFloat(String(h.allocatedPercentage)) : 0)
      : h.allocatedHours;
    historyByDate[date] = (historyByDate[date] || 0) + value;
  });

  const chartData = Object.entries(historyByDate).map(([date, value]) => ({
    date,
    value,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Histórico de Alocações</h1>
        <p className="text-muted-foreground mt-2">Visualizar histórico completo de mudanças em alocações</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre o histórico por colaborador, projeto e período</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="employee-filter">Colaborador</Label>
              <div className="flex gap-2">
                <Select 
                  value={filterEmployeeId?.toString() || undefined} 
                  onValueChange={(value) => {
                    const newEmployeeId = value ? parseInt(value) : null;
                    setFilterEmployeeId(newEmployeeId);
                    // Limpar projeto quando colaborador mudar
                    if (!newEmployeeId) {
                      setFilterProjectId(null);
                    }
                  }}
                >
                  <SelectTrigger id="employee-filter" className="flex-1">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filterEmployeeId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setFilterEmployeeId(null);
                      setFilterProjectId(null);
                    }}
                    title="Limpar colaborador"
                  >
                    ×
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="project-filter">Projeto</Label>
              <div className="flex gap-2">
                <Select 
                  value={filterProjectId?.toString() || undefined} 
                  onValueChange={(value) => setFilterProjectId(value ? parseInt(value) : null)}
                  disabled={!filterEmployeeId}
                >
                  <SelectTrigger id="project-filter" className="flex-1">
                    <SelectValue placeholder={filterEmployeeId ? "Todos" : "Selecione um colaborador primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProjects.map((proj) => (
                      <SelectItem key={proj.id} value={proj.id.toString()}>
                        {proj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filterProjectId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setFilterProjectId(null)}
                    title="Limpar projeto"
                    disabled={!filterEmployeeId}
                  >
                    ×
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="start-date">Data Início</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="end-date">Data Fim</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Mudanças ao Longo do Tempo</CardTitle>
          <CardDescription>
            {allocationMode === "percentage" 
              ? "Percentual de alocação alterado por dia" 
              : "Horas de alocação alteradas por dia"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  name={allocationMode === "percentage" ? "Percentual Alterado" : "Horas Alteradas"} 
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Detalhado</CardTitle>
          <CardDescription>Todas as mudanças em alocações</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Tipo de Mudança</TableHead>
                    <TableHead>{allocationMode === "percentage" ? "Percentual" : "Horas Alteradas"}</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory && filteredHistory.length > 0 ? (
                    filteredHistory.map((record: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {new Date(record.createdAt).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {employees?.find(e => e.id === record.employeeId)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {projects?.find(p => p.id === record.projectId)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {record.action === "created" && "Criado"}
                          {record.action === "updated" && "Atualizado"}
                          {record.action === "deleted" && "Removido"}
                        </TableCell>
                        <TableCell>
                          {allocationMode === "percentage"
                            ? (record.allocatedPercentage ? `${parseFloat(String(record.allocatedPercentage)).toFixed(2)}%` : "-")
                            : `${record.allocatedHours}h`}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          -
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum histórico encontrado
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
  );
}

