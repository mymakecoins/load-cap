import { integer, pgEnum, pgTable, text, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */

// Enums for PostgreSQL
export const userRoleEnum = pgEnum("user_role", ["user", "admin", "coordinator", "manager", "developer"]);
export const employeeTypeEnum = pgEnum("employee_type", ["frontend", "mobile", "backend", "qa", "manager"]);
export const projectTypeEnum = pgEnum("project_type", ["sustentacao", "escopo_fechado", "squad_gerenciada"]);
export const projectStatusEnum = pgEnum("project_status", ["planejamento", "em_andamento", "concluido", "pausado"]);
export const allocationActionEnum = pgEnum("allocation_action", ["created", "updated", "deleted"]);

export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Clients table - stores information about clients/companies
 */
export const clients = pgTable("clients", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  company: varchar("company", { length: 255 }),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Employees table - stores information about team members
 */
export const employees = pgTable("employees", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  type: employeeTypeEnum("type").notNull(),
  monthlyCapacityHours: integer("monthlyCapacityHours").default(160).notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * Projects table - stores information about projects
 */
export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  clientId: integer("clientId").notNull(),
  type: projectTypeEnum("type").notNull(),
  managerId: integer("managerId"),
  startDate: timestamp("startDate"),
  plannedEndDate: timestamp("plannedEndDate"),
  actualEndDate: timestamp("actualEndDate"),
  plannedProgress: integer("plannedProgress").default(0),
  actualProgress: integer("actualProgress").default(0),
  status: projectStatusEnum("status").default("planejamento").notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Allocations table - stores employee allocations to projects
 */
export const allocations = pgTable("allocations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employeeId").notNull(),
  projectId: integer("projectId").notNull(),
  allocatedHours: integer("allocatedHours").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Allocation = typeof allocations.$inferSelect;
export type InsertAllocation = typeof allocations.$inferInsert;

/**
 * Allocation history table - tracks changes to allocations for audit purposes
 */
export const allocationHistory = pgTable("allocation_history", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  allocationId: integer("allocationId"),
  employeeId: integer("employeeId").notNull(),
  projectId: integer("projectId").notNull(),
  allocatedHours: integer("allocatedHours").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  action: allocationActionEnum("action").notNull(),
  changedBy: integer("changedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AllocationHistory = typeof allocationHistory.$inferSelect;
export type InsertAllocationHistory = typeof allocationHistory.$inferInsert;

/**
 * Relations
 */
export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
}));

export const employeesRelations = relations(employees, ({ many }) => ({
  allocations: many(allocations),
  managedProjects: many(projects),
  allocationHistory: many(allocationHistory),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  manager: one(employees, {
    fields: [projects.managerId],
    references: [employees.id],
  }),
  allocations: many(allocations),
}));

export const allocationsRelations = relations(allocations, ({ one }) => ({
  employee: one(employees, {
    fields: [allocations.employeeId],
    references: [employees.id],
  }),
  project: one(projects, {
    fields: [allocations.projectId],
    references: [projects.id],
  }),
}));

export const allocationHistoryRelations = relations(allocationHistory, ({ one }) => ({
  employee: one(employees, {
    fields: [allocationHistory.employeeId],
    references: [employees.id],
  }),
  project: one(projects, {
    fields: [allocationHistory.projectId],
    references: [projects.id],
  }),
}));

