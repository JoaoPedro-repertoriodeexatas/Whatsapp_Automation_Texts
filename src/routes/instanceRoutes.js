import { Router } from 'express';
import {
  handleCreateInstance,
  handleGetInstanceQrCode,
  handleGetInstanceStatus,
} from '../controllers/instanceController.js';

export const instanceRoutes = Router();

instanceRoutes.post('/', handleCreateInstance);
instanceRoutes.get('/:name/status', handleGetInstanceStatus);
instanceRoutes.get('/:name/qrcode', handleGetInstanceQrCode);
