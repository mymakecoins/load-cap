import { createHash } from 'crypto';
import { eq, and, or, desc, ne, isNull, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, clients, employees, projects, allocations, allocationHistory, projectLogEntries, Client, Employee, Project, Allocation, AllocationHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.warn("[Database] DATABASE_URL not found in environment variables");
      return null;
    }
    
    try {
      console.log("[Database] Connecting to database...");
      _db = drizzle(databaseUrl);
      console.log("[Database] Connected successfully");
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
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
  const passwordHash = createHash('sha256').update(data.password).digest('hex');
  
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



// ===== LOCAL AUTH QUERIES =====
export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  
  // Limpar e normalizar email
  const cleanEmail = email.trim();
  
  try {
    // Buscar por email exato
    const result = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    
    if (result.length === 0) {
      console.log("[Database] User not found with email:", cleanEmail);
      // Tentar buscar todos os usuários para debug
      const allUsers = await db.select({ email: users.email }).from(users).limit(5);
      console.log("[Database] Sample emails in DB:", allUsers.map(u => u.email));
      return undefined;
    }
    
    const user = result[0];
    console.log("[Database] User found:", { 
      id: user.id, 
      email: user.email, 
      emailMatch: user.email === cleanEmail,
      hasPasswordHash: !!user.passwordHash,
      passwordHashLength: user.passwordHash?.length || 0
    });
    return user;
  } catch (error) {
    console.error("[Database] Error getting user by email:", error);
    return undefined;
  }
}

export async function createLocalUser(data: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: 'admin' | 'coordinator' | 'manager' | 'developer';
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Hash password using SHA256 (in production, use bcrypt)
  const passwordHash = createHash('sha256').update(data.password).digest('hex');
  
  return db.insert(users).values({
    openId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    passwordHash: passwordHash,
    role: data.role || 'developer',
    loginMethod: 'email',
    lastSignedIn: new Date(),
  });
}

export async function updateUserPassword(id: number, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const passwordHash = createHash('sha256').update(newPassword).digest('hex');
  
  return db.update(users).set({
    passwordHash: passwordHash,
    updatedAt: new Date(),
  }).where(eq(users.id, id));
}

export async function verifyPassword(passwordHash: string, plainPassword: string): Promise<boolean> {
  if (!passwordHash || !plainPassword) {
    console.log("[Database] verifyPassword: missing passwordHash or plainPassword");
    return false;
  }
  
  const hash = createHash('sha256').update(plainPassword).digest('hex');
  const isValid = hash === passwordHash;
  
  if (!isValid) {
    console.log("[Database] verifyPassword failed:", {
      passwordHashLength: passwordHash.length,
      plainPasswordLength: plainPassword.length,
      calculatedHashPrefix: hash.substring(0, 20),
      storedHashPrefix: passwordHash.substring(0, 20),
    });
  }
  
  return isValid;
}



// Project Log Entries queries
export async function getProjectLogEntriesByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: projectLogEntries.id,
      projectId: projectLogEntries.projectId,
      userId: projectLogEntries.userId,
      title: projectLogEntries.title,
      content: projectLogEntries.content,
      createdAt: projectLogEntries.createdAt,
      updatedAt: projectLogEntries.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(projectLogEntries)
    .leftJoin(users, eq(projectLogEntries.userId, users.id))
    .where(eq(projectLogEntries.projectId, projectId))
    .orderBy(desc(projectLogEntries.createdAt));
  
  return result;
}

export async function createProjectLogEntry(data: {
  projectId: number;
  userId: number;
  title: string;
  content: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Log do tamanho do conteúdo para debug
  const contentLength = data.content.length;
  console.log(`[Database] Creating project log entry: content length = ${contentLength} characters`);
  
  try {
    const result = await db.insert(projectLogEntries).values(data);
    console.log(`[Database] Successfully created project log entry`);
    return result;
  } catch (error: any) {
    console.error(`[Database] Error creating project log entry:`, error);
    console.error(`[Database] Error message:`, error.message);
    console.error(`[Database] Error code:`, error.code);
    console.error(`[Database] Error sqlState:`, error.sqlState);
    console.error(`[Database] Error sqlMessage:`, error.sqlMessage);
    throw error;
  }
}

export async function getProjectLogEntryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select({
      id: projectLogEntries.id,
      projectId: projectLogEntries.projectId,
      userId: projectLogEntries.userId,
      title: projectLogEntries.title,
      content: projectLogEntries.content,
      createdAt: projectLogEntries.createdAt,
      updatedAt: projectLogEntries.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(projectLogEntries)
    .leftJoin(users, eq(projectLogEntries.userId, users.id))
    .where(eq(projectLogEntries.id, id))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function updateProjectLogEntry(
  id: number,
  data: { title: string; content: string },
  userId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar se a entrada existe e se o usuário é o criador
  const entry = await db
    .select()
    .from(projectLogEntries)
    .where(eq(projectLogEntries.id, id))
    .limit(1);
  
  if (entry.length === 0) {
    throw new Error("Entrada não encontrada");
  }
  
  if (entry[0].userId !== userId) {
    throw new Error("Apenas o criador pode editar esta entrada");
  }
  
  // Log do tamanho do conteúdo para debug
  const contentLength = data.content.length;
  console.log(`[Database] Updating project log entry ${id}: content length = ${contentLength} characters`);
  
  // Verificar se o conteúdo é muito grande (TEXT pode armazenar até 65.535 bytes)
  // Considerando que caracteres podem ser multi-byte, usar um limite conservador
  if (contentLength > 60000) {
    console.warn(`[Database] Content size (${contentLength}) may exceed TEXT field limit`);
  }
  
  try {
    // Atualizar a entrada
    await db
      .update(projectLogEntries)
      .set({
        title: data.title,
        content: data.content,
        updatedAt: new Date(),
      })
      .where(eq(projectLogEntries.id, id));
    
    console.log(`[Database] Successfully updated project log entry ${id}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Database] Error updating project log entry ${id}:`, error);
    console.error(`[Database] Error message:`, error.message);
    console.error(`[Database] Error code:`, error.code);
    console.error(`[Database] Error sqlState:`, error.sqlState);
    console.error(`[Database] Error sqlMessage:`, error.sqlMessage);
    throw error;
  }
}

export async function getProjectsByManagerId(managerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(projects)
    .where(and(
      eq(projects.managerId, managerId),
      eq(projects.isDeleted, false),
      ne(projects.status, 'concluido')
    ))
    .orderBy(asc(projects.name));
  
  return result;
}

export async function getActiveProjects() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(projects)
    .where(and(
      eq(projects.isDeleted, false),
      ne(projects.status, 'concluido')
    ))
    .orderBy(asc(projects.name));
  
  return result;
}

