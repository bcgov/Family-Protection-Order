import { Location } from "@angular/common";
import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import {
  Router,
  Resolve,
  RouterStateSnapshot,
  ActivatedRouteSnapshot
} from "@angular/router";

import { GeneralDataService, UserInfo } from "../general-data.service";

@Injectable()
export class UserStatusResolver implements Resolve<any> {
  constructor(
    private router: Router,
    private location: Location,
    private dataService: GeneralDataService
  ) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<any> {
    const extUri =
      window.location.origin +
      this.location.prepareExternalUrl(
        "/prv/status?login_redirect=" + encodeURIComponent(state.url)
      );
    const reqTerms = route.data.accept_terms;
    const res = new Observable(sub => {
      this.dataService
        .getUserInfo()
        .then(result => {
          if (this.handleLogin(result, extUri, reqTerms)) sub.next();
          // otherwise - observable has no result, navigation paused
        })
        .catch(err => {
          this.handleLoadError(err);
          sub.next();
        })
        .then(() => sub.complete());
    });
    return res;
  }

  handleLogin(user: UserInfo, extUri: string, reqTerms: boolean) {
    if (user && !user.user_id && user.login_uri) {
      window.location.replace(
        user.login_uri + "?next=" + encodeURIComponent(extUri)
      );
      return false;
    } else if (user && reqTerms && !user.accepted_terms_at) {
      this.router.navigate(["/prv/status"]);
    }
    return true;
  }

  handleLoadError(err) {
    console.log("Status load error", err);
    this.router.navigate(["/prv/status"]);
  }
}
