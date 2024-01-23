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
    })
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
    for (var i = 0; i < albumsLinks.length; i++) {
        var link = albumsLinks[i];
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = link.url;
        a.textContent = link.title;
        li.appendChild(a);
        const but = document.createElement("div");
        but.className = "download-album";
        but.linkidx = i;

        but.addEventListener("click", function (event) {
            const linkIndex = event.target.linkidx; // Obtenez l'indice du lien associé au bouton
            const clickedLink = albumsLinks[linkIndex]; // Obtenez l'objet du lien correspondant

            // Vous pouvez maintenant faire quelque chose avec le lien cliqué, par exemple :
            console.log("Bouton cliqué pour l'album :", clickedLink.title);
            console.log("Lien de l'album :", clickedLink.url);

            // Ajoutez ici la logique pour gérer le clic du bouton
            // browser.tabs.create({
            //     url: clickedLink.url
            // }).then(onCreated, onError);
            fetch(clickedLink.url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error("La requête n'a pas abouti.");
                    }
                    // Convertissez la réponse en texte
                    return response.text();
                })
                .then(htmlContent => {
                    // parse html to look for images
                    const parser = new DOMParser();
                    const htmlDoc = parser.parseFromString(htmlContent, 'text/html');
                    // images pages are displayed in a ul with id "photolist"
                    // every image page link is in a li with an id starting with "photo_"
                    // let's fetch all li with id starting with "photo_"
                    const imagesPages = htmlDoc.querySelectorAll('li[id^="photo_"] a');
                    const imagesPagesLinks = [];
                    imagesPages.forEach((page) => {
                        imagesPagesLinks.push(page.href);
                        //console.log(page.href);
                        downloadImageFromPage(page.href, true);
                    });
                })
                .catch(error => {
                    console.error("Erreur lors du chargement de la page :", error);
                });

        });

        li.appendChild(but);

        ul.appendChild(li);
    }
    // append ul to div
    albumsLinksDiv.appendChild(ul);

}

function downloadImageFromPage(url, bHD) {
    console.log("downloadImageFromPage", url, bHD)
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("La requête n'a pas abouti.");
            }
            // Convertissez la réponse en texte
            return response.text();
        })
        .then(htmlContent => {
            // get image id from url
            const u = new URL(url);
            const params = new URLSearchParams(u.search);
            const imgId = params.get('photo_id');
            const albumId = params.get('album_id');

            console.log("Viewer photo chargé", imgId, albumId)


            // parse html to look for images
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(htmlContent, 'text/html');
            // image is displayed in a div with id "image_medium"
            const images = htmlDoc.querySelectorAll('img#image_medium');
            images.forEach((img) => {
                const imgSrc = img.getAttribute('src');
                console.log("image a télécharger : ",imgSrc);
                downloadImage(imgSrc, imgId, albumId);
            });
        })
        .catch(error => {
            console.error("Erreur lors du chargement de la page :", error);
        });
}

function downloadImage(imgSrc, imgId, albumId, bHD) {
    // Construisez l'URL de l'image que vous souhaitez télécharger
    const imageURL = imgSrc;
  
    // Utilisez l'API browser.downloads pour télécharger l'image sans spécifier de chemin de fichier
    browser.downloads.download({
      url: imageURL,
      filename: "hellotipi/" + albumId + "/" + (bHD ? "HD_" : "BD_") + imgId + ".jpg",
      saveAs: false // Si vous voulez que le navigateur enregistre sous forme de fichier, définissez saveAs sur true
    })
    .then(downloadId => {
      // Téléchargement lancé avec succès
      console.log("Téléchargement lancé avec l'ID :", downloadId);
    })
    .catch(error => {
      console.error("Erreur lors du téléchargement de l'image :", error);
    });
  }
  
  


function downloadImage2(imgSrc, imgId, albumId) {
    // dowload imgage file to disk
    fetch(imgSrc)
        .then(response => {
            if (!response.ok) {
                throw new Error("La requête n'a pas abouti.");
            }
            // Convertissez la réponse en blob
            return response.blob();
        })
        .then(imageBlob => {
            // Créez un objet URL à partir du blob
            const imageURL = URL.createObjectURL(imageBlob);
            // Créez un élément <a> pour télécharger l'image
            const imageLink = document.createElement('a');
            imageLink.href = imageURL;
            imageLink.download = imgId + ".jpg";
            // Ajoutez l'élément <a> au DOM
            document.body.appendChild(imageLink);
            // Cliquez sur le lien pour télécharger l'image
            imageLink.click();
            // Supprimez l'élément <a> du DOM
            document.body.removeChild(imageLink);
        })
        .catch(error => {
            console.error("Erreur lors du chargement de l'image :", error);
        });
}


// onError to be defined
function onError(error) {
    console.log(`Error: ${error}`);
}
// onCreated to be defined
function onCreated(tab) {
    console.log(`Created new tab: ${tab.id}`);
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