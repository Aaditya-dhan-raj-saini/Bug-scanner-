import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dns from "dns";
import axios from "axios";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Simple Rate Limiting (Memory based for this demo)
  const ipCache = new Map<string, number>();
  const LIMIT = 5; // 5 scans per minute
  const WINDOW = 60000;

  const rateLimit = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || "unknown";
    const now = Date.now();
    const lastRequest = ipCache.get(ip) || 0;

    if (now - lastRequest < (WINDOW / LIMIT)) {
      return res.status(429).json({ error: "Too many requests. Please slow down for ethical scanning." });
    }
    
    ipCache.set(ip, now);
    next();
  };

  // API: DNS Lookup
  app.get("/api/scan/dns", rateLimit, async (req, res) => {
    const { target } = req.query;
    if (!target || typeof target !== "string") {
      return res.status(400).json({ error: "Target domain required" });
    }

    try {
      const records: any = {};
      
      const resolve = (type: any): Promise<any[]> => 
        new Promise((resolve) => {
          dns.resolve(target, type, (err, addresses) => {
            if (err) resolve([]);
            else resolve(addresses);
          });
        });

      records.A = await resolve("A");
      records.MX = await resolve("MX");
      records.TXT = await resolve("TXT");
      records.NS = await resolve("NS");

      res.json(records);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API: Header Security Audit
  app.get("/api/scan/headers", rateLimit, async (req, res) => {
    const { target } = req.query;
    if (!target || typeof target !== "string") {
      return res.status(400).json({ error: "Target URL required" });
    }

    const url = target.startsWith("http") ? target : `http://${target}`;

    try {
      const response = await axios.head(url, { 
        timeout: 5000,
        validateStatus: () => true, // Accept any status
        headers: { 'User-Agent': 'AetherSec-Audit-Bot/1.0' }
      });

      const headers = response.headers;
      const analysis = {
        hsts: !!headers["strict-transport-security"],
        csp: !!headers["content-security-policy"],
        xframe: !!headers["x-frame-options"],
        xss: !!headers["x-xss-protection"],
        nosniff: !!headers["x-content-type-options"],
        referrer: !!headers["referrer-policy"],
        server: headers["server"] || "Hidden",
        raw: headers
      };

      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ error: `Connection failed: ${error.message}` });
    }
  });

  // API: WHOIS (Minimal/Mock or public proxy if available)
  // For this toolkit, we'll focus on DNS and Headers as they are more reliable via Node internal libs.

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
