import { Router } from "express";
import { PeopleController } from "../controllers/people.controller";

const router = Router();
const peopleController = new PeopleController();

router.get("/", peopleController.findAll);
router.post("/", peopleController.create);
router.post("/check-email", peopleController.checkEmail);
router.post("/login", peopleController.login);
router.post("/:id/spin", peopleController.spin);
router.patch("/:id", peopleController.update);
router.delete("/:id", peopleController.delete);

export default router;
