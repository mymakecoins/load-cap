import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

export function NotificationBell() {
  const [, navigate] = useLocation();
  const { data: notifications, refetch } = trpc.notifications.list.useQuery();
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery();
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation();
  const deleteNotificationMutation = trpc.notifications.delete.useMutation();
  
  const unreadCount = unreadData?.count || 0;
  
  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsReadMutation.mutateAsync({ id });
      refetch();
    } catch (error) {
      toast.error("Erro ao marcar como lida");
    }
  };
  
  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotificationMutation.mutateAsync({ id });
      refetch();
      toast.success("Notificação removida");
    } catch (error) {
      toast.error("Erro ao remover notificação");
    }
  };
  
  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "allocation_created":
        return "➕";
      case "allocation_updated":
        return "✏️";
      case "allocation_deleted":
        return "🗑️";
      case "allocation_reverted":
        return "↩️";
      default:
        return "📢";
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
        </div>
        
        {notifications && notifications.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b cursor-pointer hover:bg-muted transition ${
                  !notification.isRead ? "bg-blue-50 dark:bg-blue-950" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{getNotificationIcon(notification.type)}</span>
                      <p className="font-medium text-sm">{notification.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  
                  <div className="flex gap-1">
                    {!notification.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        title="Marcar como lida"
                      >
                        ✓
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleDelete(notification.id, e)}
                      title="Deletar"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            Nenhuma notificação
          </div>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate("/configuracoes/notificacoes")}>
          ⚙️ Preferências
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

