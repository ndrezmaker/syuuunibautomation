chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["autofill.js"],
    world: "MAIN" // agar event dikenali React di halaman
  });
});
