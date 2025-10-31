import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  phone: varchar("phone", { length: 20 }),
  passwordHash: text("passwordHash"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "coordinator", "manager", "developer"]).default("user").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Clients table - stores information about clients/companies
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  company: varchar("company", { length: 255 }),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Employees table - stores information about team members
 */
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  type: mysqlEnum("type", ["frontend", "mobile", "backend", "qa", "manager", "fullstack", "requirements_analyst"]).notNull(),
  monthlyCapacityHours: int("monthlyCapacityHours").default(160).notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * Projects table - stores information about projects
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  clientId: int("clientId").notNull(),
  type: mysqlEnum("type", ["sustentacao", "escopo_fechado", "squad_gerenciada"]).notNull(),
  managerId: int("managerId"),
  startDate: timestamp("startDate"),
  plannedEndDate: timestamp("plannedEndDate"),
  actualEndDate: timestamp("actualEndDate"),
  plannedProgress: int("plannedProgress").default(0),
  actualProgress: int("actualProgress").default(0),
  status: mysqlEnum("status", ["planejamento", "em_andamento", "concluido", "pausado"]).default("planejamento").notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Allocations table - stores employee allocations to projects
 */
export const allocations = mysqlTable("allocations", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  projectId: int("projectId").notNull(),
  allocatedHours: int("allocatedHours").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Allocation = typeof allocations.$inferSelect;
export type InsertAllocation = typeof allocations.$inferInsert;

/**
 * Allocation history table - tracks changes to allocations for audit purposes
 */
export const allocationHistory = mysqlTable("allocation_history", {
  id: int("id").autoincrement().primaryKey(),
  allocationId: int("allocationId"),
  employeeId: int("employeeId").notNull(),
  projectId: int("projectId").notNull(),
  allocatedHours: int("allocatedHours").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  action: mysqlEnum("action", ["created", "updated", "deleted"]).notNull(),
  changedBy: int("changedBy"),
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