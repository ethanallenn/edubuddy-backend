import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authHandler.js';
import { listAdminActivities } from '../utils/adminActivityStore.js';

export const getAdminActivities = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({
        status: 'fail',
        message: 'Admin access required.'
      });
      return;
    }

    const schoolId = req.user?.school_id;

    if (!schoolId) {
      res.status(401).json({
        status: 'fail',
        message: 'Missing school context on authenticated request.'
      });
      return;
    }

    const limit = Number(req.query.limit || 20);
    const activities = await listAdminActivities(schoolId, limit);

    res.status(200).json({
      status: 'success',
      data: { activities }
    });
  } catch (error) {
    next(error);
  }
};