import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { GeneralDataService } from "../general-data.service";

@Component({
  selector: "app-status",
  templateUrl: "./status.component.html",
  styleUrls: ["./status.component.scss"]
})
export class UserStatusComponent implements OnInit, OnDestroy {
  public error: string;
  public loading = true;
  private _preAccept = false;
  private _surveyIndex = [];
  public status: any;
  private _statusSub = null;
  private _loginRedirect: string = null;

  constructor(
    private dataService: GeneralDataService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this._statusSub = this.dataService.subscribeUserInfo(
      this.updateInfo.bind(this)
    );
    this.route.queryParams.subscribe(params => {
      this._loginRedirect = params.login_redirect;
      this.finishLogin(this.dataService.getUserInfo());
    });
  }

  updateInfo(status) {
    this.status = status;
  }

  ngOnDestroy() {
    if (this._statusSub) this._statusSub.unsubscribe();
  }

  get acceptedTerms(): boolean {
    return this.status && this.status.accepted_terms_at;
  }

  get loggedIn(): boolean {
    return this.status && this.status.user_id;
  }

  get preAccept(): boolean {
    return this._preAccept;
  }

  setPreAccept(val) {
    this._preAccept = val;
  }

  acceptTerms() {
    this.dataService.acceptTerms();
  }

  finishLogin(request) {
    return request
      .then(result => {
        this.loading = false;
        if (this._loginRedirect) {
          if (result && result.user_id) {
            this.router.navigateByUrl(this._loginRedirect);
          } else {
            console.error("Login session not found after redirect");
          }
        } else {
          this.loadSurveyIndex();
        }
      })
      .catch(err => {
        this.loading = false;
        this.loadSurveyIndex();
      });
  }

  get surveyIndex() {
    const index = [];
    if (this._surveyIndex) {
      for (let entry of this._surveyIndex) {
        if (entry.result) {
          // API returns different format than browser cache
          entry = { ...entry.result, key: entry.id };
        }
        if (entry.time) index.push(entry);
      }
      index.sort((a, b) => b.time - a.time);
    }
    return index;
  }

  loadSurveyIndex() {
    return this.dataService
      .loadSurveyResultIndex("default", "primary", false)
      .then(result => {
        this._surveyIndex = result.result || [];
      })
      .catch(err => {
        this._surveyIndex = [];
      });
  }

  beginSurvey() {
    // clear most-recent survey cache
    // return this.dataService.loadSurveyCache('primary', 'clear', false)
    //   .then((result) => { this.router.navigate(['prv/survey']); })
    //   .catch((err) => { this.router.navigate(['prv/survey']); });
    this.router.navigate(["/prv/survey"]);
  }

  resumeSurvey(key) {
    // return this.dataService
    //   .loadSurveyResult('', "primary", key, false)
    //   .then(result => {
    //     this.router.navigate(["prv/survey"]);
    //   });
    this.router.navigate(["/prv/survey/", key]);
  }

  showPrintSurvey(key) {
    // return this.dataService
    //   .loadSurveyCache("primary", key, false)
    //   .then(result => {
    //     this.router.navigate(["prv/survey"], { fragment: "print" });
    //   });
    this.router.navigate(["/prv/survey/", key], { fragment: "print" });
  }

  removeSurvey(key) {
    return this.dataService
      .clearSurveyResult("default", "primary", key)
      .then(result => {
        this.loadSurveyIndex();
      });
  }

  logout() {
    this.dataService.logout();
  }

  performLogin(demo_login?: string) {
    this.loading = true;
    this.finishLogin(this.dataService.loadUserInfo(demo_login));
  }
}
