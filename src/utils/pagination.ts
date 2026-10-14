import { z } from "zod";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;

export const PaginationSchema = z.object({
    page: z.number("Page must be a number").int("Page must be a whole number").min(1, "Page must be 1 or greater"),
    limit: z.number("Limit must be a number").int("Limit must be a whole number").min(1, "Limit must be between 1 and 100").max(100, "Limit must be between 1 and 100"),
});

export interface Paginated<T> {
    data: T[],
    meta: {
        page: number,
        limit: number,
        total: number,
        totalPages: number
    }
}
