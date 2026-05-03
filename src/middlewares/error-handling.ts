import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error";

const errorMiddleware = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) => {

    if (err instanceof AppError) {

        if (!err.isOperational) {
            console.error('[non-operational AppError]', err);
        }

        return res.status(err.statusCode).json({
            success: false,
            code: err.statusCode,
            message: err.message,
        });
    }

    console.error('[unhandled error]', err);

    return res.status(500).json({
        success: false,
        code: 500,
        message: 'Internal server error',
    });
};


export default errorMiddleware;