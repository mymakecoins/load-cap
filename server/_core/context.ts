import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  if (!cookieHeader) {
    return new Map<string, string>();
  }
  const parsed = parseCookieHeader(cookieHeader);
  return new Map(Object.entries(parsed));
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Autenticação local: ler user ID do cookie
    const cookies = parseCookies(opts.req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    
      if (sessionCookie) {
        // O cookie contém o ID do usuário (número)
        const userId = parseInt(sessionCookie, 10);
        if (!isNaN(userId)) {
          user = (await db.getUserById(userId)) ?? null;
        }
      }
  } catch (error) {
    // Authentication is optional for public procedures.
    console.warn("[Auth] Error authenticating user:", error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
