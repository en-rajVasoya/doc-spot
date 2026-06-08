
const DB_NAME = "dataspot_downloads";
const STORE_NAME = "chunks";
const CHUNK_SIZE = 25 * 1024 * 1024; // 25MB - matches your app



self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// This survives page refreshes because Chrome's Download Manager
// keeps this request alive independently of the React tab.

self.addEventListener('fetch', (event) => {
    //  here sw is fetching hee info about file in url
    const url = new URL(event.request.url);

    if (url.pathname.startsWith('/native-download/')) {
        // getting file id 
        const parts = url.pathname.split('/');
        const fileId = parts[parts.length - 1];

        // getting file name and file sizze here
        const fileName = url.searchParams.get('name') || 'download';
        const fileSize = parseInt(url.searchParams.get('size'));

        if (!fileId || !fileSize) {
            event.respondWith(new Response("Missing fileId or size", { status: 400 }));
            return;
        }

        //  here sw takes controler and gives response 
        event.respondWith(startStreaming(fileId, fileName, fileSize));
    }
});



//  here sw will read from index db all chuk and then streams them to chrome download panel
async function startStreaming(fileId, fileName, fileSize) {

    //  how many chunks exist in index db start from chunk 0
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)
    const db = await openDB()
    let currentChunk = 0

    const clients = await self.clients.matchAll()

    //  stream file chunks to download panel of chrome
    const stream = new ReadableStream({
        //  this will run untile all chunks finished
        async pull(controller) {
            try {
                // when downloa dcomplete
                if (currentChunk >= totalChunks) {
                    controller.close()

                    clients.forEach(client => {
                        client.postMessage({
                            type: "DOWNLOAD_COMPLETE",
                            fileId
                        })
                    })

                    return
                }
                const chunk = await getChunk(db, fileId, currentChunk)
                if (!chunk) {
                    controller.error(new Error(`Missing chunk ${currentChunk}`))
                    return
                }

                controller.enqueue(new Uint8Array(chunk))

                // download panel 
                const progress = Math.round(((currentChunk + 1) / totalChunks) * 100)

                clients.forEach(client => {
                    client.postMessage({
                        type: "NATIVE_DOWNLOAD_PROGRESS",
                        fileId,
                        progress
                    })
                })

                currentChunk++

            } catch (err) {
                console.error("SW stream error:", err)
                controller.error(err)
            }
        }
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
            'Cache-Control': 'no-cache'
        }
    })
}

// -------------------------------------------------------
// Database Helpers
// -------------------------------------------------------
function openDB() {
    return new Promise((resolve, reject) => {
        // MUST match the version in DownloadContext.jsx (DB_VERSION 10 + 1 = 11)
        // Mismatched version = Service Worker reads from wrong/stale DB = Missing chunks
        const request = indexedDB.open(DB_NAME, 2);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getChunk(db, fileId, chunkIndex) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const request = tx.objectStore(STORE_NAME).get(`${fileId}_chunk_${chunkIndex}`);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
