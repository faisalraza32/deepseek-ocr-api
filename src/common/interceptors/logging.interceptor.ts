import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const startTime = Date.now();

    // Generate a unique request ID for tracking
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    request['requestId'] = requestId;

    // Log incoming request
    this.logger.log(
      `[${requestId}] Incoming ${method} ${url} - IP: ${ip} - UserAgent: ${userAgent}`,
    );

    // Log request body if present (excluding file uploads for brevity)
    if (request.body && Object.keys(request.body).length > 0) {
      this.logger.debug(`[${requestId}] Request body: ${JSON.stringify(request.body)}`);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          this.logger.log(`[${requestId}] ${method} ${url} ${statusCode} - ${duration}ms`);

          // Log response data size if present
          if (data) {
            const dataSize =
              JSON.stringify(data).length > 1000
                ? `${(JSON.stringify(data).length / 1024).toFixed(2)}KB`
                : `${JSON.stringify(data).length}B`;
            this.logger.debug(`[${requestId}] Response size: ${dataSize}`);
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(
            `[${requestId}] ${method} ${url} ${statusCode} - ${duration}ms - Error: ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }
}
