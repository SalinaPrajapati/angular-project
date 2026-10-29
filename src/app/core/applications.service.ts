import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ApplicationDetail,
  ApplicationFormValue,
  ApplicationSummary,
  Decision,
  ListQuery,
  StatusCounts,
  Page,
  Person,
  RiskLevel,
  SensitiveFields,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApplicationsService {
  private readonly http = inject(HttpClient);

  list(query: ListQuery): Observable<Page<ApplicationSummary>> {
    let params = new HttpParams().set('page', query.page).set('pageSize', query.pageSize);
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.search) {
      params = params.set('search', query.search);
    }
    return this.http.get<Page<ApplicationSummary>>('/api/applications', { params });
  }

  counts(): Observable<StatusCounts> {
    return this.http.get<StatusCounts>('/api/applications/counts');
  }

  get(id: string): Observable<ApplicationDetail> {
    return this.http.get<ApplicationDetail>(`/api/applications/${id}`);
  }

  getDraft(id: string): Observable<ApplicationFormValue> {
    return this.http.get<ApplicationFormValue>(`/api/applications/${id}/draft`);
  }

  createDraft(value: ApplicationFormValue): Observable<{ id: string }> {
    return this.http.post<{ id: string }>('/api/applications', { value });
  }

  updateDraft(id: string, value: ApplicationFormValue): Observable<{ id: string }> {
    return this.http.put<{ id: string }>(`/api/applications/${id}`, { value });
  }

  submit(id: string): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`/api/applications/${id}/submit`, {});
  }

  reveal(id: string): Observable<SensitiveFields> {
    return this.http.get<SensitiveFields>(`/api/applications/${id}/sensitive`);
  }

  decide(id: string, body: { decision: Decision; riskLevel: RiskLevel; note: string }): Observable<unknown> {
    return this.http.post(`/api/applications/${id}/decision`, body);
  }

  reviewers(): Observable<Person[]> {
    return this.http.get<Person[]>('/api/reviewers');
  }

  assign(id: string, reviewerId: string): Observable<unknown> {
    return this.http.put(`/api/applications/${id}/assignment`, { reviewerId });
  }
}
