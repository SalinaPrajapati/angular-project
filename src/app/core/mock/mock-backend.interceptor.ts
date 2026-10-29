import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { MockApi } from "./mock-api";

export const mockBackendInterceptor: HttpInterceptorFn = (req, next) =>
  req.url.startsWith("/api/") ? inject(MockApi).handle(req) : next(req);
