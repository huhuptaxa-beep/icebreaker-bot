import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
// import authRoutes from "./routes/auth";
import generateRoutes from "./routes/generate";
import userRoutes from "./routes/user";

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
// app.use("/auth", authRoutes);
app.use("/generate", generateRoutes);
app.use("/api", userRoutes);

// Health check
app.get("/", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "rizz-backend",
    version: "1.0.0",
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
  });
});

export default app;
