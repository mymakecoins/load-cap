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

const EMPLOYEE_TYPES = [
  { value: "frontend", label: "Frontend" },
  { value: "mobile", label: "Mobile" },
  { value: "backend", label: "Backend" },
  { value: "fullstack", label: "Fullstack" },
  { value: "qa", label: "QA" },
  { value: "manager", label: "Gerente de Projeto" },
  { value: "requirements_analyst", label: "Analista de Requisitos" },
];

export default function Employees() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: "backend" as const,
    monthlyCapacityHours: 160,
  });

  const { data: employees, isLoading, refetch } = trpc.employees.list.useQuery();
  const createMutation = trpc.employees.create.useMutation();
  const updateMutation = trpc.employees.update.useMutation();
  const deleteMutation = trpc.employees.delete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...formData });
        toast.success("Colaborador atualizado com sucesso");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Colaborador criado com sucesso");
      }
      setFormData({ name: "", email: "", type: "backend", monthlyCapacityHours: 160 });
      setEditingId(null);
      setOpen(false);
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar colaborador");
    }
  };

  const handleEdit = (employee: any) => {
    setFormData({
      name: employee.name,
      email: employee.email,
      type: employee.type,
      monthlyCapacityHours: employee.monthlyCapacityHours,
    });
    setEditingId(employee.id);
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Colaborador deletado com sucesso");
      refetch();
    } catch (error) {
      toast.error("Erro ao deletar colaborador");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Colaboradores</h1>
          <p className="text-muted-foreground mt-2">Gerenciar equipe de desenvolvimento</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingId(null); setFormData({ name: "", email: "", type: "backend", monthlyCapacityHours: 160 }); }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Atualize os dados do colaborador" : "Preencha os dados do novo colaborador"}
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
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Tipo *</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger id="type">
                    <SelectValue />
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
              <div>
                <Label htmlFor="capacity">Capacidade Mensal (horas)</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.monthlyCapacityHours}
                  onChange={(e) => setFormData({ ...formData, monthlyCapacityHours: parseInt(e.target.value) })}
                />
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
          <CardTitle>Lista de Colaboradores</CardTitle>
          <CardDescription>Todos os colaboradores cadastrados no sistema</CardDescription>
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Capacidade (h/mês)</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees && employees.length > 0 ? (
                    employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>
                          {EMPLOYEE_TYPES.find((t) => t.value === employee.type)?.label || employee.type}
                        </TableCell>
                        <TableCell>{employee.monthlyCapacityHours}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum colaborador cadastrado
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

