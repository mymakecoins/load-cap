import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Clients from "./pages/Clients";
import Employees from "./pages/Employees";
import Projects from "./pages/Projects";
import Allocations from "./pages/Allocations";
import Dashboard from "./pages/Dashboard";
import EmployeeAllocations from "./pages/EmployeeAllocations";
import ProjectCapacity from "./pages/ProjectCapacity";
import AllocationHistory from "./pages/AllocationHistory";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import ProjectDiary from "./pages/ProjectDiary";
import ProjectDiaryView from "./pages/ProjectDiaryView";
import NewDiaryEntry from "./pages/NewDiaryEntry";
import EditDiaryEntry from "./pages/EditDiaryEntry";
import NotificationPreferences from "./pages/NotificationPreferences";
import { useAuth } from "./_core/hooks/useAuth";

function Router() {
  const { isAuthenticated, loading } = useAuth();
  
  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }
  
  return (
    <Switch>
      {/* Public auth routes - always accessible */}
      <Route path={"/login"} component={Login} />
      
      {/* Protected routes - require authentication */}
      {isAuthenticated ? (
        <>
          <DashboardLayout>
            <Route path={"/"} component={Dashboard} />
            <Route path={"/clientes"} component={Clients} />
            <Route path={"/colaboradores"} component={Employees} />
            <Route path={"/projetos"} component={Projects} />
            <Route path={"/alocacoes"} component={Allocations} />
            <Route path={"/alocacao-desenvolvedor"} component={EmployeeAllocations} />
            <Route path={"/capacidade-projeto"} component={ProjectCapacity} />
            <Route path={"/historico-alocacoes"} component={AllocationHistory} />
            <Route path={"/usuarios"} component={Users} />
            <Route path={"/configuracoes"} component={Settings} />
            <Route path={"/diario-bordo"} component={ProjectDiary} />
            <Route path={"/diario-bordo/editar/:id"} component={EditDiaryEntry} />
            <Route path={"/diario-bordo/:projectId/nova"} component={NewDiaryEntry} />
            <Route path={"/diario-bordo/:id"} component={ProjectDiaryView} />
            <Route path={"/configuracoes/notificacoes"} component={NotificationPreferences} />
          </DashboardLayout>
        </>
      ) : (
        <>
          <Route path={"/"} component={Home} />
          <Route path={"/404"} component={NotFound} />
          <Route component={Home} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

