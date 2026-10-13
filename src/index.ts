import express from "express";

const app = express();

app.get("/", (_req, res) => {
	res.status(200).json({
		status: "active",
		message: "CoffeeConnect is running.",
	});
});

app.listen(5000);

export default app;