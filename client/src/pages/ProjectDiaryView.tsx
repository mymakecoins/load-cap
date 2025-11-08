import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Plus, ArrowLeft, Calendar, User } from "lucide-react";

export default function ProjectDiaryView() {
  const [, params] = useRoute("/diario-bordo/:id");
  const [, setLocation] = useLocation();
  const projectId = params?.id ? parseInt(params.id) : 0;

  const { data: entries, isLoading } = trpc.projectLog.getByProject.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const { data: projects } = trpc.projectLog.listProjects.useQuery();
  const project = projects?.find((p) => p.id === projectId);

  const handleNewEntry = () => {
    setLocation(`/diario-bordo/${projectId}/nova`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/diario-bordo")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project?.name}</h1>
            <p className="text-muted-foreground mt-1">Diário de Bordo do Projeto</p>
          </div>
        </div>

        <Button onClick={handleNewEntry}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Entrada
        </Button>
      </div>

      {!entries || entries.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">
            Nenhuma entrada registrada ainda. Clique em "Nova Entrada" para começar.
          </p>
        </div>
      ) : (
        <Accordion type="single" collapsible defaultValue="item-0" className="space-y-4">
          {entries.map((entry, index) => (
            <AccordionItem
              key={entry.id}
              value={`item-${index}`}
              className="border rounded-lg px-6 bg-card"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-start justify-between w-full pr-4">
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">{entry.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(entry.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {entry.userName}
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: entry.content }}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

