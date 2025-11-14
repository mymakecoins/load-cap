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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

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
  const [filterChangedBy, setFilterChangedBy] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(monthDates.start);
  const [endDate, setEndDate] = useState(monthDates.end);
  const [searchComment, setSearchComment] = useState("");
  const [revertingId, setRevertingId] = useState<number | null>(null);
  const [revertComment, setRevertComment] = useState("");

  const { data: employees } = trpc.employees.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  // Buscar histórico do colaborador selecionado (sem filtro de projeto) para obter lista de projetos disponíveis
  const { data: employeeHistory } = trpc.allocations.getHistory.useQuery(
    filterEmployeeId ? { employeeId: filterEmployeeId } : undefined,
    { enabled: !!filterEmployeeId } // Só busca se tiver colaborador selecionado
  );
  
  // Passar filtros para a query do histórico principal
  const { data: history, isLoading, refetch } = trpc.allocations.getHistory.useQuery({
    employeeId: filterEmployeeId || undefined,
    projectId: filterProjectId || undefined,
  });
  const { data: allocationMode } = trpc.settings.getAllocationMode.useQuery();
  const revertMutation = trpc.allocations.revert.useMutation();

  // Função para verificar se é coordenador
  const isCoordinator = (role: string) => role === "coordinator" || role === "admin";

  // Função para verificar se pode reverter
  const canRevert = (record: any) => {
    return !record.action.startsWith("reverted") && isCoordinator(user?.role || "");
  };

  // Função para reverter
  const handleRevert = async () => {
    if (!revertingId) return;
    
    try {
      await revertMutation.mutateAsync({
        historyId: revertingId,
        comment: revertComment || undefined,
      });
      
      toast.success("Mudança revertida com sucesso");
      setRevertingId(null);
      setRevertComment("");
      // Recarregar histórico
      await refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao reverter mudança");
    }
  };

  // Função para obter label do tipo de ação
  const getActionLabel = (action: string) => {
    switch (action) {
      case "created":
        return "Alocação";
      case "updated":
        return "Atualização";
      case "deleted":
        return "Remoção";
      case "reverted_creation":
        return "Revertido: Criação";
      case "reverted_update":
        return "Revertido: Atualização";
      case "reverted_deletion":
        return "Revertido: Deleção";
      default:
        return action;
    }
  };

  // Limpar projeto quando colaborador mudar
  useEffect(() => {
    if (!filterEmployeeId && filterProjectId) {
      setFilterProjectId(null);
    }
  }, [filterEmployeeId, filterProjectId]);
  
  // Filtrar histórico (agora apenas por período, pois employeeId e projectId já vêm filtrados do backend)
  let filteredHistory = history || [];
  
  // Filtrar por comentário
  if (searchComment) {
    filteredHistory = filteredHistory.filter((h: any) =>
      h.comment?.toLowerCase().includes(searchComment.toLowerCase())
    );
  }
  
  // Filtrar por usuário que fez a mudança
  if (filterChangedBy) {
    filteredHistory = filteredHistory.filter(
      (h: any) => h.changedBy === filterChangedBy
    );
  }
  
  // Filtrar projetos disponíveis baseado no colaborador selecionado
  const availableProjects = filterEmployeeId && employeeHistory
    ? employeeHistory
        .map((h: any) => h.projectId)
        .filter((id: number, index: number, self: number[]) => self.indexOf(id) === index) // Remover duplicatas
        .map((projectId: number) => projects?.find((p) => p.id === projectId))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    : projects || [];
  
  // Obter lista de usuários únicos que fizeram mudanças
  const changedByUsers = Array.from(
    new Map(
      (history || []).map((h: any) => [
        h.changedBy, 
        { 
          id: h.changedBy, 
          name: h.changedByName || "Usuário deletado",
          email: h.changedByEmail || "-"
        }
      ])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  
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

  // Ordenar histórico por data de criação (mais antigo primeiro) antes de agrupar
  const sortedHistory = [...filteredHistory].sort((a: any, b: any) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Agrupar por data para gráfico baseado no modo configurado
  const historyByDate: Record<string, number> = {};
  sortedHistory.forEach((h: any) => {
    const date = new Date(h.createdAt).toLocaleDateString('pt-BR');
    const value = allocationMode === "percentage"
      ? (h.allocatedPercentage ? parseFloat(String(h.allocatedPercentage)) : 0)
      : h.allocatedHours;
    historyByDate[date] = (historyByDate[date] || 0) + value;
  });

  // Converter para array e ordenar por data (mais antigo primeiro)
  // Converter data brasileira (DD/MM/YYYY) para timestamp para ordenação correta
  const chartData = Object.entries(historyByDate)
    .map(([date, value]) => {
      // Converter data brasileira para timestamp
      const [day, month, year] = date.split('/');
      const timestamp = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();
      return { date, value, timestamp };
    })
    .sort((a, b) => a.timestamp - b.timestamp) // Ordenar do mais antigo para o mais recente
    .map(({ timestamp, ...rest }) => rest); // Remover timestamp do objeto final

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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <div className="sm:col-span-2 md:col-span-1 lg:col-span-1">
              <Label htmlFor="comment-search">Buscar por comentário</Label>
              <Input
                id="comment-search"
                placeholder="Buscar por comentário..."
                value={searchComment}
                onChange={(e) => setSearchComment(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="user-filter">Modificado por</Label>
              <Select 
                value={filterChangedBy?.toString() || "all"} 
                onValueChange={(value) => setFilterChangedBy(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger id="user-filter">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {changedByUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                    className="flex-shrink-0"
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
                    className="flex-shrink-0"
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
                <RechartsTooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  name={allocationMode === "percentage" ? "Percentual Alterado" : "Horas Alteradas"}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  activeDot={{ r: 6 }}
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
                    <TableHead>Modificado por</TableHead>
                    <TableHead>{allocationMode === "percentage" ? "Percentual" : "Horas Alteradas"}</TableHead>
                    <TableHead>Comentário</TableHead>
                    <TableHead>Ações</TableHead>
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
                          {getActionLabel(record.action)}
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">
                                {record.changedByName || "Usuário deletado"}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{record.changedByEmail || "-"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {allocationMode === "percentage"
                            ? (record.allocatedPercentage ? `${parseFloat(String(record.allocatedPercentage)).toFixed(2)}%` : "-")
                            : `${record.allocatedHours}h`}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {record.comment ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate cursor-help block">
                                  {record.comment}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-sm">{record.comment}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {canRevert(record) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRevertingId(record.id)}
                              title="Reverter esta mudança"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
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

      {/* Dialog de confirmação de reversão */}
      <AlertDialog open={revertingId !== null} onOpenChange={(open) => !open && setRevertingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverter Mudança?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação desfará a mudança anterior. Uma nova entrada será criada no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="revert-comment">Comentário (opcional)</Label>
            <Textarea
              id="revert-comment"
              placeholder="Por que está revertendo esta mudança?"
              value={revertComment}
              onChange={(e) => setRevertComment(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {revertComment.length}/500 caracteres
            </p>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevert} 
              disabled={revertMutation.isPending}
            >
              {revertMutation.isPending ? "Revertendo..." : "Reverter"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

