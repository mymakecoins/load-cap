import { eq, and, or, desc, ne, isNull, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, clients, employees, projects, allocations, allocationHistory, Client, Employee, Project, Allocation, AllocationHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ===== CLIENT QUERIES =====
export async function getAllClients() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clients).where(eq(clients.isDeleted, false)).orderBy(desc(clients.createdAt));
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(and(eq(clients.id, id), eq(clients.isDeleted, false))).limit(1);
  return result[0];
}

export async function createClient(data: Omit<Client, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(data);
  return result;
}

export async function updateClient(id: number, data: Partial<Omit<Client, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(clients).set({ ...data, updatedAt: new Date() }).where(eq(clients.id, id));
}

export async function deleteClient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(clients).set({ isDeleted: true, updatedAt: new Date() }).where(eq(clients.id, id));
}

// ===== EMPLOYEE QUERIES =====
export async function getAllEmployees() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(employees).where(eq(employees.isDeleted, false)).orderBy(desc(employees.createdAt));
}

export async function getEmployeeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(and(eq(employees.id, id), eq(employees.isDeleted, false))).limit(1);
  return result[0];
}

export async function createEmployee(data: Omit<Employee, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(employees).values(data);
}

export async function updateEmployee(id: number, data: Partial<Omit<Employee, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(employees).set({ ...data, updatedAt: new Date() }).where(eq(employees.id, id));
}

export async function deleteEmployee(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(employees).set({ isDeleted: true, updatedAt: new Date() }).where(eq(employees.id, id));
}

// ===== PROJECT QUERIES =====
export async function getAllProjects() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.isDeleted, false)).orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.isDeleted, false))).limit(1);
  return result[0];
}

export async function createProject(data: Omit<Project, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(projects).values(data);
}

export async function updateProject(id: number, data: Partial<Omit<Project, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(projects).set({ ...data, updatedAt: new Date() }).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(projects).set({ isDeleted: true, updatedAt: new Date() }).where(eq(projects.id, id));
}

// ===== ALLOCATION QUERIES =====
export async function getAllAllocations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(allocations).where(eq(allocations.isActive, true)).orderBy(desc(allocations.createdAt));
}

export async function getAllocationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(allocations).where(and(eq(allocations.id, id), eq(allocations.isActive, true))).limit(1);
  return result[0];
}

export async function getAllocationsByEmployee(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(allocations).where(and(eq(allocations.employeeId, employeeId), eq(allocations.isActive, true))).orderBy(desc(allocations.startDate));
}

export async function getAllocationsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(allocations).where(and(eq(allocations.projectId, projectId), eq(allocations.isActive, true))).orderBy(desc(allocations.startDate));
}

export async function createAllocation(data: Omit<Allocation, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(allocations).values(data);
}

export async function updateAllocation(id: number, data: Partial<Omit<Allocation, 'id' | 'createdAt' | 'updatedAt'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(allocations).set({ ...data, updatedAt: new Date() }).where(eq(allocations.id, id));
}

export async function deleteAllocation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(allocations).set({ isActive: false, updatedAt: new Date() }).where(eq(allocations.id, id));
}

// ===== ALLOCATION HISTORY QUERIES =====
export async function createAllocationHistory(data: Omit<AllocationHistory, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(allocationHistory).values(data);
}

export async function getAllocationHistory(employeeId?: number, projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions: any[] = [];
  
  if (employeeId) conditions.push(eq(allocationHistory.employeeId, employeeId));
  if (projectId) conditions.push(eq(allocationHistory.projectId, projectId));
  
  if (conditions.length > 0) {
    return db.select().from(allocationHistory).where(and(...conditions)).orderBy(desc(allocationHistory.createdAt));
  }
  
  return db.select().from(allocationHistory).orderBy(desc(allocationHistory.createdAt));
}



// ===== USER QUERIES =====
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(ne(users.role, 'user')).orderBy(desc(users.createdAt));
}

export async function createUser(data: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: 'admin' | 'coordinator' | 'manager';
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Hash password (in production, use bcrypt)
  const crypto = require('crypto');
  const passwordHash = crypto.createHash('sha256').update(data.password).digest('hex');
  
  return db.insert(users).values({
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    passwordHash: passwordHash,
    role: data.role,
    loginMethod: 'email',
    lastSignedIn: new Date(),
  });
}

export async function updateUser(id: number, data: Partial<{
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'coordinator' | 'manager';
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(users).where(eq(users.id, id));
}

