import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      
      // Substituir placeholders de variáveis de ambiente antes do transform do Vite
      const appTitle = process.env.VITE_APP_TITLE || "Sistema de Gestão de Times";
      const appLogo = process.env.VITE_APP_LOGO || "/logo.jpeg";
      const analyticsEndpoint = process.env.VITE_ANALYTICS_ENDPOINT;
      const analyticsWebsiteId = process.env.VITE_ANALYTICS_WEBSITE_ID;
      
      template = template.replace(/%VITE_APP_TITLE%/g, appTitle);
      template = template.replace(/%VITE_APP_LOGO%/g, appLogo);
      
      // Substituir analytics apenas se configurado
      if (analyticsEndpoint && analyticsWebsiteId) {
        template = template.replace(
          /<!-- Analytics script será injetado dinamicamente se configurado -->/g,
          `<script defer src="${analyticsEndpoint}/umami" data-website-id="${analyticsWebsiteId}"></script>`
        );
      } else {
        template = template.replace(
          /<!-- Analytics script será injetado dinamicamente se configurado -->/g,
          ''
        );
      }
      
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    
    // Se o arquivo existe, ler e substituir placeholders caso ainda existam
    if (fs.existsSync(indexPath)) {
      try {
        let html = await fs.promises.readFile(indexPath, "utf-8");
        
        // Substituir placeholders que podem ter ficado após o build
        const appTitle = process.env.VITE_APP_TITLE || "Sistema de Gestão de Times";
        const appLogo = process.env.VITE_APP_LOGO || "/logo.jpeg";
        const analyticsEndpoint = process.env.VITE_ANALYTICS_ENDPOINT;
        const analyticsWebsiteId = process.env.VITE_ANALYTICS_WEBSITE_ID;
        
        html = html.replace(/%VITE_APP_TITLE%/g, appTitle);
        html = html.replace(/%VITE_APP_LOGO%/g, appLogo);
        
        // Substituir analytics apenas se configurado
        if (analyticsEndpoint && analyticsWebsiteId) {
          html = html.replace(
            /<!-- Analytics script será injetado dinamicamente se configurado -->/g,
            `<script defer src="${analyticsEndpoint}/umami" data-website-id="${analyticsWebsiteId}"></script>`
          );
        } else {
          html = html.replace(
            /<!-- Analytics script será injetado dinamicamente se configurado -->/g,
            ''
          );
        }
        
        // Remover scripts de analytics vazios ou com placeholders não substituídos
        html = html.replace(/%VITE_ANALYTICS_ENDPOINT%/g, '');
        html = html.replace(/%VITE_ANALYTICS_WEBSITE_ID%/g, '');
        html = html.replace(/<script[^>]*src="%VITE_ANALYTICS_ENDPOINT%[^"]*"[^>]*><\/script>/g, '');
        html = html.replace(/<script[^>]*src="\/umami"[^>]*><\/script>/g, '');
        
        res.status(200).set({ "Content-Type": "text/html" }).send(html);
      } catch (error) {
        console.error("Error reading index.html:", error);
        res.sendFile(indexPath);
      }
    } else {
      res.sendFile(indexPath);
    }
  });
}
