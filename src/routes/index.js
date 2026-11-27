import { Router } from 'express';
import { handleHealth } from '../controllers/healthController.js';
import { handleWebhook } from '../controllers/webhookController.js';

export const router = Router();

router.get('/health', handleHealth);
router.post('/webhook', handleWebhook);
