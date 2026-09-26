import express from "express";
import { getRandomQuote, shareQuoteToConversation } from "../controllers/quote.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(protectRoute);
router.get("/random", getRandomQuote);
router.post("/share", shareQuoteToConversation);
export default router;
