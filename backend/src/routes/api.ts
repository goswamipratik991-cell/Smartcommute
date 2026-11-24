import { Router } from 'express';
import {
  getAllCrowdSummaries,
  getCrowdReportsByStation,
  getHealth,
  getRoutes,
  getStations,
  postCrowdReport,
  postRecommendations,
} from '../controllers/transitController.ts';

const apiRouter = Router();

apiRouter.get('/health', getHealth);
apiRouter.get('/stations', getStations);
apiRouter.get('/routes', getRoutes);
apiRouter.post('/recommendations', postRecommendations);
apiRouter.get('/crowd-reports', getAllCrowdSummaries);
apiRouter.post('/crowd-reports', postCrowdReport);
apiRouter.get('/crowd-reports/:stationId', getCrowdReportsByStation);

export default apiRouter;
