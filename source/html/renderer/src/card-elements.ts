﻿import * as Enums from "./enums";
import * as Utils from "./utils";
import * as TextFormatters from "./text-formatter";

function invokeSetContainer(obj: any, container: Container) {
    // This is not super pretty, but it the closest emulation of
    // "internal" in TypeScript.
    obj["setContainer"](container);
}

export abstract class CardElement {
    private _container: Container = null;

    private getRootElement(): CardElement {
        if (!this._container) {
            return this;
        }

        return this._container.getRootElement();
    }

    protected setContainer(value: Container) {
        this._container = value;
    }

    protected get hideOverflow(): boolean {
        return true;
    }

    protected get useDefaultSizing(): boolean {
        return true;
    }

    protected removeTopSpacing(element: HTMLElement) {
        element.className += " removeTopSpacing";
    }

    protected adjustAlignment(element: HTMLElement) {
        switch (this.horizontalAlignment) {
            case Enums.HorizontalAlignment.Center:
                element.style.textAlign = "center";
                break;
            case Enums.HorizontalAlignment.Right:
                element.style.textAlign = "right";
                break;
        }
    }

    protected adjustLayout(element: HTMLElement) {
        if (this.useDefaultSizing) {
            element.className += " stretch";
        }

        this.adjustAlignment(element);

        if (this.separation != Enums.Separation.Default) {
            this.removeTopSpacing(element);
        }

        if (this.hideOverflow) {
            element.style.overflow = "hidden";
        }
    }

    protected abstract internalRender(): HTMLElement;

    speak: string;
    horizontalAlignment: Enums.HorizontalAlignment = Enums.HorizontalAlignment.Left;
    separation: Enums.Separation;

    abstract renderSpeech(): string;

    parse(json: any) {
        this.speak = json["speak"];
        this.horizontalAlignment = Enums.stringToHorizontalAlignment(json["horizontalAlignment"], Enums.HorizontalAlignment.Left);
        this.separation = Enums.stringToSeparation(json["separation"], Enums.Separation.Default);        
    }

    render(): HTMLElement {
        let renderedElement = this.internalRender();

        if (renderedElement != null) {
            this.adjustLayout(renderedElement);
        }

        return renderedElement;
    }

    getRootContainer(): Container {
        var rootElement = this.getRootElement();

        if (rootElement instanceof Container) {
            return <Container>rootElement;
        }
        else {
            return null;
        }
    }

    get container(): Container {
        return this._container;
    }
}

export class TextBlock extends CardElement {
    size: Enums.TextSize = Enums.TextSize.Normal;
    weight: Enums.TextWeight = Enums.TextWeight.Normal;
    color?: Enums.TextColor;
    text: string;
    isSubtle: boolean = false;
    wrap: boolean = true;
    maxLines: number;

    protected internalRender(): HTMLElement {
        if (!Utils.isNullOrEmpty(this.text)) {
            let element = document.createElement("div");

            let cssStyle = "text ";

            switch (this.size) {
                case Enums.TextSize.Small:
                    cssStyle += "small ";
                    break;
                case Enums.TextSize.Medium:
                    cssStyle += "medium ";
                    break;
                case Enums.TextSize.Large:
                    cssStyle += "large ";
                    break;
                case Enums.TextSize.ExtraLarge:
                    cssStyle += "extraLarge ";
                    break;
                default:
                    cssStyle += "defaultSize ";
                    break;
            }

            let actualTextColor = this.color ? this.color : (this.container ? this.container.textColor : AdaptiveCard.renderOptions.defaultTextColor);

            switch (actualTextColor) {
                case Enums.TextColor.Dark:
                    cssStyle += "darkColor ";
                    break;
                case Enums.TextColor.Light:
                    cssStyle += "lightColor ";
                    break;
                case Enums.TextColor.Accent:
                    cssStyle += "accentColor ";
                    break;
                case Enums.TextColor.Good:
                    cssStyle += "goodColor ";
                    break;
                case Enums.TextColor.Warning:
                    cssStyle += "warningColor ";
                    break;
                case Enums.TextColor.Attention:
                    cssStyle += "attentionColor ";
                    break;
                default:
                    cssStyle += "defaultColor ";
                    break;
            }

            if (this.isSubtle) {
                cssStyle += "subtle ";
            }

            switch (this.weight) {
                case Enums.TextWeight.Lighter:
                    cssStyle += "lighter ";
                    break;
                case Enums.TextWeight.Bolder:
                    cssStyle += "bolder ";
                    break;
                default:
                    cssStyle += "defaultWeight ";
                    break;
            }

            var formattedText = TextFormatters.formatText(this.text);

            element.innerHTML = Utils.processMarkdown(formattedText);
            element.className = cssStyle;

            if (element.firstElementChild instanceof (HTMLElement)) {
                (<HTMLElement>element.firstElementChild).style.marginTop = "0px";
            }

            if (element.lastElementChild instanceof (HTMLElement)) {
                (<HTMLElement>element.lastElementChild).style.marginBottom = "0px";
            }

            var anchors = element.getElementsByTagName("a");

            for (var i = 0; i < anchors.length; i++) {
                anchors[i].target = "_blank";
            }

            if (!this.wrap) {
                element.style.whiteSpace = "nowrap";
                element.style.textOverflow = "ellipsis";
            }

            return element;
        }
        else {
            return null;
        }
    }

    parse(json: any) {
        super.parse(json);

        this.text = json["text"];
        this.size = Enums.stringToTextSize(json["size"], Enums.TextSize.Normal);
        this.weight = Enums.stringToTextWeight(json["weight"], Enums.TextWeight.Normal);
        this.color = Enums.stringToTextColor(json["color"], null);
        this.isSubtle = json["isSubtle"];
        this.wrap = json["wrap"];
        this.maxLines = json["maxLines"];        
    }

    renderSpeech(): string {
        if (this.speak != null)
            return this.speak + '\n';

        if (this.text)
            return '<s>' + this.text + '</s>\n';

        return null;
    }
}

class InternalTextBlock extends TextBlock {
    get useDefaultSizing(): boolean {
        return false;
    }
}

export class Fact {
    name: string;
    value: string;
    speak: string;

    renderSpeech(): string {
        if (this.speak != null) {
            return this.speak + '\n';
        }

        return '<s>' + this.name + ' ' + this.value + '</s>\n';
    }
}

export class FactSet extends CardElement {
    protected get useDefaultSizing(): boolean {
        return false;
    }

    protected internalRender(): HTMLElement {
        let element: HTMLElement = null;

        if (this.facts.length > 0) {
            element = document.createElement("table");
            element.className = "factGroup";

            let html: string = '';

            for (var i = 0; i < this.facts.length; i++) {
                html += '<tr>';
                html += '    <td class="factName">';

                let textBlock = new InternalTextBlock();
                textBlock.text = this.facts[i].name;
                textBlock.weight = Enums.TextWeight.Bolder;
                textBlock.separation = Enums.Separation.None;

                invokeSetContainer(textBlock, this.container);

                let renderedText = textBlock.render();

                if (renderedText != null) {
                    html += renderedText.outerHTML;
                }

                html += '    </td>';
                html += '    <td class="factValue">';

                textBlock = new InternalTextBlock();
                textBlock.text = this.facts[i].value;
                textBlock.weight = Enums.TextWeight.Lighter;
                textBlock.separation = Enums.Separation.None;

                invokeSetContainer(textBlock, this.container);

                renderedText = textBlock.render();

                if (renderedText != null) {
                    html += renderedText.outerHTML;
                }

                html += '    </td>';
                html += '</tr>';
            }

            element.innerHTML = html;
        }

        return element;
    }

    facts: Array<Fact> = [];

    parse(json: any) {
        super.parse(json);
        
        if (json["facts"] != null) {
            var jsonFacts = json["facts"] as Array<any>;

            for (var i = 0; i < jsonFacts.length; i++) {
                let fact = new Fact();

                fact.name = jsonFacts[i]["title"];
                fact.value = jsonFacts[i]["value"];
                fact.speak = jsonFacts[i]["speak"];

                this.facts.push(fact);
            }
        }
    }

    renderSpeech(): string {
        if (this.speak != null) {
            return this.speak + '\n';
        }

        // render each fact 
        let speak = null;

        if (this.facts.length > 0) {
            speak = '';

            for (var i = 0; i < this.facts.length; i++) {
                let speech = this.facts[i].renderSpeech();

                if (speech) {
                    speak += speech;
                }
            }
        }

        return '<p>' + speak + '\n</p>\n';
    }
}

export class Image extends CardElement {
    protected get useDefaultSizing() {
        return false;
    }

    protected adjustAlignment(element: HTMLElement) {
        switch (this.horizontalAlignment) {
            case Enums.HorizontalAlignment.Center:
                element.style.marginLeft = "auto";
                element.style.marginRight = "auto";

                break;
            case Enums.HorizontalAlignment.Right:
                element.style.marginLeft = "auto";

                break;
        }
    }

    protected internalRender(): HTMLElement {
        let imageElement: HTMLImageElement = null;

        if (!Utils.isNullOrEmpty(this.url)) {
            imageElement = document.createElement("img");
            imageElement.style.display = "block";
            imageElement.onclick = (e) => {
                if (this.selectAction != null) {
                    raiseExecuteActionEvent(this.selectAction);
                    e.cancelBubble = true;
                }
            }

            let cssStyle = "image";

            if (this.selectAction != null) {
                cssStyle += " selectable";
            }

            switch (this.size) {
                case Enums.Size.Auto:
                    cssStyle += " autoSize";
                    break;
                case Enums.Size.Stretch:
                    cssStyle += " stretch";
                    break;
                case Enums.Size.Small:
                    cssStyle += " small";
                    break;
                case Enums.Size.Large:
                    cssStyle += " large";
                    break;
                default:
                    cssStyle += " medium";
                    break;
            }

            if (this.style == Enums.ImageStyle.Person) {
                cssStyle += " person";
            }

            imageElement.className = cssStyle;

            imageElement.src = this.url;
        }

        return imageElement;
    }

    style: Enums.ImageStyle = Enums.ImageStyle.Normal;
    url: string;
    size: Enums.Size = Enums.Size.Medium;
    selectAction: ExternalAction;

    parse(json: any) {
        super.parse(json);

        this.url = json["url"];
        this.style = Enums.stringToImageStyle(json["style"], Enums.ImageStyle.Normal);
        this.size = Enums.stringToSize(json["size"], Enums.Size.Medium);

        var selectActionJson = json["selectAction"];

        if (selectActionJson != undefined) {
            this.selectAction = <ExternalAction>Action.createAction(selectActionJson);
        }        
    }

    renderSpeech(): string {
        if (this.speak != null) {
            return this.speak + '\n';
        }

        return null;
    }
}

export class ImageSet extends CardElement {
    private _images: Array<Image> = [];

    protected internalRender(): HTMLElement {
        let element: HTMLElement = null;

        if (this._images.length > 0) {
            element = document.createElement("div");
            element.className = "imageGallery";

            for (var i = 0; i < this._images.length; i++) {
                let renderedImage = this._images[i].render();

                // Default display for Image is "block" but that forces them to stack vertically
                // in a div. So we need to override display and set it to "inline-block". The
                // drawback is that it adds a small spacing at the bottom of each image, which
                // simply can't be removed cleanly in a cross-browser compatible way.
                renderedImage.style.display = "inline-block";
                renderedImage.style.margin = "0px";
                renderedImage.style.marginRight = "10px";

                Utils.appendChild(element, renderedImage);
            }
        }

        return element;
    }

    imageSize: Enums.Size = Enums.Size.Medium;

    parse(json: any) {
        super.parse(json);
        
        this.imageSize = Enums.stringToSize(json["imageSize"], Enums.Size.Medium);

        if (json["images"] != null) {
            let jsonImages = json["images"] as Array<any>;

            for (let i = 0; i < jsonImages.length; i++) {
                var image = new Image();

                image.size = this.imageSize;
                image.url = jsonImages[i]["url"];

                this.addImage(image);
            }
        }
    }

    addImage(image: Image) {
        if (!image.container) {
            this._images.push(image);

            invokeSetContainer(image, this.container);
        }
        else {
            throw new Error("This image already belongs to another ImageSet");
        }
    }

    renderSpeech(): string {
        if (this.speak != null) {
            return this.speak;
        }

        var speak = null;

        if (this._images.length > 0) {
            speak = '';

            for (var i = 0; i < this._images.length; i++) {
                speak += this._images[i].renderSpeech();
            }
        }

        return speak;
    }
}

export abstract class Input extends CardElement implements Utils.IInput {
    id: string;
    title: string;
    defaultValue: string;

    abstract get value(): string;

    parse(json: any) {
        super.parse(json);

        this.id = json["id"];
        this.defaultValue = json["value"];
    }

    renderSpeech(): string {
        if (this.speak != null) {
            return this.speak;
        }

        if (this.title) {
            return '<s>' + this.title + '</s>\n';
        }

        return null;
    }
}

export class TextInput extends Input {
    private _textareaElement: HTMLTextAreaElement;

    protected internalRender(): HTMLElement {
        this._textareaElement = document.createElement("textarea");
        this._textareaElement.className = "input textInput";

        if (this.isMultiline) {
            this._textareaElement.className += " multiline";
        }

        if (!Utils.isNullOrEmpty(this.placeholder)) {
            this._textareaElement.placeholder = this.placeholder;
        }

        if (!Utils.isNullOrEmpty(this.defaultValue)) {
            this._textareaElement.textContent = this.defaultValue;
        }

        if (this.maxLength > 0) {
            this._textareaElement.maxLength = this.maxLength;
        }

        return this._textareaElement;
    }

    maxLength: number;
    isMultiline: boolean;
    placeholder: string;

    parse(json: any) {
        super.parse(json);

        this.maxLength = json["maxLength"];
        this.isMultiline = json["isMultiline"];
        this.placeholder = json["placeholder"];
    }

    get value(): string {
        return this._textareaElement ? this._textareaElement.textContent : null;
    }
}

export class ToggleInput extends Input {
    private _checkboxInputElement: HTMLInputElement;

    protected internalRender(): HTMLElement {
        var element = document.createElement("div");
        element.className = "input";

        this._checkboxInputElement = document.createElement("input");
        this._checkboxInputElement.className = "toggleInput";
        this._checkboxInputElement.type = "checkbox";

        if (this.defaultValue == this.valueOn) {
            this._checkboxInputElement.checked = true;
        }

        var label = new InternalTextBlock();
        label.text = this.title;

        invokeSetContainer(label, this.container);

        var labelElement = label.render();
        labelElement.className += " toggleLabel";

        var compoundInput = document.createElement("div");

        Utils.appendChild(element, this._checkboxInputElement);
        Utils.appendChild(element, labelElement);

        return element;
    }

    title: string;
    valueOn: string;
    valueOff: string;

    parse(json: any) {
        super.parse(json);

        this.title = json["title"];
        this.valueOn = json["valueOn"];
        this.valueOff = json["valueOff"];
    }

    get value(): string {
        if (this._checkboxInputElement) {
            return this._checkboxInputElement.checked ? this.valueOn : this.valueOff;
        }
        else {
            return null;
        }
    }
}

export class Choice {
    title: string;
    value: string;
}

export class ChoiceSetInput extends Input {
    private _selectElement: HTMLSelectElement;
    private _toggleInputs: Array<HTMLInputElement>;

    protected internalRender(): HTMLElement {
        if (!this.isMultiSelect) {
            if (this.isCompact) {
                // Render as a combo box
                this._selectElement = document.createElement("select");
                this._selectElement.className = "input multichoiceInput";

                var option = document.createElement("option");
                option.selected = true;
                option.disabled = true;
                option.hidden = true;
                option.text = this.placeholder;

                Utils.appendChild(this._selectElement, option);

                for (var i = 0; i < this.choices.length; i++) {
                    var option = document.createElement("option");
                    option.value = this.choices[i].value;
                    option.text = this.choices[i].title;

                    Utils.appendChild(this._selectElement, option);
                }

                return this._selectElement;
            }
            else {
                // Render as a series of radio buttons
                var element = document.createElement("div");
                element.className = "input";

                this._toggleInputs = [];

                for (var i = 0; i < this.choices.length; i++) {
                    var radioInput = document.createElement("input");
                    radioInput.className = "toggleInput";
                    radioInput.type = "radio";
                    radioInput.name = this.id;
                    radioInput.value = this.choices[i].value;

                    this._toggleInputs.push(radioInput);

                    var label = new InternalTextBlock();
                    label.text = this.choices[i].title;

                    invokeSetContainer(label, this.container);

                    var labelElement = label.render();
                    labelElement.className += " toggleLabel";

                    var compoundInput = document.createElement("div");

                    Utils.appendChild(compoundInput, radioInput);
                    Utils.appendChild(compoundInput, labelElement);

                    Utils.appendChild(element, compoundInput);
                }

                return element;
            }
        }
        else {
            // Render as a list of toggle inputs
            var element = document.createElement("div");
            element.className = "input";

            this._toggleInputs = [];

            for (var i = 0; i < this.choices.length; i++) {
                var checkboxInput = document.createElement("input");
                checkboxInput.className = "toggleInput";
                checkboxInput.type = "checkbox";
                checkboxInput.value = this.choices[i].value;

                this._toggleInputs.push(checkboxInput);

                var label = new InternalTextBlock();
                label.text = this.choices[i].title;

                invokeSetContainer(label, this.container);

                var labelElement = label.render();
                labelElement.className += " toggleLabel";

                var compoundInput = document.createElement("div");

                Utils.appendChild(compoundInput, checkboxInput);
                Utils.appendChild(compoundInput, labelElement);

                Utils.appendChild(element, compoundInput);
            }

            return element;
        }
    }

    choices: Array<Choice> = [];
    isCompact: boolean;
    isMultiSelect: boolean;
    placeholder: string;

    parse(json: any) {
        super.parse(json);

        this.isCompact = !(json["style"] === "expanded");
        this.isMultiSelect = json["isMultiSelect"];
        this.placeholder = json["placeholder"];

        if (json["choices"] != undefined) {
            var choiceArray = json["choices"] as Array<any>;

            for (var i = 0; i < choiceArray.length; i++) {
                var choice = new Choice();

                choice.title = choiceArray[i]["title"];
                choice.value = choiceArray[i]["value"];

                this.choices.push(choice);
            }
        }
    }

    get value(): string {
        if (!this.isMultiSelect) {
            if (this.isCompact) {
                return this._selectElement ? this._selectElement.value : null;
            }
            else {
                if (this._toggleInputs.length == 0) {
                    return null;
                }

                for (var i = 0; i < this._toggleInputs.length; i++) {
                    if (this._toggleInputs[i].checked) {
                        return this._toggleInputs[i].value;
                    }
                }

                return null;
            }
        }
        else {
            if (this._toggleInputs.length == 0) {
                return null;
            }
            
            var result: string = "";

            for (var i = 0; i < this._toggleInputs.length; i++) {
                if (this._toggleInputs[i].checked) {
                    if (result != "") {
                        result += ";";
                    }

                    result += this._toggleInputs[i].value;
                }
            }

            return result == "" ? null : result;
        }
    }
}

export class NumberInput extends Input {
    private _numberInputElement: HTMLInputElement;

    protected internalRender(): HTMLElement {
        this._numberInputElement = document.createElement("input");
        this._numberInputElement.type = "number";
        this._numberInputElement.className = "input number";
        this._numberInputElement.min = this.min;
        this._numberInputElement.max = this.max;

        if (!Utils.isNullOrEmpty(this.defaultValue)) {
            this._numberInputElement.value = this.defaultValue;
        }

        return this._numberInputElement;
    }

    min: string;
    max: string;

    parse(json: any) {
        super.parse(json);

        this.min = json["min"];
        this.max = json["max"];
    }

    get value(): string {
        return this._numberInputElement ? this._numberInputElement.value : null;
    }
}

export class DateInput extends Input {
    private _dateInputElement: HTMLInputElement;

    protected internalRender(): HTMLElement {
        this._dateInputElement = document.createElement("input");
        this._dateInputElement.type = "date";
        this._dateInputElement.className = "input date";

        return this._dateInputElement;
    }

    get value(): string {
        return this._dateInputElement ? this._dateInputElement.value : null;
    }
}

export class TimeInput extends Input {
    private _timeInputElement: HTMLInputElement;

    protected internalRender(): HTMLElement {
        this._timeInputElement = document.createElement("input");
        this._timeInputElement.type = "time";
        this._timeInputElement.className = "input time";

        return this._timeInputElement;
    }

    get value(): string {
        return this._timeInputElement ? this._timeInputElement.value : null;
    }
}

enum ActionButtonStyle {
    Link,
    Push
}

enum ActionButtonState {
    Normal,
    Expanded,
    Subdued
}

class ActionButton {
    private _action: Action;
    private _style: ActionButtonStyle;
    private _element: HTMLElement = null;
    private _state: ActionButtonState = ActionButtonState.Normal;
    private _text: string;

    private click() {
        if (this.onClick != null) {
            this.onClick(this);
        }
    }

    private updateCssStyle() {
        let cssStyle = this._style == ActionButtonStyle.Link ? "linkButton " : "pushButton ";

        switch (this._state) {
            case ActionButtonState.Expanded:
                cssStyle += " expanded";
                break;
            case ActionButtonState.Subdued:
                cssStyle += " subdued";
                break;
        }

        this._element.className = cssStyle;
    }

    constructor(action: Action, style: ActionButtonStyle) {
        this._action = action;
        this._style = style;
        this._element = document.createElement("div");
        this._element.onclick = (e) => { this.click(); };

        this.updateCssStyle();
    }

    onClick: (actionButton: ActionButton) => void = null;

    get action() {
        return this._action;
    }

    get text(): string {
        return this._text;
    }

    set text(value: string) {
        this._text = value;
        this._element.innerText = this._text;
    }

    get element(): HTMLElement {
        return this._element;
    }

    get state(): ActionButtonState {
        return this._state;
    }

    set state(value: ActionButtonState) {
        this._state = value;

        this.updateCssStyle();
    }
}

export abstract class Action {
    static createAction(json: any): Action {
        var actionType = json["type"];

        var result = AdaptiveCard.actionTypeRegistry.createInstance(actionType);

        if (result) {
            result.parse(json);
        }
        else {
            raiseValidationErrorEvent(Enums.ValidationError.UnknownActionType, "Unknown action type: " + actionType);
        }

        return result;
    }

    private _container: Container = null;

    protected setContainer(value: Container) {
        this._container = value;
    }

    prepare(inputs: Array<Input>) {
        // Do nothing in base implementation
    };

    parse(json: any) {
        this.title = json["title"];        
    }

    title: string;

    get container(): Container {
        return this._container;
    }
}

export abstract class ExternalAction extends Action {
}

export class SubmitAction extends ExternalAction {
    private _isPrepared: boolean = false;
    private _originalData: Object;
    private _processedData: Object;

    prepare(inputs: Array<Input>) {
        if (this._originalData) {
            this._processedData = JSON.parse(JSON.stringify(this._originalData));
        }
        else {
            this._processedData = { };
        }

        for (var i = 0; i < inputs.length; i++) {
            var inputValue = inputs[i].value;

            if (inputValue != null) {
                this._processedData[inputs[i].id] = inputs[i].value;
            }
        }

        this._isPrepared = true;
    }

    parse(json: any) {
        super.parse(json);

        this.data = json["data"];        
    }

    get data(): Object {
        return this._isPrepared ? this._processedData : this._originalData;
    }

    set data(value: Object) {
        this._originalData = value;
        this._isPrepared = false;
    }
}

export class OpenUrlAction extends ExternalAction {
    url: string;

    parse(json: any) {
        super.parse(json);

        this.url = json["url"];        
    }
}

export class HttpHeader {
    private _value = new Utils.StringWithSubstitutions();

    name: string;

    prepare(inputs: Array<Input>) {
        this._value.substituteInputValues(inputs);
    }

    get value(): string {
        return this._value.get();
    }

    set value(newValue: string) {
        this._value.set(newValue);
    }
}

export class HttpAction extends ExternalAction {
    private _url = new Utils.StringWithSubstitutions();
    private _body = new Utils.StringWithSubstitutions();
    private _headers: Array<HttpHeader> = [];

    method: string;

    prepare(inputs: Array<Input>) {
        this._url.substituteInputValues(inputs);
        this._body.substituteInputValues(inputs);

        for (var i = 0; i < this._headers.length; i++) {
            this._headers[i].prepare(inputs);
        }
    };

    parse(json: any) {
        super.parse(json);

        this.url = json["url"];
        this.method = json["method"];
        this.body = json["body"];

        if (json["headers"] != null) {
            var jsonHeaders = json["headers"] as Array<any>;

            for (var i = 0; i < jsonHeaders.length; i++) {
                let httpHeader = new HttpHeader();

                httpHeader.name = jsonHeaders[i]["name"];
                httpHeader.value = jsonHeaders[i]["value"];

                this.headers.push(httpHeader);
            }
        }        
    }

    get url(): string {
        return this._url.get();
    }

    set url(value: string) {
        this._url.set(value);
    }

    get body(): string {
        return this._body.get();
    }

    set body(value: string) {
        this._body.set(value);
    }

    get headers(): Array<HttpHeader> {
        return this._headers;
    }
}

export class ShowCardAction extends Action {
    protected setContainer(value: Container) {
        super.setContainer(value);

        invokeSetContainer(this.card, value);
    }

    readonly card: ShowCardActionContainer;

    title: string;

    constructor() {
        super();

        this.card = new ShowCardActionContainer();
    }

    parse(json: any) {
        super.parse(json);

        this.card.parse(json["card"], "body");
    }
}

export class ActionCollection {
    private _container: Container;
    private _forbiddenActionTypes: Array<any>;
    private _actionButtons: Array<ActionButton> = [];
    private _actionCardContainer: HTMLDivElement;
    private _expandedAction: Action = null;

    private hideActionCardPane() {
        this._actionCardContainer.innerHTML = '';
        this._actionCardContainer.style.padding = "0px";
        this._actionCardContainer.style.marginTop = "0px";

        if (this.onHideActionCardPane) {
            this.onHideActionCardPane();
        }
    }

    private showActionCardPane(action: ShowCardAction) {
        if (this.onShowActionCardPane) {
            this.onShowActionCardPane(action);
        }

        this._actionCardContainer.innerHTML = '';

        var padding = Utils.getActualPadding(this._actionCardContainer);

        this._actionCardContainer.style.padding = null;
        this._actionCardContainer.style.paddingLeft = padding.left + "px";
        this._actionCardContainer.style.paddingRight = padding.right + "px";

        this._actionCardContainer.style.marginTop = this.items.length > 1 ? null : "0px";
        this._actionCardContainer.style.marginLeft = "-" + padding.left + "px";
        this._actionCardContainer.style.marginRight = "-" + padding.right + "px";

        Utils.appendChild(this._actionCardContainer, action.card.render());
    }

    private actionClicked(actionButton: ActionButton) {
        if (!(actionButton.action instanceof ShowCardAction)) {
            for (var i = 0; i < this._actionButtons.length; i++) {
                this._actionButtons[i].state = ActionButtonState.Normal;
            }

            this.hideActionCardPane();

            raiseExecuteActionEvent(<ExternalAction>actionButton.action);
        }
        else {
            if (AdaptiveCard.renderOptions.showCardActionMode == Enums.ShowCardActionMode.Popup) {
                var actionShowCard = <ShowCardAction>actionButton.action;

                raiseShowPopupCardEvent(actionShowCard);
            }
            else if (actionButton.action === this._expandedAction) {
                for (var i = 0; i < this._actionButtons.length; i++) {
                    this._actionButtons[i].state = ActionButtonState.Normal;
                }

                this._expandedAction = null;

                this.hideActionCardPane();
            }
            else {
                for (var i = 0; i < this._actionButtons.length; i++) {
                    if (this._actionButtons[i] !== actionButton) {
                        this._actionButtons[i].state = ActionButtonState.Subdued;
                    }
                }

                actionButton.state = ActionButtonState.Expanded;

                this._expandedAction = actionButton.action;

                this.showActionCardPane(actionButton.action);
            }
        }
    }

    constructor(container: Container, forbiddenActionTypes?: Array<any>) {
        this._container = container;
        this._forbiddenActionTypes = forbiddenActionTypes;
    }
    
    items: Array<Action> = [];
    onHideActionCardPane: () => void = null;
    onShowActionCardPane: (action: ShowCardAction) => void = null;

    render(): HTMLElement {
        let element = document.createElement("div");
        element.className = "actionGroup";

        let buttonStrip = document.createElement("div");
        buttonStrip.className = "buttonStrip";

        this._actionCardContainer = document.createElement("div");
        this._actionCardContainer.className = "actionCardContainer";
        this._actionCardContainer.style.padding = "0px";
        this._actionCardContainer.style.marginTop = "0px";

        var renderedActions: number = 0;

        if (this.items.length == 1 && this.items[0] instanceof ShowCardAction) {
            this.showActionCardPane(<ShowCardAction>this.items[0]);

            renderedActions++;
        }
        else {
            var actionButtonStyle = ActionButtonStyle.Push;

            for (var i = 0; i < this.items.length; i++) {
                if (this.items[i] instanceof ShowCardAction) {
                    actionButtonStyle = ActionButtonStyle.Link;
                    break;
                }
            }

            for (var i = 0; i < this.items.length; i++) {
                let buttonStripItem = document.createElement("div");
                buttonStripItem.className = "buttonStripItem";

                let actionButton = new ActionButton(this.items[i], actionButtonStyle);
                actionButton.text = this.items[i].title;

                actionButton.onClick = (ab) => { this.actionClicked(ab); };

                this._actionButtons.push(actionButton);

                if (i < this.items.length - 1) {
                    buttonStripItem.className += " buttonStripItemSpacer";
                }

                Utils.appendChild(buttonStripItem, actionButton.element);
                Utils.appendChild(buttonStrip, buttonStripItem);

                renderedActions++;
            }

            Utils.appendChild(element, buttonStrip);
        }

        Utils.appendChild(element, this._actionCardContainer);

        return renderedActions > 0 ? element : null;
    }
}

export class Container extends CardElement {
    private showBottomSpacer(requestingElement: CardElement = null) {
        if (requestingElement == null || this.isLastItem(requestingElement)) {
            if (this.container) {
                this.container.showBottomSpacer(this);
            }

            this._element.style.paddingBottom = null;
        }
    }

    private hideBottomSpacer(requestingElement: CardElement = null) {
        if (requestingElement == null || this.isLastItem(requestingElement)) {
            if (this.container) {
                this.container.hideBottomSpacer(this);
            }

            this._element.style.paddingBottom = "0px";
        }
    }

    private checkElementTypeIsAllowed(element: CardElement) {
        var className = Utils.getClassNameFromInstance(element);
        var typeIsForbidden = false;
        var forbiddenElementTypes = this.getForbiddenElementTypes();

        if (forbiddenElementTypes) {
            for (var i = 0; i < forbiddenElementTypes.length; i++) {
                if (className === Utils.getClassNameFromConstructor(forbiddenElementTypes[i])) {
                    typeIsForbidden = true;
                    break;
                }
            }
        }

        if (!typeIsForbidden) {
            for (var i = 0; i < AdaptiveCard.validationOptions.supportedElementTypes.length; i++) {
                if (className === Utils.getClassNameFromConstructor(AdaptiveCard.validationOptions.supportedElementTypes[i])) {
                    return true;
                }
            }
        }

        raiseValidationErrorEvent(
            Enums.ValidationError.ElementTypeNotAllowed,
            "Elements of type " + className + " are not allowed in this container.");

        return false;
    }
    
    private checkActionTypeIsAllowed(action: Action): boolean {
        var className = Utils.getClassNameFromInstance(action);
        var typeIsForbidden = false;
        var forbiddenActionTypes = this.getForbiddenActionTypes();

        if (forbiddenActionTypes) {
            for (var i = 0; i < forbiddenActionTypes.length; i++) {
                if (className === Utils.getClassNameFromConstructor(forbiddenActionTypes[i])) {
                    typeIsForbidden = true;
                    break;
                }
            }
        }

        if (!typeIsForbidden) {
            for (var i = 0; i < AdaptiveCard.validationOptions.supportedActionTypes.length; i++) {
                if (className === Utils.getClassNameFromConstructor(AdaptiveCard.validationOptions.supportedActionTypes[i])) {
                    return true;
                }
            }
        }

        raiseValidationErrorEvent(
            Enums.ValidationError.ActionTypeNotAllowed,
            "Actions of type " + className + " are not allowed in this container.");

        return false;
    }

    private _items: Array<CardElement> = [];
    private _hasBottomPadding?: boolean;
    private _textColor?: Enums.TextColor;

    protected _actionCollection: ActionCollection;
    protected _element: HTMLDivElement;

    protected isLastItem(element: CardElement): boolean {
        return this._items.indexOf(element) == (this._items.length - 1);
    }

    protected getForbiddenElementTypes(): Array<any> {
        return null;
    }

    protected getForbiddenActionTypes(): Array<any> {
        return null;
    }

    protected internalRender(): HTMLElement {
        this._element = document.createElement("div");
        this._element.className = this.cssClassName;
        this._element.onclick = (e) => {
            if (this.selectAction != null) {
                raiseExecuteActionEvent(this.selectAction);
                e.cancelBubble = true;
            }
        }

        if (!Utils.isNullOrEmpty(this.backgroundColor)) {
            this._element.style.backgroundColor = this.backgroundColor;
        }

        if (this._items.length > 0) {
            var renderedElementCount: number = 0;

            for (var i = 0; i < this._items.length; i++) {
                var renderedElement = this._items[i].render();

                if (renderedElement != null) {
                    if (renderedElementCount == 0) {
                        this.removeTopSpacing(renderedElement);
                    }
                    else {
                        if (this._items[i].separation == Enums.Separation.Strong) {
                            var separator = document.createElement("div");
                            separator.className = "separator";

                            Utils.appendChild(this._element, separator);
                        }
                    }

                    Utils.appendChild(this._element, renderedElement);

                    renderedElementCount++;
                }
            }
        }

        var renderedActions = this._actionCollection.render();

        Utils.appendChild(this._element, renderedActions);

        if (renderedElementCount > 0 || renderedActions != null) {
            if (!Utils.isNullOrEmpty(this.backgroundImageUrl)) {
                this._element.style.backgroundImage = 'url("' + this.backgroundImageUrl + '")';
                this._element.style.backgroundRepeat = "no-repeat";
                this._element.style.backgroundSize = "cover";
            }

            return this._element;
        }
        else {
            return null;
        }
    }

    protected get hideOverflow() {
        return false;
    }

    protected get cssClassName(): string {
        var className = "container";

        if (this.selectAction != null) {
            className += " selectable";
        }

        return className;
    }

    backgroundImageUrl: string;
    backgroundColor: string;
    selectAction: ExternalAction;

    constructor() {
        super();

        this._actionCollection = new ActionCollection(this, this.getForbiddenActionTypes());
        this._actionCollection.onHideActionCardPane = () => { this.showBottomSpacer() };
        this._actionCollection.onShowActionCardPane = (action: ShowCardAction) => { this.hideBottomSpacer() };
    }

    parse(json: any, itemsCollectionPropertyName: string = "items") {
        super.parse(json);

        this.backgroundImageUrl = json["backgroundImage"];
        this.backgroundColor = json["backgroundColor"];

        this.textColor = Enums.stringToTextColor(json["textColor"], null);

        if (json[itemsCollectionPropertyName] != null) {
            var items = json[itemsCollectionPropertyName] as Array<any>;

            for (var i = 0; i < items.length; i++) {
                var elementType = items[i]["type"];

                var element = AdaptiveCard.elementTypeRegistry.createInstance(elementType);

                if (!element) {
                    raiseValidationErrorEvent(Enums.ValidationError.UnknownElementType, "Unknown element type: " + elementType);
                }
                else {
                    element.parse(items[i]);

                    this.addItem(element);
                }
            }
        }

        if (json["actions"] != undefined) {
            var jsonActions = json["actions"] as Array<any>;

            for (var i = 0; i < jsonActions.length; i++) {
                var action = Action.createAction(jsonActions[i]);

                if (action != null) {
                    this.addAction(action);
                }
            }
        }

        var selectActionJson = json["selectAction"];

        if (selectActionJson != undefined) {
            this.selectAction = <ExternalAction>Action.createAction(selectActionJson);
        }
    }

    get textColor(): Enums.TextColor {
        if (!this._textColor) {
            if (this.container) {
                return this.container.textColor;
            }
            else {
                return AdaptiveCard.renderOptions.defaultTextColor;
            }
        }
        else {
            return this._textColor;
        }
    }

    set textColor(value: Enums.TextColor) {
        this._textColor = value;
    }

    addItem(item: CardElement) {
        if (!AdaptiveCard.validationOptions.supportsInteractivity && item instanceof Input) {
            raiseValidationErrorEvent(
                Enums.ValidationError.InteractivityNotAllowed,
                "Interactivity is not allowed.");

            return;
        }

        if (this.checkElementTypeIsAllowed(item)) {
            if (!item.container) {
                this._items.push(item);

                invokeSetContainer(item, this);
            }
            else {
                throw new Error("The element already belongs to another container.")
            }
        }
    }

    addAction(action: Action) {
        var addAction = true;

        if (!AdaptiveCard.validationOptions.supportsInteractivity) {
            raiseValidationErrorEvent(
                Enums.ValidationError.InteractivityNotAllowed,
                "Interactivity is not allowed.");

            addAction = false;            
        }

        if (addAction) {
            var isNested = this.container || this instanceof ShowCardActionContainer;

            if (isNested && !AdaptiveCard.validationOptions.supportsNestedActions) {
                raiseValidationErrorEvent(
                    Enums.ValidationError.NestedActionNotAllowed,
                    "Nested actions are not allowed.");

                addAction = false;
            }
        }

        if (addAction) {
            addAction = this.checkActionTypeIsAllowed(action);
        }

        if (addAction) {
            if (AdaptiveCard.validationOptions.maxActions != null && this._actionCollection.items.length >= AdaptiveCard.validationOptions.maxActions) {
                raiseValidationErrorEvent(
                    Enums.ValidationError.TooManyActions,
                    "Maximum number of actions (" + AdaptiveCard.validationOptions.maxActions.toString() + ") exceeded.");

                addAction = false;
            }            
        }

        if (addAction) {
            this._actionCollection.items.push(action);

            invokeSetContainer(action, this);
        }
    }

    getAllInputs(): Array<Input> {
        var result: Array<Input> = [];

        for (var i = 0; i < this._items.length; i++) {
            var item: CardElement = this._items[i];

            if (item instanceof Input) {
                result.push(<Input>item);
            }

            if (item instanceof Container) {
                result = result.concat((<Container>item).getAllInputs());
            }
        }

        for (var i = 0; i < this._actionCollection.items.length; i++) {
            var action = this._actionCollection.items[i];

            if (action instanceof ShowCardAction) {
                var actionShowCard = <ShowCardAction>action;

                if (actionShowCard.card) {
                    result = result.concat(actionShowCard.card.getAllInputs());
                }
            }
        }

        return result;
    }

    renderSpeech(): string {
        if (this.speak != null) {
            return this.speak;
        }

        // render each item
        let speak = null;

        if (this._items.length > 0) {
            speak = '';

            for (var i = 0; i < this._items.length; i++) {
                var result = this._items[i].renderSpeech();

                if (result) {
                    speak += result;
                }
            }
        }

        return speak;
    }
}

export class ShowCardActionContainer extends Container {
    protected getForbiddenActionTypes(): Array<any> {
        return [ ShowCardAction ];
    }

    protected get cssClassName(): string {
        return "showCardActionContainer";
    }
}

export class Column extends Container {
    weight: number = 100;

    protected get cssClassName(): string {
        var className = "column";

        if (this.selectAction != null) {
            className += " selectable";
        }

        return className;
    }

    protected adjustLayout(element: HTMLElement) {
        if (this.weight > 0) {
            element.style.flex = "1 1 " + this.weight + "%";
        }
        else if (this.weight == 0) {
            element.style.flex = "0 0 auto";
        }
        else {
            element.style.flex = "1 1 auto";
        }
    }

    parse(json: any) {
        super.parse(json);

        if (json["size"] === "auto") {
            this.weight = 0;
        }
        else if (json["size"] === "stretch") {
            this.weight = -1;
        }
        else {
            this.weight = Number(json["size"]);
        }
    }
}

export class ColumnSet extends CardElement {
    private _columns: Array<Column> = [];

    protected internalRender(): HTMLElement {
        if (this._columns.length > 0) {
            var element = document.createElement("div");
            element.className = "columnGroup";
            element.style.display = "flex";

            var renderedColumnCount: number = 0;

            for (let i = 0; i < this._columns.length; i++) {
                var renderedColumn = this._columns[i].render();

                if (renderedColumn != null) {
                    Utils.appendChild(element, renderedColumn);

                    if (this._columns.length > 1 && i < this._columns.length - 1 && this._columns[i + 1].separation != Enums.Separation.None) {
                        var separator = document.createElement("div");
                        separator.style.flex = "0 0 auto";

                        switch (this._columns[i + 1].separation) {
                            case Enums.Separation.Default:
                                separator.className = "defaultColumnSeparator";
                                break;
                            case Enums.Separation.Strong:
                                separator.className = "strongColumnSeparator";
                                break;
                        }

                        Utils.appendChild(element, separator);
                    }

                    renderedColumnCount++;
                }
            }

            return renderedColumnCount > 0 ? element : null;
        }
        else {
            return null;
        }
    }

    parse(json: any) {
        super.parse(json);
        
        if (json["columns"] != null) {
            let jsonColumns = json["columns"] as Array<any>;

            for (let i = 0; i < jsonColumns.length; i++) {
                var column = new Column();

                column.parse(jsonColumns[i]);

                this.addColumn(column);
            }
        }
    }

    addColumn(column: Column) {
        if (!column.container) {
            this._columns.push(column);
            invokeSetContainer(column, this.container);
        }
        else {
            throw new Error("This column already belongs to another ColumnSet.");
        }
    }

    renderSpeech(): string {
        if (this.speak != null) {
            return this.speak;
        }

        // render each item
        let speak = '';

        if (this._columns.length > 0) {
            for (var i = 0; i < this._columns.length; i++) {
                speak += this._columns[i].renderSpeech();
            }
        }

        return speak;
    }
}

export interface IVersion {
    major: number;
    minor: number;
}

export interface IRenderOptions {
    defaultTextColor: Enums.TextColor;
    showCardActionMode: Enums.ShowCardActionMode;
}

export interface IValidationOptions {
    supportedElementTypes: any[];
    supportedActionTypes: any[];
    supportsNestedActions: boolean;
    supportsInteractivity: boolean;
    maxActions?: number;
}

function raiseExecuteActionEvent(action: ExternalAction) {
    if (AdaptiveCard.onExecuteAction != null) {
        action.prepare(action.container.getRootContainer().getAllInputs());

        AdaptiveCard.onExecuteAction(action);
    }
}

function raiseShowPopupCardEvent(action: ShowCardAction) {
    if (AdaptiveCard.onShowPopupCard != null) {
        AdaptiveCard.onShowPopupCard(action);
    }
}

function raiseValidationErrorEvent(error: Enums.ValidationError, data: string) {
    if (AdaptiveCard.onValidationError != null) {
        AdaptiveCard.onValidationError(error, data);
    }
}

interface ITypeRegistration<T> {
    typeName: string,
    createInstance: () => T;
}

export class TypeRegistry<T> {
    private _items: Array<ITypeRegistration<T>> = [];

    private findTypeRegistration(typeName: string): ITypeRegistration<T> {
        for (var i = 0; i < this._items.length; i++) {
            if (this._items[i].typeName === typeName) {
                return this._items[i];
            }
        }

        return null;
    }

    clear() {
        this._items = [];
    }

    registerType(typeName: string, createInstance: () => T) {
        var registrationInfo = this.findTypeRegistration(typeName);

        if (registrationInfo != null) {
            registrationInfo.createInstance = createInstance;
        }
        else {
            registrationInfo = {
                typeName: typeName,
                createInstance: createInstance
            }

            this._items.push(registrationInfo);
        }
    }

    unregisterType(typeName: string) {
        for (var i = 0; i < this._items.length; i++) {
            if (this._items[i].typeName === typeName) {                
                this._items = this._items.splice(i, 1);

                return;
            }
        }
    }

    createInstance(typeName: string): T {
        var registrationInfo = this.findTypeRegistration(typeName);

        return registrationInfo != null ? registrationInfo.createInstance() : null;
    }
}

export class AdaptiveCard {
    private static currentVersion: IVersion = { major: 1, minor: 0 };

    static elementTypeRegistry = new TypeRegistry<CardElement>();
    static actionTypeRegistry = new TypeRegistry<Action>();

    static onExecuteAction: (action: ExternalAction) => void = null;
    static onShowPopupCard: (action: ShowCardAction) => void = null;
    static onValidationError: (error: Enums.ValidationError, message: string) => void = null;

    static validationOptions: IValidationOptions = {
        supportedElementTypes: [
            Container,
            TextBlock,
            Image,
            ImageSet,
            FactSet,
            ColumnSet,
            TextInput,
            DateInput,
            NumberInput,
            ChoiceSetInput,
            ToggleInput
        ],
        supportedActionTypes: [
            HttpAction,
            OpenUrlAction,
            SubmitAction,
            ShowCardAction
        ],
        supportsNestedActions: true,
        supportsInteractivity: true
    };

    static renderOptions: IRenderOptions = {
        defaultTextColor: Enums.TextColor.Dark,
        showCardActionMode: Enums.ShowCardActionMode.Inline
    }

    static initialize() {
        AdaptiveCard.elementTypeRegistry.clear();

        AdaptiveCard.elementTypeRegistry.registerType("Container", () => { return new Container(); });
        AdaptiveCard.elementTypeRegistry.registerType("TextBlock", () => { return new TextBlock(); });
        AdaptiveCard.elementTypeRegistry.registerType("Image", () => { return new Image(); });
        AdaptiveCard.elementTypeRegistry.registerType("ImageSet", () => { return new ImageSet(); });
        AdaptiveCard.elementTypeRegistry.registerType("FactSet", () => { return new FactSet(); });
        AdaptiveCard.elementTypeRegistry.registerType("ColumnSet", () => { return new ColumnSet(); });
        AdaptiveCard.elementTypeRegistry.registerType("Input.Text", () => { return new TextInput(); });
        AdaptiveCard.elementTypeRegistry.registerType("Input.Date", () => { return new DateInput(); });
        AdaptiveCard.elementTypeRegistry.registerType("Input.Time", () => { return new TimeInput(); });
        AdaptiveCard.elementTypeRegistry.registerType("Input.Number", () => { return new NumberInput(); });
        AdaptiveCard.elementTypeRegistry.registerType("Input.ChoiceSet", () => { return new ChoiceSetInput(); });
        AdaptiveCard.elementTypeRegistry.registerType("Input.Toggle", () => { return new ToggleInput(); });

        AdaptiveCard.actionTypeRegistry.clear();

        AdaptiveCard.actionTypeRegistry.registerType("Action.Http", () => { return new HttpAction(); });
        AdaptiveCard.actionTypeRegistry.registerType("Action.OpenUrl", () => { return new OpenUrlAction(); });
        AdaptiveCard.actionTypeRegistry.registerType("Action.Submit", () => { return new SubmitAction(); });
        AdaptiveCard.actionTypeRegistry.registerType("Action.ShowCard", () => { return new ShowCardAction(); });
    }

    readonly root: Container = new Container();

    minVersion: IVersion = { major: 1, minor: 0 };
    fallbackText: string;

    parse(json: any) {
        var cardTypeName = json["type"];

        if (cardTypeName != "AdaptiveCard" && AdaptiveCard.onValidationError) {
            AdaptiveCard.onValidationError(
                Enums.ValidationError.MissingCardType,
                "Invalid card type. Make sure the card's type property is set to \"AdaptiveCard\".");
        }

        var minVersion = json["minVersion"];
        var regEx = /(\d+).(\d+)/gi;
        var matches = regEx.exec(minVersion);

        if (matches != null && matches.length == 3) {
            this.minVersion.major = parseInt(matches[1]);
            this.minVersion.minor = parseInt(matches[2]);
        }

        this.fallbackText = json["fallbackText"];

        this.root.parse(json, "body");
    }

    render(): HTMLElement {
        var unsupportedVersion: boolean =
            (AdaptiveCard.currentVersion.major < this.minVersion.major) ||
            (AdaptiveCard.currentVersion.major == this.minVersion.major && AdaptiveCard.currentVersion.minor < this.minVersion.minor);

        var renderedCard: HTMLElement;

        if (unsupportedVersion) {
            renderedCard = document.createElement("div");
            renderedCard.innerHTML = this.fallbackText ? this.fallbackText : "The version of this card is not supported.";
        }
        else {
            renderedCard = this.root.render();
            renderedCard.className = "rootContainer";
        }

        return renderedCard;
    }

    renderSpeech(): string {
        return this.root.renderSpeech();
    }
}

// This calls acts as a static constructor (see https://github.com/Microsoft/TypeScript/issues/265)
AdaptiveCard.initialize();