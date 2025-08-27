import { Injectable, Logger, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    this.logger.debug('JwtAuthGuard.canActivate() called');
    this.logger.debug(
      `Authorization header: ${authHeader ? 'Present' : 'Missing'}`,
    );

    if (authHeader) {
      this.logger.debug(
        `Auth header format: ${authHeader.substring(0, 20)}...`,
      );
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    this.logger.debug('JwtAuthGuard.handleRequest() called');
    this.logger.debug(`Error: ${err ? err.message : 'None'}`);
    this.logger.debug(`User: ${user ? 'Found' : 'Not found'}`);
    this.logger.debug(`Info: ${info ? info.message : 'None'}`);

    return super.handleRequest(err, user, info, context);
  }
}
