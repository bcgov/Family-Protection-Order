import { PlatformLocation } from "@angular/common";
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject } from "rxjs";
import { map } from "rxjs/operators";

export interface UserInfo {
  accepted_terms_at?: string;
  user_id?: string;
  [key: string]: any;
}

@Injectable()
export class GeneralDataService {
  private onUserInfo: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  private userInfo: any = null;
  // restrict to browser cache - not database
  private browserOnly = false;

  constructor(
    private http: HttpClient,
    private platformLocation: PlatformLocation
  ) {}

  getBaseHref(): string {
    return this.platformLocation.getBaseHrefFromDOM() || "/";
  }

  getApiUrl(action: string): string {
    return "http://localhost:8081/api/v1/" + action;
  }

  getBrowserUser() {
    const userKey = "temp-user";
    const sessionUser = sessionStorage.getItem(userKey);
    let user = null;
    try {
      user = sessionUser ? JSON.parse(sessionUser) : null;
    } catch (e) {}
    if (!user) {
      user = {
        accepted_terms_at: null, // "2018-09-14T05:46:24.165233Z",
        demo_user: true,
        surveys: [],
        user_id: userKey
      };
      sessionStorage.setItem(userKey, JSON.stringify(user));
    }
    return user;
  }

  updateBrowserUser(params?: any) {
    const user = this.getBrowserUser();
    if (params) Object.assign(user, params);
    sessionStorage.setItem("temp-user", JSON.stringify(user));
  }

  clearSession() {
    sessionStorage.clear();
  }

  quickExit() {
    const div = document.createElement("div");
    div.style.background = "#fff";
    div.style.position = "absolute";
    div.style.left = "0px";
    div.style.top = "0px";
    div.style.right = "0px";
    div.style.bottom = "0px";
    div.style.zIndex = "999999";
    document.body.appendChild(div);
    this.clearSession();
    document.title = "";
    location.replace("https://www.google.com");
  }

  loadJson(
    url: string,
    params?: any,
    headers?: any,
    relative?: boolean
  ): Promise<object> {
    if (!url) return Promise.reject("Cache name not defined");
    if (relative) url = this.getBaseHref() + url;
    return this.http
      .get(url, { params, headers, withCredentials: true })
      .toPromise()
      .catch((error: any) => {
        return Promise.reject(error.message || error);
      });
  }

  loadUserInfo(demo_login?: string): Promise<UserInfo | null> {
    if (this.browserOnly) {
      return new Promise(resolve => {
        try {
          const user = this.getBrowserUser();
          this.returnUserInfo(user);
          resolve(user);
        } catch (e) {
          console.error(e);
        }
      });
    } else {
      let headers = null;
      if (demo_login !== undefined) {
        headers = { "X-DEMO-LOGIN": demo_login };
      }
      const url = this.getApiUrl("user-info/");
      return this.loadJson(url, { t: new Date().getTime() }, headers)
        .then(result => {
          this.returnUserInfo(result);
          return result;
        })
        .catch(error => {
          console.log("Error loading user information:", error);
          this.returnUserInfo(null);
          return Promise.reject(error);
        });
    }
  }

  currentUserInfo(): UserInfo {
    return this.userInfo;
  }

  getUserInfo(demo_login?: string): Promise<UserInfo | null> {
    if (this.userInfo) {
      return Promise.resolve(this.userInfo);
    }
    return this.loadUserInfo(demo_login);
  }

  logout() {
    if (this.browserOnly) {
      this.clearSession();
      window.location.replace(this.getBaseHref());
    } else if (this.userInfo && this.userInfo.demo_user) {
      // clear demo login cookie
      this.loadUserInfo("").then(() => {
        window.location.replace(this.getBaseHref());
      });
    } else if (this.userInfo && this.userInfo.logout_uri) {
      window.location.replace(this.userInfo.logout_uri);
    }
  }

  returnUserInfo(result) {
    console.log("user info:", result);
    this.userInfo = result;
    this.onUserInfo.next(result);
  }

  subscribeUserInfo(callb) {
    return this.onUserInfo.subscribe(callb);
  }

  isLoggedIn(): boolean {
    return !!(this.userInfo && this.userInfo.user_id);
  }

  loginUri(): string {
    return this.userInfo && this.userInfo.login_uri;
  }

  acceptTerms() {
    if (this.browserOnly) {
      this.updateBrowserUser({ accepted_terms_at: new Date().toString() });
      return this.loadUserInfo();
    } else {
      const url = this.getApiUrl("accept-terms/");
      return this.http
        .post(url, null, { withCredentials: true })
        .toPromise()
        .then(result => this.loadUserInfo());
    }
  }

  clearSurveyResult(
    collection: string,
    name: string,
    key: string,
    useLocal?: boolean
  ) {
    if (!name) return Promise.reject("Survey type not defined");
    const localKey = "survey-" + collection + "-" + name;
    if (this.browserOnly) {
      return new Promise(resolve => {
        if (key) sessionStorage.removeItem(localKey + "-key");
        let index = this.getLocalSurveyCache(collection, name, "index", true);
        index = index ? index.result.filter(x => x.key !== key) : [];
        sessionStorage.setItem(localKey + "-index", JSON.stringify(index));
        resolve(null);
      });
    }
    if (useLocal) {
      localStorage.removeItem(localKey);
    }
    const url = this.getApiUrl(
      "survey-result/" +
        encodeURIComponent(collection) +
        "/" +
        encodeURIComponent(name) +
        "/" +
        encodeURIComponent(key)
    );
    return this.http
      .delete(url, { withCredentials: true })
      .pipe(
        map((result: any) => {
          return result;
        })
      )
      .toPromise()
      .catch((error: any) => {
        return Promise.reject(error.message || error);
      });
    // return this.saveSurveyResult(collection, name, null, key);
  }

  loadSurveyResultIndex(collection: string, name: string, useLocal?: boolean) {
    if (!collection) return Promise.reject("Survey collection not defined");
    if (!name) return Promise.reject("Survey type not defined");
    if (this.browserOnly) {
      return this.loadSurveyResult(collection, name, "index", true);
    }
    const url = this.getApiUrl(
      "survey-result/" +
        encodeURIComponent(collection) +
        "/" +
        encodeURIComponent(name)
    );
    return this.loadJson(url, { t: new Date().getTime() })
      .then(result =>
        this.returnSurveyResult(
          collection,
          name,
          "index",
          result,
          null,
          useLocal
        )
      )
      .catch(err =>
        this.returnSurveyResult(collection, name, "index", null, err, useLocal)
      );
  }

  loadSurveyResult(
    collection: string,
    name: string,
    key: string,
    useLocal?: boolean
  ) {
    if (!name) return Promise.reject("Survey type not defined");
    if (this.browserOnly) {
      return this.loadUserInfo().then(info => {
        if (!info.accepted_terms_at && key !== "index") {
          return { accept_terms: true };
        }
        return this.getLocalSurveyCache(collection, name, key, true);
      });
    }
    if (!key) {
      return Promise.reject("Survey id not defined");
    }
    const url = this.getApiUrl(
      "survey-result/" +
        encodeURIComponent(collection) +
        "/" +
        encodeURIComponent(name) +
        "/" +
        encodeURIComponent(key)
    );
    return this.loadJson(url, { t: new Date().getTime() })
      .then(result =>
        this.returnSurveyResult(collection, name, key, result, null, useLocal)
      )
      .catch(err =>
        this.returnSurveyResult(collection, name, key, null, err, useLocal)
      );
  }

  getLocalSurveyCache(collection: string, name: string, key: string, session?) {
    const localKey = "survey-" + collection + "-" + name;
    let cached;
    if (session) {
      if (key === "clear") {
        cached = sessionStorage.removeItem(localKey + "-latest");
        return;
      }
      if (!key) key = sessionStorage.getItem(localKey + "-latest");
      else if (key !== "index")
        sessionStorage.setItem(localKey + "-latest", key);
      if (key) cached = sessionStorage.getItem(localKey + "-" + key);
    } else {
      cached = localStorage.getItem(localKey);
    }
    let result = null;
    if (cached) {
      cached = JSON.parse(cached);
      if (cached) {
        result = { uid: null, local: true, key: key, result: cached };
      }
    }
    return result;
  }

  saveLocalSurveyCache(
    collection: string,
    name: string,
    data,
    key?: string,
    session?
  ) {
    const localKey = "survey-" + collection + "-" + name;
    if (session) {
      if (!key) key = "" + Math.round(Math.random() * 10000000);
      sessionStorage.setItem(localKey + "-" + key, JSON.stringify(data));
      let index = this.getLocalSurveyCache(collection, name, "index", true);
      index = index ? index.result.filter(x => x.key !== key) : [];
      const idxCopy = Object.assign({}, data);
      delete idxCopy["data"];
      idxCopy["key"] = key;
      index.push(idxCopy);
      sessionStorage.setItem(localKey + "-index", JSON.stringify(index));
      sessionStorage.setItem(localKey + "-latest", key);
      return key;
    } else {
      localStorage.setItem(localKey, JSON.stringify(data));
    }
  }

  returnSurveyResult(
    collection: string,
    name: string,
    key: string,
    result,
    err,
    useLocal?: boolean
  ) {
    if ((!result || !result.key) && useLocal) {
      result = this.getLocalSurveyCache(collection, name, key);
    }
    return result;
  }

  saveSurveyResult(
    collection: string,
    name: string,
    data: object,
    key?: string,
    useLocal?: boolean
  ) {
    if (!name) return Promise.reject("Survey type not defined");
    if (this.browserOnly) {
      key = this.saveLocalSurveyCache(collection, name, data, key, true);
      return Promise.resolve({
        user_id: null,
        local: true,
        key: key,
        status: "ok",
        result: data
      });
    }
    let url = this.getApiUrl(
      "survey-result/" +
        encodeURIComponent(collection) +
        "/" +
        encodeURIComponent(name)
    );
    if (key) url += "/" + encodeURIComponent(key);
    const headers = { "Content-Type": "application/json" };
    const postData = data === null ? "" : JSON.stringify(data);
    let savedLocal = false;
    if (useLocal && postData) {
      this.saveLocalSurveyCache(collection, name, data, key);
      savedLocal = true;
    }
    return this.http
      .post(url, postData, { headers, withCredentials: true })
      .pipe(
        map((result: any) => {
          if (result && result.key) result.result = data;
          return result;
        })
      )
      .toPromise()
      .catch((error: any) => {
        if (savedLocal) {
          return Promise.resolve({
            user_id: null,
            local: true,
            key: null,
            status: "ok",
            result: data
          });
        }
        return Promise.reject(error.message || error);
      });
  }
}
