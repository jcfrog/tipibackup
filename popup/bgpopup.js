function listenForClicks() {
    document.addEventListener("click", (e) => {
        if (e.target.id == "scan-album-pages") {
            browser.tabs.query({ active: true, currentWindow: true })
                .then(tabs => { sendMessageToTabs(tabs, "scan-album-pages") })
                .catch(reportError);
        } else if (e.target.id == "scan-all-albums") {
            browser.tabs.query({ active: true, currentWindow: true })
                .then(tabs => { sendMessageToTabs(tabs, "scan-all-albums") })
                .catch(reportError);
        }
    }
    )
}

function sendMessageToTabs(tabs, msg) {
    browser.tabs.sendMessage(tabs[0].id, {
        command: msg,
    });
}

function updateAlbumsLinksDisplay() {
    // fill div "albums-pages" with links
    const albumsLinksDiv = document.getElementById("albums-links");
    // clear div
    albumsLinksDiv.innerHTML = "";
    // create ul element
    const ul = document.createElement("ul");
    // create li elements
    albumsLinks.forEach((link) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = link.url;
        a.textContent = link.title;
        li.appendChild(a);
        const but = document.createElement("div");
        but.className = "download-album";
        li.appendChild(but);
        
        ul.appendChild(li);
    });
    // append ul to div
    albumsLinksDiv.appendChild(ul);

}

// create an array to store the urls of all albums pages
const albumsPagesLinks = [];
const albumsLinks = [];
// listen to crawlPage message from content script
browser.runtime.onMessage.addListener((message) => {
    if (message.command === "albumsPage") {
        // check if link is already in array, if not add it
        if (albumsPagesLinks.indexOf(message.url) === -1) {
            albumsPagesLinks.push(message.url);
            updateAlbumsPagesDisplay()
        }
    } else if (message.command == "oneAlbumPage") {
        const newAlbum = {
            url: message.url,
            title: message.name
        };
        const isDuplicate = albumsLinks.some(album => album.url === newAlbum.url);
        if (!isDuplicate) {
            albumsLinks.push(newAlbum);
        }
    } else if (message.command == "refreshAlbumsList") {
        updateAlbumsLinksDisplay();
    }
});


function updateAlbumsPagesDisplay() {
    // fill div "albums-pages" with links
    const albumsPagesDiv = document.getElementById("albums-pages");
    // clear div
    albumsPagesDiv.innerHTML = "";
    // create ul element
    const ul = document.createElement("ul");
    // create li elements
    albumsPagesLinks.forEach((link) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = link;
        a.textContent = link;
        li.appendChild(a);
        ul.appendChild(li);
    });
    // append ul to div
    albumsPagesDiv.appendChild(ul);
}


// listen to openTab message from content script
browser.runtime.onMessage.addListener((message) => {
    if (message.command === "openAlbum") {
        browser.tabs.create({
            url: message.url
        }).then(onCreated, onError);
    }
});
// onError to be defined
function onError(error) {
    console.log(`Error: ${error}`);
}
// onCreated to be defined
function onCreated(tab) {
    console.log(`Created new tab: ${tab.id}`);
}





/**
 * When the popup loads, inject a content script into the active tab,
 * and add a click handler.
 * If we couldn't inject the script, handle the error.
 */
browser.tabs.executeScript({ file: "/content_scripts/crawler.js" })
    .then(listenForClicks)
    .catch(reportExecuteScriptError);

/**
 * There was an error executing the script.
 * Display the popup's error message, and hide the normal UI.
 */
function reportExecuteScriptError(error) {
    document.querySelector("#popup-content").classList.add("hidden");
    document.querySelector("#error-content").classList.remove("hidden");
    console.error(`Failed to execute tipibackup content script: ${error.message}`);
}