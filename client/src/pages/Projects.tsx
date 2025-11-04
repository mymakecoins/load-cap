import { useState } from "react";
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
                    onChange={(e) => setFormData({ ...formData, plannedProgress: Math.max(0, parseInt(e.target.value) || 0) })}
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
                    onChange={(e) => setFormData({ ...formData, actualProgress: Math.max(0, parseInt(e.target.value) || 0) })}
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

      <Card>
        <CardHeader>
          <CardTitle>Lista de Projetos</CardTitle>
          <CardDescription>Todos os projetos cadastrados no sistema</CardDescription>
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Andamento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects && projects.length > 0 ? (
                    projects.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>
                          {clients?.find(c => c.id === project.clientId)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {PROJECT_TYPES.find((t) => t.value === project.type)?.label || project.type}
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

