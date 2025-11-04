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

export default function Allocations() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    employeeId: 0,
    projectId: 0,
    allocatedHours: 0,
    startDate: "",
    endDate: "",
  });

  const { data: allocations, isLoading: allocLoading, refetch } = trpc.allocations.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  
  const createMutation = trpc.allocations.create.useMutation();
  const updateMutation = trpc.allocations.update.useMutation();
  const deleteMutation = trpc.allocations.delete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data: any = {
        employeeId: formData.employeeId,
        projectId: formData.projectId,
        allocatedHours: formData.allocatedHours,
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      };

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, allocatedHours: data.allocatedHours, endDate: data.endDate });
        toast.success("Alocação atualizada com sucesso");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Alocação criada com sucesso");
      }
      setFormData({ employeeId: 0, projectId: 0, allocatedHours: 0, startDate: "", endDate: "" });
      setEditingId(null);
      setOpen(false);
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar alocação");
    }
  };

  const handleEdit = (allocation: any) => {
    setFormData({
      employeeId: allocation.employeeId,
      projectId: allocation.projectId,
      allocatedHours: allocation.allocatedHours,
      startDate: new Date(allocation.startDate).toISOString().split('T')[0],
      endDate: allocation.endDate ? new Date(allocation.endDate).toISOString().split('T')[0] : "",
    });
    setEditingId(allocation.id);
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja deletar esta alocação? Esta ação não pode ser desfeita.")) {
      return;
    }
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Alocação deletada com sucesso");
      refetch();
    } catch (error) {
      toast.error("Erro ao deletar alocação");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alocações</h1>
          <p className="text-muted-foreground mt-2">Gerenciar alocação de colaboradores em projetos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingId(null); setFormData({ employeeId: 0, projectId: 0, allocatedHours: 0, startDate: "", endDate: "" }); }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Alocação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Alocação" : "Nova Alocação"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Atualize os dados da alocação" : "Preencha os dados da nova alocação"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employeeId">Colaborador *</Label>
                  <Select value={formData.employeeId > 0 ? formData.employeeId.toString() : ""} onValueChange={(value) => setFormData({ ...formData, employeeId: parseInt(value) })}>
                    <SelectTrigger id="employeeId">
                      <SelectValue placeholder="Selecione um colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="projectId">Projeto *</Label>
                  <Select value={formData.projectId > 0 ? formData.projectId.toString() : ""} onValueChange={(value) => setFormData({ ...formData, projectId: parseInt(value) })}>
                    <SelectTrigger id="projectId">
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map((proj) => (
                        <SelectItem key={proj.id} value={proj.id.toString()}>
                          {proj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="allocatedHours">Horas Alocadas *</Label>
                <Input
                  id="allocatedHours"
                  type="number"
                  min="1"
                  value={formData.allocatedHours}
                  onChange={(e) => setFormData({ ...formData, allocatedHours: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Data de Início *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Data de Fim</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
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
          <CardTitle>Lista de Alocações</CardTitle>
          <CardDescription>Todas as alocações de colaboradores em projetos</CardDescription>
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
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Data de Início</TableHead>
                    <TableHead>Data de Fim</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations && allocations.length > 0 ? (
                    allocations.map((alloc) => (
                      <TableRow key={alloc.id}>
                        <TableCell className="font-medium">
                          {employees?.find(e => e.id === alloc.employeeId)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {projects?.find(p => p.id === alloc.projectId)?.name || "-"}
                        </TableCell>
                        <TableCell>{alloc.allocatedHours}h</TableCell>
                        <TableCell>
                          {new Date(alloc.startDate).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {alloc.endDate ? new Date(alloc.endDate).toLocaleDateString('pt-BR') : "-"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(alloc)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(alloc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma alocação cadastrada
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

