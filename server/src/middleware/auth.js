import config from '../config/index.js';
import { getAuth } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';
import { userService } from '../services/user.service.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Missing or invalid authorization header');
    }

    const token = authHeader.split('Bearer ')[1];
    let decoded;

    if (config.authDevMode && token.startsWith('dev_')) {
      // Parse dev token: dev_<uid>_<email>_<encodedName>
      const parts = token.split('_');
      const uid = parts[1] || 'dev-user-1';
      const email = parts[2] || 'dev@collab.editor';
      const name = parts.length > 3 ? decodeURIComponent(parts.slice(3).join('_')) : 'Dev User';
      
      decoded = {
        uid,
        email,
        name,
      };
    } else {
      const auth = getAuth();
      if (!auth) {
        throw ApiError.unauthorized('Firebase Auth not configured on server');
      }
      decoded = await auth.verifyIdToken(token);
    }

    req.user = await userService.upsertFromAuth(decoded);
    req.auth = { uid: decoded.uid, email: decoded.email };
    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();
  return authenticate(req, res, next);
}

export default { authenticate, optionalAuth };
