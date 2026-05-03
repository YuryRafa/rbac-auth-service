import "dotenv/config";
import express from "express";
import authRoutes from "./routes/authRoutes";
import indexRoute from "./routes"
import userRoutes from "./routes/userRoutes"
import errorMiddleware from "./middlewares/error-handling";
import helmet from "helmet";
import cors from 'cors';
import jwtMiddleware from "./middlewares/jwt-middleware";

const app = express();

const corsOptions = {
    "origin": process.env.CORS_ORIGIN,
    "methods": ["GET", "POST", "PUT", "PATCH", "DELETE"],
    "credentials": true,


}

app.use(helmet());
app.use(cors(corsOptions));

app.use(express.json());

app.use("/", indexRoute);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use(jwtMiddleware);
app.use(errorMiddleware);



export default app;
