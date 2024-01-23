(function () {
    /**
     * Check and set a global guard variable.
     * If this content script is injected into the same page again,
     * it will do nothing next time.
     */
    if (window.hasRun) {
        return;
    }
    window.hasRun = true;

    function listAlbumsPages() {

        const pageLinks = []; // Tableau pour stocker les liens des pages

        // Sélectionnez tous les éléments li avec la classe "pagenothover"
        const pageElements = document.querySelectorAll('ul.pages:first-of-type > li');

        firstPageIdx = 0;
        lastPageIdx = 0;
        lastLink = "";
        // Parcourez les éléments li et extrayez les liens
        pageElements.forEach((element) => {
            const link = element.querySelector('a');
            if (link) {

                // et URL params from link 
                const url = new URL(link.href);
                const params = new URLSearchParams(url.search);
                const pageIdx = parseInt(params.get('p'));
                lastLink = link.href;

                if (pageIdx > lastPageIdx) {
                    lastPageIdx = pageIdx;
                }
            }
        });
        // now we have the last page index, let's build the urls
        for (let i = firstPageIdx; i <= lastPageIdx; i++) {
            const url = new URL(lastLink);
            const params = new URLSearchParams(url.search);
            params.set('p', i);
            url.search = params;
            pageLinks.push(url.href);
            // send message to bacground script
            browser.runtime.sendMessage({
                command: "albumsPage",
                url: url.href
            });
        }



        // Sélectionnez tous les éléments <li> dans la liste d'albums avec l'ID "albumlist"
        const albumItems = document.querySelectorAll('#albumlist li');

    }

    function listAllAlbums() {
        // check the URL is an "all albums" page
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        if (url.hostname.indexOf("hellotipi") == -1) {
            console.log("not a hellotipi page")
            return;
        }
        // get subdomain
        const subdomain = url.hostname.split('.')[0];
        console.log("subdomain", subdomain);

        const allAlbumsPageURL = "http://" + subdomain + ".hellotipi.com/?page=album&action=view_all";
        fetch(allAlbumsPageURL)
            .then(response => {
                if (!response.ok) {
                    throw new Error('La requête n\'a pas abouti.');
                }
                return response.text(); // Convertir la réponse en texte
            })
            .then(htmlContent => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlContent, 'text/html');

                // Sélectionnez tous les éléments div avec la classe "minipic"
                const albumElements = doc.querySelectorAll('div.minipic');

                // Parcourez les éléments div et extrayez le nom de l'album et le lien
                albumElements.forEach(element => {
                    const albumLink = element.querySelector('a'); // Sélectionnez le lien à l'intérieur du div
                    const albumName = albumLink.querySelector('strong').textContent; // Obtenez le texte du nom de l'album
                    const albumURL = albumLink.getAttribute('href'); // Obtenez l'attribut "href" du lien
                    const albumDetails = albumLink.querySelector('span').innerHTML; // Obtenez le texte des détails de l'album

                    browser.runtime.sendMessage({
                        command: "oneAlbumPage",
                        url: albumURL,
                        name: albumName,
                        details: albumDetails
                    });
                });

                browser.runtime.sendMessage({
                    command: "refreshAlbumsList",
                });



            })
            .catch(error => {
                console.error('Erreur lors de la récupération du contenu de la page :', error);
            });


    }


    /**
 * Listen for messages from the background script.
 */
    browser.runtime.onMessage.addListener((message) => {
    if (message.command === "scan-album-pages") {
        listAlbumsPages();
    } else if (message.command === "scan-all-albums") {
        listAllAlbums();
    }
});

}) ();