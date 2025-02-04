import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json, urlencoded } from 'body-parser';
import { campaignController } from './api/campaignController';
import { logger } from './core/loggingSystem';
import { eventBus } from './core/eventBus';

class WellConnectProApp {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeEventListeners();
  }

  private initializeMiddlewares() {
    // Security middlewares
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsing middlewares
    this.app.use(json());
    this.app.use(urlencoded({ extended: true }));

    // Logging middleware
    this.app.use((req, res, next) => {
      logger.log('info', 'Request Received', {
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString()
      });
      next();
    });
  }

  private initializeRoutes() {
    // Campaign management routes
    this.app.use('/api/campaigns', campaignController.getRouter());

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    });
  }

  private initializeErrorHandling() {
    // 404 handler
    this.app.use((req, res, next) => {
      res.status(404).json({
        message: 'Endpoint Not Found',
        path: req.path
      });
    });

    // Global error handler
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.log('error', 'Unhandled Error', {
        message: err.message,
        stack: err.stack
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : err.message
      });
    });
  }

  private initializeEventListeners() {
    // Set up global event listeners
    eventBus.subscribe('system.startup', () => {
      logger.log('info', 'WellConnect Pro System Startup', {
        timestamp: new Date().toISOString()
      });
    });

    eventBus.subscribe('system.shutdown', () => {
      logger.log('info', 'WellConnect Pro System Shutdown', {
        timestamp: new Date().toISOString()
      });
    });
  }

  public start(port: number = 4000) {
    const server = this.app.listen(port, () => {
      logger.log('info', `WellConnect Pro Backend Started`, {
        port,
        environment: process.env.NODE_ENV || 'development'
      });

      // Publish system startup event
      eventBus.publish('system.startup');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.log('info', 'SIGTERM received. Shutting down gracefully');
      
      server.close(() => {
        eventBus.publish('system.shutdown');
        process.exit(0);
      });
    });

    return server;
  }
}

// Create and export app instance
export const wellConnectProApp = new WellConnectProApp();
