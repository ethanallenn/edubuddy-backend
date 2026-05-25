import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the Express Request interface so TypeScript allows us to attach user data to the request object
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const protectRoute = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Check if the token is present in the HTTP Authorization Header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]; // Extract the token from "Bearer <token>"
    }

    // 2. Reject if no token is found
    if (!token) {
      res.status(401).json({
        status: 'fail',
        message: 'Access Denied: You are not logged in. Please provide a valid authentication token.'
      });
      return;
    }

    // 3. Cryptographically verify the token using your server's secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string };

    // 4. Attach the verified user details to the request object for use down the line
    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    next(); // Pass the request along cleanly to the intended controller!
  } catch (error: any) {
    res.status(401).json({
      status: 'fail',
      message: 'Authentication failed: Token is invalid, tampered with, or expired.',
      error: error.message
    });
  }
};