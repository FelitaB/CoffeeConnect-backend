import cors from "cors";
import express from "express";

import ChatRouter from "./routes/chat.routes";
import PeopleRouter from "./routes/people.routes";

require('dotenv').config();

const app = express();

const allowedOrigins = (process.env["CORS_ORIGIN"] ?? "http://localhost:3000")
	.split(",")
	.map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use("/api/chats", ChatRouter);
app.use("/api/people", PeopleRouter);

app.get("/", (_req, res) => {
	res.status(200).json({
		status: "active",
		message: "CoffeeConnect is running.",
	});
});

app.listen(5000);

export default app;