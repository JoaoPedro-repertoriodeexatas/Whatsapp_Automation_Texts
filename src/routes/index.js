import { Router } from 'express';
import { handleHealth } from '../controllers/healthController.js';
import { handleWebhook } from '../controllers/webhookController.js';
import { instanceRoutes } from './instanceRoutes.js';

export const router = Router();

router.get('/health', handleHealth);
router.post('/webhook', handleWebhook);
router.use('/instances', instanceRoutes);
