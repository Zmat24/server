import { Schema } from "./types";
import { APIErrorResponse } from "./errors";
import { verifyJWT } from "./JWT";

export interface MiddlewareContext {
    req: Request;
    schema: Schema;
    schemaName: string;
    action: string;
}

export type Middleware = (context: MiddlewareContext) => Promise<Response | null>;

export const authMiddleware: Middleware = async (context) => {
    const { req, schema, schemaName } = context;
    const currentSchema = schema[schemaName];

    if (!currentSchema.auth) {
        return null;
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new APIErrorResponse({
            message: 'Authentication required',
            status: 401,
            code: 'AUTH_REQUIRED'
        });
    }

    const token = authHeader.split(' ')[1];
    try {
        const isValid = verifyJWT(token, process.env.JWT_SECRET);
        if (!isValid) {
            throw new Error('Invalid token');
        }
        return null;
    } catch (error) {
        throw new APIErrorResponse({
            message: 'Invalid token',
            status: 401,
            code: 'INVALID_TOKEN',
            details: error
        });
    }
};

export const middlewares: { [key: string]: Middleware } = {
    auth: authMiddleware,
}; 