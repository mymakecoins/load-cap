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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Edit2 } from "lucide-react";
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

// Função para calcular segunda-feira da semana atual
function getMondayCurrentWeek(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday);
  return monday.toISOString().split('T')[0];
}

// Função para calcular sexta-feira da semana atual
function getFridayCurrentWeek(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return friday.toISOString().split('T')[0];
}

// Função para calcular segunda-feira da próxima semana
function getMondayNextWeek(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday + 7);
  return monday.toISOString().split('T')[0];
}

// Função para calcular sexta-feira da próxima semana
function getFridayNextWeek(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday + 7);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return friday.toISOString().split('T')[0];
}

export default function Allocations() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [editComment, setEditComment] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllocationId, setDeleteAllocationId] = useState<number | null>(null);
  const [deleteComment, setDeleteComment] = useState("");
  const [formData, setFormData] = useState({
    employeeId: 0,
    projectId: 0,
    allocatedHours: 0,
    allocatedPercentage: 0,
    startDate: "",
    endDate: "",
  });

  const { data: allocations, isLoading: allocLoading, refetch } = trpc.allocations.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: allocationMode } = trpc.settings.getAllocationMode.useQuery();
  
  const createMutation = trpc.allocations.create.useMutation();
  const updateMutation = trpc.allocations.update.useMutation();
  const deleteMutation = trpc.allocations.delete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data: any = {
        employeeId: formData.employeeId,
        projectId: formData.projectId,
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      };

      // Adicionar campo baseado no modo configurado
      if (allocationMode === "percentage") {
        data.allocatedPercentage = formData.allocatedPercentage;
      } else {
        data.allocatedHours = formData.allocatedHours;
      }

      if (editingId) {
        const updateData: any = { id: editingId, endDate: data.endDate };
        if (allocationMode === "percentage") {
          updateData.allocatedPercentage = formData.allocatedPercentage;
        } else {
          updateData.allocatedHours = formData.allocatedHours;
        }
        if (editComment.trim()) {
          updateData.comment = editComment.trim();
        }
        await updateMutation.mutateAsync(updateData);
        toast.success("Alocação atualizada com sucesso");
        setEditComment("");
      } else {
        if (comment.trim()) {
          data.comment = comment.trim();
        }
        await createMutation.mutateAsync(data);
        toast.success("Alocação criada com sucesso");
        setComment("");
      }
      setFormData({ employeeId: 0, projectId: 0, allocatedHours: 0, allocatedPercentage: 0, startDate: "", endDate: "" });
      setEditingId(null);
      setOpen(false);
      refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || "Erro ao salvar alocação";
      toast.error(errorMessage);
    }
  };

  const handleEdit = (allocation: any) => {
    setFormData({
      employeeId: allocation.employeeId,
      projectId: allocation.projectId,
      allocatedHours: allocation.allocatedHours || 0,
      allocatedPercentage: allocation.allocatedPercentage ? parseFloat(String(allocation.allocatedPercentage)) : 0,
      startDate: new Date(allocation.startDate).toISOString().split('T')[0],
      endDate: allocation.endDate ? new Date(allocation.endDate).toISOString().split('T')[0] : "",
    });
    setEditingId(allocation.id);
    setEditComment("");
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeleteAllocationId(id);
    setDeleteComment("");
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteAllocationId) return;
    
    try {
      const deleteData: any = { id: deleteAllocationId };
      if (deleteComment.trim()) {
        deleteData.comment = deleteComment.trim();
      }
      await deleteMutation.mutateAsync(deleteData);
      toast.success("Alocação deletada com sucesso");
      setDeleteDialogOpen(false);
      setDeleteAllocationId(null);
      setDeleteComment("");
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
            <Button onClick={() => { 
              setEditingId(null); 
              setComment("");
              setFormData({ employeeId: 0, projectId: 0, allocatedHours: 0, allocatedPercentage: 0, startDate: "", endDate: "" }); 
            }}>
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
                      {employees?.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((emp) => (
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
                      {projects?.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((proj) => (
                        <SelectItem key={proj.id} value={proj.id.toString()}>
                          {proj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {allocationMode === "percentage" ? (
                <div>
                  <Label htmlFor="allocatedPercentage">Percentual de Alocação (%) *</Label>
                  <Input
                    id="allocatedPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.allocatedPercentage}
                    onChange={(e) => setFormData({ ...formData, allocatedPercentage: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Insira o percentual de alocação (0-100%). O sistema calculará as horas automaticamente.
                  </p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="allocatedHours">Horas Alocadas *</Label>
                  <Input
                    id="allocatedHours"
                    type="number"
                    min="1"
                    value={formData.allocatedHours}
                    onChange={(e) => setFormData({ ...formData, allocatedHours: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
              )}
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      startDate: getMondayCurrentWeek(),
                      endDate: getFridayCurrentWeek(),
                    });
                  }}
                >
                  Semana Atual
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      startDate: getMondayNextWeek(),
                      endDate: getFridayNextWeek(),
                    });
                  }}
                >
                  Semana Seguinte
                </Button>
              </div>
              {editingId ? (
                <div className="space-y-2">
                  <Label htmlFor="edit-comment">Comentário (opcional)</Label>
                  <Textarea
                    id="edit-comment"
                    placeholder="Explique o motivo desta alteração..."
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {editComment.length}/500 caracteres
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="comment">Comentário (opcional)</Label>
                  <Textarea
                    id="comment"
                    placeholder="Explique o motivo desta alocação..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {comment.length}/500 caracteres
                  </p>
                </div>
              )}
              <Button type="submit" className="w-full">
                {editingId ? "Atualizar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dialog de confirmação de deleção */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta alocação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="delete-comment">Comentário (opcional)</Label>
            <Textarea
              id="delete-comment"
              placeholder="Por que está removendo esta alocação?"
              value={deleteComment}
              onChange={(e) => setDeleteComment(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {deleteComment.length}/500 caracteres
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                    <TableHead>{allocationMode === "percentage" ? "Percentual" : "Horas"}</TableHead>
                    <TableHead>Data de Início</TableHead>
                    <TableHead>Data de Fim</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations && allocations.length > 0 ? (
                    allocations.sort((a, b) => {
                      const empA = employees?.find(e => e.id === a.employeeId)?.name || "";
                      const empB = employees?.find(e => e.id === b.employeeId)?.name || "";
                      return empA.localeCompare(empB, 'pt-BR');
                    }).map((alloc) => (
                      <TableRow key={alloc.id}>
                        <TableCell className="font-medium">
                          {employees?.find(e => e.id === alloc.employeeId)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {projects?.find(p => p.id === alloc.projectId)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {allocationMode === "percentage" 
                            ? (alloc.allocatedPercentage ? `${parseFloat(String(alloc.allocatedPercentage)).toFixed(2)}%` : "-")
                            : `${alloc.allocatedHours}h`
                          }
                        </TableCell>
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

