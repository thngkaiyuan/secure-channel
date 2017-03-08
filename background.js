const UNSET = 0;
const INSECURE = 1;
const SECURE = 2;
var currentTabId = null;
var tabStatuses = {};

chrome.webRequest.onHeadersReceived.addListener(
    function(details) {
        for (var i = 0; i < details.responseHeaders.length; ++i) {
            if (details.responseHeaders[i].name === 'x-authentication-results') {
                if(tabStatuses[currentTabId] === UNSET) setSecureTab();
                var results = details.responseHeaders[i].value;
                var header_results = results.match(/header=([a-z]+)/);
                var body_results = results.match(/body=([a-z]+)/);
                if((header_results && header_results[1] != "pass") || (body_results && body_results[1] != "pass")) {
                    setInsecureTab();
                    console.log(details.url + " is insecure");
                    return {cancel: true};;
                } else {
                    console.log(details.url + " is secure");
                }
            }
        }
    },
    {urls: ["<all_urls>"]},
    ["blocking", "responseHeaders"]
);

chrome.webNavigation.onCommitted.addListener(function(info) {
    resetTab();
    currentTabId = info.tabId;
});

chrome.tabs.onActivated.addListener(function(tab) {
    currentTabId = tab.tabId;
});

function setCurrentTabTitleAndIcon(title, icon) {
    chrome.browserAction.setTitle({
        title : title,
        tabId: currentTabId
    });
    chrome.browserAction.setIcon({
        path : icon,
        tabId: currentTabId
    });
}

function resetTab() {
    tabStatuses[currentTabId] = UNSET;
    setCurrentTabTitleAndIcon("Secure channel is not used", "icons/Security-icon.png");
}

function setInsecureTab() {
    tabStatuses[currentTabId] = INSECURE;
    setCurrentTabTitleAndIcon("Unsafe resource(s) have been blocked for your safety", "icons/Security-Caution-icon.png");
}

function setSecureTab() {
    tabStatuses[currentTabId] = SECURE;
    setCurrentTabTitleAndIcon("Channel is confidential and authenticated", "icons/Security-Approved-icon.png");
}
