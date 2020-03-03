import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import {
  Router,
  Resolve,
  RouterStateSnapshot,
  ActivatedRouteSnapshot
} from "@angular/router";

import { GeneralDataService } from "../general-data.service";

@Injectable()
export class UserStatusResolver implements Resolve<any> {
  constructor(
    private router: Router,
    private dataService: GeneralDataService
  ) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<any> {
    return from(
      this.dataService.requireLogin().catch(this.handleLoadError.bind(this))
    );
  }

  handleLoadError(err) {
    console.log("Status load error", err);
    this.router.navigate(["/prv/status"]);
  }
}
