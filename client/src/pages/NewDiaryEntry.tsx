import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

export default function NewDiaryEntry() {
  const params = useParams();
  const projectId = params.projectId ? parseInt(params.projectId) : 0;
  const [, setLocation] = useLocation();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const createMutation = trpc.projectLog.create.useMutation({
    onSuccess: () => {
      toast.success("Entrada criada com sucesso!");
      setLocation(`/diario-bordo/${projectId}`);
    },
    onError: (error) => {
      toast.error(`Erro ao criar entrada: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    createMutation.mutate({
      projectId,
      title: title.trim(),
      content: content.trim(),
    });
  };

  const handleCancel = () => {
    setLocation(`/diario-bordo/${projectId}`);
  };

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
              <h1 className="text-3xl font-bold">Nova Entrada no Diário</h1>
              <p className="text-muted-foreground">
                Registre uma atualização importante sobre o projeto
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
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvando..." : "Salvar Entrada"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

