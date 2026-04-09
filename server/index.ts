import express from "express";
import path from "path";
import { registerRoutes } from "./routes";

const app = express();
app.use(express.json());

const distPath = path.join(process.cwd(), "dist", "public");
app.use(express.static(distPath));

registerRoutes(null, app).then((server) => {
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});