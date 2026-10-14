import type { Request, Response } from "express";

import { PeopleService } from "../services/people.service.ts";

export class PeopleController {
    constructor(private readonly peopleService: PeopleService = new PeopleService()) {}

    findAll = (_req: Request, res: Response): void => {
        res.status(200).json(this.peopleService.findAll());
    };

    create = (req: Request, res: Response): void => {
        try {
            const person = this.peopleService.create(req.body);
            res.status(201).json(person);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to create person";
            res.status(400).json({ status: "fail", message, errors: [] });
        }
    };

    update = (req: Request<{ id: string }>, res: Response): void => {
        const id = this.parseId(req.params.id);
        if (id === undefined) {
            res.status(400).json({ status: "fail", message: "Person id must be a 5-digit number", errors: [] });
            return;
        }

        try {
            const person = this.peopleService.update(id, req.body);
            if (!person) {
                res.status(404).json({ status: "fail", message: "Person not found", errors: [] });
                return;
            }

            res.status(200).json(person);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to update person";
            res.status(400).json({ status: "fail", message, errors: [] });
        }
    };

    delete = (req: Request<{ id: string }>, res: Response): void => {
        const id = this.parseId(req.params.id);
        if (id === undefined) {
            res.status(400).json({ status: "fail", message: "Person id must be a 5-digit number", errors: [] });
            return;
        }

        if (!this.peopleService.delete(id)) {
            res.status(404).json({ status: "fail", message: "Person not found", errors: [] });
            return;
        }

        res.status(204).end();
    };

    spin = (req: Request<{ id: string }>, res: Response): void => {
        const id = this.parseId(req.params.id);
        if (id === undefined) {
            res.status(400).json({ status: "fail", message: "Person id must be a 5-digit number", errors: [] });
            return;
        }

        const result = this.peopleService.spin(id);
        if (!result) {
            res.status(404).json({ status: "fail", message: "Person not found", errors: [] });
            return;
        }

        res.status(200).json(result);
    };

    private parseId(raw: string): number | undefined {
        return /^\d{5}$/.test(raw) ? Number(raw) : undefined;
    }
}
