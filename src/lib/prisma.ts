import dotenv from "dotenv";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { Prisma, PrismaClient } from "../generated/prisma/client";

dotenv.config();

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
}

export const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(databaseUrl),
    omit: { person: { hashedPassword: true } },
});

export type AppPrismaClient = typeof prisma;

// P2025: the record targeted by an update/delete does not exist.
export function isRecordNotFound(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}
