import type { Request, Response } from "express";

import { MatchRecordIdSchema, PeopleService, PersonIdSchema } from "../services/people.service";
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

    findById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        try {
            const person = await this.peopleService.findById(PersonIdSchema.parse(req.params.id));
            if (!person) {
                res.status(404).json({ status: "fail", message: "Person not found", errors: [] });
                return;
            }

            res.status(200).json(person);
        } catch (error) {
            sendError(res, error, "Unable to fetch person");
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

    checkEmail = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.peopleService.checkEmail(req.body));
        } catch (error) {
            sendError(res, error, "Unable to check email");
        }
    };

    login = async (req: Request, res: Response): Promise<void> => {
        try {
            const person = await this.peopleService.login(req.body);
            if (!person) {
                res.status(401).json({ status: "fail", message: "Invalid email or password", errors: [] });
                return;
            }

            res.status(200).json(person);
        } catch (error) {
            sendError(res, error, "Unable to sign in");
        }
    };

    setPassword = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.peopleService.setPassword(req.body));
        } catch (error) {
            sendError(res, error, "Unable to set password");
        }
    };

    completeRegistration = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        try {
            const person = await this.peopleService.completeRegistration(PersonIdSchema.parse(req.params.id), req.body);
            if (!person) {
                res.status(404).json({ status: "fail", message: "Person not found", errors: [] });
                return;
            }

            res.status(200).json(person);
        } catch (error) {
            sendError(res, error, "Unable to complete registration");
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

    acceptMatch = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        try {
            const result = await this.peopleService.acceptMatch(PersonIdSchema.parse(req.params.id));
            if (!result) {
                res.status(404).json({ status: "fail", message: "Person not found", errors: [] });
                return;
            }

            res.status(201).json(result);
        } catch (error) {
            sendError(res, error, "Unable to accept match");
        }
    };

    declineMatch = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        try {
            if (!(await this.peopleService.declineMatch(PersonIdSchema.parse(req.params.id)))) {
                res.status(404).json({ status: "fail", message: "Person not found", errors: [] });
                return;
            }

            res.status(204).end();
        } catch (error) {
            sendError(res, error, "Unable to decline match");
        }
    };

    acceptIncomingMatch = async (req: Request<{ id: string, matchId: string }>, res: Response): Promise<void> => {
        try {
            const result = await this.peopleService.acceptIncomingMatch(
                PersonIdSchema.parse(req.params.id),
                MatchRecordIdSchema.parse(req.params.matchId),
            );
            if (!result) {
                res.status(404).json({ status: "fail", message: "Person not found", errors: [] });
                return;
            }

            res.status(200).json(result);
        } catch (error) {
            sendError(res, error, "Unable to accept incoming match");
        }
    };

    findPendingMatches = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        try {
            const matches = await this.peopleService.findPendingMatches(PersonIdSchema.parse(req.params.id));
            if (!matches) {
                res.status(404).json({ status: "fail", message: "Person not found", errors: [] });
                return;
            }

            res.status(200).json(matches);
        } catch (error) {
            sendError(res, error, "Unable to fetch pending matches");
        }
    };

    findMeetups = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        try {
            const meetups = await this.peopleService.findMeetups(PersonIdSchema.parse(req.params.id));
            if (!meetups) {
                res.status(404).json({ status: "fail", message: "Person not found", errors: [] });
                return;
            }
            res.status(200).json(meetups);
        } catch (error) {
            sendError(res, error, "Unable to fetch meetups");
        }
    };

    completeMatch = async (req: Request<{ id: string, matchId: string }>, res: Response): Promise<void> => {
        try {
            const match = await this.peopleService.completeMatch(
                PersonIdSchema.parse(req.params.id),
                MatchRecordIdSchema.parse(req.params.matchId),
            );
            if (!match) {
                res.status(404).json({ status: "fail", message: "Person not found", errors: [] });
                return;
            }
            res.status(200).json(match);
        } catch (error) {
            sendError(res, error, "Unable to complete match");
        }
    };

    declineIncomingMatch = async (req: Request<{ id: string, matchId: string }>, res: Response): Promise<void> => {
        try {
            if (!(await this.peopleService.declineIncomingMatch(
                PersonIdSchema.parse(req.params.id),
                MatchRecordIdSchema.parse(req.params.matchId),
            ))) {
                res.status(404).json({ status: "fail", message: "Person not found", errors: [] });
                return;
            }

            res.status(204).end();
        } catch (error) {
            sendError(res, error, "Unable to decline incoming match");
        }
    };
}
