import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

export default function EditDiaryEntry() {
  const params = useParams();
  const entryId = params.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const utils = trpc.useUtils();

  // Buscar a entrada existente
  const { data: entry, isLoading: isLoadingEntry, error } = trpc.projectLog.getById.useQuery(
    { id: entryId },
    { enabled: entryId > 0 }
  );

  // Carregar dados da entrada quando disponível
  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setContent(entry.content);
    }
  }, [entry]);

  const updateMutation = trpc.projectLog.update.useMutation({
    onSuccess: async () => {
      toast.success("Entrada atualizada com sucesso!");
      
      // Invalidar cache para atualizar a lista de entradas
      if (entry) {
        await utils.projectLog.getByProject.invalidate({ projectId: entry.projectId });
        setLocation(`/diario-bordo/${entry.projectId}`);
      }
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar entrada: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    updateMutation.mutate({
      id: entryId,
      title: title.trim(),
      content: content.trim(),
    });
  };

  const handleCancel = () => {
    if (entry) {
      setLocation(`/diario-bordo/${entry.projectId}`);
    } else {
      setLocation("/diario-bordo");
    }
  };

  if (isLoadingEntry) {
    return (
      <DashboardLayout>
        <div className="container max-w-4xl py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !entry) {
    return (
      <DashboardLayout>
        <div className="container max-w-4xl py-8">
          <div className="text-center py-12">
            <p className="text-destructive mb-4">
              {error?.message || "Entrada não encontrada"}
            </p>
            <Button onClick={() => setLocation("/diario-bordo")}>
              Voltar para Diário de Bordo
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-4xl py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Diário de Bordo
          </Button>

          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Editar Entrada no Diário</h1>
              <p className="text-muted-foreground">
                Atualize as informações desta entrada
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião com cliente sobre novas funcionalidades"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">
              Conteúdo <span className="text-destructive">*</span>
            </Label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Descreva os detalhes da atualização..."
              className="min-h-[400px]"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

