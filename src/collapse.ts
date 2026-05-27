/**
 * Add event handlers that allow for collapsing and expanding JSON structures, with the mouse or keyboard.
 */
export function installCollapseEventListeners() {
  // Click handler for collapsing and expanding objects and arrays
  function collapse(evt: Event) {
    let collapser = evt.target as Element;

    while (collapser && !collapser.classList?.contains("collapser")) {
      collapser = collapser.nextSibling as Element;
    }
    if (!collapser?.classList?.contains("collapser")) {
      return;
    }

    evt.stopPropagation();

    collapser.classList.toggle("collapsed");

    let collapsible = collapser;
    while (collapsible && !collapsible.classList?.contains("collapsible")) {
      collapsible = collapsible.nextSibling as Element;
    }
    collapsible.classList.toggle("collapsed");
  }

  /*
   * Collapses the whole json using keyboard
   * TODO: Add a navigator support for each of the elements
   */
  function collapseAll(evt: KeyboardEvent) {
    let inputList;
    let i;

    // Ignore anything paired with a modifier key. See https://github.com/bhollis/jsonview/issues/69
    if (evt.ctrlKey || evt.shiftKey || evt.altKey || evt.metaKey) {
      return;
    }

    if (evt.key === "ArrowLeft") {
      // Collapses the json on left arrow key up
      inputList = document.querySelectorAll(".collapsible, .collapser");
      for (i = 0; i < inputList.length; i++) {
        if ((inputList[i].parentNode! as HTMLElement).id !== "json") {
          inputList[i].classList.add("collapsed");
        }
      }
      evt.preventDefault();
    } else if (evt.key === "ArrowRight") {
      // Expands the json on right arrow key up
      inputList = document.querySelectorAll(".collapsed");
      for (i = 0; i < inputList.length; i++) {
        inputList[i].classList.remove("collapsed");
      }
      evt.preventDefault();
    }
  }

  // collapse with event delegation
  document.addEventListener("click", collapse, false);
  document.addEventListener("keyup", collapseAll, false);

  // Context menu for property keys
  setupContextMenu();

  // Hover highlight for parent blocks
  setupHoverHighlight();
}

function setupHoverHighlight() {
  let highlightedElement: Element | null = null;

  function findParentLi(element: Element | null): Element | null {
    while (element && element.tagName !== "LI") {
      element = element.parentElement;
    }
    return element;
  }

  function isSingleLine(li: Element): boolean {
    return !li.querySelector("ul, ol");
  }

  function handleMouseOver(e: MouseEvent) {
    const target = e.target as Element;
    const parentLi = findParentLi(target);

    if (parentLi && parentLi !== highlightedElement) {
      if (highlightedElement) {
        highlightedElement.classList.remove("hover-highlight");
      }
      if (!isSingleLine(parentLi)) {
        parentLi.classList.add("hover-highlight");
        highlightedElement = parentLi;
      } else {
        highlightedElement = null;
      }
    }
  }

  function handleMouseOut(e: MouseEvent) {
    const target = e.target as Element;
    const relatedTarget = e.relatedTarget as Element;

    const parentLi = findParentLi(target);
    const relatedParentLi = findParentLi(relatedTarget);

    if (parentLi && parentLi !== relatedParentLi) {
      parentLi.classList.remove("hover-highlight");
      if (parentLi === highlightedElement) {
        highlightedElement = null;
      }
    }
  }

  const jsonElement = document.getElementById("json");
  if (jsonElement) {
    jsonElement.addEventListener("mouseover", handleMouseOver, false);
    jsonElement.addEventListener("mouseout", handleMouseOut, false);
  }
}

function setupContextMenu() {
  let contextMenu: HTMLDivElement | null = null;

  function hideContextMenu() {
    if (contextMenu) {
      contextMenu.remove();
      contextMenu = null;
    }
  }

  function showContextMenu(x: number, y: number, propElement: Element) {
    hideContextMenu();

    contextMenu = document.createElement("div");
    contextMenu.className = "context-menu";
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;

    const keyText = propElement.textContent?.replace(/^"|"$/g, "") || "";
    const jsonPath = (propElement.getAttribute("title") || "").replace(/^<root>/, "");
    const valueText = getValueText(propElement);

    let copyKeyLabel = "Copy Key";
    let copyValueLabel = "Copy Value";
    let copyPathLabel = "Copy Path";
    try {
      copyKeyLabel = chrome.i18n.getMessage("contextMenuCopyKey") || copyKeyLabel;
      copyValueLabel = chrome.i18n.getMessage("contextMenuCopyValue") || copyValueLabel;
      copyPathLabel = chrome.i18n.getMessage("contextMenuCopyPath") || copyPathLabel;
    } catch {
      // Extension context invalidated, use defaults
    }

    const items = [
      { label: copyKeyLabel, value: keyText },
      { label: copyValueLabel, value: valueText },
      { label: copyPathLabel, value: jsonPath },
    ];

    for (const item of items) {
      const menuItem = document.createElement("div");
      menuItem.className = "context-menu-item";
      menuItem.textContent = item.label;
      menuItem.addEventListener("click", (e) => {
        e.stopPropagation();
        copyToClipboard(item.value);
        hideContextMenu();
      });
      contextMenu.appendChild(menuItem);
    }

    document.body.appendChild(contextMenu);

    // Adjust position if menu goes off screen
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      contextMenu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      contextMenu.style.top = `${y - rect.height}px`;
    }
  }

  function getValueText(propElement: Element): string {
    let node = propElement.nextSibling;
    while (node) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.includes(":")) {
        node = node.nextSibling;
        continue;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (el.classList?.contains("collapser")) {
          node = node.nextSibling;
          continue;
        }
        return el.textContent || "";
      }
      node = node.nextSibling;
    }
    return "";
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    });
  }

  document.addEventListener("contextmenu", (e: MouseEvent) => {
    const target = e.target as Element;
    const propElement = target.closest(".prop");
    if (propElement) {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, propElement);
    }
  });

  document.addEventListener("click", hideContextMenu);
}
