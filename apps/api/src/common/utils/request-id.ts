import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const id = req.headers['x-request-id'] ?? randomUUID();
    req.requestId = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
