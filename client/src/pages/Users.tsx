import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Copy, RefreshCw } from "lucide-react";

// Função para validar senha
const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push("Mínimo de 12 caracteres");
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push("Deve conter letras");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Deve conter números");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push("Deve conter símbolos");
  }
  
  return { valid: errors.length === 0, errors };
};

// Função para gerar senha aleatória
const generatePassword = (): string => {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}';:\\\"\\|,.<>/?";
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

export default function Users() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "coordinator" as "admin" | "coordinator" | "manager",
  });

  const { data: users = [], isLoading, refetch } = trpc.users.list.useQuery();
  const createMutation = trpc.users.create.useMutation();
  const updateMutation = trpc.users.update.useMutation();
  const deleteMutation = trpc.users.delete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação: senha é obrigatória apenas ao criar novo usuário
    if (!formData.name || !formData.email) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!editingId && !formData.password) {
      toast.error("Senha é obrigatória para novo usuário");
      return;
    }

    // Validar senha ao criar novo usuário ou se estiver editando e preencheu nova senha
    if (!editingId) {
      const validation = validatePassword(formData.password);
      if (!validation.valid) {
        toast.error("Senha não atende aos requisitos");
        return;
      }
    } else if (formData.password) {
      // Se está editando e preencheu uma nova senha, validar
      const validation = validatePassword(formData.password);
      if (!validation.valid) {
        toast.error("Senha não atende aos requisitos");
        return;
      }
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          role: formData.role,
          ...(formData.password && { password: formData.password }),
        });
        toast.success("Usuário atualizado com sucesso");
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          password: formData.password,
          role: formData.role,
        });
        toast.success("Usuário criado com sucesso");
      }

      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "coordinator",
      });
      setEditingId(null);
      setIsOpen(false);
      setPasswordErrors([]);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar usuário");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Usuário deletado com sucesso");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar usuário");
    }
  };

  const handleEdit = (user: any) => {
    setEditingId(user.id);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      role: user.role,
    });
    setPasswordErrors([]);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "coordinator",
    });
    setPasswordErrors([]);
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setFormData({ ...formData, password: newPassword });
    setPasswordErrors([]);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(formData.password);
    toast.success("Senha copiada para a área de transferência");
  };

  const handlePasswordChange = (value: string) => {
    setFormData({ ...formData, password: value });
    if (value) {
      const validation = validatePassword(value);
      setPasswordErrors(validation.errors);
    } else {
      setPasswordErrors([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
          <p className="text-gray-600 mt-2">Cadastre e gerencie usuários do sistema</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleClose()} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Atualize as informações do usuário"
                  : "Preencha os dados para criar um novo usuário"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="João Silva"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="joao@example.com"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>

              {/* Campo de senha - obrigatório ao criar, opcional ao editar */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">{editingId ? "Senha (opcional)" : "Senha *"}</label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="text"
                      value={formData.password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      placeholder={editingId ? "Deixe em branco para manter a senha atual" : "Gere ou digite uma senha"}
                      required={!editingId}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGeneratePassword}
                      className="gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Gerar
                    </Button>
                    {formData.password && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyPassword}
                        className="gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copiar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Requisitos de senha - mostrar apenas se houver senha preenchida */}
                {formData.password && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-xs font-semibold text-blue-900 mb-2">Requisitos de senha:</p>
                    <ul className="space-y-1 text-xs text-blue-800">
                      <li className={formData.password.length >= 12 ? "text-green-700 font-medium" : ""}>
                        ✓ Mínimo de 12 caracteres
                      </li>
                      <li className={/[a-zA-Z]/.test(formData.password) ? "text-green-700 font-medium" : ""}>
                        ✓ Letras (maiúsculas e minúsculas)
                      </li>
                      <li className={/[0-9]/.test(formData.password) ? "text-green-700 font-medium" : ""}>
                        ✓ Números
                      </li>
                      <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(formData.password) ? "text-green-700 font-medium" : ""}>
                        ✓ Símbolos especiais
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Perfil *</label>
                <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="coordinator">Coordenador</SelectItem>
                    <SelectItem value="manager">Gerente de Projeto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || (!editingId && passwordErrors.length > 0) || (editingId && formData.password && passwordErrors.length > 0) || false}>
                  {editingId ? "Atualizar" : "Criar"} Usuário
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>Lista de todos os usuários cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando usuários...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nenhum usuário cadastrado</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR')).map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.role === "admin"
                            ? "Administrador"
                            : user.role === "coordinator"
                            ? "Coordenador"
                            : "Gerente"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {user.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          className="gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Deletar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

