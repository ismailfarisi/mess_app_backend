import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LoggerService } from './logger.service';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body, query } = req;
    const contextName = `${method} ${url}`;

    // Log the incoming request
    this.logger.debug(
      `Incoming Request: ${method} ${url}
        Body: ${JSON.stringify(body)}
        Query: ${JSON.stringify(query)}`,
      'Request',
    );

    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof HttpException) {
          // Log HTTP exceptions as warnings
          this.logger.warn(
            `HTTP Exception: ${error.message}
              Status: ${error.getStatus()}
              Path: ${method} ${url}`,
            contextName,
          );
        } else {
          // Log other exceptions as errors
          this.logger.error(error.message, error.stack, contextName);
        }
        return throwError(() => error);
      }),
    );
  }
}
