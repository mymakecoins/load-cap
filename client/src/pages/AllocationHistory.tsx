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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function AllocationHistory() {
  const [filterEmployeeId, setFilterEmployeeId] = useState<number | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: employees } = trpc.employees.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: history, isLoading } = trpc.allocations.getHistory.useQuery();

  // Filtrar histórico
  let filteredHistory = history || [];
  
  if (filterEmployeeId) {
    filteredHistory = filteredHistory.filter((h: any) => h.employeeId === filterEmployeeId);
  }
  
  if (filterProjectId) {
    filteredHistory = filteredHistory.filter((h: any) => h.projectId === filterProjectId);
  }
  
  if (startDate) {
    const start = new Date(startDate);
    filteredHistory = filteredHistory.filter((h: any) => new Date(h.timestamp) >= start);
  }
  
  if (endDate) {
    const end = new Date(endDate);
    filteredHistory = filteredHistory.filter((h: any) => new Date(h.timestamp) <= end);
  }

  // Agrupar por data para gráfico
  const historyByDate: Record<string, number> = {};
  filteredHistory.forEach((h: any) => {
    const date = new Date(h.timestamp).toLocaleDateString('pt-BR');
    historyByDate[date] = (historyByDate[date] || 0) + h.hoursChanged;
  });

  const chartData = Object.entries(historyByDate).map(([date, hours]) => ({
    date,
    hours,
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
              <Select 
                value={filterEmployeeId?.toString() || ""} 
                onValueChange={(value) => setFilterEmployeeId(value ? parseInt(value) : null)}
              >
                <SelectTrigger id="employee-filter">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="project-filter">Projeto</Label>
              <Select 
                value={filterProjectId?.toString() || ""} 
                onValueChange={(value) => setFilterProjectId(value ? parseInt(value) : null)}
              >
                <SelectTrigger id="project-filter">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {projects?.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id.toString()}>
                      {proj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <CardDescription>Horas de alocação alteradas por dia</CardDescription>
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
                <Line type="monotone" dataKey="hours" stroke="#3b82f6" name="Horas Alteradas" />
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
                    <TableHead>Horas Alteradas</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory && filteredHistory.length > 0 ? (
                    filteredHistory.map((record: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {new Date(record.timestamp).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {employees?.find(e => e.id === record.employeeId)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {projects?.find(p => p.id === record.projectId)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {record.changeType === "allocation" && "Alocação"}
                          {record.changeType === "update" && "Atualização"}
                          {record.changeType === "removal" && "Remoção"}
                        </TableCell>
                        <TableCell>{record.hoursChanged}h</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {record.notes || "-"}
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

