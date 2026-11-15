import express from 'express';

import { task4Router } from './src/api/task4.routes';

/** Demo server only. In the real project, mount task4Router on the existing backend instead. */
const app = express();
app.use(express.json());
app.use('/api/task4', task4Router);

const PORT = 3001;
app.listen(PORT, () => console.log(`Task 4 API running on http://localhost:${PORT}`));
