import * as Clipboard from "clipboard";
import * as Adaptive from "adaptivecards";
import * as Controls from "adaptivecards-controls";
import * as Constants from "./constants";
import * as Designer from "./card-designer";
import { ILoadSettingResult, SettingsManager } from "./settings-manager";
import { HostContainer } from "./containers/host-container";
import { OutlookContainer } from "./containers/outlook-container";
import { LightTeamsContainer, DarkTeamsContainer } from "./containers/teams-container";
import { CortanaContainer } from "./containers/cortana-container";
import { WebChatContainer } from "./containers/webchat-container";
import { ToastContainer } from "./containers/toast-container";
import { TimelineContainer } from "./containers/timeline-container";
import { BotFrameworkContainer } from "./containers/bf-image-container";
import { adaptiveCardSchema } from "./adaptive-card-schema";
import { FullScreenHandler } from "./fullscreen-handler";
import { Toolbar, ToolbarButton, ToolbarSeparator, ToolbarLabel, ToolbarChoicePicker } from "./toolbar";
import { SidePane, SidePaneOrientation } from "./side-pane";
import { Splitter } from "./splitter";

// var monacoEditor: any;

// const MAX_UNDO_STACK_SIZE = 50;

// Monaco loads asynchronously via a call to require() from index.html
// App initialization needs to happen after.
declare function loadMonacoEditor(schema, callback);

// var isMonacoEditorLoaded: boolean = false;

/*
function monacoEditorLoaded() {
    if (!isMonacoEditorLoaded) {
        isMonacoEditorLoaded = true;

        monacoEditor = window["monaco"].editor.create(
            document.getElementById('jsonEditorHost'),
            {
                folding: true,
                validate: false,
                fontSize: 13.5,
                language: 'json',
                minimap: {
                    enabled: false
                }
            }
        );
        
        window.addEventListener('resize', function () {
            monacoEditor.layout();
        });

        document.getElementById("loadingEditor").remove();

        monacoEditor.onDidChangeModelContent(
            function (e) {
                scheduleUpdateCardFromJson();
            });

        updateJsonFromCard(false);
    }
}
*/

/*
function getCurrentJsonPayload(): string {
    return isMonacoEditorLoaded ? monacoEditor.getValue() : Constants.defaultPayload;
}

function setJsonPayload(payload: object) {
    monacoEditor.setValue(JSON.stringify(payload, null, 4));
}
*/

class SidePaneHeader {
    private _sidePaneElement: HTMLElement;
    private _rootElement: HTMLElement;
    private _contentElement: HTMLElement;
    private _titleElement: HTMLElement;
    private _iconElement: HTMLElement;
    private _statusTextElement: HTMLElement;
    private _isExpanded: boolean = true;

    collapsedTabContainer: HTMLElement = null;
    collapsedTabClass: string = null;
    targetElementsSelector: string = null;

    onToggled: (sender: SidePaneHeader) => void;

    constructor(sidePaneElement: HTMLElement, title: string) {
        this._sidePaneElement = sidePaneElement;

        this._rootElement = document.createElement("div");
        this._rootElement.innerHTML = "";
        this._rootElement.className = "acd-sidePane-header";

        this._contentElement = document.createElement("div");
        this._contentElement.className = "acd-sidePane-header-content";

        this._titleElement = document.createElement("span");
        this._titleElement.className = "acd-sidePane-header-title";
        this._titleElement.innerText = title;

        this._contentElement.appendChild(this._titleElement);

        let expandCollapseElement = document.createElement("span");
        expandCollapseElement.className = "acd-sidePane-header-expandCollapseButton";

        this._iconElement = document.createElement("span")
        this._iconElement.classList.add("acd-icon", "acd-icon-header-expanded");

        expandCollapseElement.appendChild(this._iconElement);

        this._statusTextElement = document.createElement("span");
        this._statusTextElement.className = "acd-sidePane-header-status";
        this._statusTextElement.innerText = "Hide";

        expandCollapseElement.appendChild(this._statusTextElement);

        expandCollapseElement.onmousedown = (e) => {
            e.preventDefault();

            return true;
        }

        expandCollapseElement.onclick = (e) => {
            this.toggle();

            e.preventDefault();

            return true;
        }

        this._contentElement.appendChild(expandCollapseElement);
        this._rootElement.appendChild(this._contentElement);

        this._sidePaneElement.insertBefore(this._rootElement, this._sidePaneElement.firstChild);
    }

    toggle() {
        if (this._isExpanded) {
            this._iconElement.classList.add("acd-icon-header-collapsed");
            this._iconElement.classList.remove("acd-icon-header-expanded");
            this._statusTextElement.classList.add("acd-hidden");

            if (this.collapsedTabContainer) {
                this._rootElement.remove();
                this.collapsedTabContainer.appendChild(this._rootElement);
            }
        }
        else {
            this._iconElement.classList.add("acd-icon-header-expanded");
            this._iconElement.classList.remove("acd-icon-header-collapsed");
            this._statusTextElement.classList.remove("acd-hidden");

            if (this.collapsedTabContainer) {
                this._rootElement.remove();
                this._sidePaneElement.insertBefore(this._rootElement, this._sidePaneElement.firstChild);
            }
        }

        this._isExpanded = !this._isExpanded;

        if (this.collapsedTabClass) {
            this._rootElement.classList.toggle(this.collapsedTabClass, !this._isExpanded);
            this._contentElement.classList.toggle(this.collapsedTabClass, !this._isExpanded);
        }

        if (this.targetElementsSelector) {
            let targetNodes = document.getElementsByClassName(this.targetElementsSelector);

            for (let i = 0; i < targetNodes.length; i++) {
                (<HTMLElement>targetNodes[i]).classList.toggle("acd-hidden", !this._isExpanded);
            }
        }

        if (this.onToggled) {
            this.onToggled(this);
        }
    }

    getBoundingRect(): ClientRect {
        return this._rootElement.getBoundingClientRect();
    }

    get isExpanded(): boolean {
        return this._isExpanded;
    }
}

abstract class BasePaletteItem extends Designer.DraggableElement {
    protected abstract getText(): string;
    protected abstract getIconClass(): string;

    protected internalRender(): HTMLElement {
        let element = document.createElement("div");
        element.className = "acd-palette-item";
        element.style.display = "flex";

        let iconElement = document.createElement("div");
        iconElement.classList.add("acd-icon", this.getIconClass());
        iconElement.style.flex = "0 0 auto";

        let labelElement = document.createElement("div");
        labelElement.className = "acd-palette-item-label";
        labelElement.style.flex = "1 1 100%";
        labelElement.innerText = this.getText();

        element.appendChild(iconElement);
        element.appendChild(labelElement);

        return element;
    }

    cloneElement(): HTMLElement {
        return this.internalRender();
    }

    abstract createPeer(designer: Designer.CardDesigner): Designer.CardElementPeer;
}

class ElementPaletteItem extends BasePaletteItem {
    protected getText(): string {
        return this.typeRegistration.typeName;
    }

    protected getIconClass(): string {
        return this.peerRegistration.iconClass;
    }

    readonly typeRegistration: Adaptive.ITypeRegistration<Adaptive.CardElement>;
    readonly peerRegistration: Designer.DesignerPeerRegistrationBase;

    constructor(typeRegistration: Adaptive.ITypeRegistration<Adaptive.CardElement>, peerRegistration: Designer.DesignerPeerRegistrationBase) {
        super();

        this.typeRegistration = typeRegistration;
        this.peerRegistration = peerRegistration;
    }

    createPeer(designer: Designer.CardDesigner): Designer.CardElementPeer {
        let peer = Designer.CardDesigner.cardElementPeerRegistry.createPeerInstance(designer, null, this.typeRegistration.createInstance());
        peer.initializeCardElement();

        return peer;
    }
}

class SnippetPaletteItem extends BasePaletteItem {
    protected getText(): string {
        return this.name;
    }

    protected getIconClass(): string {
        return null;
    }

    readonly name: string;
    snippet: object;

    constructor(name: string) {
        super();

        this.name = name;
    }

    createPeer(designer: Designer.CardDesigner): Designer.CardElementPeer {
        if (this.snippet) {
            let rootElementTypeName = this.snippet["type"];

            if (rootElementTypeName) {
                let adaptiveElement = Adaptive.AdaptiveCard.elementTypeRegistry.createInstance(rootElementTypeName);

                if (adaptiveElement) {
                    adaptiveElement.parse(this.snippet);

                    let peer = Designer.CardDesigner.cardElementPeerRegistry.createPeerInstance(designer, null, adaptiveElement);
                    peer.initializeCardElement();

                    return peer;
                }
            }
        }
    }
}

class DesignerApp {
    private static MAX_UNDO_STACK_SIZE = 50;

    private monacoEditor: any;
    private isMonacoEditorLoaded: boolean = false;

    private _designer: Designer.CardDesigner;
    private _propertySheetHostConfig: Adaptive.HostConfig;
    private _designerHostElement: HTMLElement;
    private _paletteHostElement: HTMLElement;
    private _draggedPaletteItem: BasePaletteItem;
    private _draggedElement: HTMLElement;
    private _currentMousePosition: Designer.IPoint;
    private _card: Adaptive.AdaptiveCard;
    private _hostContainerPicker: Controls.DropDown;
    private _selectedHostContainer: HostContainer;
    private _undoStack: Array<object> = [];
    private _undoStackIndex: number = -1;

    public buildTreeView() {
        if (this.treeViewHostElement) {
            this.treeViewHostElement.innerHTML = "";
            this.treeViewHostElement.appendChild(this.designer.rootPeer.treeItem.render());
        }
    }

    private buildPropertySheet(peer: Designer.DesignerPeer) {
        if (this.propertySheetHostElement) {
            this.propertySheetHostElement.innerHTML = "";

            let card: Adaptive.AdaptiveCard;

            if (peer) {
                card = peer.buildPropertySheetCard();
            }
            else {

                card = new Adaptive.AdaptiveCard();
                card.parse(
                    {
                        type: "AdaptiveCard",
                        version: "1.0",
                        body: [
                            {
                                type: "TextBlock",
                                wrap: true,
                                text: "**Nothing is selected**"
                            },
                            {
                                type: "TextBlock",
                                wrap: true,
                                text: "Select an element in the card to modify its properties."
                            }
                        ]
                    }
                );
                card.padding = new Adaptive.PaddingDefinition(
                    Adaptive.Spacing.Small,
                    Adaptive.Spacing.Small,
                    Adaptive.Spacing.Small,
                    Adaptive.Spacing.Small
                )
            }

            card.hostConfig = this._propertySheetHostConfig;

            this.propertySheetHostElement.appendChild(card.render());
        }
    }

    private addPaletteItem(paletteItem: BasePaletteItem, hostElement: HTMLElement) {
        paletteItem.render();
        paletteItem.onStartDrag = (sender: BasePaletteItem) => {
            this._draggedPaletteItem = sender;

            this._draggedElement = sender.cloneElement();
            this._draggedElement.style.position = "absolute";
            this._draggedElement.style.left = this._currentMousePosition.x + "px";
            this._draggedElement.style.top = this._currentMousePosition.y + "px";

            document.body.appendChild(this._draggedElement);
        }

        hostElement.appendChild(paletteItem.renderedElement);
    }

    private buildPalette() {
        if (!this._toolPalettePane.content) {
            this._toolPalettePane.content = document.createElement("div");
            this._toolPalettePane.content.className = "acd-dockedPane";
        }

        this._toolPalettePane.content.innerHTML = "";

        let categorizedTypes: Object = {};

        for (let i = 0; i < Adaptive.AdaptiveCard.elementTypeRegistry.getItemCount(); i++) {
            let dummyCardElement = Adaptive.AdaptiveCard.elementTypeRegistry.getItemAt(i).createInstance();
            let peerRegistration = Designer.CardDesigner.cardElementPeerRegistry.findTypeRegistration((<any>dummyCardElement).constructor);

            if (peerRegistration) {
                if (!categorizedTypes.hasOwnProperty(peerRegistration.category)) {
                    categorizedTypes[peerRegistration.category] = [];
                }

                let paletteItem = new ElementPaletteItem(
                    Adaptive.AdaptiveCard.elementTypeRegistry.getItemAt(i),
                    peerRegistration
                )

                categorizedTypes[peerRegistration.category].push(paletteItem);
            }
        }

        for (let category in categorizedTypes) {
            let node = document.createElement('li');
            node.innerText = category;
            node.className = "acd-palette-category";
            this._toolPalettePane.content.appendChild(node);

            for (var i = 0; i < categorizedTypes[category].length; i++) {
                this.addPaletteItem(categorizedTypes[category][i], this._toolPalettePane.content);
            }
        }

        /* This is to test "snippet" support. Snippets are not yet fully baked
        let personaHeaderSnippet = new SnippetPaletteItem("Persona header");
        personaHeaderSnippet.snippet = {
            type: "ColumnSet",
            columns: [
                {
                    width: "auto",
                    items: [
                        {
                            type: "Image",
                            size: "Small",
                            style: "Person",
                            url: "https://pbs.twimg.com/profile_images/3647943215/d7f12830b3c17a5a9e4afcc370e3a37e_400x400.jpeg"
                        }
                    ]
                },
                {
                    width: "stretch",
                    items: [
                        {
                            type: "TextBlock",
                            text: "John Doe",
                            weight: "Bolder",
                            wrap: true
                        },
                        {
                            type: "TextBlock",
                            spacing: "None",
                            text: "Additional information",
                            wrap: true
                        }
                    ]
                }
            ]
        };

        this.addPaletteItem(personaHeaderSnippet);
        */
    }

    private endDrag() {
        if (this._draggedPaletteItem) {
            this._draggedPaletteItem.endDrag();
            this._draggedElement.remove();

            this._draggedPaletteItem = null;
            this._draggedElement = null;
        }
    }

    private recreateDesigner() {
        let styleSheetLinkElement = <HTMLLinkElement>document.getElementById("adaptiveCardStylesheet");

        if (styleSheetLinkElement == null) {
            styleSheetLinkElement = document.createElement("link");
            styleSheetLinkElement.id = "adaptiveCardStylesheet";

            document.getElementsByTagName("head")[0].appendChild(styleSheetLinkElement);
        }

        styleSheetLinkElement.rel = "stylesheet";
        styleSheetLinkElement.type = "text/css";
        styleSheetLinkElement.href = this._selectedHostContainer.styleSheet;

        let designerBackground = document.getElementById("designerBackground");

        if (designerBackground) {
            designerBackground.style.backgroundColor = this._selectedHostContainer.getBackgroundColor();
        }

        this._selectedHostContainer.initialize();

        this._designerHostElement.innerHTML = "";
        this._selectedHostContainer.renderTo(this._designerHostElement);

        this._designer = new Designer.CardDesigner(this._selectedHostContainer.cardHost);
        this._designer.onSelectedPeerChanged = (peer: Designer.CardElementPeer) => {
            this.buildPropertySheet(peer);
        };
        this._designer.onLayoutUpdated = (isFullRefresh: boolean) => {
            if (isFullRefresh) {
                this.scheduleUpdateJsonFromCard();
            }

            this.buildTreeView();
        };
        this._designer.onCardValidated = (errors: Array<Adaptive.IValidationError>) => {
            let errorPane = document.getElementById("errorPane");
            errorPane.innerHTML = "";

            if (errors.length > 0) {
                let errorMessages: Array<string> = [];

                for (let error of errors) {
                    if (errorMessages.indexOf(error.message) < 0) {
                        errorMessages.push(error.message);
                    }
                }

                for (let message of errorMessages) {
                    let errorElement = document.createElement("div");
                    errorElement.style.overflow = "hidden";
                    errorElement.style.textOverflow = "ellipsis";
                    errorElement.innerText = message;

                    errorPane.appendChild(errorElement);
                }

                errorPane.classList.remove("acd-hidden");
            }
            else {
                errorPane.classList.add("acd-hidden");
            }
        };

        this.buildPalette();
        this.buildPropertySheet(null);

        if (this._card) {
            this._card.hostConfig = this._selectedHostContainer.getHostConfig();
        }

        this._designer.card = this._card;
    }

    private selectedHostContainerChanged() {
        this.recreateDesigner();
    }

    public updateJsonEditorLayout() {
        if (this.isMonacoEditorLoaded) {
            // Monaco is very finicky. It will apparently only properly layout if
            // its direct container has an explicit height.
            /*
            let jsonEditorPaneRect = document.getElementById("jsonEditorPane").getBoundingClientRect();
            let jsonEditorHeaderRect = jsonEditorPaneHeader.getBoundingRect();
    
            let jsonEditorHost = document.getElementById("jsonEditorHost");
    
            jsonEditorHost.style.height = (jsonEditorPaneRect.height - jsonEditorHeaderRect.height) + "px";
            */
          
            let jsonEditorPaneRect = this._jsonEditorPane.renderedElement.getBoundingClientRect();
            let jsonEditorHeaderRect = this._jsonEditorPane.getHeaderBoundingRect();
   
            this._jsonEditorPane.content.style.height = (jsonEditorPaneRect.height - jsonEditorHeaderRect.height) + "px";
   
            this.monacoEditor.layout();
        }
    }
    
    public updateFullLayout() {
        this.scheduleLayoutUpdate();
        this.updateJsonEditorLayout();
    }
    
    private jsonUpdateTimer: NodeJS.Timer;
    private cardUpdateTimer: NodeJS.Timer;
    private updateLayoutTimer: NodeJS.Timer;
    
    private preventCardUpdate: boolean = false;
    
    private setJsonPayload(payload: object) {
        this.monacoEditor.setValue(JSON.stringify(payload, null, 4));
    }

    private updateJsonFromCard(addToUndoStack: boolean = true) {
        try {
            this.preventCardUpdate = true;
    
            if (!this.preventJsonUpdate && this.isMonacoEditorLoaded) {
                let cardPayload = this.card.toJSON();
    
                if (addToUndoStack) {
                    this.addToUndoStack(cardPayload);
                }
    
                this.setJsonPayload(cardPayload);
            }
        }
        finally {
            this.preventCardUpdate = false;
        }
    }
    
    private scheduleUpdateJsonFromCard() {
        clearTimeout(this.jsonUpdateTimer);
    
        if (!this.preventJsonUpdate) {
            this.jsonUpdateTimer = setTimeout(() => { this.updateJsonFromCard(); }, 100);
        }
    }
    
    private preventJsonUpdate: boolean = false;
    
    private getCurrentJsonPayload(): string {
        return this.isMonacoEditorLoaded ? this.monacoEditor.getValue() : Constants.defaultPayload;
    }

    public updateCardFromJson() {
        try {
            this.preventJsonUpdate = true;
    
            if (!this.preventCardUpdate) {
                this.designer.parseCard(this.getCurrentJsonPayload());
            }
        }
        finally {
            this.preventJsonUpdate = false;
        }
    }
    
    public scheduleUpdateCardFromJson() {
        clearTimeout(this.cardUpdateTimer);
    
        if (!this.preventCardUpdate) {
            this.cardUpdateTimer = setTimeout(() => { this.updateCardFromJson(); }, 100);
        }
    }
    
    public scheduleLayoutUpdate() {
        clearTimeout(this.updateLayoutTimer);
    
        this.updateLayoutTimer = setTimeout(() => { app.designer.updateLayout(false); }, 50);
    }
    
    readonly hostContainers: Array<HostContainer> = [];

    propertySheetHostElement: HTMLElement;
    treeViewHostElement: HTMLElement;
    commandListHostElement: HTMLElement;

    private _fullScreenHandler = new FullScreenHandler();
    private _toolbar: Toolbar;
    private _fullScreenButton: ToolbarButton;
    private _hostContainerChoicePicker: ToolbarChoicePicker;
    private _undoButton: ToolbarButton;
    private _redoButton: ToolbarButton;
    private _copyJSONButton: ToolbarButton;

    constructor(designerHostElement: HTMLElement) {
        this.hostContainers.push(new WebChatContainer("Bot Framework WebChat", "css/webchat-container.css"));
        this.hostContainers.push(new CortanaContainer("Cortana Skills", "css/cortana-container.css"));
        this.hostContainers.push(new OutlookContainer("Outlook Actionable Messages", "css/outlook-container.css"));
        this.hostContainers.push(new TimelineContainer("Windows Timeline", "css/timeline-container.css"));
        this.hostContainers.push(new DarkTeamsContainer("Microsoft Teams - Dark", "css/teams-container-dark.css"));
        this.hostContainers.push(new LightTeamsContainer("Microsoft Teams - Light", "css/teams-container-light.css"));
        this.hostContainers.push(new BotFrameworkContainer("Bot Framework Other Channels (Image render)", "css/bf-image-container.css"));
        this.hostContainers.push(new ToastContainer("Windows Notifications (Preview)", "css/toast-container.css"));

        this._toolbar = new Toolbar();

        this._fullScreenButton = new ToolbarButton(
            "Enter Full Screen",
            "acd-icon-fullScreen",
            (sender) => { this._fullScreenHandler.toggleFullScreen(); });

        this._toolbar.addElement(this._fullScreenButton);

        this._toolbar.addElement(new ToolbarSeparator());
        this._toolbar.addElement(new ToolbarLabel("Select Host app:"));

        this._hostContainerChoicePicker = new ToolbarChoicePicker();

        for (let i = 0; i < this.hostContainers.length; i++) {
            this._hostContainerChoicePicker.choices.push(
                {
                    name: this.hostContainers[i].name,
                    value: i.toString(),
                }
            );
        }

        this._hostContainerChoicePicker.onChanged = (sender) => {
            this._selectedHostContainer = this.hostContainers[Number.parseInt(this._hostContainerChoicePicker.value)];

            this.selectedHostContainerChanged();
        }

        this._toolbar.addElement(this._hostContainerChoicePicker);

        this._toolbar.addElement(new ToolbarSeparator());

        this._undoButton = new ToolbarButton(
            "Undo",
            "acd-icon-undo",
            (sender) => { this.undo(); });
        this._undoButton.toolTip = "Undo your last change";
        this._undoButton.isEnabled = false;
        this._undoButton.displayCaption = false;

        this._toolbar.addElement(this._undoButton);

        this._redoButton = new ToolbarButton(
            "Redo",
            "acd-icon-redo",
            (sender) => { this.redo(); });
        this._redoButton.toolTip = "Redo your last changes";
        this._redoButton.isEnabled = false;
        this._redoButton.displayCaption = false;

        this._toolbar.addElement(this._redoButton);

        this._toolbar.addElement(new ToolbarSeparator());
        this._toolbar.addElement(
            new ToolbarButton(
                "New card",
                "acd-icon-newCard",
                (sender) => { this.newCard(); }));

        this._copyJSONButton = new ToolbarButton("Copy JSON", "acd-icon-copy");
        this._toolbar.addElement(this._copyJSONButton);

        this._fullScreenHandler = new FullScreenHandler();
        this._fullScreenHandler.onFullScreenChanged = (isFullScreen: boolean) => {
            this._fullScreenButton.caption = isFullScreen ? "Exit full screen" : "Enter full screen";
    
            this.updateFullLayout();
        }

        this._propertySheetHostConfig = new Adaptive.HostConfig(
            {
                preExpandSingleShowCardAction: true,
                supportsInteractivity: true,
                fontFamily: "Segoe UI",
                spacing: {
                    small: 10,
                    default: 20,
                    medium: 30,
                    large: 40,
                    extraLarge: 50,
                    padding: 20
                },
                separator: {
                    lineThickness: 1,
                    lineColor: "#EEEEEE"
                },
                textAlign: {
                    right: "right"
                },
                fontSizes: {
                    small: 12,
                    default: 14,
                    medium: 17,
                    large: 21,
                    extraLarge: 26
                },
                fontWeights: {
                    lighter: 200,
                    default: 400,
                    bolder: 600
                },
                imageSizes: {
                    small: 40,
                    medium: 80,
                    large: 160
                },
                containerStyles: {
                    default: {
                        backgroundColor: "#f9f9f9",
                        foregroundColors: {
                            default: {
                                default: "#333333",
                                subtle: "#EE333333"
                            },
                            accent: {
                                default: "#2E89FC",
                                subtle: "#882E89FC"
                            },
                            attention: {
                                default: "#cc3300",
                                subtle: "#DDcc3300"
                            },
                            good: {
                                default: "#54a254",
                                subtle: "#DD54a254"
                            },
                            warning: {
                                default: "#e69500",
                                subtle: "#DDe69500"
                            }
                        }
                    },
                    emphasis: {
                        backgroundColor: "#08000000",
                        foregroundColors: {
                            default: {
                                default: "#333333",
                                subtle: "#EE333333"
                            },
                            accent: {
                                default: "#2E89FC",
                                subtle: "#882E89FC"
                            },
                            attention: {
                                default: "#cc3300",
                                subtle: "#DDcc3300"
                            },
                            good: {
                                default: "#54a254",
                                subtle: "#DD54a254"
                            },
                            warning: {
                                default: "#e69500",
                                subtle: "#DDe69500"
                            }
                        }
                    }
                },
                actions: {
                    maxActions: 5,
                    spacing: Adaptive.Spacing.Default,
                    buttonSpacing: 10,
                    showCard: {
                        actionMode: Adaptive.ShowCardActionMode.Inline,
                        inlineTopMargin: 16
                    },
                    actionsOrientation: Adaptive.Orientation.Horizontal,
                    actionAlignment: Adaptive.ActionAlignment.Left
                },
                adaptiveCard: {
                    allowCustomStyle: true
                },
                imageSet: {
                    imageSize: Adaptive.Size.Medium,
                    maxImageHeight: 100
                },
                factSet: {
                    title: {
                        color: Adaptive.TextColor.Default,
                        size: Adaptive.TextSize.Default,
                        isSubtle: false,
                        weight: Adaptive.TextWeight.Bolder,
                        wrap: true,
                        maxWidth: 150,
                    },
                    value: {
                        color: Adaptive.TextColor.Default,
                        size: Adaptive.TextSize.Default,
                        isSubtle: false,
                        weight: Adaptive.TextWeight.Default,
                        wrap: true,
                    },
                    spacing: 10
                }
            }
        );

        this._propertySheetHostConfig.cssClassNamePrefix = "default";
        this._designerHostElement = designerHostElement;
        this._selectedHostContainer = this.hostContainers[0];
    }

    private _toolPalettePane: SidePane;
    private _jsonEditorPane: SidePane;

    private onResize() {
        this.monacoEditor.layout();
    }

    private monacoEditorLoaded() {
        let monacoConfiguration = {
            schemas: [
                {
                    uri: "http://adaptivecards.io/schemas/adaptive-card.json",
                    schema: adaptiveCardSchema,
                    fileMatch: ["*"],
                }
            ],
            validate: false,
            allowComments: true
        }

        window["monaco"].languages.json.jsonDefaults.setDiagnosticsOptions(monacoConfiguration);
    
        this._jsonEditorPane.content.innerHTML = "";

        this.monacoEditor = window["monaco"].editor.create(
            this._jsonEditorPane.content,
            {
                folding: true,
                validate: false,
                fontSize: 13.5,
                language: 'json',
                minimap: {
                    enabled: false
                }
            }
        );
        
        this.monacoEditor.onDidChangeModelContent(() => { this.scheduleUpdateCardFromJson(); });

        window.addEventListener('resize', () => { this.onResize(); });

        this.isMonacoEditorLoaded = true;

        this.updateJsonFromCard(false);
    }
    
    render(): HTMLElement {
        let root = document.createElement("div");

        // Toolbar
        root.appendChild(this._toolbar.render());

        new Clipboard(
            this._copyJSONButton.renderedElement,
            {
                text: function () {
                    return JSON.stringify(app.card.toJSON(), null, 4);
                }
            });

        // Tool palette
        this._toolPalettePane = new SidePane(
            "toolPalette",
            "Tool box",
            "selector-toolPalette",
            document.getElementById("leftCollapsedPaneTabHost"));
        this._toolPalettePane.onToggled = (sender) => {
            this.updateFullLayout();
        }
        this._toolPalettePane.render();

        let surfaceBelowToolbar = document.createElement("div");
        surfaceBelowToolbar.style.display = "flex";
        surfaceBelowToolbar.style.flex = "1 1 auto";
        surfaceBelowToolbar.style.overflowY = "hidden";

        surfaceBelowToolbar.appendChild(this._toolPalettePane.renderedElement);

        let surfaceRightOfToolPalette = document.createElement("div");
        surfaceRightOfToolPalette.style.display = "flex";
        surfaceRightOfToolPalette.style.flexDirection = "column";
        surfaceRightOfToolPalette.style.flex = "1 1 100%";
        surfaceRightOfToolPalette.style.overflow = "hidden";

        let surfaceAboveJsonEditor = document.createElement("div");
        surfaceAboveJsonEditor.style.display = "flex";
        surfaceAboveJsonEditor.style.flex = "1 1 100%";
        surfaceAboveJsonEditor.style.overflow = "hidden";

        surfaceRightOfToolPalette.appendChild(surfaceAboveJsonEditor);

        // JSON editor pane
        this._jsonEditorPane = new SidePane(
            "jsonEditor",
            "JSON",
            "selector-jsonEditor",
            document.getElementById("bottomCollapsedPaneTabHost"),
            SidePaneOrientation.Horizontal
        )
        this._jsonEditorPane.onToggled = (sender) => {
            this.updateFullLayout();
        }
        this._jsonEditorPane.render();
        this._jsonEditorPane.renderedElement.classList.add("acd-json-editor-pane");

        this._jsonEditorPane.content = document.createElement("div");
        this._jsonEditorPane.content.className = "acd-json-editor-host";
        
        let jsonEditorLoading = document.createElement("div");
        jsonEditorLoading.style.padding = "8px";
        jsonEditorLoading.innerText = "Loading editor..."

        this._jsonEditorPane.content.appendChild(jsonEditorLoading);

        // Splitter for JSON editor pane
        let jsonEditorSplitter = new Splitter(this._jsonEditorPane.renderedElement, false);
        jsonEditorSplitter.onResized = (splitter: Splitter, newSize: number) => {
            this.updateJsonEditorLayout();

            this._jsonEditorPane.saveState();
        }
        jsonEditorSplitter.renderedElement.classList.add("selector-jsonEditor");

        surfaceRightOfToolPalette.appendChild(jsonEditorSplitter.renderedElement);
        surfaceRightOfToolPalette.appendChild(this._jsonEditorPane.renderedElement);

        surfaceBelowToolbar.appendChild(surfaceRightOfToolPalette);
        root.appendChild(surfaceBelowToolbar);

        this.recreateDesigner();

        loadMonacoEditor(adaptiveCardSchema, () => { this.monacoEditorLoaded(); });

        return root;
    }

    updateToolbar() {
        this._undoButton.isEnabled = this.canUndo;
        this._redoButton.isEnabled = this.canRedo;
    }

    addToUndoStack(payload: object) {
        let doAdd: boolean = true;

        if (this._undoStack.length > 0) {
            doAdd = this._undoStack[this._undoStack.length - 1] != payload;
        }

        if (doAdd) {
            let undoPayloadsToDiscard = this._undoStack.length - (this._undoStackIndex + 1);

            if (undoPayloadsToDiscard > 0) {
                this._undoStack.splice(this._undoStackIndex + 1, undoPayloadsToDiscard);
            }

            this._undoStack.push(payload);

            if (this._undoStack.length > DesignerApp.MAX_UNDO_STACK_SIZE) {
                this._undoStack.splice(0, 1);
            }

            this._undoStackIndex = this._undoStack.length - 1;

            this.updateToolbar();
        }
    }

    get canUndo(): boolean {
        return this._undoStackIndex >= 1;
    }

    undo() {
        if (this.canUndo) {
            this._undoStackIndex--;

            let card = this._undoStack[this._undoStackIndex];

            this.setJsonPayload(card);

            this.updateToolbar();
        }
    }

    get canRedo(): boolean {
        return this._undoStackIndex < this._undoStack.length - 1;
    }

    redo() {
        if (this._undoStackIndex < this._undoStack.length - 1) {
            this._undoStackIndex++;

            let card = this._undoStack[this._undoStackIndex];

            this.setJsonPayload(card);

            this.updateToolbar();
        }
    }

    newCard() {
        let card = {
            type: "AdaptiveCard",
            version: "1.0",
            body: [
            ]
        }

        this.setJsonPayload(card);
    }

    handlePointerMove(e: PointerEvent) {
        this._currentMousePosition = { x: e.x, y: e.y };

        let isPointerOverDesigner = this.designer.isPointerOver(this._currentMousePosition.x, this._currentMousePosition.y);
        let peerDropped = false;

        if (this._draggedPaletteItem && isPointerOverDesigner) {
            let peer = this._draggedPaletteItem.createPeer(this.designer);

            let clientCoordinates = this.designer.pageToClientCoordinates(this._currentMousePosition.x, this._currentMousePosition.y);

            if (this.designer.tryDrop(clientCoordinates, peer)) {
                this.endDrag();

                this.designer.startDrag(peer);

                peerDropped = true;
            }
        }

        if (!peerDropped && this._draggedElement) {
            this._draggedElement.style.left = this._currentMousePosition.x - 10 + "px";
            this._draggedElement.style.top = this._currentMousePosition.y - 10 + "px";
        }
    }

    handlePointerUp(e: PointerEvent) {
        this.endDrag();
        this.designer.endDrag();
    }

    /*
    get paletteHostElement(): HTMLElement {
        return this._paletteHostElement;
    }

    set paletteHostElement(value: HTMLElement) {
        if (this._paletteHostElement != value) {
            this._paletteHostElement = value;
        }
    }
    */

    get card(): Adaptive.AdaptiveCard {
        return this._card;
    }

    set card(value: Adaptive.AdaptiveCard) {
        if (this._card != value) {
            if (this._card) {
                this._card.designMode = false;
            }

            this._card = value;

            if (this._card) {
                this._card.designMode = true;
                this._card.hostConfig = this._selectedHostContainer.getHostConfig();
            }

            this.recreateDesigner();
        }
    }

    get designer(): Designer.CardDesigner {
        return this._designer;
    }
}

class SplitterOld {
    private _splitterElement: HTMLElement;
    private _sizedELement: HTMLElement;
    private _isPointerDown: boolean;
    private _lastClickedOffset: Designer.IPoint;

    private pointerDown(e: PointerEvent) {
        e.preventDefault();

        this._splitterElement.setPointerCapture(e.pointerId);

        this._lastClickedOffset = { x: e.x, y: e.y };

        this._isPointerDown = true;
    }

    private pointerMove(e: PointerEvent) {
        if (this._isPointerDown) {
            e.preventDefault();

            let sizeApplied = false;
            let newSize: number;

            if (this.isVertical) {
                newSize = this._sizedELement.getBoundingClientRect().width - (e.x - this._lastClickedOffset.x);

                if (newSize >= this.minimum) {
                    this._sizedELement.style.width = newSize + "px";

                    sizeApplied = true;
                }
            }
            else {
                newSize = this._sizedELement.getBoundingClientRect().height - (e.y - this._lastClickedOffset.y);

                if (newSize >= this.minimum) {
                    this._sizedELement.style.height = newSize + "px";

                    sizeApplied = true;
                }
            }

            if (sizeApplied) {
                if (this.onResized) {
                    this.onResized(this, newSize);
                }

                this._lastClickedOffset = { x: e.x, y: e.y };
            }
        }
    }

    private pointerUp(e: PointerEvent) {
        e.preventDefault();

        this._splitterElement.releasePointerCapture(e.pointerId);

        this._isPointerDown = false;
    }

    onResized: (sender: SplitterOld, newSize: number) => void;

    isVertical: boolean = false;
    minimum: number = 50;

    constructor(splitterElement: HTMLElement, sizedElement: HTMLElement) {
        this._splitterElement = splitterElement;
        this._sizedELement = sizedElement;

        this._splitterElement.onmousedown = (e: MouseEvent) => {e.preventDefault(); };
        this._splitterElement.onpointerdown = (e: PointerEvent) => { this.pointerDown(e); };
        this._splitterElement.onpointermove = (e: PointerEvent) => { this.pointerMove(e); };
        this._splitterElement.onpointerup = (e: PointerEvent) => { this.pointerUp(e); };
    }
}

var app: DesignerApp;
var jsonEditorHorizontalSplitter: SplitterOld;
var propertySheetVerticalSplitter: SplitterOld;
var treeViewVerticalSplitter: SplitterOld;
var jsonEditorPaneHeader: SidePaneHeader;

window.onload = () => {
    if (!SettingsManager.isLocalStorageAvailable) {
        console.log("Local storage is not available.");
    }

    // Prepare tool palette pane

    /*
    let toolPalettePaneHeader = new SidePaneHeader(document.getElementById("toolPalettePane"), "Tool box");
    toolPalettePaneHeader.collapsedTabContainer = document.getElementById("leftCollapsedPaneTabHost");
    toolPalettePaneHeader.collapsedTabClass = "rotated90DegreesCounterClockwise";
    toolPalettePaneHeader.targetElementsSelector = "selector-toolPalette";
    toolPalettePaneHeader.onToggled = (sender: SidePaneHeader) => {
        updateFullLayout();
    };
    */

    // Prepare JSON editor pane

    /*
    jsonEditorPaneHeader = new SidePaneHeader(document.getElementById("jsonEditorPane"), "JSON");
    jsonEditorPaneHeader.collapsedTabContainer = document.getElementById("bottomCollapsedPaneTabHost");
    jsonEditorPaneHeader.targetElementsSelector = "selector-jsonEditor";
    jsonEditorPaneHeader.onToggled = (sender: SidePaneHeader) => {
        app.updateFullLayout();

        SettingsManager.trySaveSetting("jsonEditorIsExpanded", sender.isExpanded.toString());
    };

    let jsonEditorPane =  document.getElementById("jsonEditorPane");

    jsonEditorHorizontalSplitter = new SplitterOld(document.getElementById("horizontalSplitter"), jsonEditorPane);
    jsonEditorHorizontalSplitter.onResized = (splitter: SplitterOld, newSize: number) => {
        app.updateJsonEditorLayout();

        SettingsManager.trySaveSetting("jsonEditorHeight", newSize.toString());
    }

    let jsonEditorHeightSetting = SettingsManager.tryLoadNumberSetting("jsonEditorHeight");

    if (jsonEditorHeightSetting.succeeded && jsonEditorHeightSetting.value != undefined) {
        jsonEditorPane.style.height = jsonEditorHeightSetting.value + "px";
    }

    let jsonEditorIsExpandedSetting = SettingsManager.tryLoadBooleanSetting("jsonEditorIsExpanded", true);

    if (jsonEditorIsExpandedSetting.succeeded && !jsonEditorIsExpandedSetting.value) {
        jsonEditorPaneHeader.toggle();
    }
    */

    // Prepare property sheet pane

    let propertySheetPaneHeader = new SidePaneHeader(document.getElementById("propertySheetPane"), "Element properties");
    propertySheetPaneHeader.collapsedTabContainer = document.getElementById("rightCollapsedPaneTabHost");
    propertySheetPaneHeader.collapsedTabClass = "rotated90DegreesClockwise";
    propertySheetPaneHeader.targetElementsSelector = "selector-propertySheet";
    propertySheetPaneHeader.onToggled = (sender: SidePaneHeader) => {
        app.updateFullLayout();

        SettingsManager.trySaveSetting("propertySheetIsExpanded", sender.isExpanded.toString());
    };

    let propertySheetPane = document.getElementById("propertySheetPane");

    propertySheetVerticalSplitter = new SplitterOld(document.getElementById("propertyVerticalSplitter"), propertySheetPane);
    propertySheetVerticalSplitter.isVertical = true;
    propertySheetVerticalSplitter.minimum = 230;
    propertySheetVerticalSplitter.onResized = (splitter: SplitterOld, newSize: number) => {
        app.scheduleLayoutUpdate();

        SettingsManager.trySaveSetting("propertySheetWidth", newSize.toString());
    }

    let propertySheetWidthSetting = SettingsManager.tryLoadNumberSetting("propertySheetWidth");

    if (propertySheetWidthSetting.succeeded && propertySheetWidthSetting.value != undefined) {
        propertySheetPane.style.width = propertySheetWidthSetting.value + "px";
    }

    let propertySheetIsExpandedSetting = SettingsManager.tryLoadBooleanSetting("propertySheetIsExpanded", true);

    if (propertySheetIsExpandedSetting.succeeded && !propertySheetIsExpandedSetting.value) {
        propertySheetPaneHeader.toggle();
    }

    // Prepare tree view pane

    let treeViewPaneHeader = new SidePaneHeader(document.getElementById("treeViewPane"), "Visual tree view");
    treeViewPaneHeader.collapsedTabContainer = document.getElementById("rightCollapsedPaneTabHost");
    treeViewPaneHeader.collapsedTabClass = "rotated90DegreesClockwise";
    treeViewPaneHeader.targetElementsSelector = "selector-treeView";
    treeViewPaneHeader.onToggled = (sender: SidePaneHeader) => {
        app.updateFullLayout();

        SettingsManager.trySaveSetting("treeViewIsExpanded", sender.isExpanded.toString());
    };

    let treeViewPane = document.getElementById("treeViewPane");

    treeViewVerticalSplitter = new SplitterOld(document.getElementById("treeViewVerticalSplitter"), treeViewPane);
    treeViewVerticalSplitter.isVertical = true;
    treeViewVerticalSplitter.minimum = 140;
    treeViewVerticalSplitter.onResized = (splitter: SplitterOld, newSize: number) => {
        app.scheduleLayoutUpdate();

        SettingsManager.trySaveSetting("treeViewWidth", newSize.toString());
    }

    let treeViewWidthSetting = SettingsManager.tryLoadNumberSetting("treeViewWidth");

    if (treeViewWidthSetting.succeeded && treeViewWidthSetting.value != undefined) {
        treeViewPane.style.width = treeViewWidthSetting.value + "px";
    }

    let treeViewIsExpandedSetting = SettingsManager.tryLoadBooleanSetting("treeViewIsExpanded", true);

    if (treeViewIsExpandedSetting.succeeded && !treeViewIsExpandedSetting.value) {
        treeViewPaneHeader.toggle();
    }

    // Setup designer

    let card = new Adaptive.AdaptiveCard();
    card.onImageLoaded = (image: Adaptive.Image) => {
        app.scheduleLayoutUpdate();
    }

    app = new DesignerApp(document.getElementById("designerHost"));
    app.propertySheetHostElement = document.getElementById("propertySheetHost");
    app.treeViewHostElement = document.getElementById("treeViewHost");
    app.commandListHostElement = document.getElementById("commandsHost");
    // app.paletteHostElement = document.getElementById("toolPalette");

    window.addEventListener("pointermove", (e: PointerEvent) => { app.handlePointerMove(e); });
    window.addEventListener("resize", () => { app.scheduleLayoutUpdate(); });
    window.addEventListener("pointerup", (e: PointerEvent) => { app.handlePointerUp(e); });

    document.getElementById("designerRootHost").appendChild(app.render());

    app.card = card;

    // loadMonacoEditor(adaptiveCardSchema, monacoEditorLoaded);

    app.updateCardFromJson();
};
