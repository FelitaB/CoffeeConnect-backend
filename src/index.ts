import express from "express";

import ChatRouter from "./routes/chat.routes.ts";
//import PeopleRouter from "./routes/people.routes.ts";

const app = express();

app.use(express.json());

app.use("/chats", ChatRouter);
//app.use("/people", PeopleRouter);

app.get("/", (_req, res) => {
	res.status(200).json({
		status: "active",
		message: "CoffeeConnect is running.",
	});
});

app.listen(5000);

export default app;