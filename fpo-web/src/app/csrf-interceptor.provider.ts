import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpXsrfTokenExtractor
} from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

// required to send CSRF token when the API doesn't share the same origin
@Injectable()
export class HttpCsrfInterceptor implements HttpInterceptor {
  constructor(private tokenExtractor: HttpXsrfTokenExtractor) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const headerName = "X-CSRFToken";
    if (req.method !== "GET") {
      const token = this.tokenExtractor.getToken() as string;
      if (token !== null && !req.headers.has(headerName)) {
        req = req.clone({ headers: req.headers.set(headerName, token) });
      }
    }
    return next.handle(req);
  }
}
