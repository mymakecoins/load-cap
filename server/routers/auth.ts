import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return {
      success: true,
    } as const;
  }),
  
  login: publicProcedure
    .input(z.object({
      email: z.string().email("Email inválido"),
      password: z.string().min(1, "Senha é obrigatória"),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log("[Auth] Login attempt for email:", input.email);
      const user = await db.getUserByEmail(input.email);
      
      if (!user) {
        console.log("[Auth] User not found for email:", input.email);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha incorretos" });
      }
      
      console.log("[Auth] User found:", { id: user.id, email: user.email, hasPasswordHash: !!user.passwordHash });
      
      if (!user.passwordHash) {
        console.log("[Auth] User has no passwordHash");
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha incorretos" });
      }
      
      console.log("[Auth] Verifying password...");
      const isPasswordValid = await db.verifyPassword(user.passwordHash, input.password);
      console.log("[Auth] Password valid:", isPasswordValid);
      
      if (!isPasswordValid) {
        console.log("[Auth] Invalid password");
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha incorretos" });
      }
      
      const cookieOptions = getSessionCookieOptions(ctx.req);
      const cookieValue = String(user.id);
      
      console.log("[Auth] Setting cookie:", {
        name: COOKIE_NAME,
        value: cookieValue,
        options: cookieOptions,
      });
      
      ctx.res.cookie(COOKIE_NAME, cookieValue, {
        ...cookieOptions,
        maxAge: 31536000000, // 1 year in milliseconds
      });
      
      console.log("[Auth] Cookie set successfully, user authenticated:", user.email);
      
      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),
});
