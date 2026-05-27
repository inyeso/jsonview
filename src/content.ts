import { errorPage, jsonToHTML } from "./jsonformatter";

import { installCollapseEventListeners } from "./collapse";
import { safeStringEncodeNums } from "./safe-encode-numbers";

interface JsonViewSettings {
  lineEnabled: boolean;
  lineColor: string;
  lineStyle: string;
  lineCustomCss: string;
  colorString: string;
  colorNumber: string;
  colorBoolean: string;
  colorNull: string;
  colorKey: string;
  colorLink: string;
  keyBold: boolean;
  valueBold: boolean;
  bgColor: string;
  textColor: string;
  fontSize: number;
  indentSize: number;
  hoverEnabled: boolean;
  hoverBgColor: string;
}

const defaultLineCustomCss = `ul.array::before,
ul.obj::before {
  content: "";
  position: absolute;
  left: calc(-1 * var(--jsonview-indent-size));
  top: 0.6em;
  bottom: 0.6em;
  width: 0;
  border-left: 1px var(--jsonview-line-style) var(--jsonview-line-color);
  pointer-events: none;
  display: var(--jsonview-line-enabled);
}`;

const defaultSettings: JsonViewSettings = {
  lineEnabled: true,
  lineColor: "#646464",
  lineStyle: "dashed",
  lineCustomCss: defaultLineCustomCss,
  colorString: "#78a62d",
  colorNumber: "#236dd7",
  colorBoolean: "#d43c25",
  colorNull: "#a52a2a",
  colorKey: "#d7dad8",
  colorLink: "#4188ec",
  keyBold: true,
  valueBold: false,
  bgColor: "#27292c",
  textColor: "#d7dad8",
  fontSize: 1.2,
  indentSize: 2,
  hoverEnabled: true,
  hoverBgColor: "#3a3d41",
};

function applySettings(settings: JsonViewSettings) {
  const root = document.documentElement;

  root.style.setProperty("--jsonview-bg-color", settings.bgColor);
  root.style.setProperty("--jsonview-text-color", settings.textColor);
  root.style.setProperty("--jsonview-string-color", settings.colorString);
  root.style.setProperty("--jsonview-number-color", settings.colorNumber);
  root.style.setProperty("--jsonview-boolean-color", settings.colorBoolean);
  root.style.setProperty("--jsonview-null-color", settings.colorNull);
  root.style.setProperty("--jsonview-key-color", settings.colorKey);
  root.style.setProperty("--jsonview-link-color", settings.colorLink || "#4188ec");
  root.style.setProperty("--jsonview-line-color", settings.lineColor);
  root.style.setProperty("--jsonview-line-style", settings.lineStyle);
  root.style.setProperty("--jsonview-line-enabled", settings.lineEnabled ? "block" : "none");
  root.style.setProperty("--jsonview-key-bold", settings.keyBold ? "bold" : "normal");
  root.style.setProperty("--jsonview-value-bold", settings.valueBold ? "bold" : "normal");
  root.style.setProperty("--jsonview-font-size", `${settings.fontSize}em`);
  root.style.setProperty("--jsonview-indent-size", `${settings.indentSize}em`);

  const hoverEnabled = settings.hoverEnabled ?? true;
  const hoverBgColor = settings.hoverBgColor || "#3a3d41";
  root.style.setProperty("--jsonview-hover-bg", hoverEnabled ? hoverBgColor : "transparent");

  const existingCustomStyle = document.getElementById("jsonview-custom-line-style");
  if (existingCustomStyle) {
    existingCustomStyle.remove();
  }

  const customCss = settings.lineCustomCss || defaultLineCustomCss;
  if (customCss) {
    const style = document.createElement("style");
    style.id = "jsonview-custom-line-style";
    style.textContent = customCss;
    document.head.appendChild(style);
  }
}

function loadAndApplySettings() {
  try {
    chrome.storage.sync.get({ jsonviewSettings: defaultSettings }, (data) => {
      if (chrome.runtime.lastError) {
        applySettings(defaultSettings);
        return;
      }
      applySettings(data.jsonviewSettings as JsonViewSettings);
    });
  } catch {
    applySettings(defaultSettings);
  }
}

function setupStorageListener() {
  try {
    chrome.storage.onChanged.addListener((changes) => {
      if (chrome.runtime.lastError) {
        return;
      }
      if (changes.jsonviewSettings) {
        applySettings(changes.jsonviewSettings.newValue as JsonViewSettings);
      }
    });
  } catch {}
}

function hideContent() {
  const style = document.createElement("style");
  style.id = "jsonview-hide-content";
  style.textContent = "html { visibility: hidden !important; }";
  (document.head || document.documentElement).appendChild(style);
}

function showContent() {
  const style = document.getElementById("jsonview-hide-content");
  if (style) {
    style.remove();
  }
}

function processJSON() {
  // At least in chrome, the JSON is wrapped in a pre tag.
  const jsonElems = document.getElementsByTagName("pre");
  let content: string | null = null;
  if (jsonElems.length >= 1) {
    content = jsonElems[0].textContent;
  } else {
    // Sometimes there's no pre? I'm not sure why this would happen
    content = (document.body.firstChild ?? document.body).textContent;
  }
  let outputDoc = "";
  let jsonObj: any = null;

  if (content === null) {
    outputDoc = errorPage(new Error("No content"), "", document.URL);
  } else {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      jsonObj = JSON.parse(safeStringEncodeNums(content));
      outputDoc = jsonToHTML(jsonObj, document.URL);
    } catch (e) {
      outputDoc = errorPage(
        e instanceof Error ? e : typeof e === "string" ? new Error(e) : new Error("Unknown error"),
        content,
        document.URL,
      );
    }
  }

  document.documentElement.innerHTML = outputDoc;
  loadAndApplySettings();
  setupStorageListener();
  installCollapseEventListeners();
}

/**
 * This script runs on every page. It communicates with the background script
 * to help decide whether to treat the contents of the page as JSON.
 */
hideContent();

chrome.runtime.sendMessage("jsonview-is-json", (response: boolean) => {
  if (chrome.runtime.lastError) {
    showContent();
    return;
  }
  if (!response) {
    showContent();
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      processJSON();
    });
  } else {
    processJSON();
  }
});
