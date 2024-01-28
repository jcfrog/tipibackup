
currentTipi = null;
// create an array to store the urls of all albums pages
const albumsPagesLinks = [];
const albumsLinks = [];
albumsNames = [];


function saveValueToStorage(key, value) {
    browser.storage.local.set({ [key]: value })
        .then(() => {
            console.log(`La valeur "${value}" a été enregistrée sous la clé "${key}" dans le stockage local.`);
        })
        .catch((error) => {
            console.error(`Erreur lors de l'enregistrement de la valeur : ${error}`);
        });
}
// Pour récupérer une valeur du stockage local
function getValueFromStorage(key) {
    return browser.storage.local.get(key)
        .then((result) => {
            return result[key];
        })
        .catch((error) => {
            console.error(`Erreur lors de la récupération de la valeur : ${error}`);
        });
}

function init() {

    // get select from local storage
    getValueFromStorage("resolutions").then((value) => {
        if (value !== undefined) {

            console.log("resolutions", value);
            const select = document.getElementById("resolutions");
            select.value = value;
        }
    });

    // listen to select change to store it in local storage

    const resolutionSelect = document.getElementById("resolutions");
    resolutionSelect.addEventListener("change", function () {
        // Récupérez la nouvelle valeur sélectionnée
        const selectedValue = resolutionSelect.value;

        // Enregistrez la nouvelle valeur dans le local storage
        saveValueToStorage("resolutions", selectedValue)
    });



    // get active tab url
    browser.tabs.query({ active: true, currentWindow: true })
        .then(tabs => {
            // get active tab url
            const url = new URL(tabs[0].url);
            // check it's an hellotipi domain or subdomain
            if (url.hostname.indexOf("hellotipi") == -1) {
                console.log("not an hellotipi domain");
                document.getElementById("tipi-name").textContent = "Ceci n'est pas un site Hellotipi";
                return;
            }

            // get subdomain
            currentTipi = url.hostname.split('.')[0];
            console.log("subdomain", currentTipi);
            document.getElementById("tipi-name").textContent = currentTipi;
        })
        .catch(reportError);

    document.addEventListener("click", (e) => {
        if (e.target.id == "scan-album-pages") {
            browser.tabs.query({ active: true, currentWindow: true })
                .then(tabs => { sendMessageToTabs(tabs, "scan-album-pages") })
                .catch(reportError);
        } else if (e.target.id == "scan-all-albums") {
            askForAlbums();
        } else if (e.target.id == "download-all-docs") {
            downloadAllDocs();
        } else if (e.target.id == "download-all-coms") {
            downloadAllDiscussions();
        } else if (e.target.id == "download-all-contacts") {
            downloadAllContacts();
        }
    })


    askForAlbums();

}

function registerDownloadRequest(url, fileName) {
    // store all download requests in local storage

}

// Contacts
function downloadAllContacts() {
    const contactsPageURL = "http://" + currentTipi + ".hellotipi.com/?page=annuaire";
    fetch(contactsPageURL)
        .then(response => {
            if (!response.ok) {
                throw new Error('La requête n\'a pas abouti.');
            }
            // Convertissez la réponse en texte
            return response.text();
        }).then(htmlContent => {
            // parse html to look for contacts info
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(htmlContent, 'text/html');

            var contacts = "";

            htmlDoc.querySelectorAll(".annuaire_li").forEach((contact) => {
                contacts += contact.innerHTML;
            });

            const contactsFileName = "hellotipi/" + currentTipi + "/contacts/contacts.html";
            doesExist(contactsFileName).then((fileExists) => {
                if (!fileExists) {
                    const blob = new Blob([contacts], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob)
                    // save description to file
                    browser.downloads.download({
                        url: url,
                        filename: contactsFileName,
                        saveAs: false // Si vous voulez que le navigateur enregistre sous forme de fichier, définissez saveAs sur true
                    }).then(downloadId => {
                        // Téléchargement lancé avec succès
                        console.log("Téléchargement lancé pour les contacts avec l'ID :", downloadId, contactsFileName);
                    }).catch(error => {
                        console.error("Erreur lors du téléchargement du fichier contacts:", error);
                    });
                } else {
                    console.log("Le fichier existe déjà", contactsFileName);
                }
            }
            );
        })

}

// Messages 
var accuMsgs = [];
function downloadAllDiscussions() {
    // fetch docs main page to get the number of pages
    const docsPageURL = "http://" + currentTipi + ".hellotipi.com/?page=short_msg&action=view_old";
    fetch(docsPageURL)
        .then(response => {
            if (!response.ok) {
                throw new Error('La requête n\'a pas abouti.');
            }
            // Convertissez la réponse en texte
            return response.text();
        })
        .then(htmlContent => {
            // parse html to look for docs info
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(htmlContent, 'text/html');
            // find ul with class "pages"
            var nbPages = 1;
            const pagesUl = htmlDoc.querySelector("ul.pages");

            if (pagesUl !== null) {
                // find last li
                const lastLi = pagesUl.lastElementChild;
                // get last page number
                nbPages = parseInt(lastLi.textContent);
            }
            console.log("nb Pages discussions", nbPages);
            // download all pages
            for (let i = 1; i <= nbPages; i++) {
                const url = "http://" + currentTipi + ".hellotipi.com/?page=short_msg&action=view_old&p=" + (i - 1);
                downloadDiscussionsFromPage(url, i);
            }
        })
        .catch(error => {
            console.error("Erreur lors du chargement de la page :", error);
        });
}

function downloadDiscussionsFromPage(url, i) {
    console.log("downloadDiscussionsFromPage", url);
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('La requête n\'a pas abouti.');
            }
            // Convertissez la réponse en texte
            return response.text();
        }
        )
        .then(htmlContent => {
            // parse html to look for docs info
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(htmlContent, 'text/html');
            accuMsgs[i] = htmlDoc.querySelector("div#comview.current_comments").innerHTML;
            console.log("taille de l'accu : ", accuMsgs[i].length);


            const prefix = i.toString().padStart(4, '0');
            const comsFileName = "hellotipi/" + currentTipi + "/discussions/" + prefix + "-discussions.html";
            doesExist(comsFileName).then((fileExists) => {
                if (!fileExists) {
                    const blob = new Blob([accuMsgs[i]], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob)
                    // save description to file
                    browser.downloads.download({
                        url: url,
                        filename: comsFileName,
                        saveAs: false // Si vous voulez que le navigateur enregistre sous forme de fichier, définissez saveAs sur true
                    }).then(downloadId => {
                        // Téléchargement lancé avec succès
                        console.log("Téléchargement lancé pour les coms avec l'ID :", downloadId, comsFileName);
                    }).catch(error => {
                        console.error("Erreur lors du téléchargement du fichier coms:", error);
                    });
                } else {
                    console.log("Le fichier existe déjà", comsFileName);
                }
            }
            );
        }
        )
        .catch(error => {
            console.error("Erreur lors du chargement de la page :", error);
        }
        );

}

function downloadAllDocs() {
    // fetch docs main page to get the number of pages
    const docsPageURL = "http://" + currentTipi + ".hellotipi.com/?page=docs";
    fetch(docsPageURL)
        .then(response => {
            if (!response.ok) {
                throw new Error('La requête n\'a pas abouti.');
            }
            // Convertissez la réponse en texte
            return response.text();
        })
        .then(htmlContent => {
            // parse html to look for docs info
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(htmlContent, 'text/html');
            // find ul with class "pages"
            var nbPages = 1;
            const pagesUl = htmlDoc.querySelector("ul.pages");

            if (pagesUl !== null) {
                // find last li
                const lastLi = pagesUl.lastElementChild;
                // get last page number
                nbPages = parseInt(lastLi.textContent);
            }
            console.log("nb Pages docs", nbPages);
            // download all pages
            for (let i = 1; i <= nbPages; i++) {
                const url = "http://" + currentTipi + ".hellotipi.com/?page=docs&p=" + (i - 1);
                downloadDocsFromPage(url);
            }

        })
        .catch(error => {
            console.error("Erreur lors du chargement de la page :", error);
        });
}

function downloadDocsFromPage(url) {
    console.log("downloadDocsFromPage", url);
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('La requête n\'a pas abouti.');
            }
            // Convertissez la réponse en texte
            return response.text();
        }
        )
        .then(htmlContent => {
            // parse html to look for docs info
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(htmlContent, 'text/html');
            // find divs 
            const docsLi = htmlDoc.querySelectorAll("ul#docslist>li>div.docdiv2");
            console.log("nb docs in page: ", docsLi.length, "in page: ", url);
            // find all docs
            for (let i = 0; i < docsLi.length; i++) {
                const docLi = docsLi[i];
                const docUrl = docLi.querySelector("a").href;
                var docName = cleanAlbumNameForDirectory(removeAccents(docLi.querySelector("h2").textContent));
                // we need to keep the last . for the extension. It has been replaced by a - in cleanAlbumNameForDirectory
                const docExt = docName.substring(docName.lastIndexOf("-") + 1);
                docName = docName.substring(0, docName.lastIndexOf("-")) + "." + docExt;


                const docDetails = docLi.querySelector("p").textContent;
                // download doc
                downloadDoc(docUrl, docName, docDetails);
            }
        })
        .catch(error => {
            console.error("Erreur lors du chargement de la page :", error);
        }
        );
}

function downloadDoc(docUrl, docName, docDetails) {
    const docFileName = "hellotipi/" + currentTipi + "/docs/" + docName;
    const docFileNameDesc = docFileName + ".txt";
    doesExist(docFileName).then((fileExists) => {
        if (!fileExists) {
            // Téléchargez le fichier
            // Utilisez l'API browser.downloads pour télécharger le fichier sans spécifier de chemin de fichier
            browser.downloads.download({
                url: docUrl,
                filename: docFileName,
                saveAs: false // Si vous voulez que le navigateur enregistre sous forme de fichier, définissez saveAs sur true
            }).then(downloadId => {
                // Téléchargement lancé avec succès
                console.log("Téléchargement lancé pour le doc avec l'ID :", downloadId, docName);
            }).catch(error => {
                console.error("Erreur lors du téléchargement du fichier doc :", error);
            });
        } else {
            console.log("Le fichier existe déjà", docFileName);
        }
    }
    );

    doesExist(docFileNameDesc).then((fileExists) => {
        if (!fileExists) {
            const blob = new Blob([docDetails], { type: 'text/plain' });
            const url = URL.createObjectURL(blob)
            // save description to file
            browser.downloads.download({
                url: url,
                filename: docFileNameDesc,
                saveAs: false // Si vous voulez que le navigateur enregistre sous forme de fichier, définissez saveAs sur true
            }).then(downloadId => {
                // Téléchargement lancé avec succès
                console.log("Téléchargement lancé pour le doc description avec l'ID :", downloadId, docName);
            }).catch(error => {
                console.error("Erreur lors du téléchargement du fichier doc description :", error);
            });
        } else {
            console.log("Le fichier existe déjà", docFileName);
        }
    }
    );
}


function askForAlbums() {
    browser.tabs.query({ active: true, currentWindow: true })
        .then(tabs => { sendMessageToTabs(tabs, "scan-all-albums") })
        .catch(reportError);
}

function sendMessageToTabs(tabs, msg) {
    browser.tabs.sendMessage(tabs[0].id, {
        command: msg,
    });
}

function getAlbumIdFromURL(url) {
    const u = new URL(url);
    const params = new URLSearchParams(u.search);
    const albumId = params.get('album_id');
    return albumId;
}
function removeAccents(str) {
    // Utilisez la méthode normalize pour normaliser les caractères accentués
    const normalizedStr = str.normalize("NFD");
    // Utilisez une expression régulière pour supprimer les caractères diacritiques
    return normalizedStr.replace(/[\u0300-\u036f]/g, "");
}

function updateAlbumsLinksDisplay() {
    // fill div "albums-pages" with links
    const albumsLinksDiv = document.getElementById("albums-links");
    // clear div
    albumsLinksDiv.innerHTML = "";

    if (albumsLinks.length > 0) {
        // add a button to download all albums
        const d = document.createElement("p");
        // create a link to download all albums
        const a = document.createElement("a");
        a.href = "#";
        a.textContent = "Télécharger tous les albums";
        a.addEventListener("click", function (event) {
            // click all buttons
            const buttons = document.getElementsByClassName("download-album");
            for (var i = 0; i < buttons.length; i++) {
                buttons[i].click();
            }
        }
        );
        d.appendChild(a);
        albumsLinksDiv.appendChild(d);
    }

    // create ul element
    const ul = document.createElement("ul");
    // create li elements
    for (var i = 0; i < albumsLinks.length; i++) {
        var link = albumsLinks[i];
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = link.url;
        a.textContent = link.title;
        const but = document.createElement("div");
        but.className = "download-album";
        but.linkidx = i;


        but.addEventListener("click", function (event) {
            const linkIndex = event.target.linkidx; // Obtenez l'indice du lien associé au bouton
            const clickedLink = albumsLinks[linkIndex]; // Obtenez l'objet du lien correspondant

            // get user choice from select box
            const select = document.getElementById("resolutions");
            console.log("select", select);
            const resolutions = select.options[select.selectedIndex].value;
            console.log("selectedValue resolution", resolutions);


            // Vous pouvez maintenant faire quelque chose avec le lien cliqué, par exemple :
            console.log("Bouton cliqué pour l'album :", clickedLink.title);
            console.log("Lien de l'album :", clickedLink.url);

            const albumDirName = cleanAlbumNameForDirectory(removeAccents(clickedLink.title)) + "_" + getAlbumIdFromURL(clickedLink.url);

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
                        downloadImageFromPage(page.href, albumDirName, resolutions);
                    });
                    // videos
                    const videosPages = htmlDoc.querySelectorAll('li[id^="video_"] a');
                    const videosPagesLinks = [];
                    videosPages.forEach((page) => {
                        videosPagesLinks.push(page.href);
                        //console.log(page.href);
                        downloadVideoFromPage(page.href, albumDirName);
                    });

                })
                .catch(error => {
                    console.error("Erreur lors du chargement de la page :", error);
                });

        });

        li.appendChild(but);
        li.appendChild(a);

        // add details
        const text = link.details.split("<br>");
        console.log(text);
        const photoMatches = text[2].match(/(\d+) photos/);
        const videoMatches = text[3].match(/(\d+) vidéo/);
        const commentMatches = text[4].match(/(\d+) commentaire/);

        // Vérifiez si une correspondance a été trouvée et obtenez les nombres correspondants
        const numPhotos = photoMatches ? parseInt(photoMatches[1]) : 0;
        const numVideos = videoMatches ? parseInt(videoMatches[1]) : 0;
        const numComments = commentMatches ? parseInt(commentMatches[1]) : 0;

        // Créez un élément <span> pour afficher les détails
        const details = document.createElement('span');
        details.textContent = ` (${numPhotos} 🖼️, ${numComments} 💬, ${numVideos} 🎥)`;
        li.appendChild(details);

        ul.appendChild(li);
    }
    // append ul to div
    albumsLinksDiv.appendChild(ul);

}

// check if file exists
function doesExist(fileNameToCheck) {
    return new Promise((resolve, reject) => {

        browser.downloads.search({ query: [fileNameToCheck] }).then(results => {
            if (results.length > 0) {
                // Le fichier existe déjà dans le répertoire de téléchargement
                console.log(`Le fichier "${fileNameToCheck}" existe déjà.`);
                // Vous pouvez accéder aux détails du téléchargement avec results[0]
                console.log(results[0]);
                resolve(true); // Renvoyer true si le fichier existe
            } else {
                // Le fichier n'existe pas dans le répertoire de téléchargement
                console.log(`Le fichier "${fileNameToCheck}" n'existe pas.`);
                resolve(false); // Renvoyer false si le fichier n'existe pas
            }
        }).catch(error => {
            console.error("Erreur lors de la recherche de fichiers :", error);
            reject(error); // Rejeter la promesse en cas d'erreur
        });
    });
}

function downloadVideoFromPage(url, albumDirName) {
    console.log("downloadVideoFromPage", url)
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
            const vidId = params.get('id_video');
            const albumId = params.get('album_id');

            console.log("Viewer video chargé", vidId, albumId)

            const htmlFileName = "hellotipi/" + currentTipi + "/albums/" + albumDirName + "/html/" + vidId + ".html";
            doesExist(htmlFileName).then((fileExists) => {
                if (!fileExists) {
                    browser.downloads.download({
                        url: url,
                        filename: htmlFileName,
                        saveAs: false // Si vous voulez que le navigateur enregistre sous forme de fichier, définissez saveAs sur true
                    }).then(downloadId => {
                        // Téléchargement lancé avec succès
                        console.log("Téléchargement html lancé avec l'ID :", downloadId);
                    }).catch(error => {
                        console.error("Erreur lors du téléchargement du fichier :", error);
                    });
                } else {
                    console.log("Le fichier existe déjà", htmlFileName);
                }
            });

            // parse html to look for images
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(htmlContent, 'text/html');

            // download video
            const section = htmlDoc.querySelector(".outils")
            if (section === null) {
                console.log("no video found");
                return;
            }
            const videoSrc = section.querySelector("a").href
            console.log("video a télécharger : ", videoSrc);
            downloadVideo(videoSrc, vidId, albumDirName);
        })
        .catch(error => {
            console.error("Erreur lors du chargement de la page :", error);
        });

}

function downloadImageFromPage(url, albumDirName, resolutions) {
    console.log("downloadImageFromPage", url, resolutions)
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

            const htmlFileName = "hellotipi/" + currentTipi + "/albums/" + albumDirName + "/html/" + imgId + ".html";
            doesExist(htmlFileName).then((fileExists) => {
                if (!fileExists) {
                    browser.downloads.download({
                        url: url,
                        filename: htmlFileName,
                        saveAs: false // Si vous voulez que le navigateur enregistre sous forme de fichier, définissez saveAs sur true
                    }).then(downloadId => {
                        // Téléchargement lancé avec succès
                        console.log("Téléchargement html lancé avec l'ID :", downloadId);
                    }).catch(error => {
                        console.error("Erreur lors du téléchargement du fichier :", error);
                    });
                } else {
                    console.log("Le fichier existe déjà", htmlFileName);
                }
            });

            // parse html to look for images
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(htmlContent, 'text/html');

            console.log("resolutions", resolutions)

            if (resolutions.indexOf("br") > -1) {
                // download basse résolution
                // image is displayed in a div with id "image_medium"
                const images = htmlDoc.querySelectorAll('img#image_medium');
                images.forEach((img) => {
                    const imgSrc = img.getAttribute('src');
                    console.log("image LR a télécharger : ", imgSrc);
                    downloadImage(imgSrc, imgId, albumDirName, false);
                });
            }
            if (resolutions.indexOf("hr") > -1) {
                // download haute résolution
                // image is available from a link 
                const h3s = htmlDoc.querySelector("#outilsphoto")
                    .querySelectorAll("h3");
                if (h3s[h3s.length - 1] === undefined) {
                    console.log("no HR link found (h3)");
                    return;
                }
                const hrLink = h3s[h3s.length - 1]
                    .nextSibling
                    .querySelector("a").href;
                // get the link href
                if (hrLink == null) {
                    console.log("no HR link found (hrLink)");
                    return;
                } else {
                    console.log("image HR a télécharger : ", hrLink);
                    downloadImage(hrLink, imgId, albumDirName, true);
                }
            }
        })
        .catch(error => {
            console.error("Erreur lors du chargement de la page :", error);
        });
}

function cleanAlbumNameForDirectory(albumName) {
    // Supprimer les caractères spéciaux et les espaces
    const cleanName = albumName.replace(/[^\w\s]/g, '-').replace(/\s+/g, '-');
    // Limiter la longueur si nécessaire (par exemple, à 255 caractères)
    const maxLength = 100;
    if (cleanName.length > maxLength) {
        return cleanName.substring(0, maxLength);
    }
    return cleanName;
}
function downloadVideo(videoSrc, vidId, albumDirName) {
    // Construisez l'URL de l'image que vous souhaitez télécharger
    const videoURL = videoSrc;
    const fileName = "hellotipi/" + currentTipi + "/albums/" + albumDirName + "/videos/" + vidId + ".mp4";

    doesExist(fileName).then((fileExists) => {
        if (!fileExists) {
            // Téléchargez l'image
            // Utilisez l'API browser.downloads pour télécharger l'image sans spécifier de chemin de fichier
            browser.downloads.download({
                url: videoURL,
                filename: fileName,
                saveAs: false // Si vous voulez que le navigateur enregistre sous forme de fichier, définissez saveAs sur true
            }).then(downloadId => {
                // Téléchargement lancé avec succès
                console.log("Téléchargement lancé avec l'ID :", downloadId);
            }).catch(error => {
                console.error("Erreur lors du téléchargement de l'image :", error);
            });
        } else {
            console.log("Le fichier existe déjà", fileName);
        }
    });
}
function downloadImage(imgSrc, imgId, albumDirName, bHD) {
    // Construisez l'URL de l'image que vous souhaitez télécharger
    const imageURL = imgSrc;
    const fileName = "hellotipi/" + currentTipi + "/albums/" + albumDirName + "/" + (bHD ? "HD/" : "BD/") + imgId + ".jpg";

    doesExist(fileName).then((fileExists) => {
        if (!fileExists) {
            // Téléchargez l'image
            // Utilisez l'API browser.downloads pour télécharger l'image sans spécifier de chemin de fichier
            browser.downloads.download({
                url: imageURL,
                filename: fileName,
                saveAs: false // Si vous voulez que le navigateur enregistre sous forme de fichier, définissez saveAs sur true
            }).then(downloadId => {
                // Téléchargement lancé avec succès
                console.log("Téléchargement lancé avec l'ID :", downloadId);
            }).catch(error => {
                console.error("Erreur lors du téléchargement de l'image :", error);
            });
        } else {
            console.log("Le fichier existe déjà", fileName);
        }
    });
}




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
            title: message.name,
            details: message.details
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
    .then(init)
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