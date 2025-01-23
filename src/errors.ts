export interface APIError {
    message: string;
    status: number;
    code?: string;
    details?: any;
}

export class APIErrorResponse extends Error {
    public status: number;
    public code?: string;
    public details?: any;

    constructor(error: APIError) {
        super(error.message);
        this.status = error.status;
        this.code = error.code;
        this.details = error.details;
    }

    toResponse(): Response {
        return new Response(
            JSON.stringify({
                error: {
                    message: this.message,
                    code: this.code,
                    details: this.details
                }
            }),
            {
                status: this.status,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

export function createErrorResponse(error: unknown): Response {
    if (error instanceof APIErrorResponse) {
        return error.toResponse();
    }

    if (error instanceof Error) {
        return new APIErrorResponse({
            message: error.message,
            status: (error as any).status || 500,
        }).toResponse();
    }

    if (typeof error === 'object' && error !== null) {
        return new APIErrorResponse({
            message: (error as any).message || 'Unknown error',
            status: (error as any).status || 500,
            details: error
        }).toResponse();
    }

    return new APIErrorResponse({
        message: 'Internal Server Error',
        status: 500,
        code: 'INTERNAL_ERROR'
    }).toResponse();
} 