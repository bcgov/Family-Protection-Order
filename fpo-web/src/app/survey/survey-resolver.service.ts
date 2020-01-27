import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import {
  Router,
  Resolve,
  RouterStateSnapshot,
  ActivatedRouteSnapshot
} from "@angular/router";
import { HttpClient } from "@angular/common/http";
import "rxjs/add/operator/map";

@Injectable()
export class SurveyResolver implements Resolve<any> {
  constructor(private router: Router, private http: HttpClient) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<object> {
    if (route.data.survey) {
      return Observable.of(route.data.survey);
    }

    if (route.data.survey_path) {
      return this.http.get(route.data.survey_path, {
        params: { t: "" + new Date().getTime() }
      }); //.catch(this.handleLoadError);
    }
  }

  handeLoadError() {
    this.router.navigate(["not-found"]);
  }
}
