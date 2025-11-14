import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";

const PROJECT_TYPES = [
  { value: "sustentacao", label: "Sustentação" },
  { value: "escopo_fechado", label: "Escopo Fechado" },
  { value: "squad_gerenciada", label: "Squad Gerenciada" },
];

const PROJECT_STATUS = [
  { value: "planejamento", label: "Planejamento" },
  { value: "discovery", label: "Discovery" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "homologacao", label: "Homologação" },
  { value: "delivery", label: "Delivery" },
  { value: "go_live", label: "Go Live" },
  { value: "concluido", label: "Concluído" },
  { value: "pausado", label: "Pausado" },
];

export default function Projects() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    clientId: 0,
    type: "escopo_fechado" as const,
    managerId: 0,
    startDate: "",
    plannedEndDate: "",
    plannedProgress: 0,
    actualProgress: 0,
    status: "planejamento" as const,
  });

  const { data: projects, isLoading: projLoading, refetch } = trpc.projects.list.useQuery();
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    const query = searchQuery.toLowerCase();
    return projects.filter((proj: any) => {
      const clientName = clients?.find((c: any) => c.id === proj.clientId)?.name || "";
      const clientCompany = clients?.find((c: any) => c.id === proj.clientId)?.company || "";
      return (
        proj.name.toLowerCase().includes(query) ||
        clientName.toLowerCase().includes(query) ||
        clientCompany.toLowerCase().includes(query)
      );
    }).sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [projects, searchQuery, clients]);

  // Dados para o gráfico de andamento dos projetos
  const projectProgressData = projects?.map((proj) => ({
    name: proj.name,
    previsto: proj.plannedProgress || 0,
    realizado: proj.actualProgress || 0,
  })) || [];

  // Função para determinar a cor do bullet baseado na comparação
  const getBulletColor = (previsto: number, realizado: number): string => {
    if (realizado < previsto) return '#ef4444'; // Vermelho
    if (realizado === previsto) return '#f59e0b'; // Laranja
    return '#10b981'; // Verde
  };

  // Componente customizado para o label do XAxis com bullet
  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const data = projectProgressData.find((p) => p.name === payload.value);
    const bulletColor = data ? getBulletColor(data.previsto, data.realizado) : '#6b7280';
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="end" fill="#666" transform="rotate(-90)">
          <tspan fill={bulletColor}>● </tspan>
          {payload.value}
        </text>
      </g>
    );
  };
  
  const createMutation = trpc.projects.create.useMutation();
  const updateMutation = trpc.projects.update.useMutation();
  const deleteMutation = trpc.projects.delete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (formData.plannedProgress < 0 || formData.actualProgress < 0) {
        toast.error("Progresso previsto e realizado não podem ser negativos");
        return;
      }
      
      const data: any = {
        name: formData.name,
        clientId: formData.clientId,
        type: formData.type,
        managerId: formData.managerId || undefined,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        plannedEndDate: formData.plannedEndDate ? new Date(formData.plannedEndDate) : undefined,
        plannedProgress: formData.plannedProgress,
        actualProgress: formData.actualProgress,
        status: formData.status,
      };

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...data });
        toast.success("Projeto atualizado com sucesso");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Projeto criado com sucesso");
      }
      setFormData({ name: "", clientId: 0, type: "escopo_fechado", managerId: 0, startDate: "", plannedEndDate: "", plannedProgress: 0, actualProgress: 0, status: "planejamento" });
      setEditingId(null);
      setOpen(false);
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar projeto");
    }
  };

  const handleEdit = (project: any) => {
    setFormData({
      name: project.name,
      clientId: project.clientId,
      type: project.type,
      managerId: project.managerId || 0,
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "",
      plannedEndDate: project.plannedEndDate ? new Date(project.plannedEndDate).toISOString().split('T')[0] : "",
      plannedProgress: project.plannedProgress,
      actualProgress: project.actualProgress || 0,
      status: project.status || "planejamento",
    });
    setEditingId(project.id);
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja deletar este projeto? Esta ação não pode ser desfeita.")) {
      return;
    }
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Projeto deletado com sucesso");
      refetch();
    } catch (error) {
      toast.error("Erro ao deletar projeto");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground mt-2">Gerenciar projetos da fábrica</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingId(null); setFormData({ name: "", clientId: 0, type: "escopo_fechado", managerId: 0, startDate: "", plannedEndDate: "", plannedProgress: 0, actualProgress: 0, status: "planejamento" }); }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Atualize os dados do projeto" : "Preencha os dados do novo projeto"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Nome do projeto"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="plannedProgress">Progresso Previsto (%) *</Label>
                  <Input
                    id="plannedProgress"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.plannedProgress}
                    onChange={(e) => {
                      let value = parseInt(e.target.value) || 0;
                      value = Math.max(0, Math.min(100, value));
                      setFormData({ ...formData, plannedProgress: value });
                    }}
                    required
                    placeholder="0-100"
                  />
                </div>
                <div>
                  <Label htmlFor="actualProgress">Progresso Realizado (%) *</Label>
                  <Input
                    id="actualProgress"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.actualProgress}
                    onChange={(e) => {
                      let value = parseInt(e.target.value) || 0;
                      value = Math.max(0, Math.min(100, value));
                      setFormData({ ...formData, actualProgress: value });
                    }}
                    required
                    placeholder="0-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientId">Cliente *</Label>                  <Select value={formData.clientId.toString()} onValueChange={(value) => setFormData({ ...formData, clientId: parseInt(value) })}>
                    <SelectTrigger id="clientId">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">Tipo *</Label>
                  <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="managerId">Gerente de Projeto</Label>
                <Select value={formData.managerId.toString()} onValueChange={(value) => setFormData({ ...formData, managerId: parseInt(value) })}>
                  <SelectTrigger id="managerId">
                    <SelectValue placeholder="Selecione um gerente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Nenhum</SelectItem>
                    {employees?.filter(e => e.type === "manager").sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="plannedEndDate">Data de Fim Prevista</Label>
                  <Input
                    id="plannedEndDate"
                    type="date"
                    value={formData.plannedEndDate}
                    onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status">Status do Projeto *</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Atualizar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Gráfico de Andamento dos Projetos */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-3">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <CardTitle>Andamento dos Projetos</CardTitle>
                <CardDescription>
                  Comparação entre progresso previsto e realizado por projeto
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                  <span className="text-sm text-muted-foreground">Previsto</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
                  <span className="text-sm text-muted-foreground">Realizado</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {projLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : projectProgressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={480}>
                <BarChart data={projectProgressData} margin={{ bottom: 100, top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-90} 
                    textAnchor="end" 
                    height={100}
                    tick={<CustomXAxisTick />}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="previsto" fill="#3b82f6" name="Previsto">
                    <LabelList 
                      dataKey="previsto" 
                      position="top" 
                      formatter={(value: number) => `${value}%`}
                      style={{ fontSize: '12px', fill: '#374151' }}
                    />
                  </Bar>
                  <Bar dataKey="realizado" fill="#10b981" name="Realizado">
                    <LabelList 
                      dataKey="realizado" 
                      position="top" 
                      formatter={(value: number) => `${value}%`}
                      style={{ fontSize: '12px', fill: '#374151' }}
                    />
                  </Bar>
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

      <Card>
        <CardHeader>
          <CardTitle>Lista de Projetos</CardTitle>
          <CardDescription>Todos os projetos cadastrados no sistema</CardDescription>
          <div className="mt-4">
            <Input
              placeholder="Buscar por nome do projeto, empresa ou cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {projLoading ? (
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Gerente de Projeto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Andamento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects && filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>
                          {clients?.find(c => c.id === project.clientId)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {employees?.find(e => e.id === project.managerId)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {PROJECT_STATUS.find((s) => s.value === project.status)?.label || project.status}
                        </TableCell>
                        <TableCell>{project.actualProgress}%</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(project)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(project.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum projeto cadastrado
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

