import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const request = host.switchToHttp().getRequest();
    const candidate = exception as any;
    const status = typeof candidate?.getStatus === 'function' ? Number(candidate.getStatus()) : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = typeof candidate?.getResponse === 'function' ? candidate.getResponse() : { message: 'Internal server error' };
    const body = typeof response === 'string' ? { message: response } : response;
    if (status >= 500) this.logger.error(`${request.method} ${request.url}`, exception instanceof Error ? exception.stack : String(exception));
    res.status(status).json({ statusCode: status, ...body, path: request.url, timestamp: new Date().toISOString() });
  }
}
