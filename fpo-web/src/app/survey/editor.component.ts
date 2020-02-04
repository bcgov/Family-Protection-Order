import { Component, Input, ViewEncapsulation, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import * as SurveyKO from "survey-knockout";
import * as SurveyCreator from "survey-creator";
import { addQuestionTypes, addToolboxOptions } from "./question-types";
import { GeneralDataService } from "../general-data.service";

@Component({
  selector: "survey-editor",
  templateUrl: "./editor.component.html",
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    "../../../node_modules/survey-creator/survey-creator.css",
    "./editor.component.scss"
  ]
})
export class SurveyEditorComponent implements OnInit {
  @Input() surveyJson: any;
  @Input() surveyPath: any;
  @Input() cacheName: string;
  @Input() onComplete: Function;

  public cacheKey: string;
  public cacheLoadTime: any;
  public editor: SurveyCreator.SurveyCreator;
  public loading = true;
  public error: string;
  private useLocalCache = true;

  constructor(
    private route: ActivatedRoute,
    private dataService: GeneralDataService
  ) {}

  ngOnInit() {
    if (!this.cacheName) {
      this.cacheName = this.route.snapshot.data.cache_name;
    }
    if (!this.surveyPath) {
      this.surveyPath = this.route.snapshot.data.survey_path;
    }
    if (!this.surveyJson) {
      this.surveyJson = this.route.snapshot.data.survey;
    }

    const surveyCssCls = SurveyKO.defaultBootstrapCss;
    surveyCssCls.page.root = "sv_page";
    surveyCssCls.pageDescription = "sv_page_description";
    surveyCssCls.pageTitle = "sv_page_title";
    surveyCssCls.navigationButton = "btn btn-primary";
    surveyCssCls.question.title = "sv_q_title";
    surveyCssCls.question.description = "sv_q_description small";
    surveyCssCls.panel.description = "sv_p_description";
    surveyCssCls.matrixdynamic.button = "btn btn-primary";
    surveyCssCls.paneldynamic.button = "btn btn-primary";
    surveyCssCls.paneldynamic.root = "sv_p_dynamic"; // not used?
    surveyCssCls.checkbox.item = "sv-checkbox";
    surveyCssCls.checkbox.controlLabel = "sv-checkbox-label";
    surveyCssCls.checkbox.materialDecorator = "";
    surveyCssCls.radiogroup.item = "sv-radio";
    surveyCssCls.radiogroup.controlLabel = "sv-checkbox-label";
    surveyCssCls.radiogroup.materialDecorator = "";

    const mainColor = "#38598a";
    const mainHoverColor = "#2d476f";
    const textColor = "#494949";
    const headerColor = "#555";
    const headerBackgroundColor = "#4a4a4a";
    const bodyContainerBackgroundColor = "#f8f8f8";
    const borderColor = "#aaa";

    const surveyThemeColors = SurveyKO.StylesManager.ThemeColors["default"];
    surveyThemeColors["$main-color"] = mainColor;
    surveyThemeColors["$main-hover-color"] = mainHoverColor;
    surveyThemeColors["$text-color"] = textColor;
    surveyThemeColors["$header-color"] = headerColor;
    surveyThemeColors["$header-background-color"] = headerBackgroundColor;
    surveyThemeColors[
      "$body-container-background-color"
    ] = bodyContainerBackgroundColor;

    const editorThemeColors =
      SurveyCreator.StylesManager.ThemeColors["default"];
    editorThemeColors["$primary-color"] = mainColor;
    editorThemeColors["$secondary-color"] = mainColor;
    editorThemeColors["$primary-border-color"] = borderColor;
    editorThemeColors["$secondary-border-color"] = borderColor;
    editorThemeColors["$primary-hover-color"] = mainHoverColor;
    editorThemeColors["$primary-text-color"] = textColor;
    editorThemeColors["$selection-border-color"] = mainColor;

    SurveyCreator.StylesManager.applySurveyTheme = () => null; // disable editor's reference to survey theme
    SurveyKO.StylesManager.applyTheme("bootstrap");
    SurveyCreator.StylesManager.applyTheme("bootstrap");

    this.loadSurvey();
  }

  loadSurvey(reload: boolean = false) {
    if (this.surveyJson && !reload) {
      this.loading = false;
      this.renderEditor();
    } else {
      this.loadCache().then(ok => {
        if (!ok && this.surveyPath) {
          this.dataService.loadJson(this.surveyPath).then(data => {
            this.surveyJson = data;
            this.loadSurvey();
          }); // .catch( (err) => ...)
        } else {
          this.loadSurvey();
        }
      });
    }
  }

  renderEditor() {
    if (!this.editor) {
      addQuestionTypes(SurveyKO);
      const editorOptions = {
        isAutoSave: true,
        showLogicTab: true,
        // showTestSurveyTab: false,
        // showPropertyGrid: "right",
        showToolbox: "right"
      };
      const editor = (this.editor = new SurveyCreator.SurveyCreator(
        "editorElement",
        editorOptions
      ));
      // editor.rightContainerActiveItem("toolbox");
      editor.saveSurveyFunc = (saveNo, callback) => {
        this.saveCache(callback);
      };
      addToolboxOptions(editor);
    }
    if (this.surveyJson) {
      this.editor.text = JSON.stringify(this.surveyJson, null, 2);
    }
  }

  resetCache() {
    this.dataService.clearSurveyCache(
      this.cacheName,
      this.cacheKey,
      this.useLocalCache
    );
    this.cacheLoadTime = null;
    this.cacheKey = null;
    this.loadSurvey(true);
  }

  loadCache() {
    return this.dataService
      .loadSurveyCache(this.cacheName, this.cacheKey, this.useLocalCache)
      .then(this.doneLoadCache.bind(this))
      .catch(err => this.doneLoadCache(null, err));
  }

  doneLoadCache(response, err) {
    if (response && response.result) {
      const cache = response.result;
      if (cache.data) {
        this.cacheLoadTime = cache.time;
        this.cacheKey = response.key;
        this.surveyJson = cache.data;
      }
      return true;
    }
    return false;
  }

  saveCache(saveNo?, callback?) {
    const survey = JSON.parse(this.editor.text);
    const cache = {
      time: new Date().getTime(),
      data: survey
    };
    this.dataService
      .saveSurveyCache(this.cacheName, cache, this.cacheKey, this.useLocalCache)
      .then(
        result => this.doneSaveCache(result, null, saveNo, callback),
        err => this.doneSaveCache(null, err, saveNo, callback)
      );
  }

  doneSaveCache(response, err, saveNo?, callback?) {
    if (response && response.status === "ok" && response.result) {
      this.cacheLoadTime = response.result.time;
      this.cacheKey = response.key;
    }
    !!callback && callback(saveNo, !err);
  }
}
