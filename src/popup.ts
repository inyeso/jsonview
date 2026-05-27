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

function showStatus(message: string, bgColor: string) {
  const existing = document.querySelector(".status");
  if (existing) existing.remove();

  const status = document.createElement("div");
  status.className = "status";
  status.textContent = message;
  status.style.backgroundColor = bgColor;
  document.body.appendChild(status);
  setTimeout(() => status.remove(), 1500);
}

function saveOptions() {
  const settings: JsonViewSettings = {
    lineEnabled: (document.getElementById("lineEnabled") as HTMLInputElement).checked,
    lineColor: (document.getElementById("lineColor") as HTMLInputElement).value,
    lineStyle: (document.getElementById("lineStyle") as HTMLSelectElement).value,
    lineCustomCss: (document.getElementById("lineCustomCss") as HTMLTextAreaElement).value,
    colorString: (document.getElementById("colorString") as HTMLInputElement).value,
    colorNumber: (document.getElementById("colorNumber") as HTMLInputElement).value,
    colorBoolean: (document.getElementById("colorBoolean") as HTMLInputElement).value,
    colorNull: (document.getElementById("colorNull") as HTMLInputElement).value,
    colorKey: (document.getElementById("colorKey") as HTMLInputElement).value,
    colorLink: (document.getElementById("colorLink") as HTMLInputElement).value,
    keyBold: (document.getElementById("keyBold") as HTMLInputElement).checked,
    valueBold: (document.getElementById("valueBold") as HTMLInputElement).checked,
    bgColor: (document.getElementById("bgColor") as HTMLInputElement).value,
    textColor: (document.getElementById("textColor") as HTMLInputElement).value,
    fontSize: parseFloat((document.getElementById("fontSize") as HTMLInputElement).value) || 1.2,
    indentSize: parseFloat((document.getElementById("indentSize") as HTMLInputElement).value) || 2,
    hoverEnabled: (document.getElementById("hoverEnabled") as HTMLInputElement).checked,
    hoverBgColor: (document.getElementById("hoverBgColor") as HTMLInputElement).value,
  };

  try {
    chrome.storage.sync.set({ jsonviewSettings: settings }, () => {
      if (chrome.runtime.lastError) {
        showStatus("保存失败！", "#f44336");
        return;
      }
      showStatus("保存成功！", "#4caf50");
    });
  } catch {
    showStatus("保存失败！", "#f44336");
  }
}

function restoreOptions() {
  try {
    chrome.storage.sync.get({ jsonviewSettings: defaultSettings }, (data) => {
      if (chrome.runtime.lastError) {
        applySettingsToUI(defaultSettings);
        return;
      }
      applySettingsToUI(data.jsonviewSettings as JsonViewSettings);
    });
  } catch {
    applySettingsToUI(defaultSettings);
  }
}

function applySettingsToUI(settings: JsonViewSettings) {
  (document.getElementById("lineEnabled") as HTMLInputElement).checked = settings.lineEnabled;
  (document.getElementById("lineColor") as HTMLInputElement).value = settings.lineColor;
  (document.getElementById("lineStyle") as HTMLSelectElement).value = settings.lineStyle;
  (document.getElementById("lineCustomCss") as HTMLTextAreaElement).value =
    settings.lineCustomCss || defaultLineCustomCss;
  (document.getElementById("colorString") as HTMLInputElement).value = settings.colorString;
  (document.getElementById("colorNumber") as HTMLInputElement).value = settings.colorNumber;
  (document.getElementById("colorBoolean") as HTMLInputElement).value = settings.colorBoolean;
  (document.getElementById("colorNull") as HTMLInputElement).value = settings.colorNull;
  (document.getElementById("colorKey") as HTMLInputElement).value = settings.colorKey;
  (document.getElementById("colorLink") as HTMLInputElement).value =
    settings.colorLink || "#4188ec";
  (document.getElementById("keyBold") as HTMLInputElement).checked = settings.keyBold;
  (document.getElementById("valueBold") as HTMLInputElement).checked = settings.valueBold;
  (document.getElementById("bgColor") as HTMLInputElement).value = settings.bgColor;
  (document.getElementById("textColor") as HTMLInputElement).value = settings.textColor;
  (document.getElementById("fontSize") as HTMLInputElement).value = String(settings.fontSize);
  (document.getElementById("indentSize") as HTMLInputElement).value = String(settings.indentSize);
  (document.getElementById("hoverEnabled") as HTMLInputElement).checked =
    settings.hoverEnabled ?? true;
  (document.getElementById("hoverBgColor") as HTMLInputElement).value =
    settings.hoverBgColor || "#3a3d41";
}

function resetOptions() {
  try {
    chrome.storage.sync.set({ jsonviewSettings: defaultSettings }, () => {
      if (chrome.runtime.lastError) {
        showStatus("重置失败！", "#f44336");
        return;
      }
      applySettingsToUI(defaultSettings);
      showStatus("已恢复默认！", "#ff9800");
    });
  } catch {
    applySettingsToUI(defaultSettings);
    showStatus("已恢复默认！", "#ff9800");
  }
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save")!.addEventListener("click", saveOptions);
document.getElementById("reset")!.addEventListener("click", resetOptions);
