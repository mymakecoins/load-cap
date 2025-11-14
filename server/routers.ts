import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { authRouter } from "./routers/auth";
import { calculateHoursFromPercentage, calculatePercentageFromHours, datesOverlap } from "./utils/allocations";

// Helper to check if user is coordinator
const isCoordinator = (role: string) => role === "coordinator" || role === "admin";
const isManager = (role: string) => role === "manager" || role === "admin" || role === "coordinator";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,

  // ===== CLIENTS ROUTER =====
  clients: router({
    list: protectedProcedure.query(async () => {
      return db.getAllClients();
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getClientById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email inválido").optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem criar clientes" });
        }
        return db.createClient({
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          company: input.company ?? null,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email inválido").optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem editar clientes" });
        }
        const { id, ...data } = input;
        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email ?? null;
        if (data.phone !== undefined) updateData.phone = data.phone ?? null;
        if (data.company !== undefined) updateData.company = data.company ?? null;
        return db.updateClient(id, updateData);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem deletar clientes" });
        }
        return db.deleteClient(input.id);
      }),
  }),

  // ===== EMPLOYEES ROUTER =====
  employees: router({
    list: protectedProcedure.query(async () => {
      return db.getAllEmployees();
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getEmployeeById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        type: z.enum(["frontend", "mobile", "backend", "qa", "manager", "fullstack"]),
        monthlyCapacityHours: z.number().int().positive().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem criar colaboradores" });
        }
        return db.createEmployee({
          ...input,
          monthlyCapacityHours: input.monthlyCapacityHours || 160,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        type: z.enum(["frontend", "mobile", "backend", "qa", "manager", "fullstack"]).optional(),
        monthlyCapacityHours: z.number().int().positive().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem editar colaboradores" });
        }
        const { id, ...data } = input;
        return db.updateEmployee(id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem deletar colaboradores" });
        }
        return db.deleteEmployee(input.id);
      }),
  }),

  // ===== PROJECTS ROUTER =====
  projects: router({
    list: protectedProcedure.query(async () => {
      return db.getAllProjects();
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        clientId: z.number(),
        type: z.enum(["sustentacao", "escopo_fechado", "squad_gerenciada"]),
        managerId: z.number().optional(),
        startDate: z.date().optional(),
        plannedEndDate: z.date().optional(),
        plannedProgress: z.number().int().min(0).max(100).optional(),
        actualProgress: z.number().int().min(0).max(100).optional(),
        status: z.enum(["planejamento", "discovery", "em_andamento", "homologacao", "delivery", "go_live", "concluido", "pausado"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem criar projetos" });
        }
        return db.createProject({
          name: input.name,
          clientId: input.clientId,
          type: input.type,
          managerId: input.managerId ?? null,
          startDate: input.startDate ?? null,
          plannedEndDate: input.plannedEndDate ?? null,
          actualEndDate: null,
          plannedProgress: input.plannedProgress || 0,
          actualProgress: input.actualProgress || 0,
          status: input.status || "planejamento",
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        clientId: z.number().optional(),
        type: z.enum(["sustentacao", "escopo_fechado", "squad_gerenciada"]).optional(),
        managerId: z.number().optional(),
        startDate: z.date().optional(),
        plannedEndDate: z.date().optional(),
        actualEndDate: z.date().optional(),
        plannedProgress: z.number().int().min(0).max(100).optional(),
        actualProgress: z.number().int().min(0).max(100).optional(),
        status: z.enum(["planejamento", "discovery", "em_andamento", "homologacao", "delivery", "go_live", "concluido", "pausado"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Projeto nao encontrado" });
        }
        
        const userRole = ctx.user?.role || "";
        const isProjectManager = project.managerId === ctx.user?.id;
        
        if (!isCoordinator(userRole) && !isProjectManager) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenador e gerente do projeto podem editar" });
        }
        
        const { id, ...data } = input;
        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.clientId !== undefined) updateData.clientId = data.clientId;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.managerId !== undefined) updateData.managerId = data.managerId ?? null;
        if (data.startDate !== undefined) updateData.startDate = data.startDate ?? null;
        if (data.plannedEndDate !== undefined) updateData.plannedEndDate = data.plannedEndDate ?? null;
        if (data.actualEndDate !== undefined) updateData.actualEndDate = data.actualEndDate ?? null;
        if (data.plannedProgress !== undefined) updateData.plannedProgress = data.plannedProgress;
        if (data.actualProgress !== undefined) updateData.actualProgress = data.actualProgress;
        if (data.status !== undefined) updateData.status = data.status;
        return db.updateProject(id, updateData);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem deletar projetos" });
        }
        return db.deleteProject(input.id);
      }),
  }),

  // ===== ALLOCATIONS ROUTER =====
  allocations: router({
    list: protectedProcedure.query(async () => {
      return db.getAllAllocations();
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getAllocationById(input.id);
      }),
    
    byEmployee: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return db.getAllocationsByEmployee(input.employeeId);
      }),
    
    byProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getAllocationsByProject(input.projectId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        projectId: z.number(),
        allocatedHours: z.number().int().positive().optional(),
        allocatedPercentage: z.number().min(0).max(100).optional(),
        startDate: z.date(),
        endDate: z.date().optional(),
        comment: z.string().max(500).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem criar alocacoes" });
        }
        
        // Obter modo de alocação configurado
        const allocationMode = await db.getAllocationMode();
        
        // Buscar colaborador para obter capacidade mensal
        const employee = await db.getEmployeeById(input.employeeId);
        if (!employee) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Colaborador não encontrado" });
        }
        
        let allocatedHours: number;
        let allocatedPercentage: number | null = null;
        
        if (allocationMode === "percentage") {
          // Modo percentual: validar que percentual foi fornecido
          if (input.allocatedPercentage === undefined) {
            throw new TRPCError({ 
              code: "BAD_REQUEST", 
              message: "Percentual de alocação é obrigatório no modo percentual" 
            });
          }
          
          allocatedPercentage = input.allocatedPercentage;
          
          // Calcular horas a partir do percentual
          allocatedHours = calculateHoursFromPercentage(
            allocatedPercentage,
            employee.monthlyCapacityHours,
            input.startDate,
            input.endDate || null
          );
          
          // Validar que soma de percentuais não exceda 100% no período
          const existingAllocations = await db.getAllocationsByEmployee(input.employeeId);
          const overlappingAllocations = existingAllocations.filter(alloc => {
            return datesOverlap(
              input.startDate,
              input.endDate || new Date(),
              alloc.startDate,
              alloc.endDate || null
            );
          });
          
          const totalPercentage = overlappingAllocations.reduce(
            (sum, alloc) => sum + (alloc.allocatedPercentage ? parseFloat(String(alloc.allocatedPercentage)) : 0),
            0
          );
          
          if (totalPercentage + allocatedPercentage > 100) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Alocação excede 100% do tempo disponível. Total atual: ${totalPercentage.toFixed(2)}%`
            });
          }
        } else {
          // Modo horas: validar que horas foram fornecidas
          if (input.allocatedHours === undefined) {
            throw new TRPCError({ 
              code: "BAD_REQUEST", 
              message: "Horas alocadas são obrigatórias no modo horas" 
            });
          }
          
          allocatedHours = input.allocatedHours;
          
          // Calcular percentual a partir das horas (opcional, para histórico)
          allocatedPercentage = calculatePercentageFromHours(
            allocatedHours,
            employee.monthlyCapacityHours,
            input.startDate,
            input.endDate || null
          );
        }
        
        const allocationResult = await db.createAllocation({
          employeeId: input.employeeId,
          projectId: input.projectId,
          allocatedHours,
          allocatedPercentage: allocatedPercentage ? String(allocatedPercentage) : null,
          startDate: input.startDate,
          endDate: input.endDate ?? null,
          isActive: true,
        });
        
        // Obter ID da alocação criada
        const allocationId = (allocationResult as any).insertId || (allocationResult as any)[0]?.insertId;
        
        // Validação: usuário deve estar autenticado
        if (!ctx.user?.id) {
          throw new TRPCError({ 
            code: "UNAUTHORIZED", 
            message: "Usuário não autenticado" 
          });
        }
        
        // Log to history
        await db.createAllocationHistory({
          allocationId: allocationId || null,
          employeeId: input.employeeId,
          projectId: input.projectId,
          allocatedHours,
          allocatedPercentage: allocatedPercentage ? String(allocatedPercentage) : null,
          startDate: input.startDate,
          endDate: input.endDate ?? null,
          action: "created",
          changedBy: ctx.user.id, // MODIFICADO: não usa ?? null, já validado acima
          comment: input.comment ?? null,
        });
        
        // Criar notificação para gerente do projeto
        try {
          const project = await db.getProjectById(input.projectId);
          const employee = await db.getEmployeeById(input.employeeId);
          
          if (project?.managerId && project.managerId !== ctx.user?.id) {
            // Não notificar se o gerente é quem criou
            await db.createNotification({
              userId: project.managerId,
              type: "allocation_created",
              title: "Novo colaborador alocado",
              message: `${employee?.name || "Colaborador"} foi alocado(a) para ${project.name} com ${allocatedHours}h${allocatedPercentage ? ` (${allocatedPercentage.toFixed(2)}%)` : ""}`,
              relatedAllocationId: allocationId || null,
              relatedProjectId: input.projectId,
              actionUrl: `/alocacoes`,
              isRead: false,
            });
          }
        } catch (error) {
          // Não falhar criação se notificação falhar
          console.error("Erro ao criar notificação:", error);
        }
        
        // Buscar alocação criada para retornar
        const allocation = allocationId ? await db.getAllocationById(allocationId) : null;
        return allocation || allocationResult;
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        allocatedHours: z.number().int().positive().optional(),
        allocatedPercentage: z.number().min(0).max(100).optional(),
        endDate: z.date().optional(),
        comment: z.string().max(500).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem editar alocacoes" });
        }
        
        const allocation = await db.getAllocationById(input.id);
        if (!allocation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Alocacao nao encontrada" });
        }
        
        // Obter modo de alocação configurado
        const allocationMode = await db.getAllocationMode();
        
        // Buscar colaborador
        const employee = await db.getEmployeeById(allocation.employeeId);
        if (!employee) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Colaborador não encontrado" });
        }
        
        let allocatedHours = allocation.allocatedHours;
        let allocatedPercentage: number | null = allocation.allocatedPercentage ? parseFloat(String(allocation.allocatedPercentage)) : null;
        
        if (allocationMode === "percentage") {
          if (input.allocatedPercentage !== undefined) {
            allocatedPercentage = input.allocatedPercentage;
            allocatedHours = calculateHoursFromPercentage(
              allocatedPercentage,
              employee.monthlyCapacityHours,
              allocation.startDate,
              input.endDate ?? allocation.endDate ?? null
            );
            
            // Validar soma de percentuais (excluindo a alocação atual)
            const existingAllocations = await db.getAllocationsByEmployee(allocation.employeeId);
            const overlappingAllocations = existingAllocations.filter(alloc => {
              if (alloc.id === allocation.id) return false; // Excluir a alocação atual
              return datesOverlap(
                allocation.startDate,
                input.endDate ?? allocation.endDate ?? new Date(),
                alloc.startDate,
                alloc.endDate ?? null
              );
            });
            
            const totalPercentage = overlappingAllocations.reduce(
              (sum, alloc) => sum + (alloc.allocatedPercentage ? parseFloat(String(alloc.allocatedPercentage)) : 0),
              0
            );
            
            if (totalPercentage + allocatedPercentage > 100) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Alocação excede 100% do tempo disponível. Total atual: ${totalPercentage.toFixed(2)}%`
              });
            }
          }
        } else {
          if (input.allocatedHours !== undefined) {
            allocatedHours = input.allocatedHours;
            allocatedPercentage = calculatePercentageFromHours(
              allocatedHours,
              employee.monthlyCapacityHours,
              allocation.startDate,
              input.endDate ?? allocation.endDate ?? null
            );
          }
        }
        
        const updateData: any = {
          allocatedHours,
          endDate: input.endDate ?? allocation.endDate,
        };
        
        if (allocatedPercentage !== null) {
          updateData.allocatedPercentage = String(allocatedPercentage);
        }
        
        const result = await db.updateAllocation(input.id, updateData);
        
        // Validação: usuário deve estar autenticado
        if (!ctx.user?.id) {
          throw new TRPCError({ 
            code: "UNAUTHORIZED", 
            message: "Usuário não autenticado" 
          });
        }
        
        // Log to history COM SNAPSHOT de valores anteriores
        await db.createAllocationHistory({
          allocationId: input.id,
          employeeId: allocation.employeeId,
          projectId: allocation.projectId,
          allocatedHours,
          allocatedPercentage: allocatedPercentage ? String(allocatedPercentage) : null,
          startDate: allocation.startDate,
          endDate: input.endDate ?? allocation.endDate ?? null,
          action: "updated",
          changedBy: ctx.user.id, // MODIFICADO: não usa ?? null, já validado acima
          comment: input.comment ?? null,
          // Snapshot de valores anteriores para permitir reversão
          previousAllocatedHours: allocation.allocatedHours,
          previousAllocatedPercentage: allocation.allocatedPercentage,
          previousEndDate: allocation.endDate ?? null,
        });
        
        // Criar notificação para gerente do projeto
        try {
          const project = await db.getProjectById(allocation.projectId);
          const employee = await db.getEmployeeById(allocation.employeeId);
          
          if (project?.managerId && project.managerId !== ctx.user?.id) {
            // Construir mensagem de mudança
            let changeMessage = "";
            if (input.allocatedHours !== undefined && allocation.allocatedHours !== allocatedHours) {
              changeMessage = `${allocation.allocatedHours}h → ${allocatedHours}h`;
            } else if (input.allocatedPercentage !== undefined && allocation.allocatedPercentage !== String(allocatedPercentage)) {
              changeMessage = `${allocation.allocatedPercentage}% → ${allocatedPercentage?.toFixed(2)}%`;
            } else if (input.endDate !== undefined) {
              changeMessage = `Data fim alterada para ${input.endDate.toLocaleDateString('pt-BR')}`;
            } else {
              changeMessage = "Alocação atualizada";
            }
            
            await db.createNotification({
              userId: project.managerId,
              type: "allocation_updated",
              title: "Alocação alterada",
              message: `Alocação de ${employee?.name || "Colaborador"} em ${project.name} foi alterada: ${changeMessage}`,
              relatedAllocationId: input.id,
              relatedProjectId: allocation.projectId,
              actionUrl: `/alocacoes`,
              isRead: false,
            });
          }
        } catch (error) {
          console.error("Erro ao criar notificação:", error);
        }
        
        return result;
      }),
    
    delete: protectedProcedure
      .input(z.object({ 
        id: z.number(),
        comment: z.string().max(500).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem deletar alocacoes" });
        }
        
        const allocation = await db.getAllocationById(input.id);
        if (!allocation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Alocacao nao encontrada" });
        }
        
        const result = await db.deleteAllocation(input.id);
        
        // Validação: usuário deve estar autenticado
        if (!ctx.user?.id) {
          throw new TRPCError({ 
            code: "UNAUTHORIZED", 
            message: "Usuário não autenticado" 
          });
        }
        
        // Log to history
        await db.createAllocationHistory({
          allocationId: input.id,
          employeeId: allocation.employeeId,
          projectId: allocation.projectId,
          allocatedHours: allocation.allocatedHours,
          allocatedPercentage: allocation.allocatedPercentage,
          startDate: allocation.startDate,
          endDate: allocation.endDate ?? null,
          action: "deleted",
          changedBy: ctx.user.id, // MODIFICADO: não usa ?? null, já validado acima
          comment: input.comment ?? null,
        });
        
        // Criar notificação para gerente do projeto
        try {
          const project = await db.getProjectById(allocation.projectId);
          const employee = await db.getEmployeeById(allocation.employeeId);
          
          if (project?.managerId && project.managerId !== ctx.user?.id) {
            await db.createNotification({
              userId: project.managerId,
              type: "allocation_deleted",
              title: "Alocação removida",
              message: `Alocação de ${employee?.name || "Colaborador"} em ${project.name} (${allocation.allocatedHours}h) foi removida`,
              relatedAllocationId: input.id,
              relatedProjectId: allocation.projectId,
              actionUrl: `/historico-alocacoes`,
              isRead: false,
            });
          }
        } catch (error) {
          console.error("Erro ao criar notificação:", error);
        }
        
        return result;
      }),
    
    revert: protectedProcedure
      .input(z.object({
        historyId: z.number(),
        comment: z.string().max(500).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verificar permissão
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Apenas coordenadores podem reverter mudanças" 
          });
        }
        
        // Verificar autenticação
        if (!ctx.user?.id) {
          throw new TRPCError({ 
            code: "UNAUTHORIZED", 
            message: "Usuário não autenticado" 
          });
        }
        
        // Obter registro de histórico
        const historyRecord = await db.getAllocationHistoryById(input.historyId);
        if (!historyRecord) {
          throw new TRPCError({ 
            code: "NOT_FOUND", 
            message: "Registro de histórico não encontrado" 
          });
        }
        
        // Verificar se já foi revertido
        const allHistory = await db.getAllocationHistory();
        const isReverted = allHistory.some(
          (h: any) => h.revertedHistoryId === input.historyId
        );
        if (isReverted) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Esta mudança já foi revertida" 
          });
        }
        
        let result;
        
        if (historyRecord.action === "created") {
          // Reverter criação = deletar alocação
          if (historyRecord.allocationId) {
            await db.deleteAllocation(historyRecord.allocationId);
          }
          
          result = await db.createAllocationHistory({
            allocationId: historyRecord.allocationId ?? null,
            employeeId: historyRecord.employeeId,
            projectId: historyRecord.projectId,
            allocatedHours: historyRecord.allocatedHours,
            allocatedPercentage: historyRecord.allocatedPercentage,
            startDate: historyRecord.startDate,
            endDate: historyRecord.endDate ?? null,
            action: "reverted_creation",
            changedBy: ctx.user.id,
            comment: input.comment || `Revertido: Alocação criada em ${new Date(historyRecord.createdAt).toLocaleString('pt-BR')}`,
            revertedHistoryId: input.historyId,
          });
          
        } else if (historyRecord.action === "updated") {
          // Reverter atualização = restaurar valores anteriores
          if (!historyRecord.allocationId) {
            throw new TRPCError({ 
              code: "BAD_REQUEST", 
              message: "Não é possível reverter atualização: alocação não encontrada" 
            });
          }
          
          // Restaurar valores anteriores
          const restoreData: any = {};
          if (historyRecord.previousAllocatedHours !== null && historyRecord.previousAllocatedHours !== undefined) {
            restoreData.allocatedHours = historyRecord.previousAllocatedHours;
          }
          if (historyRecord.previousAllocatedPercentage !== null && historyRecord.previousAllocatedPercentage !== undefined) {
            restoreData.allocatedPercentage = String(historyRecord.previousAllocatedPercentage);
          }
          if (historyRecord.previousEndDate !== null && historyRecord.previousEndDate !== undefined) {
            restoreData.endDate = historyRecord.previousEndDate;
          }
          
          await db.updateAllocation(historyRecord.allocationId, restoreData);
          
          // Obter alocação atualizada para histórico
          const updatedAllocation = await db.getAllocationById(historyRecord.allocationId);
          
          result = await db.createAllocationHistory({
            allocationId: historyRecord.allocationId,
            employeeId: historyRecord.employeeId,
            projectId: historyRecord.projectId,
            allocatedHours: updatedAllocation?.allocatedHours || historyRecord.previousAllocatedHours || 0,
            allocatedPercentage: updatedAllocation?.allocatedPercentage || historyRecord.previousAllocatedPercentage,
            startDate: historyRecord.startDate,
            endDate: updatedAllocation?.endDate ?? historyRecord.previousEndDate ?? null,
            action: "reverted_update",
            changedBy: ctx.user.id,
            comment: input.comment || `Revertido: Atualização de ${historyRecord.previousAllocatedHours}h para ${historyRecord.allocatedHours}h`,
            revertedHistoryId: input.historyId,
          });
          
        } else if (historyRecord.action === "deleted") {
          // Reverter deleção = restaurar alocação
          const insertResult = await db.createAllocation({
            employeeId: historyRecord.employeeId,
            projectId: historyRecord.projectId,
            allocatedHours: historyRecord.allocatedHours,
            allocatedPercentage: historyRecord.allocatedPercentage,
            startDate: historyRecord.startDate,
            endDate: historyRecord.endDate ?? null,
            isActive: true,
          });
          
          // Obter o ID da alocação criada
          // No MySQL, o resultado do insert contém insertId
          const insertId = (insertResult as any).insertId || (insertResult as any)[0]?.insertId;
          let restoredAllocationId = insertId;
          
          // Se não conseguir o insertId, buscar a alocação mais recente para este colaborador/projeto
          if (!restoredAllocationId) {
            const recentAllocations = await db.getAllocationsByEmployee(historyRecord.employeeId);
            const matchingAllocation = recentAllocations.find(
              (a: any) => 
                a.projectId === historyRecord.projectId &&
                a.allocatedHours === historyRecord.allocatedHours &&
                Math.abs(new Date(a.startDate).getTime() - new Date(historyRecord.startDate).getTime()) < 1000
            );
            restoredAllocationId = matchingAllocation?.id;
          }
          
          result = await db.createAllocationHistory({
            allocationId: restoredAllocationId ?? null,
            employeeId: historyRecord.employeeId,
            projectId: historyRecord.projectId,
            allocatedHours: historyRecord.allocatedHours,
            allocatedPercentage: historyRecord.allocatedPercentage,
            startDate: historyRecord.startDate,
            endDate: historyRecord.endDate ?? null,
            action: "reverted_deletion",
            changedBy: ctx.user.id,
            comment: input.comment || `Revertido: Alocação deletada em ${new Date(historyRecord.createdAt).toLocaleString('pt-BR')}`,
            revertedHistoryId: input.historyId,
          });
        } else {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Não é possível reverter este tipo de ação" 
          });
        }
        
        return { success: true, message: "Mudança revertida com sucesso" };
      }),
    
    getHistory: protectedProcedure
      .input(z.object({
        employeeId: z.number().optional(),
        projectId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const history = await db.getAllocationHistory(input?.employeeId, input?.projectId);
        
        // Enriquecer com dados do usuário
        const enrichedHistory = await Promise.all(
          history.map(async (record) => {
            try {
              const user = await db.getUserById(record.changedBy);
              return {
                ...record,
                changedByName: user?.name || "Usuário deletado",
                changedByEmail: user?.email || "-",
              };
            } catch (error) {
              // Se usuário não existir, usar valores padrão
              return {
                ...record,
                changedByName: "Usuário deletado",
                changedByEmail: "-",
              };
            }
          })
        );
        
        return enrichedHistory;
      }),
  }),

  // ===== NOTIFICATIONS ROUTER =====
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      
      return db.getNotificationsByUserId(ctx.user.id, 20);
    }),
    
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      
      return { count: await db.getUnreadNotificationCount(ctx.user.id) };
    }),
    
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        
        return db.markNotificationAsRead(input.id, ctx.user.id);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        
        return db.deleteNotification(input.id, ctx.user.id);
      }),
    
    preferences: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      
      const prefs = await db.getNotificationPreferences(ctx.user.id);
      
      // Retornar padrões se não houver preferências
      return prefs || {
        userId: ctx.user.id,
        allocationCreated: true,
        allocationUpdated: true,
        allocationDeleted: true,
        allocationReverted: true,
        emailNotifications: false,
      };
    }),
    
    updatePreferences: protectedProcedure
      .input(z.object({
        allocationCreated: z.boolean().optional(),
        allocationUpdated: z.boolean().optional(),
        allocationDeleted: z.boolean().optional(),
        allocationReverted: z.boolean().optional(),
        emailNotifications: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        
        return db.updateNotificationPreferences(ctx.user.id, input);
      }),
  }),

  users: router({
    list: protectedProcedure.query(async () => {
      return db.getAllUsers();
    }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        password: z.string().min(6),
        role: z.enum(["admin", "coordinator", "manager"]),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem criar usuarios" });
        }
        return db.createUser(input);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.enum(["admin", "coordinator", "manager"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem editar usuarios" });
        }
        const { id, ...data } = input;
        return db.updateUser(id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem deletar usuarios" });
        }
        return db.deleteUser(input.id);
      }),
  }),

  // ===== PROJECT LOG ROUTER =====
  projectLog: router({
    // List projects for diary (filtered by role)
    listProjects: protectedProcedure.query(async ({ ctx }) => {
      const userRole = ctx.user?.role || "";
      
      // Admin and coordinator see all active projects
      if (isCoordinator(userRole)) {
        return db.getActiveProjectsWithEntryCount();
      }
      
      // Managers see only their projects
      if (isManager(userRole)) {
        return db.getProjectsByManagerIdWithEntryCount(ctx.user!.id);
      }
      
      // Other roles see no projects
      return [];
    }),
    
    // Get log entries for a project
    getByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectLogEntriesByProject(input.projectId);
      }),
    
    // Create a new log entry
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        title: z.string().min(1, "Título é obrigatório"),
        content: z.string().min(1, "Conteúdo é obrigatório"),
      }))
      .mutation(async ({ input, ctx }) => {
        // Only managers, coordinators and admins can create log entries
        if (!isManager(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gerentes, coordenadores e administradores podem criar entradas no diário" });
        }
        
        try {
          return await db.createProjectLogEntry({
            projectId: input.projectId,
            userId: ctx.user!.id,
            title: input.title,
            content: input.content,
          });
        } catch (error: any) {
          console.error("[ProjectLog] Error creating entry:", error);
          console.error("[ProjectLog] Error details:", {
            message: error.message,
            code: error.code,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage,
          });
          
          // Verificar se é erro de tamanho do campo
          if (error.code === "ER_DATA_TOO_LONG" || error.sqlState === "22001") {
            throw new TRPCError({ 
              code: "PAYLOAD_TOO_LARGE", 
              message: "O conteúdo da entrada é muito grande. Tente reduzir o tamanho das imagens ou remover algumas imagens." 
            });
          }
          
          // Retornar mensagem de erro mais detalhada
          const errorMessage = error.sqlMessage || error.message || "Erro ao criar entrada";
          throw new TRPCError({ 
            code: "INTERNAL_SERVER_ERROR", 
            message: `Erro ao criar entrada: ${errorMessage}` 
          });
        }
      }),
    
    // Get a single log entry by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const entry = await db.getProjectLogEntryById(input.id);
        if (!entry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Entrada não encontrada" });
        }
        return entry;
      }),
    
    // Update a log entry (only by creator)
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1, "Título é obrigatório"),
        content: z.string().min(1, "Conteúdo é obrigatório"),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não autenticado" });
        }
        
        try {
          return await db.updateProjectLogEntry(
            input.id,
            { title: input.title, content: input.content },
            ctx.user.id
          );
        } catch (error: any) {
          console.error("[ProjectLog] Error updating entry:", error);
          console.error("[ProjectLog] Error details:", {
            message: error.message,
            code: error.code,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage,
            stack: error.stack,
          });
          
          if (error.message === "Apenas o criador pode editar esta entrada") {
            throw new TRPCError({ code: "FORBIDDEN", message: error.message });
          }
          if (error.message === "Entrada não encontrada") {
            throw new TRPCError({ code: "NOT_FOUND", message: error.message });
          }
          
          // Verificar se é erro de tamanho do campo
          if (error.code === "ER_DATA_TOO_LONG" || error.sqlState === "22001") {
            throw new TRPCError({ 
              code: "PAYLOAD_TOO_LARGE", 
              message: "O conteúdo da entrada é muito grande. Tente reduzir o tamanho das imagens ou remover algumas imagens." 
            });
          }
          
          // Retornar mensagem de erro mais detalhada
          const errorMessage = error.sqlMessage || error.message || "Erro ao atualizar entrada";
          throw new TRPCError({ 
            code: "INTERNAL_SERVER_ERROR", 
            message: `Erro ao atualizar entrada: ${errorMessage}` 
          });
        }
      }),
  }),

  // ===== SETTINGS ROUTER (Admin only) =====
  settings: router({
    getAll: adminProcedure.query(async () => {
      return db.getAllSystemSettings();
    }),
    
    get: adminProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return db.getSystemSetting(input.key);
      }),
    
    set: adminProcedure
      .input(z.object({
        key: z.string(),
        value: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não autenticado" });
        }
        
        await db.setSystemSetting(
          input.key,
          input.value,
          input.description || null,
          ctx.user.id
        );
        
        return { success: true };
      }),
    
    getAllocationMode: protectedProcedure.query(async () => {
      return db.getAllocationMode();
    }),
  }),
});

export type AppRouter = typeof appRouter;

