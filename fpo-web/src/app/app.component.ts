import { AfterViewInit, Component, Renderer2 } from "@angular/core";
import { LocationStrategy } from "@angular/common";
import { NavigationEnd, Router } from "@angular/router";
import { BreadcrumbComponent } from "./breadcrumb/breadcrumb.component";
import { GeneralDataService } from "./general-data.service";
import { InsertService } from "./insert/insert.service";
import { MatomoInjector } from "@ambroise-rabier/ngx-matomo";
import { environment } from "../environments/environment";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent implements AfterViewInit {
  title = "";
  _isPrv = false;

  constructor(
    private renderer: Renderer2,
    private router: Router,
    private locStrat: LocationStrategy,
    private dataService: GeneralDataService,
    private matomoInjector: MatomoInjector
  ) {}

  ngAfterViewInit(): void {
    let isPopState = false;
    let prevSlug: string;
    let prevUrl: string;
    let matomoEnabled: boolean;

    this.locStrat.onPopState(() => {
      isPopState = true;
    });

    if (environment.matomoUrl && environment.matomoSiteId) {
      this.matomoInjector.init({
        url: environment.matomoUrl,
        id: environment.matomoSiteId
      });
      matomoEnabled = true;
    }

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        if (!isPopState) {
          // scroll to page top only when navigating to a new page (not via history state)
          window.scrollTo(0, 0);
          isPopState = false;
        }
        isPopState = false;

        let nextSlug = event.url.slice(1);
        if (nextSlug.match(/^prv(\/|$)/)) {
          this._isPrv = true;
        } else {
          this._isPrv = false;
        }
        nextSlug = nextSlug.replace(/^prv\//, "").replace("/", "-");
        if (!nextSlug) nextSlug = "home";
        if (prevSlug) {
          this.renderer.removeClass(document.body, "ctx-" + prevSlug);
        }
        if (nextSlug) {
          this.renderer.addClass(document.body, "ctx-" + nextSlug);
        }
        prevSlug = nextSlug;

        if (matomoEnabled) {
          // init() handles the first URL, so only trigger on subsequent pages
          if (prevUrl) {
            this.matomoInjector.onPageChange({ referrer: prevUrl });
          }
          prevUrl = window.location.href;
        }
      }
    });
  }

  get isPrv() {
    return this._isPrv;
  }

  quickExit(): void {
    this.dataService.quickExit();
  }
}
