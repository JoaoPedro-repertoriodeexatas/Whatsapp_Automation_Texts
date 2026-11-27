import { Router } from 'express';
import {
  handleListApiInstances,
  handleListConversationMessages,
  handleListConversations,
  handleSseEvents,
} from '../controllers/conversationController.js';

export const conversationRoutes = Router();

conversationRoutes.get('/events', handleSseEvents);
conversationRoutes.get('/instances', handleListApiInstances);
conversationRoutes.get('/conversations', handleListConversations);
conversationRoutes.get('/conversations/:instancia/:telefone/messages', handleListConversationMessages);
