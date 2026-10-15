import type { Request, Response } from "express";

import { PeopleService, PersonIdSchema } from "../services/people.service";
import { sendError } from "../utils/errors";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "../utils/pagination";

export class PeopleController {
    constructor(private readonly peopleService: PeopleService = new PeopleService()) {}

    findAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const page = Number(req.query.page ?? DEFAULT_PAGE);
            const limit = Number(req.query.limit ?? DEFAULT_LIMIT);
            res.status(200).json(await this.peopleService.getPaginatedShifts(page, limit));
        } catch (error) {
            sendError(res, error, "Unable to fetch people");
        }
    };

    create = async (req: Request, res: Response): Promise<void> => {
        try {
            const person = await this.peopleService.create(req.body);
            res.status(201).json(person);
        } catch (error) {
            sendError(res, error, "Unable to create person");
        }
    };

    update = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        try {
            const person = await this.peopleService.update(PersonIdSchema.parse(req.params.id), req.body);
            if (!person) {
                res.status(404).json({ status: "fail", message: "Person not found", errors: [] });
                return;
            }

            res.status(200).json(person);
        } catch (error) {
            sendError(res, error, "Unable to update person");
        }
    };

    delete = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        try {
            if (!(await this.peopleService.delete(PersonIdSchema.parse(req.params.id)))) {
                res.status(404).json({ status: "fail", message: "Person not found", errors: [] });
                return;
            }

            res.status(204).end();
        } catch (error) {
            sendError(res, error, "Unable to delete person");
        }
    };

    spin = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        try {
            const result = await this.peopleService.spin(PersonIdSchema.parse(req.params.id));
            if (!result) {
                res.status(404).json({ status: "fail", message: "Person not found", errors: [] });
                return;
            }

            res.status(200).json(result);
        } catch (error) {
            sendError(res, error, "Unable to spin for a match");
        }
    };
}
