import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.routes';
import { productRouter } from './modules/product/product.routes';
import { inventoryRouter } from './modules/inventory/inventory.routes';
import { salesRouter } from './modules/sales/sales.routes';
import { purchaseRouter } from './modules/purchase/purchase.routes';
import { manufacturingRouter } from './modules/manufacturing/manufacturing.routes';
import { procurementRouter } from './modules/procurement/procurement.routes';
import { auditRouter } from './modules/audit/audit.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';

const app: Application = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Module Routes
app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/sales', salesRouter);
app.use('/api/purchase', purchaseRouter);
app.use('/api/manufacturing', manufacturingRouter);
app.use('/api/procurement', procurementRouter);
app.use('/api/audit', auditRouter);
app.use('/api/dashboard', dashboardRouter);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Internal Server Error',
  });
});

export default app;
// Force dev server restart to reload regenerated Prisma Client

