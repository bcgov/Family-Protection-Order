function fixCheckboxes(Survey) {
  const widget = {
    name: "fixchecks",
    isFit: function(question) {
      const t = question.getType();
      return (
        t === "radiogroup" ||
        t === "checkbox" ||
        t === "matrix" ||
        t === "boolean"
      );
    },
    isDefaultRender: true,
    afterRender: function(question, el) {
      // if(1) return;
      const elts = el.getElementsByTagName("input");
      for (let idx = 0; idx < elts.length; idx++) {
        const input = elts[idx];
        if (input.type !== "radio" && input.type !== "checkbox") continue;
        const newInput = document.createElement("input");
        for (const k of input.getAttributeNames()) {
          newInput.setAttribute(k, input.getAttribute(k));
        }
        if (!newInput.id) {
          newInput.id = (newInput.name || question.name) + "-" + idx;
        }
        newInput.checked = input.checked;
        const outer = input.parentNode;
        const contain = outer.parentNode;
        let label = undefined;
        for (const child of outer.children) {
          if (child.tagName.toLowerCase() === "span") {
            if (
              child.className.indexOf("circle") < 0 &&
              child.className.indexOf("check") < 0 &&
              child.className.indexOf("checkbox-material") < 0
            ) {
              label = child;
              break;
            }
          }
        }
        if (question.getType() !== "boolean" && label)
          label = label.children[0];
        let wrap = contain;
        if (wrap.tagName.toLowerCase() !== "div") {
          wrap = document.createElement("div");
          if (question.getType() !== "boolean") wrap.className = newInput.type;
          contain.insertBefore(wrap, outer);
          wrap.appendChild(outer);
        }
        wrap.insertBefore(newInput, outer);
        const newLabel = document.createElement("label");
        newLabel.setAttribute("for", newInput.id);
        if (label) {
          label.style.marginLeft = "0.3em";
          newLabel.appendChild(label);
        }
        wrap.insertBefore(newLabel, outer);
        wrap.removeChild(outer);

        newInput.addEventListener("click", event => {
          const target = <HTMLInputElement>event.target;
          if (question.getType() === "matrix") {
            if (target.checked) {
              question.generatedVisibleRows.forEach(function(row, index, rows) {
                if (row.fullName === target.name) {
                  row.value = target.value;
                }
              });
            }
          } else if (question.getType() === "checkbox") {
            const oldValue = question.value || [];
            const index = oldValue.indexOf(target.value);
            if (index >= 0) {
              if (!target.checked) {
                oldValue.splice(index, 1);
                question.value = oldValue;
              }
            } else if (target.checked) {
              question.value = oldValue.concat([target.value]);
            }
          } else if (target.checked) {
            question.value = target.value;
          }
        });
      }

      question.valueChangedCallback = function() {
        if (question.getType() !== "matrix") {
          let values = question.value || [];
          if (!Array.isArray(values)) {
            values = [values];
          }
          const inputElts = el.getElementsByTagName("input");
          for (let i = 0; i < inputElts.length; i++) {
            inputElts[i].checked = values.indexOf(inputElts[i].value) >= 0;
          }
        } else {
          question.generatedVisibleRows.forEach(function(row, index, rows) {
            if (row.value) {
              const inputElts = el.getElementsByTagName("input");
              for (let i = 0; i < inputElts.length; i++) {
                if (
                  inputElts[i].name === row.fullName &&
                  inputElts[i].value === row.value
                ) {
                  inputElts[i].checked = true;
                }
              }
            }
          });
        }
      };
    },
    willUnmount: function(question, el) {}
  };

  Survey.CustomWidgetCollection.Instance.addCustomWidget(widget, "type");
}

function initHelpText(Survey) {
  const widget = {
    name: "helptext",
    title: "Expanding FAQ",
    iconName: "icon-panel",
    widgetIsLoaded: function() {
      return true;
    },
    isFit: function(question) {
      return question.getType() === "helptext";
    },
    activatedByChanged: function(activatedBy) {
      Survey.JsonObject.metaData.addClass("helptext", [], null, "empty");
      Survey.JsonObject.metaData.addProperties("helptext", [
        {
          name: "body:text"
        }
      ]);
    },
    htmlTemplate: "<div></div>",
    afterRender: function(question, el) {
      while (el.childNodes.length) el.removeChild(el.childNodes[0]);

      const outer = document.createElement("div");
      let outerCls = "panel panel-default survey-expander ";
      if (question.messageStyle === "box") outerCls += "survey-helptext";
      else outerCls += "survey-inlinetext";
      outer.className = outerCls;
      const header = document.createElement("div");
      header.className = "panel-heading";
      const lbl = document.createElement("label");
      lbl.className = "panel-title";
      lbl.tabIndex = 0;
      lbl.addEventListener("keydown", event => {
        // let target = <HTMLInputElement>event.target;
        if (event.keyCode === 32) {
          // space
          question.value = !question.value;
        }
      });
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = !!question.value;
      chk.style.visibility = "hidden";
      chk.style.width = "0px";
      chk.addEventListener("click", event => {
        const target = <HTMLInputElement>event.target;
        question.value = target.checked;
      });

      const icon = document.createElement("span");
      icon.className = "heading-icon fa fa-question-circle";
      const title = document.createElement("span");
      title.className = "title-text";

      const expander = document.createElement("span");
      expander.className = "heading-expand fa fa-chevron-down";
      lbl.appendChild(chk);
      lbl.appendChild(icon);
      lbl.appendChild(title);
      lbl.appendChild(expander);
      header.appendChild(lbl);
      outer.appendChild(header);

      const body = document.createElement("div");
      body.className = "panel-body";
      outer.appendChild(body);
      el.appendChild(outer);

      const updateContent = () => {
        const titleContent = question.fullTitle;
        title.innerHTML = titleContent;

        const bodyContent = question.body || "";
        const bodyHtml = question.getMarkdownHtml(bodyContent);
        if (bodyHtml !== null)
          body.innerHTML = question.getProcessedHtml(bodyHtml);
        else body.innerText = question.getProcessedHtml(bodyContent);
      };
      question.titleChangedCallback = updateContent;
      updateContent();

      question.valueChangedCallback = function() {
        outer.className = outerCls + (question.value ? " expanded" : "");
        expander.className =
          "heading-expand " +
          (question.value ? "fa fa-chevron-up" : "fa fa-chevron-down");
      };
      question.valueChangedCallback();
    },
    willUnmount: function(question, el) {}
  };

  Survey.CustomWidgetCollection.Instance.addCustomWidget(widget, "type");
}

function initInfoText(Survey) {
  const widget = {
    name: "infotext",
    title: "Message Text",
    iconName: "icon-panel",
    widgetIsLoaded: function() {
      return true;
    },
    isFit: function(question) {
      return question.getType() === "infotext";
    },
    activatedByChanged: function(activatedBy) {
      Survey.JsonObject.metaData.addClass("infotext", [], null, "empty");
      Survey.JsonObject.metaData.addProperties("infotext", [
        {
          name: "body:text"
        },
        {
          name: "messageStyle",
          default: "info",
          choices: ["info", "inline", "error"]
        }
      ]);
    },
    htmlTemplate: "<div></div>",
    afterRender: function(question, el) {
      while (el.childNodes.length) el.removeChild(el.childNodes[0]);

      const outer = document.createElement("div");
      let outerCls = "panel panel-default ";
      if (question.messageStyle === "error")
        outerCls += "survey-infotext error";
      else if (question.messageStyle === "inline")
        outerCls += "survey-inlinetext";
      else outerCls += "survey-infotext";
      outer.className = outerCls;
      const header = document.createElement("div");
      header.className = "panel-heading";
      const lbl = document.createElement("label");
      lbl.className = "panel-title";

      let iconCls = null;
      if (question.messageStyle === "error") iconCls = "heading-icon fa fa-ban";
      else if (question.messageStyle === "info")
        iconCls = "heading-icon fa fa-info-circle";
      const title = document.createElement("span");
      title.className = "title-text";
      if (iconCls) {
        const icon = document.createElement("span");
        icon.className = iconCls;
        lbl.appendChild(icon);
      }
      lbl.appendChild(title);
      header.appendChild(lbl);
      outer.appendChild(header);

      let body = null;
      if (question.body) {
        body = document.createElement("div");
        body.className = "panel-body";
        outer.appendChild(body);
      }

      if (question.isRequired && !question.value) {
        const acceptRow = document.createElement("div");
        acceptRow.className = "row accept-row";
        const cell = document.createElement("div");
        cell.className = "col-sm-12";
        const acceptBtn = document.createElement("button");
        acceptBtn.className = "btn btn-primary";
        const acceptLbl = document.createElement("span");
        acceptLbl.appendChild(document.createTextNode("Continue"));
        acceptBtn.appendChild(acceptLbl);
        acceptBtn.addEventListener("click", () => {
          question.value = 1;
          acceptRow.style.display = "none";
        });
        cell.appendChild(acceptBtn);
        acceptRow.appendChild(cell);
        outer.appendChild(acceptRow);
      }

      el.appendChild(outer);

      const updateContent = () => {
        const titleContent = question.fullTitle;
        title.innerHTML = titleContent;

        if (body) {
          const bodyContent = question.body || "";
          const bodyHtml = question.getMarkdownHtml(bodyContent);
          if (bodyHtml !== null)
            body.innerHTML = question.getProcessedHtml(bodyHtml);
          else body.innerText = question.getProcessedHtml(bodyContent);
        }
      };
      question.titleChangedCallback = updateContent;
      updateContent();
    },
    willUnmount: function(question, el) {}
  };

  Survey.CustomWidgetCollection.Instance.addCustomWidget(widget, "type");
}

function initYesNo(Survey) {
  const widget = {
    name: "yesno",
    title: "Yes/No",
    iconName: "icon-radiogroup",
    isDefaultRender: true,
    widgetIsLoaded: function() {
      return true;
    },
    isFit: function(question) {
      return question.getType() === "yesno";
    },
    activatedByChanged: function(activatedBy) {
      Survey.JsonObject.metaData.addClass("yesno", [], null, "empty");
    },
    htmlTemplate: "<div></div>",
    makeButton: function(question, opt) {
      const chk = document.createElement("input");
      chk.type = "radio";
      chk.name = question.name + "_" + question.id;
      chk.value = opt.value;
      chk.checked = question.value === opt.value;
      chk.onclick = function() {
        if ((<HTMLInputElement>this).checked) question.value = opt.value;
      };
      opt.input = chk;
      const outer = document.createElement("label");
      outer.className = "survey-yesno";
      outer.appendChild(chk);
      const div = document.createElement("span");
      div.className = "survey-yesno-button";
      div.appendChild(document.createTextNode(opt.label));
      div.tabIndex = 0;
      div.setAttribute("role", "button");
      if (opt.value === "y") div.id = question.inputId; // allow auto focus
      div.onkeypress = function(evt) {
        if (evt.keyCode === 32) {
          chk.checked = true;
          question.value = opt.value;
          evt.preventDefault();
        }
      };
      outer.appendChild(div);
      opt.button = outer;
      return outer;
    },
    afterRender: function(question, el) {
      while (el.childNodes.length) el.removeChild(el.childNodes[0]);

      const choices = [
        { label: "Yes", value: "y", button: null, input: null },
        { label: "No", value: "n", button: null, input: null }
      ];
      for (const opt of choices) {
        const btn = this.makeButton(question, opt);
        el.appendChild(opt.button);
      }
      question.valueChangedCallback = function() {
        for (const opt of choices) {
          if (opt.value === question.value) opt.input.checked = true;
        }
      };
      // This probably shouldn't be necessary, but the question is sometimes rendered with no value
      if (question.value === undefined) {
        setTimeout(question.valueChangedCallback, 50);
      }
    },
    willUnmount: function(question, el) {}
  };

  Survey.CustomWidgetCollection.Instance.addCustomWidget(widget, "type");
  console.log(Survey.CustomWidgetCollection);
}

function initAddressBlock(Survey) {
  const widget = {
    name: "address",
    title: "Postal Address",
    iconName: "icon-multipletext",
    widgetIsLoaded: function() {
      return true;
    },
    isFit: function(question) {
      return question.getType() === "address";
    },
    activatedByChanged: function(activatedBy) {
      Survey.JsonObject.metaData.addClass(
        "address",
        [
          {
            name: "referLabel:text"
          }
        ],
        null,
        "empty"
      );
    },
    htmlTemplate: "<div></div>",
    provinceOptions: function() {
      return [
        {
          value: "AB",
          text: "Alberta"
        },
        {
          value: "BC",
          text: "British Columbia"
        },
        {
          value: "MB",
          text: "Manitoba"
        },
        {
          value: "NB",
          text: "New Brunswick"
        },
        {
          value: "NF",
          text: "Newfoundland and Labrador"
        },
        {
          value: "NT",
          text: "Northwest Territories"
        },
        {
          value: "NS",
          text: "Nova Scotia"
        },
        {
          value: "NU",
          text: "Nunavut"
        },
        {
          value: "ON",
          text: "Ontario"
        },
        {
          value: "PE",
          text: "Prince Edward Island"
        },
        {
          value: "QC",
          text: "Quebec"
        },
        {
          value: "SK",
          text: "Saskatchewan"
        },
        {
          value: "YT",
          text: "Yukon"
        }
      ];
    },
    countryOptions: function() {
      return [
        {
          value: "CAN",
          text: "Canada"
        },
        {
          value: "USA",
          text: "USA"
        }
      ];
    },
    prevAddrOptions: function(question) {
      const skipName = question.name;
      const survey = question.survey;
      const addrs = [];
      const seen = {};
      let otherQVal;
      for (const page of survey.pages) {
        for (const otherQ of page.questions) {
          if (
            otherQ.getType() === "address" &&
            otherQ.name !== skipName &&
            (otherQVal = otherQ.value)
          ) {
            const parts = [
              otherQVal.street,
              otherQVal.city,
              otherQVal.state,
              otherQVal.country,
              otherQVal.postcode
            ];
            const lbl = parts
              .map(p => p.trim())
              .filter(p => p)
              .join(", ");
            if (lbl && !seen[lbl]) {
              seen[lbl] = 1;
              addrs.push({
                name: otherQ.name,
                label: lbl, // otherQ.referLabel,
                value: Object.assign({}, otherQ.value)
              });
            }
          }
        }
      }
      addrs.sort((a, b) => a.label.localeCompare(b.label));
      return addrs;
    },
    afterRender: function(question, el) {
      while (el.childNodes.length) el.removeChild(el.childNodes[0]);

      const outer = document.createElement("div");
      const outerCls = "survey-address";
      let label;
      let row;
      let cell;
      outer.className = outerCls;

      const selOpts = this.prevAddrOptions(question);
      if (selOpts.length) {
        row = document.createElement("div");
        row.className = "row survey-address-line";

        cell = document.createElement("div");
        cell.className = "col-sm-6 form-inline";
        label = document.createElement("label");
        // FIXME - set label.for to province ID
        label.className = "survey-sublabel";
        label.appendChild(document.createTextNode("Copy from: \u00a0 "));
        cell.appendChild(label);
        const selAddr = document.createElement("select");
        selAddr.className = "form-control";
        const opt = document.createElement("option");
        opt.text = "(Select Address)";
        opt.value = "";
        selAddr.appendChild(opt);
        for (const selIdx of Object.keys(selOpts)) {
          const selVal = selOpts[selIdx];
          const addrOpt = document.createElement("option");
          addrOpt.text = selVal.label;
          addrOpt.value = selIdx;
          selAddr.appendChild(addrOpt);
        }
        selAddr.onchange = function() {
          const selIdx = (<HTMLInputElement>this).value;
          if (selIdx.length) {
            const selAddrOpt = selOpts[selIdx].value;
            question.value = selAddrOpt;
          }
        };
        cell.appendChild(selAddr);
        row.appendChild(cell);
        outer.appendChild(row);
      }

      row = document.createElement("div");
      row.className = "row survey-address-line";
      cell = document.createElement("div");
      cell.className = "col-sm-12";
      row.appendChild(cell);
      const addr1 = document.createElement("input");
      addr1.className = "form-control";
      addr1.placeholder = "Street address, for example: 800 Hornby St.";
      addr1.id = question.inputId; // allow auto focus
      cell.appendChild(addr1);
      outer.appendChild(row);

      /*row = document.createElement('div');
      row.className = 'row survey-address-line';
      cell = document.createElement('div');
      cell.className = 'col-sm-12';
      row.appendChild(cell);
      let addr2 = document.createElement('input');
      addr2.className = 'form-control';
      addr2.placeholder = 'Second address line, if needed';
      cell.appendChild(addr2);
      outer.appendChild(row);*/

      row = document.createElement("div");
      row.className = "row survey-address-line";

      cell = document.createElement("div");
      cell.className = "col-sm-6";
      label = document.createElement("label");
      // FIXME - set label.for to city ID
      label.className = "survey-sublabel";
      label.appendChild(document.createTextNode("City / Town"));
      cell.appendChild(label);
      const city = document.createElement("input");
      city.className = "form-control";
      cell.appendChild(city);
      row.appendChild(cell);

      cell = document.createElement("div");
      cell.className = "col-sm-6";
      label = document.createElement("label");
      // FIXME - set label.for to province ID
      label.className = "survey-sublabel";
      label.appendChild(document.createTextNode("Province / State / Region"));
      cell.appendChild(label);
      const state = document.createElement("select");
      state.className = "form-control";
      const stateOpts = this.provinceOptions();
      for (const province of stateOpts) {
        const opt = document.createElement("option");
        opt.text = province.text;
        opt.value = province.value;
        state.appendChild(opt);
      }
      cell.appendChild(state);
      row.appendChild(cell);

      outer.appendChild(row);

      row = document.createElement("div");
      row.className = "row survey-address-line";

      cell = document.createElement("div");
      cell.className = "col-sm-6";
      label = document.createElement("label");
      // FIXME - set label.for to province ID
      label.className = "survey-sublabel";
      label.appendChild(document.createTextNode("Country"));
      cell.appendChild(label);
      const country = document.createElement("select");
      country.className = "form-control";
      const countryOpts = this.countryOptions();
      for (const cval of countryOpts) {
        const opt = document.createElement("option");
        opt.text = cval.text;
        opt.value = cval.value;
        country.appendChild(opt);
      }
      cell.appendChild(country);
      row.appendChild(cell);

      cell = document.createElement("div");
      cell.className = "col-sm-6";
      label = document.createElement("label");
      // FIXME - set label.for to postal code ID
      label.className = "survey-sublabel";
      label.appendChild(document.createTextNode("Postal Code"));
      cell.appendChild(label);
      const postCode = document.createElement("input");
      postCode.className = "form-control";
      cell.appendChild(postCode);
      row.appendChild(cell);

      outer.appendChild(row);

      el.appendChild(outer);

      function updateValue(evt) {
        const value = {
          street: addr1.value,
          // 'line2': addr2.value,
          city: city.value,
          state: state.value,
          country: country.value,
          postcode: postCode.value
        };
        for (const k in value) {
          if (value[k] !== undefined && value[k].length) {
            question.value = value;
            return;
          }
        }
        question.value = null;
      }
      addr1.addEventListener("change", updateValue);
      // addr2.addEventListener('change', updateValue);
      city.addEventListener("change", updateValue);
      state.addEventListener("change", updateValue);
      country.addEventListener("change", updateValue);
      postCode.addEventListener("change", updateValue);

      question.valueChangedCallback = () => {
        const val = question.value || {};
        addr1.value = val.street || "";
        city.value = val.city || "";
        state.value = val.state || "BC";
        country.value = val.country || "CAN";
        postCode.value = val.postcode || "";
      };
      question.valueChangedCallback();
      // This probably shouldn't be necessary, but the question is sometimes rendered with no value
      if (question.value === undefined) {
        setTimeout(question.valueChangedCallback, 50);
      }
    },
    willUnmount: function(question, el) {}
  };

  Survey.CustomWidgetCollection.Instance.addCustomWidget(widget, "type");
}

function initNameBlock(Survey) {
  const widget = {
    name: "personname",
    title: "Person Name",
    iconName: "icon-multipletext",
    widgetIsLoaded: function() {
      return true;
    },
    isFit: function(question) {
      return question.getType() === "personname";
    },
    activatedByChanged: function(activatedBy) {
      Survey.JsonObject.metaData.addClass(
        "personname",
        [
          {
            name: "defaultSubstitution:text"
          },
          {
            name: "labelFirstName:text"
          },
          {
            name: "labelMiddleName:text"
          },
          {
            name: "labelLastName:text"
          },
          {
            name: "descFirstName:text"
          },
          {
            name: "descMiddleName:text"
          },
          {
            name: "descLastName:text"
          }
        ],
        null,
        "empty"
      );
    },
    getDisplayValue: function(question) {
      const name = question.value;
      if (name)
        return [name.first, name.middle, name.last]
          .map(p => p.trim())
          .filter(p => p)
          .join(" ");
      return question.defaultSubstitution;
    },
    htmlTemplate: "<div></div>",
    afterRender: function(question, el) {
      while (el.childNodes.length) el.removeChild(el.childNodes[0]);

      const outer = document.createElement("div");
      const outerCls = "survey-personname";
      let label;
      let sublbl;
      let descId;
      let row;
      let cell;
      let input;
      const acceptLbl = null;
      const acceptRow = null;
      // let acceptBtn;
      // let cancelBtn;
      outer.className = outerCls;

      row = document.createElement("div");
      row.className = "row";

      const fields = [
        { name: "first", label: "First Name", input: null },
        { name: "middle", label: "Middle Name(s)", input: null },
        { name: "last", label: "Last Name", input: null }
      ];
      if (question.labelFirstName) {
        fields[0].label = question.labelFirstName;
      }
      if (question.labelMiddleName) {
        fields[1].label = question.labelMiddleName;
      }
      if (question.labelLastName) {
        fields[2].label = question.labelLastName;
      }
      let curVal: any;
      const checkAccept = function() {
        let visib = false;
        const qVal = question.value || {};
        if (curVal) {
          for (const field of fields) {
            if (qVal[field.name] !== curVal[field.name]) {
              visib = true;
              break;
            }
          }
        }
        if (acceptRow) acceptRow.style.display = visib ? "block" : "none";
        if (acceptLbl)
          acceptLbl.innerText = question.value ? "Update Name" : "Continue";
      };
      let focused = false;
      let acceptTimeout = null;
      const acceptValue = function(evt?) {
        question.value = curVal;
      };
      let updated = false;
      const updateValue = function(evt) {
        if (acceptTimeout) {
          clearTimeout(acceptTimeout);
          acceptTimeout = null;
        }
        let empty = true;
        curVal = {};
        for (const field of fields) {
          curVal[field.name] = field.input.value.trim();
          if (curVal[field.name].length) empty = false;
        }
        if (empty) curVal = null;
        // checkAccept();
        if (question.value) updated = true;
        acceptValue();
      };
      const updateFocus = function(evt) {
        focused = evt.type === "focus";
        if (acceptTimeout) {
          clearTimeout(acceptTimeout);
          acceptTimeout = null;
        }
        // if(! focused && updated) {
        //   acceptTimeout = setTimeout(acceptValue, 1000);
        // }
      };

      for (const field of fields) {
        cell = document.createElement("div");
        cell.className = "col-sm-4";
        label = document.createElement("label");
        label.className = "survey-sublabel";
        label.appendChild(document.createTextNode(field.label));
        cell.appendChild(label);
        input = document.createElement("input");
        input.className = "form-control";
        if (field.name === "first") input.id = question.inputId;
        // allow auto focus
        else input.id = question.inputId + "-" + field.name;
        input.addEventListener("change", updateValue);
        input.addEventListener("input", updateValue);
        input.addEventListener("focus", updateFocus);
        input.addEventListener("blur", updateFocus);
        label.setAttribute("for", input.id);
        field.input = input;
        cell.appendChild(input);
        descId =
          "desc" +
          field.name[0].toUpperCase() +
          field.name.substring(1) +
          "Name";
        if (question[descId]) {
          sublbl = document.createElement("p");
          sublbl.className = "survey-desc small";
          sublbl.appendChild(document.createTextNode(question[descId]));
          cell.appendChild(sublbl);
        }
        row.appendChild(cell);
      }

      outer.appendChild(row);

      /*acceptRow = document.createElement('div');
      acceptRow.style.display = 'none';
      acceptRow.className = 'row accept-row';
      cell = document.createElement('div');
      cell.className = 'col-sm-12'*/
      /*cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-primary';
      cancelBtn.appendChild(document.createTextNode('Cancel'));
      cell.appendChild(cancelBtn);
      cell.appendChild(document.createTextNode(' '));
      cancelBtn.onclick = function() {
        question.valueChangedCallback();
        updateValue();
      }*/
      /*acceptBtn = document.createElement('button');
      acceptBtn.className = 'btn btn-primary';
      acceptLbl = document.createElement('span');
      acceptBtn.appendChild(acceptLbl);
      acceptBtn.addEventListener('click', acceptValue);
      cell.appendChild(acceptBtn);
      acceptRow.appendChild(cell);
      outer.appendChild(acceptRow);*/

      el.appendChild(outer);

      question.valueChangedCallback = () => {
        const val = question.value || {};
        for (const field of fields) {
          field.input.value = val[field.name] || "";
        }
        checkAccept();
      };
      question.valueChangedCallback();
      // This probably shouldn't be necessary, but the question is sometimes rendered with no value
      if (question.value === undefined) {
        setTimeout(question.valueChangedCallback, 50);
      }
    },
    willUnmount: function(question, el) {}
  };

  Survey.CustomWidgetCollection.Instance.addCustomWidget(widget, "type");
}

function initContactInfoBlock(Survey) {
  const widget = {
    name: "contactinfo",
    title: "Contact Info",
    iconName: "icon-multipletext",
    widgetIsLoaded: function() {
      return true;
    },
    isFit: function(question) {
      return question.getType() === "contactinfo";
    },
    activatedByChanged: function(activatedBy) {
      Survey.JsonObject.metaData.addClass(
        "contactinfo",
        [
          {
            name: "labelEmail:text"
          },
          {
            name: "labelFax:text"
          },
          {
            name: "labelPhone:text"
          }
        ],
        null,
        "empty"
      );
    },
    htmlTemplate: "<div></div>",
    afterRender: function(question, el) {
      while (el.childNodes.length) el.removeChild(el.childNodes[0]);

      const outer = document.createElement("div");
      const outerCls = "survey-contactinfo";
      let label;
      let row;
      let cell;
      let input;
      outer.className = outerCls;

      row = document.createElement("div");
      row.className = "row";

      const fields = [
        { name: "phone", label: "Phone", input: null },
        { name: "email", label: "Email", input: null },
        { name: "fax", label: "Fax", input: null }
      ];
      const updateValue = function() {
        const parts = {};
        for (const field of fields) {
          parts[field.name] = field.input.value.trim();
        }
        question.value = parts["phone"] ? parts : null;
      };

      for (const field of fields) {
        const altLbl =
          "label" + field.name[0].toUpperCase() + field.name.substring(1);
        cell = document.createElement("div");
        cell.className = "col-sm-4";
        label = document.createElement("label");
        label.className = "survey-sublabel";
        label.appendChild(
          document.createTextNode(question[altLbl] || field.label)
        );
        cell.appendChild(label);
        input = document.createElement("input");
        input.className = "form-control";
        if (field.name === "phone") input.id = question.inputId; // allow auto focus
        input.addEventListener("change", updateValue);
        field.input = input;
        cell.appendChild(input);
        row.appendChild(cell);
      }

      outer.appendChild(row);
      el.appendChild(outer);

      question.valueChangedCallback = () => {
        for (const field of fields) {
          field.input.value =
            (question.value && question.value[field.name]) || "";
        }
      };
      question.valueChangedCallback();
      // This probably shouldn't be necessary, but the question is sometimes rendered with no value
      if (question.value === undefined) {
        setTimeout(question.valueChangedCallback, 50);
      }
    },
    willUnmount: function(question, el) {}
  };

  Survey.CustomWidgetCollection.Instance.addCustomWidget(widget, "type");
}

function initCustomDate(Survey) {
  const widget = {
    name: "date",
    title: "Date Input",
    iconName: "icon-date",
    widgetIsLoaded: function() {
      return true;
    },
    isFit: function(question) {
      return question.inputType === "date";
    },
    activatedByChanged: function(activatedBy) {
      Survey.JsonObject.metaData.addProperties("text", [
        {
          name: "dateYearsAhead:number",
          default: 0
        },
        {
          name: "dateYearsBehind:number",
          default: 100
        }
      ]);
    },
    htmlTemplate: '<div class="form-inline date-select"></div>',
    monthOptions: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ],
    afterRender: function(question, el) {
      while (el.childNodes.length) el.removeChild(el.childNodes[0]);

      let yearVal = "";
      let monthVal = "";
      let dayVal = "";

      const yearSel = document.createElement("select");
      const monthSel = document.createElement("select");
      const daySel = document.createElement("select");
      const updateDay = function() {
        while (daySel.childNodes.length > 1)
          daySel.removeChild(daySel.childNodes[1]);
        if (yearVal && monthVal) {
          const lastDay = new Date(
            parseInt(yearVal, 10),
            parseInt(monthVal, 10),
            0
          ).getDate();
          for (let day = 1; day <= lastDay; day++) {
            const dayOpt = document.createElement("option");
            dayOpt.text = "" + day;
            dayOpt.value = "" + day;
            daySel.appendChild(dayOpt);
          }
          if (dayVal && parseInt(dayVal, 10) > lastDay) {
            dayVal = "";
          }
        } else {
          dayVal = "";
        }
        daySel.value = dayVal;
      };
      const updateValue = function(evt?) {
        updateDay();
        if (yearVal && monthVal && dayVal) {
          let dt = "" + yearVal + "-";
          dt += (monthVal.length < 2 ? "0" : "") + monthVal;
          dt += "-" + (dayVal.length < 2 ? "0" : "") + dayVal;
          question.value = dt;
        } else {
          question.value = null;
        }
      };

      yearSel.className = "form-control date-select-year mr-1";
      yearSel.id = question.inputId; // allow auto focus
      const yrFst = document.createElement("option");
      yrFst.text = "(Year)";
      yrFst.value = "";
      yearSel.appendChild(yrFst);
      let curYear = new Date().getFullYear();
      const firstYear = curYear - (question.dateYearsBehind || 0);
      curYear += question.dateYearsAhead || 0;
      for (let yr = curYear; yr >= firstYear; yr--) {
        const yropt = document.createElement("option");
        yropt.text = "" + yr;
        yropt.value = "" + yr;
        yearSel.appendChild(yropt);
      }
      yearSel.onchange = function() {
        yearVal = (<HTMLSelectElement>this).value;
        updateValue();
        monthSel.focus();
      };
      el.appendChild(yearSel);

      monthSel.className = "form-control date-select-month mr-1";
      const monthFst = document.createElement("option");
      monthFst.text = "(Month)";
      monthFst.value = "";
      monthSel.appendChild(monthFst);
      for (let mo = 1; mo <= 12; mo++) {
        const monthOpt = document.createElement("option");
        monthOpt.text = this.monthOptions[mo - 1];
        monthOpt.value = "" + mo;
        monthSel.appendChild(monthOpt);
      }
      monthSel.onchange = function() {
        monthVal = (<HTMLSelectElement>this).value;
        updateValue();
        daySel.focus();
      };
      el.appendChild(document.createTextNode(" "));
      el.appendChild(monthSel);

      daySel.className = "form-control date-select-day";
      const opt = document.createElement("option");
      opt.text = "(Day)";
      opt.value = "";
      daySel.appendChild(opt);
      daySel.onchange = function() {
        dayVal = (<HTMLSelectElement>this).value;
        updateValue();
      };
      el.appendChild(document.createTextNode(" "));
      el.appendChild(daySel);

      const loadValue = function() {
        if (question.value) {
          const m = question.value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          const dt = new Date(m[1], m[2] - 1, m[3]);
          console.log(dt);
          if (dt) {
            yearVal = "" + dt.getFullYear();
            monthVal = "" + (dt.getMonth() + 1);
            dayVal = "" + dt.getDate();
          }
        }
        yearSel.value = yearVal;
        monthSel.value = monthVal;
        updateDay();
      };
      loadValue();
      question.valueChangedCallback = loadValue;
      // This probably shouldn't be necessary, but the question is sometimes rendered with no value
      if (question.value === undefined) {
        setTimeout(question.valueChangedCallback, 50);
      }
    },
    willUnmount: function(question, el) {}
  };

  Survey.CustomWidgetCollection.Instance.addCustomWidget(widget, "property");
}

// Returns 'y' or 'n', or 'u' for undefined and 'e' for error
function isChild(params) {
  if (!params && !params.length) return "u";
  const DOB = params[0];
  const MinorOrAdult = params[1];
  let dobReturn;
  let maReturn;
  const minYears = 19;

  if (DOB) {
    const now = new Date();
    const cmp = new Date(DOB);
    if (isNaN(cmp.getTime())) {
      dobReturn = "e";
    } else {
      dobReturn = "y";
      const yearDiff = now.getFullYear() - cmp.getFullYear();
      if (yearDiff > minYears) dobReturn = "n";
      else if (yearDiff === minYears) {
        if (cmp.getMonth() < now.getMonth()) dobReturn = "n";
        else if (
          cmp.getMonth() === now.getMonth() &&
          cmp.getDate() < now.getDate()
        )
          dobReturn = "n";
      }
    }
  }

  if (MinorOrAdult) {
    maReturn = MinorOrAdult === "Minor" ? "y" : "n";
  }

  if (!dobReturn && !maReturn) return "n";
  else if (dobReturn && !maReturn) return dobReturn;
  else if (!dobReturn && maReturn) return maReturn;
  else if (dobReturn === maReturn) return dobReturn;
  else return "e";
}

export function addQuestionTypes(Survey) {
  // fixCheckboxes(Survey);
  initYesNo(Survey);
  initInfoText(Survey);
  initHelpText(Survey);
  initNameBlock(Survey);
  initAddressBlock(Survey);
  initContactInfoBlock(Survey);
  initCustomDate(Survey);
  Survey.FunctionFactory.Instance.register("isChild", isChild);
}

export function addToolboxOptions(editor) {
  editor.toolbox.addItem({
    name: "yesno",
    title: "Yes/No Choice",
    category: "Custom",
    isCopied: true,
    iconName: "icon-radiogroup",
    json: {
      type: "yesno"
    }
  });
  editor.toolbox.addItem({
    name: "helptext",
    title: "Expanding FAQ",
    category: "Custom",
    isCopied: true,
    iconName: "icon-panel",
    json: {
      type: "helptext",
      titleLocation: "hidden"
    }
  });
  editor.toolbox.addItem({
    name: "infotext",
    title: "Message Text",
    category: "Custom",
    isCopied: true,
    iconName: "icon-panel",
    json: {
      type: "infotext",
      titleLocation: "hidden"
    }
  });
  editor.toolbox.addItem({
    name: "personname",
    title: "Name Input",
    category: "Custom",
    isCopied: true,
    iconName: "icon-multipletext",
    json: {
      type: "personname"
    }
  });
  editor.toolbox.addItem({
    name: "address",
    title: "Postal Address",
    category: "Custom",
    isCopied: true,
    iconName: "icon-multipletext",
    json: {
      type: "address"
    }
  });
  editor.toolbox.addItem({
    name: "contactinfo",
    title: "Contact Information",
    category: "Custom",
    isCopied: true,
    iconName: "icon-multipletext",
    json: {
      type: "contactinfo"
    }
  });
}
