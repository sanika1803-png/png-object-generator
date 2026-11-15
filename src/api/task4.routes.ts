import { Router } from 'express';

import { generateController, scanController } from './task4.controller.js';

/** Mount with: app.use('/api/task4', task4Router) — match your project's route convention. */
export const task4Router = Router();
task4Router.post('/scan', scanController);
task4Router.post('/generate', generateController);
