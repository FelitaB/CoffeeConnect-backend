import type { Response } from "express";
import { z } from "zod";

export class HttpError extends Error {
    constructor(readonly statusCode: number, message: string) {
        super(message);
    }
}

export function sendError(res: Response, error: unknown, fallbackMessage: string): void {
    if (error instanceof HttpError) {
        res.status(error.statusCode).json({ status: "fail", message: error.message, errors: [] });
        return;
    }

    if (error instanceof z.ZodError) {
        res.status(400).json({
            status: "fail",
            message: "Validation failed",
            errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
        });
        return;
    }

    const message = error instanceof Error ? error.message : fallbackMessage;
    res.status(400).json({ status: "fail", message, errors: [] });
}
