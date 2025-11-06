import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

// Helper to check if user is coordinator
const isCoordinator = (role: string) => role === "coordinator" || role === "admin";
const isManager = (role: string) => role === "manager" || role === "admin" || role === "coordinator";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

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
        allocatedHours: z.number().int().positive(),
        startDate: z.date(),
        endDate: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem criar alocacoes" });
        }
        
        const allocation = await db.createAllocation({
          employeeId: input.employeeId,
          projectId: input.projectId,
          allocatedHours: input.allocatedHours,
          startDate: input.startDate,
          endDate: input.endDate ?? null,
          isActive: true,
        });
        
        // Log to history
        await db.createAllocationHistory({
          allocationId: null,
          employeeId: input.employeeId,
          projectId: input.projectId,
          allocatedHours: input.allocatedHours,
          startDate: input.startDate,
          endDate: input.endDate ?? null,
          action: "created",
          changedBy: ctx.user?.id ?? null,
        });
        
        return allocation;
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        allocatedHours: z.number().int().positive().optional(),
        endDate: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem editar alocacoes" });
        }
        
        const allocation = await db.getAllocationById(input.id);
        if (!allocation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Alocacao nao encontrada" });
        }
        
        const { id, ...data } = input;
        const result = await db.updateAllocation(id, data);
        
        // Log to history
        await db.createAllocationHistory({
          allocationId: id,
          employeeId: allocation.employeeId,
          projectId: allocation.projectId,
          allocatedHours: data.allocatedHours || allocation.allocatedHours,
          startDate: allocation.startDate,
          endDate: data.endDate ?? allocation.endDate,
          action: "updated",
          changedBy: ctx.user?.id ?? null,
        });
        
        return result;
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoordinator(ctx.user?.role || "")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem deletar alocacoes" });
        }
        
        const allocation = await db.getAllocationById(input.id);
        if (!allocation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Alocacao nao encontrada" });
        }
        
        const result = await db.deleteAllocation(input.id);
        
        // Log to history
        await db.createAllocationHistory({
          allocationId: input.id,
          employeeId: allocation.employeeId,
          projectId: allocation.projectId,
          allocatedHours: allocation.allocatedHours,
          startDate: allocation.startDate,
          endDate: allocation.endDate ?? null,
          action: "deleted",
          changedBy: ctx.user?.id ?? null,
        });
        
        return result;
      }),
    
    getHistory: protectedProcedure.query(async () => {
      return db.getAllocationHistory();
    }),
  }),

  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!isCoordinator(ctx.user?.role || "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas coordenadores podem listar usuarios" });
      }
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
});

export type AppRouter = typeof appRouter;

