import { Router } from "express";
import { PeopleController } from "../controllers/people.controller";

const router = Router();
const peopleController = new PeopleController();

router.get("/", peopleController.findAll);
router.get("/:id", peopleController.findById);
router.post("/", peopleController.create);
router.post("/check-email", peopleController.checkEmail);
router.post("/verify-setup-identity", peopleController.verifySetupIdentity);
router.post("/login", peopleController.login);
router.post("/set-password", peopleController.setPassword);
router.post("/:id/complete-registration", peopleController.completeRegistration);
router.post("/:id/spin", peopleController.spin);
router.post("/:id/spin/accept", peopleController.acceptMatch);
router.post("/:id/spin/decline", peopleController.declineMatch);
router.get("/:id/matches/pending", peopleController.findPendingMatches);
router.get("/:id/meetups", peopleController.findMeetups);
router.post("/:id/matches/:matchId/booking/propose", peopleController.proposeBooking);
router.post("/:id/matches/:matchId/booking/accept", peopleController.acceptBookingSlot);
router.post("/:id/matches/:matchId/complete", peopleController.completeMatch);
router.post("/:id/matches/:matchId/accept", peopleController.acceptIncomingMatch);
router.post("/:id/matches/:matchId/decline", peopleController.declineIncomingMatch);
router.patch("/:id", peopleController.update);
router.delete("/:id", peopleController.delete);

export default router;
