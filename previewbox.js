// Close lightbox
function closeLightbox() {
    $(".new-preview-zoom-controls").hide();
    $(".pdf-page-total").text(1);
    $(".new-preview-pagination-pdf-single-box").addClass("d-none");
    // $('.new-preview-modal').fadeOut(300);
    $(".lightbox-download").attr("data-id", "");
    $(".new-preview-toolbar-title").text("");
    $(".new-preview-content").html("");
    $(".new-preview-zoom-out-btn").attr("disabled", false);
    $(".new-preview-zoom-in-btn").attr("disabled", false);
    $(".new-preview-zoom-reset-btn").attr("disabled", false);
    $(".new-preview-zoom-out-btn").css("color", "");
    $(".new-preview-zoom-in-btn").css("color", "");
    $(".new-preview-zoom-reset-btn").css("color", "");
    $(".new-preview-zoom-reset-btn svg").replaceWith(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zoom-in">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
      </svg>`);
    setTimeout(() => {
        $(".new-preview-modal").removeClass("active");
    }, 300);
}


// Close on ESC key
$(document).keyup(function (e) {
    if (e.key === "Escape") {
        closeLightbox();
    }
});

// Fetch and display text from URL
function displayTextFromUrl(src, title) {
    clearContent();
    zoomControls.style.display = 'none';

    // Create a container div for better formatting
    const container = document.createElement('div');
    container.className = 'new-preview-text-container';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.background = '#fff';
    container.style.margin = 0;
    container.style.overflow = 'auto';
    container.style.padding = '5em 1em';
    container.style.boxSizing = 'border-box';
    container.style.fontFamily = 'monospace, Consolas, "Liberation Mono", Menlo, Courier, monospace';
    container.style.whiteSpace = 'pre-wrap';
    container.style.wordBreak = 'break-all';
    container.style.fontSize = '15px';
    container.style.lineHeight = '1.6';

    // Add initial loading text
    container.innerHTML = `<span style="color:#888;">Loading...</span>`;
    previewContent.appendChild(container);

    // Set download attribute for .lightbox-download
    $(".lightbox-download").attr("data-id", src);
    $(".new-preview-toolbar-title").text(title);

    // Fetch then display
    fetch(src)
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.text();
        })
        .then(text => {
            // if (/�/.test(text)) {
            //     container.textContent = "A Binary File Was Uploaded";
            // } else {
            // Basic escaping for <, > and &
            const safeText = text
            // .replace(/&/g, "&amp;")
            // .replace(/</g, "&lt;")
            // .replace(/>/g, "&gt;");
            container.innerHTML = ""; // Clear loading
            // Split into lines to maintain formatting and preserve empty lines
            safeText.split("\n").forEach(line => {
                const div = document.createElement('div');
                div.textContent = line;
                container.appendChild(div);
            });
            // }
        })
        .catch(error => {
            container.innerHTML = `<span style="color:#d32f2f;">Error loading file: Something went wrong</span>`;
            console.error('Error:', error);
        });

    currentSrc = src;
    modal.classList.add('active');
}
$(document).on('click', '.floating-dd', function (e) {
    e.stopPropagation(); // Stop bubbling to .viewBoxBtn
});
$(document).on('click', '.viewBoxBtn', async function (e) {
    const ext = get_url_extension($(this).attr("data-id"));
    var filename = extractFilenameForforward($(this).attr("data-id"));
    if (viewBoxShow.includes(ext)) {
        if (ext == 'pdf') {
            const pdfUrl = $(this).attr("data-id");
            // $(".lightbox-download").attr("data-id",pdfUrl);
            // displayPDF(pdfUrl, filename);
            loadPDF(pdfUrl, filename)
        } else if (ext == 'txt') {
            const textUrl = $(this).attr("data-id");
            // $(".lightbox-download").attr("data-id",textUrl);
            displayTextFromUrl(textUrl, filename);
        } else if (ext == 'xlsx' || ext == 'xls') {
            // $(".lightbox-download").attr("data-id",$(this).attr("data-id"));
            await loadFromURL($(this).attr("data-id"), filename);
        } else if (ext == 'docx') {
            loadDocx($(this).attr("data-id"), filename)
        } else if (ext == 'jpg' || ext == 'png' || ext == 'jpeg' || ext == 'webp') {
            let src = $(this).attr("data-id");
            if (!/^https?:\/\//i.test(src)) {
                src = (FILES_URL + src).trim();
            }
            $(".lightbox-download").attr("data-id", src);

            loadImage(src, filename)
        } else if (ext == 'mp4') {
            $(".lightbox-download").attr("data-id", (FILES_URL + $(this).attr("data-id")).trim());
            loadVideo($(this).attr("data-id"), filename)
        }
        // else{
        //     $(".lightbox-download").attr("data-id","");
        // }
    }
});

//sheet code start

let sheetsData = [];
let currentSheetIndex = 0;

async function loadFromURL(link, fileName) {
    const url = link;
    if (!url) {
        alert('Please provide a valid URL');
        return;
    }

    // Put loader in new-preview-content, not static excel-viewer
    const newContent = document.querySelector('.new-preview-content');
    newContent.innerHTML = '<div class="loading">Loading Excel file...</div>';
    $(".new-preview-zoom-controls").hide();
    $(".new-preview-pagination-pdf-single-box").addClass("d-none");
    $(".lightbox-download").attr("data-id", link);
    // Set the .new-preview-toolbar-title to have an img tag then the filename
    const toolbarTitle = document.querySelector('.new-preview-toolbar-title');
    if (toolbarTitle) {
        // toolbarTitle.innerHTML = '<img src="images/svgs/excelpreview.png" alt="Excel Icon" style="height:20px;vertical-align:middle;margin-right:10px;">' + fileName;
        toolbarTitle.innerHTML = fileName;
    }
    // $(".new-preview-toolbar-title").text(fileName);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch file from URL');
        const blob = await response.blob();
        await processExcelFile(blob);
    } catch (error) {
        console.error('Error loading from URL:', error);
        newContent.innerHTML = `<div class="loading">Error: ${error.message}</div>`;
    }
}

async function processExcelFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    // Use JSZip to extract images from the Excel file
    const zip = await JSZip.loadAsync(arrayBuffer);
    const imageMap = {};

    // Extract images from xl/media/
    const mediaFiles = Object.keys(zip.files).filter(name =>
        name.startsWith('xl/media/') && /\.(png|jpg|jpeg|gif|bmp)$/i.test(name)
    );
    for (const fileName of mediaFiles) {
        const imageData = await zip.files[fileName].async('base64');
        const ext = fileName.split('.').pop().toLowerCase();
        const mimeType = ext === 'png' ? 'image/png' :
            ext === 'gif' ? 'image/gif' : 'image/jpeg';
        imageMap[fileName] = `data:${mimeType};base64,${imageData}`;
    }

    // Parse drawing relationships if they exist
    let imagePositions = {};
    try {
        const drawing = await zip.files['xl/drawings/drawing1.xml']?.async('text');
        if (drawing) {
            imagePositions = parseDrawingPositions(drawing);
        }
    } catch (e) {
        console.log('No drawing information found');
    }

    // Read workbook
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, {
        type: 'array',
        cellStyles: true,
        cellHTML: false,
        bookImages: true
    });

    sheetsData = convertToManualFormat(workbook, imageMap, imagePositions);
    displaySheets(sheetsData);
}

function parseDrawingPositions(drawingXml) {
    const positions = {};
    const parser = new DOMParser();
    const doc = parser.parseFromString(drawingXml, 'text/xml');
    const anchors = doc.querySelectorAll('xdr\\:twoCellAnchor, twoCellAnchor');
    anchors.forEach((anchor, idx) => {
        const from = anchor.querySelector('xdr\\:from, from');
        if (from) {
            const col = parseInt(from.querySelector('xdr\\:col, col')?.textContent || 0);
            const row = parseInt(from.querySelector('xdr\\:row, row')?.textContent || 0);
            const colOff = parseInt(from.querySelector('xdr\\:colOff, colOff')?.textContent || 0);
            const rowOff = parseInt(from.querySelector('xdr\\:rowOff, rowOff')?.textContent || 0);
            positions[idx] = {
                col: col,
                row: row,
                left: colOff / 9525, // EMU to px
                top: rowOff / 9525
            };
        }
    });
    return positions;
}
function convertToManualFormat(workbook, imageMap, imagePositions) {
    const sheets = [];
    workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        // Get merged cells info
        const merges = worksheet['!merges'] || [];
        
        const cellData = [];
        const maxRow = range.e.r;
        const maxCol = range.e.c;
        
        for (let R = 0; R <= maxRow; R++) {
            cellData[R] = [];
            for (let C = 0; C <= maxCol; C++) {
                cellData[R][C] = null;
            }
        }
        
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = worksheet[cellAddress];
                
                if (cell && cell.v !== undefined) {
                    const cellObj = {
                        value: cell.v,
                        displayText: cell.w || cell.v.toString(),
                        style: {}
                    };
                    
                    if (cell.s) {
                        if (cell.s.fgColor && cell.s.fgColor.rgb) {
                            cellObj.style.backgroundColor = '#' + cell.s.fgColor.rgb;
                        }
                        if (cell.s.font) {
                            if (cell.s.font.color && cell.s.font.color.rgb) {
                                cellObj.style.color = '#' + cell.s.font.color.rgb;
                            }
                            if (cell.s.font.bold) {
                                cellObj.style.fontWeight = 'bold';
                            }
                            if (cell.s.font.italic) {
                                cellObj.style.fontStyle = 'italic';
                            }
                            if (cell.s.font.sz) {
                                cellObj.style.fontSize = cell.s.font.sz + 'pt';
                            }
                        }
                        if (cell.s.alignment) {
                            if (cell.s.alignment.horizontal) {
                                cellObj.style.textAlign = cell.s.alignment.horizontal;
                            }
                            if (cell.s.alignment.vertical) {
                                cellObj.style.verticalAlign = cell.s.alignment.vertical;
                            }
                        }
                    }
                    
                    cellData[R][C] = cellObj;
                }
            }
        }
        
        // Images for this sheet
        const images = [];
        if (sheetIndex === 0 && Object.keys(imageMap).length > 0) {
            Object.entries(imageMap).forEach(([fileName, base64Data], idx) => {
                const pos = imagePositions[idx] || {};
                const cellWidth = 80;
                const cellHeight = 20;
                const left = pos.col !== undefined ? (pos.col * cellWidth) + (pos.left || 0) : (50 + (idx * 320));
                const top = pos.row !== undefined ? (pos.row * cellHeight) + (pos.top || 0) : 50;
                
                if (!base64Data) {
                    console.warn(`Image data missing for ${fileName}`);
                    return;
                }
                
                images.push({
                    src: base64Data,
                    width: 300,
                    height: 200,
                    left: left,
                    top: top,
                    col: pos.col || 0,
                    row: pos.row || 0
                });
            });
        }
        
        sheets.push({
            name: sheetName,
            cellData: cellData,
            images: images,
            maxRow: maxRow,
            maxCol: maxCol,
            merges: merges 
        });
    });
    
    return sheets;
}

// REWRITE displaySheets to set into new-preview-content, NOT use statically-defined sheet-tabs/excel-viewer
function displaySheets(sheets) {
    $(".new-preview-modal").addClass("active")
    const newContent = document.querySelector('.new-preview-content');
    newContent.innerHTML = ""; // clear previous rendered sheets

    // Create a wrapper for tabs and sheets (not using static elements)
    const tabsContainer = document.createElement('div');
    tabsContainer.className = "sheet-tabs";
    tabsContainer.id = "sheetTabsDynamic";

    const sheetsContainer = document.createElement('div');
    sheetsContainer.className = "excel-viewer";
    sheetsContainer.id = "excelViewerDynamic";

    // Create sheet tabs
    sheets.forEach((sheet, index) => {
        const tab = document.createElement('div');
        tab.className = `sheet-tab ${index === 0 ? 'active' : ''}`;
        tab.textContent = sheet.name;
        tab.onclick = () => switchSheet(index, tabsContainer, sheetsContainer);
        tabsContainer.appendChild(tab);
    });

    // Create sheet containers (tables and images)
    sheets.forEach((sheet, index) => {
        const container = document.createElement('div');
        container.className = `sheet-container ${index === 0 ? 'active' : ''}`;
        container.id = `sheet-dyn-${index}`;

        const table = createTable(sheet);
        container.appendChild(table);

        // Images at bottom
        if (sheet.images && sheet.images.length > 0) {
            const imagesWrapper = document.createElement('div');
            imagesWrapper.style.display = 'flex';
            imagesWrapper.style.gap = '15px';
            // imagesWrapper.style.marginTop = '25px';
            imagesWrapper.style.padding = '10px 10px 0';
            imagesWrapper.style.justifyContent = 'flex-start';
            imagesWrapper.style.flexWrap = 'wrap';

            sheet.images.forEach((img, imgIdx) => {
                const imgDiv = document.createElement('div');
                imgDiv.className = 'excel-image';
                imgDiv.style.position = 'static';
                imgDiv.style.left = ''; // clear
                imgDiv.style.top = '';  // clear
                imgDiv.style.width = img.width + 'px';
                imgDiv.style.height = img.height + 'px';
                imgDiv.style.zIndex = 10;
                imgDiv.style.pointerEvents = 'none';

                const imgElement = document.createElement('img');
                imgElement.src = img.src;
                imgElement.alt = `Image ${imgIdx + 1}`;
                imgDiv.appendChild(imgElement);

                imagesWrapper.appendChild(imgDiv);
            });

            container.appendChild(imagesWrapper);
        }

        sheetsContainer.appendChild(container);
    });

    // Add to new-preview-content
    newContent.appendChild(tabsContainer);
    newContent.appendChild(sheetsContainer);

    currentSheetIndex = 0;
    enableCellCopy();
}
function createTable(sheet) {
    const table = document.createElement('table');
    table.className = 'excel-table';

    const hiddenCells = new Set();
    const mergeCellInfo = new Map();
    
    // Process merges
    if (sheet.merges) {
        sheet.merges.forEach(merge => {
            const startRow = merge.s.r;
            const startCol = merge.s.c;
            const endRow = merge.e.r;
            const endCol = merge.e.c;
            
            const rowSpan = endRow - startRow + 1;
            const colSpan = endCol - startCol + 1;
            
            mergeCellInfo.set(`${startRow}-${startCol}`, {
                rowSpan: rowSpan,
                colSpan: colSpan
            });
            
            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    if (r !== startRow || c !== startCol) {
                        hiddenCells.add(`${r}-${c}`);
                    }
                }
            }
        });
    }
    
    // Col header
    const headerRow = document.createElement('tr');
    const emptyHeader = document.createElement('th');
    headerRow.appendChild(emptyHeader);

    for (let C = 0; C <= sheet.maxCol; C++) {
        const th = document.createElement('th');
        th.textContent = XLSX.utils.encode_col(C);
        headerRow.appendChild(th);
    }
    table.appendChild(headerRow);

    // Create rows
    for (let R = 0; R <= sheet.maxRow; R++) {
        const row = document.createElement('tr');
        const rowHeader = document.createElement('th');
        rowHeader.textContent = R + 1;
        row.appendChild(rowHeader);

        for (let C = 0; C <= sheet.maxCol; C++) {
            const cellKey = `${R}-${C}`;
            
            // Skip hidden cells (part of a merge)
            if (hiddenCells.has(cellKey)) {
                continue;
            }
            
            const td = document.createElement('td');
            const cell = sheet.cellData[R] && sheet.cellData[R][C];
            
            if (mergeCellInfo.has(cellKey)) {
                const mergeInfo = mergeCellInfo.get(cellKey);
                if (mergeInfo.rowSpan > 1) {
                    td.rowSpan = mergeInfo.rowSpan;
                }
                if (mergeInfo.colSpan > 1) {
                    td.colSpan = mergeInfo.colSpan;
                }
            }
            
            if (cell) {
                td.textContent = cell.displayText;
                Object.assign(td.style, cell.style);
            }
            
            row.appendChild(td);
        }
        table.appendChild(row);
    }
    
    return table;
}

// Switch sheet for dynamic containers
function switchSheet(index, tabsContainer, sheetsContainer) {
    // If args not passed, fallback to static query for initial calls.
    if (!tabsContainer) tabsContainer = document.querySelector('.new-preview-content .sheet-tabs');
    if (!sheetsContainer) sheetsContainer = document.querySelector('.new-preview-content .excel-viewer');
    const tabs = tabsContainer.querySelectorAll('.sheet-tab');
    tabs.forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });

    const containers = sheetsContainer.querySelectorAll('.sheet-container');
    containers.forEach((container, i) => {
        container.classList.toggle('active', i === index);
    });

    currentSheetIndex = index;
}

// Add this function after your existing functions

function enableCellCopy() {
    document.addEventListener('click', function (e) {
        const td = e.target.closest('td');
        if (td && td.textContent.trim()) {
            copyCellContent(td);
        }
    });
}

function copyCellContent(cell) {
    const content = cell.textContent.trim();

    if (!content) {
        return;
    }

    // Copy to clipboard
    navigator.clipboard.writeText(content).then(() => {
        document.querySelectorAll('.excel-table td.active-cell').forEach(td => {
            td.classList.remove('active-cell');
        });

        // Add active class to clicked cell
        cell.classList.add('active-cell');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Add CSS animation styles
const style = document.createElement('style');
style.textContent = `    
    .excel-table td {
        cursor: pointer;
        // user-select: none;
    }

    .excel-table td.active-cell{
        outline: 2px solid #00a3ef!important;
        outline-offset: -2px;
    }
            /* Better styling for merged cells */
    .excel-table td[rowspan], 
    .excel-table td[colspan] {
        text-align: center;
        vertical-align: middle;
    }
`;
document.head.appendChild(style);

//sheet code end


$(document).on(clickEvent, ".lightbox-download", function (e) {
    const url = $(this).attr("data-id");
    var filename = extractFilenameForforward(url); //path.split('/').pop();
    download(url, filename);
});

$(document).on(clickEvent, ".lightbox-close", (e) => {
    closeLightbox();
});


const modal = document.querySelector('.new-preview-modal');
const contentBox = document.querySelector('.new-preview-single-box');
const previewContent = document.querySelector('.new-preview-content');
const titleElement = document.querySelector('.lightbox-title');
const closeBtns = document.querySelectorAll('.lightbox-close, .lightbox-backbtn');
const zoomInBtn = document.querySelector('.new-preview-zoom-in-btn');
const zoomOutBtn = document.querySelector('.new-preview-zoom-out-btn');
const zoomResetBtn = document.querySelector('.new-preview-zoom-reset-btn');
const zoomControls = document.querySelector('.new-preview-zoom-controls');
const downloadBtn = document.getElementById('downloadBtn');
const pdfViewer = document.querySelector('.pdf-zoom-wrapper');

let scale = 0.1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let startX, startY;
let initialFitScale = 0.1;
// let currentSrc = '';
let docxZoom = 1;
const DOCX_ZOOM_STEP = 0.25;
const DOCX_MIN_ZOOM = 1;
const DOCX_MAX_ZOOM = 2;
function clearContent() {
    previewContent.innerHTML = '';
    scale = 0.1;
    translateX = 0;
    translateY = 0;
    isDragging = false;
}

function fitToContainer(img) {
    const contWidth = previewContent.clientWidth;
    const contHeight = previewContent.clientHeight;
    if (img.naturalHeight <= contHeight) {
        initialFitScale = 1;
    } else {
        // Calculate scale to fit image in container
        const scaleX = contWidth / img.naturalWidth;
        const scaleY = contHeight / img.naturalHeight;
        initialFitScale = Math.min(scaleX, scaleY);
    }

    scale = initialFitScale;
    translateX = 0;
    translateY = 0;
    updateTransform(img);
}

function updateTransform(img) {

    img.style.transform = `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${scale})`;
    contentBox.style.cursor = scale > initialFitScale ? 'grab' : 'default';


    // Update button states
    if (scale <= initialFitScale) {
        $(".new-preview-zoom-out-btn").attr("disabled", true);
        // $(".new-preview-zoom-reset-btn").attr("disabled", true);
        $(".new-preview-zoom-out-btn").css("color", "#d4d4d4");
        // $(".new-preview-zoom-reset-btn").css("color", "#d4d4d4");
    } else {
        $(".new-preview-zoom-out-btn").attr("disabled", false);
        $(".new-preview-zoom-reset-btn").attr("disabled", false);
        $(".new-preview-zoom-out-btn").css("color", "");
        $(".new-preview-zoom-reset-btn").css("color", "");
    }
}

function loadImage(src, title) {
    clearContent();
    zoomControls.style.display = 'flex';

    const img = document.createElement('img');
    img.className = 'new-preview-image';
    img.src = src;
    img.alt = title;

    img.onload = () => {
    modal.classList.add('active');

        fitToContainer(img);
        previewContent.appendChild(img);
    };

    $(".lightbox-download").attr("data-id", src);
    $(".new-preview-toolbar-title").text(title);
    $(".new-preview-zoom-out-btn").attr("disabled", true);
    // $(".new-preview-zoom-reset-btn").attr("disabled", true);
    $(".new-preview-zoom-out-btn").css("color", "#d4d4d4");
    // $(".new-preview-zoom-reset-btn").css("color", "#d4d4d4");
    $(".new-preview-pagination-pdf-single-box").addClass("d-none");
    $(".new-preview-zoom-reset-btn svg").replaceWith(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zoom-out">
  <circle cx="11" cy="11" r="8"></circle>
  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  <line x1="8" y1="11" x2="14" y2="11"></line>
  <line x1="11" y1="8" x2="11" y2="14"></line>
</svg>`);
    currentSrc = src;
}

function loadVideo(src, title) {
    clearContent();
    $(".new-preview-pagination-pdf-single-box").addClass("d-none");
    zoomControls.style.display = 'none';

    const video = document.createElement('video');
    video.className = 'new-preview-video';
    video.src = src;
    video.controls = true;
    video.autoplay = true;
    previewContent.appendChild(video);
    $(".lightbox-download").attr("data-id", src);
    $(".new-preview-toolbar-title").text(title);
    currentSrc = src;
    modal.classList.add('active');
}

function loadDocx(src, title) {
    clearContent();
    zoomControls.style.display = 'none';
    $(".new-preview-pagination-pdf-single-box").addClass("d-none");

    // Create fallback object for when browser can't render DOCX
    const object = document.createElement('object');
    object.className = 'new-preview-docx';
    object.data = src;
    object.type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    object.width = '100%';
    object.height = '100%';
    object.innerHTML = `<p style="text-align:center;margin-top:2em;">
        <strong>Unable to display DOCX file.</strong>
        <br>
        <a href="${src}" target="_blank" style="color:blue;">Open DOCX in a new tab</a>
    </p>`;

    previewContent.appendChild(object);
    modal.classList.add('active');
    $(".lightbox-download").attr("data-id", src);
    // $(".new-preview-toolbar-title").text(title);
    const toolbarTitle = document.querySelector('.new-preview-toolbar-title');
    if (toolbarTitle) {
        // toolbarTitle.innerHTML = '<img src="images/svgs/docspreview.png" alt="docs Icon" style="height:20px;vertical-align:middle;margin-right:10px;">' + title;
        toolbarTitle.innerHTML = title;
    }
    // Try to fetch and render docx using docx-preview in '.new-preview-content'
    fetch(src)
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.blob();
        })
        .then(blob => {
            // docx.renderAsync expects an element or id, not HTMLCollection
            const container = document.querySelector('.new-preview-content');
            // Optionally clear container before rendering (uncomment if needed)
            // container.innerHTML = '';
            docx.renderAsync(blob, container).then(() => {
                // Remove fallback object
                if (object.parentNode) object.parentNode.removeChild(object);
            
                // Force responsive behavior
                const style = document.createElement('style');
                style.textContent = `
                    .new-preview-content .docx-wrapper,
                    .new-preview-content .docx-page,
                    .new-preview-content table,
                    .new-preview-content div[style*="position: absolute"] {
                        max-width: 100% !important;
                        width: 100% !important;
                        box-sizing: border-box !important;
                    }
                    .new-preview-content table {
                        table-layout: auto !important;
                        width: 100% !important;
                        min-width: 0 !important;
                    }
                    .new-preview-content img {
                        max-width: 100% !important;
                        height: auto !important;
                    }
                `;
                document.head.appendChild(style);
                });
            // docx.renderAsync(blob, container)
            //     .then(function () {
            //         // Remove the <object> fallback since rendering succeeded
            //         if (object.parentNode) {
            //             object.parentNode.removeChild(object);
            //         }
            //     })
            //     .catch(function (error) {
            //         console.error("Error rendering docx:", error);
            //     });
        })
        .catch(error => {
            console.error("Error fetching docx:", error);
        });

    currentSrc = src;
}

//pdf code start
// Global zoom state
let currentZoom = 1;
const zoomStep = 0.25;
const minZoom = 0.5;
const maxZoom = 2;
let pdfDoc = null;
let totalPages = 0;
let renderTasks = [];
let currentPage = 1; //trace page number

async function loadPDF(src, title) {
    clearContent();
    $(".new-preview-pagination-pdf-single-box").removeClass("d-none");
    $(".new-preview-zoom-reset-btn").attr("disabled", true);
    $(".new-preview-zoom-reset-btn").css("color", "#d4d4d4");
    currentZoom = 1;
    currentPage = 1;

    if (zoomControls) {
        zoomControls.style.display = 'flex';
    }


    const zoomWrapper = document.createElement('div');
    zoomWrapper.className = 'pdf-zoom-wrapper';
    zoomWrapper.style.width = '100%';
    zoomWrapper.style.height = '100%';
    zoomWrapper.style.overflow = 'auto';
    zoomWrapper.style.display = 'flex';
    zoomWrapper.style.flexDirection = 'column';
    zoomWrapper.style.alignItems = 'center';
    zoomWrapper.style.padding = '20px';

    const pagesContainer = document.createElement('div');
    pagesContainer.className = 'pdf-pages-container';
    pagesContainer.style.display = 'flex';
    pagesContainer.style.flexDirection = 'column';
    pagesContainer.style.gap = '20px';
    pagesContainer.style.width = '100%';
    // pagesContainer.style.maxWidth = '1000px';

    zoomWrapper.appendChild(pagesContainer);
    previewContent.appendChild(zoomWrapper);

    if (typeof $ !== 'undefined') {
        $(".lightbox-download").attr("data-id", src);
    }

    const toolbarTitle = document.querySelector('.new-preview-toolbar-title');
    if (toolbarTitle) {
        toolbarTitle.innerHTML = title;
    }

    currentSrc = src;
    if (modal) {
        modal.classList.add('active');
    }

    //important
    setTimeout(() => {
        const scrollContainer = document.querySelector('.pdf-zoom-wrapper');

        if (scrollContainer) {
            let timer;
            scrollContainer.addEventListener('scroll', function () {

                clearTimeout(timer);
                timer = setTimeout(() => {
                    const scrollTop = this.scrollTop;
                    let bestPage = 1;
                    let minDiff = Infinity;

                    document.querySelectorAll('.pdf-canvas-container').forEach(el => {
                        const top = el.offsetTop;
                        const diff = Math.abs(scrollTop - top);
                        if (diff < minDiff) {
                            minDiff = diff;
                            bestPage = parseInt(el.getAttribute('data-page-number')) || 1;
                        }
                    });

                    // for last page
                    if (scrollTop + this.clientHeight >= this.scrollHeight - 100) {
                        bestPage = totalPages;
                    }

                    if (bestPage !== currentPage) {
                        currentPage = bestPage;
                        $(".pdf-page-count").text(currentPage);
                        // $("#pageSelector").val(currentPage);
                        // console.log("update page:", currentPage);
                    }
                }, 120);
            });
        } else {
            console.error("pdf-zoom-wrapper not found");
        }


        if (totalPages > 0) {
            currentPage = 1;
            $("#pageSelector").val(1);
            $(".pdf-page-count").text(1);
        }
    }, 800);
    try {
        if (typeof pdfjsLib === 'undefined') {
            await loadPDFJS();
        }

        const loadingTask = pdfjsLib.getDocument(src);
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages;
        $(".pdf-page-total").text(totalPages);

        updatePageInfo();

        await renderAllPages();

    } catch (error) {
        console.error('Error loading PDF:', error);
        pagesContainer.innerHTML = `
            <div style="padding: 40px; text-align: center; background: #fff; border-radius: 4px;">
                <strong>Unable to display PDF file.</strong>
                <br><br>
                <a href="${src}" target="_blank" style="color: #4285f4; text-decoration: none;">Open PDF in a new tab</a>
            </div>
        `;
    }

    updateZoomDisplay();
}

async function loadPDFJS() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function renderAllPages() {
    if (!pdfDoc) return;

    renderTasks.forEach(task => task && task.cancel && task.cancel());
    renderTasks = [];

    const pagesContainer = document.querySelector('.pdf-pages-container');
    pagesContainer.innerHTML = '';

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'pdf-canvas-container';
        canvasContainer.style.background = '#fff';
        canvasContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        canvasContainer.style.position = 'relative';
        canvasContainer.setAttribute('data-page-number', pageNum);

        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-canvas';
        canvas.setAttribute('data-page', pageNum);
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = 'auto';

        canvasContainer.appendChild(canvas);
        pagesContainer.appendChild(canvasContainer);

        await renderPage(pageNum, canvas);
    }
}

async function renderPage(pageNum, canvas) {
    if (!pdfDoc) return;

    const page = await pdfDoc.getPage(pageNum);
    const context = canvas.getContext('2d');

    const viewport = page.getViewport({ scale: 1.5 * currentZoom });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };

    const task = page.render(renderContext);
    renderTasks.push(task);

    try {
        await task.promise;
    } catch (error) {
        if (error.name !== 'RenderingCancelledException') {
            console.error('Rendering error:', error);
        }
    }
}

function updatePageInfo() {
    const pageInfo = document.querySelector('.page-info');
    if (pageInfo) {
        pageInfo.textContent = `${totalPages} page${totalPages !== 1 ? 's' : ''}`;
    }

    const pageSelector = document.getElementById('pageSelector');
    if (pageSelector && totalPages > 0) {
        pageSelector.max = totalPages;
        pageSelector.min = 1;
    }
}

function zoomIn() {
    if (currentZoom < maxZoom) {
        currentZoom = Math.min(currentZoom + zoomStep, maxZoom);
        $('.pdf-canvas').each(function () {
            this.style.width = (parseFloat(this.width) * currentZoom) + 'px';
            this.style.height = (parseFloat(this.height) * currentZoom) + 'px';
        });
        updateZoomDisplay();
    } else {
        $(".new-preview-zoom-out-btn").attr("disabled", false);
        $(".new-preview-zoom-reset-btn").attr("disabled", false);
        $(".new-preview-zoom-out-btn").css("color", "#989a99");
        $(".new-preview-zoom-reset-btn").css("color", "#989a99");
    }
}

function zoomOut() {
    if (currentZoom > minZoom) {
        currentZoom = Math.max(currentZoom - zoomStep, minZoom);
        $('.pdf-canvas').each(function () {
            this.style.width = (parseFloat(this.width) * currentZoom) + 'px';
            this.style.height = (parseFloat(this.height) * currentZoom) + 'px';
        });
        updateZoomDisplay();
    } else {
        $(".new-preview-zoom-out-btn").attr("disabled", true);
        $(".new-preview-zoom-reset-btn").attr("disabled", true);
        $(".new-preview-zoom-out-btn").css("color", "#989a99");
        $(".new-preview-zoom-reset-btn").css("color", "#989a99");
    }
}

function resetZoomPdf() {
    currentZoom = 1;
    $('.pdf-canvas').each(function () {
        this.style.width = '100%';
        this.style.height = 'auto';
    });
    $(".new-preview-zoom-reset-btn").attr("disabled", true);
    $(".new-preview-zoom-reset-btn").css("color", "#d4d4d4");
    updateZoomDisplay();
}

function updateZoomDisplay() {
    const zoomInBtn = document.querySelector('.new-preview-zoom-in-btn');
    const zoomOutBtn = document.querySelector('.new-preview-zoom-out-btn');
    if (currentZoom <= minZoom) {
        $(".new-preview-zoom-out-btn").attr("disabled", true).css("color", "#d4d4d4");
    } else {
        $(".new-preview-zoom-out-btn").attr("disabled", false).css("color", "");
    }
    if (currentZoom >= maxZoom) {
        $(".new-preview-zoom-in-btn").attr("disabled", true).css("color", "#d4d4d4");
    } else {
        $(".new-preview-zoom-in-btn").attr("disabled", false).css("color", "");
    }
    if (currentZoom === 1) {
        $(".new-preview-zoom-reset-btn").attr("disabled", true).css("color", "#d4d4d4");
    } else {
        $(".new-preview-zoom-reset-btn").attr("disabled", false).css("color", "");
    }
    if (zoomInBtn) {
        zoomInBtn.disabled = currentZoom >= maxZoom;
        zoomInBtn.style.opacity = currentZoom >= maxZoom ? '0.5' : '1';
    }
    if (zoomOutBtn) {
        zoomOutBtn.disabled = currentZoom <= minZoom;
        zoomOutBtn.style.opacity = currentZoom <= minZoom ? '0.5' : '1';
    }
}

// Page selector functionality
$(".pageSelectorSubmit").on("click", () => {
    const pageNum = parseInt($('#pageSelector').val());
    if (pageNum >= 1 && pageNum <= totalPages) {
        scrollToPage(pageNum);
    }
});

function scrollToPage(pageNum) {
    const pageContainer = document.querySelector(`[data-page-number="${pageNum}"]`);
    if (pageContainer) {
        $(".pdf-page-count").text(pageNum);
        pageContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        currentPage = pageNum;
        updatePageDisplay();
    }
}

function updatePageDisplay() {
    $(".pdf-page-count").text(currentPage);
    $("#pageSelector").val(currentPage);
}

function clearContent() {
    const wrapper = document.querySelector('.pdf-zoom-wrapper');
    if (wrapper) wrapper.remove();
}

//pdf code end

// Zoom handlers (only for image)

function updateDocxZoomButtons() {
    $(".new-preview-zoom-in-btn").attr("disabled", docxZoom >= DOCX_MAX_ZOOM);
    $(".new-preview-zoom-out-btn").attr("disabled", docxZoom <= DOCX_MIN_ZOOM);
    $(".new-preview-zoom-reset-btn").attr("disabled", docxZoom === 1);

    // Optional: change colors like you do for image/pdf
}

zoomInBtn.onclick = () => {
    const docxContainer = previewContent.querySelector('.docx-wrapper');
    if (previewContent.querySelector('.new-preview-image')) {
        zoomAtPoint(1.4);
    }
    if (previewContent.querySelector('.pdf-pages-container')) {
        zoomIn();
    }
    if (docxContainer) {
        docxZoom = Math.min(docxZoom + DOCX_ZOOM_STEP, DOCX_MAX_ZOOM);
        docxContainer.style.transform = `scale(${docxZoom})`;
        docxContainer.style.transformOrigin = 'top left';
        updateDocxZoomButtons();
    }
};

zoomOutBtn.onclick = () => {
    const docxContainer = previewContent.querySelector('.docx-wrapper');

    if (previewContent.querySelector('.new-preview-image')) {
        zoomAtPoint(0.7);
    }
    if (previewContent.querySelector('.pdf-pages-container')) {
        zoomOut();
    }else if (docxContainer) {
        docxZoom = Math.max(docxZoom - DOCX_ZOOM_STEP, DOCX_MIN_ZOOM);
        docxContainer.style.transform = `scale(${docxZoom})`;
        docxContainer.style.transformOrigin = 'top left';
        updateDocxZoomButtons();
    }
};

zoomResetBtn.onclick = () => {
    const img = previewContent.querySelector('.new-preview-image');

    if (img) {
        if (img.style.transform.includes('scale')) {
            const scaleMatch = img.style.transform.match(/scale\(([^)]+)\)/);

            if (scaleMatch) {
                const scaleValue = parseFloat(scaleMatch[1]);
                if (scaleValue < 1) {
                    $(".new-preview-zoom-out-btn").attr("disabled", false).css("color", "");
                    img.style.transform = img.style.transform.replace(/scale\([^)]+\)/, 'scale(1)');
                    scale = 1;
                } else {
                    $(".new-preview-zoom-in-btn").attr("disabled", false).css("color", "");
                    fitToContainer(img);
                }
            }
        } else {
            fitToContainer(img);
        }
    }

    if (previewContent.querySelector('.pdf-pages-container')) {
        resetZoomPdf();
    }

    // if (previewContent.querySelector('.docx-wrapper, div.docx-page')) {
    if (previewContent.querySelector('.docx-wrapper')) {
        const docxContainer = previewContent.querySelector('.docx-wrapper');

        docxZoom = 1;
        docxContainer.style.transform = 'scale(1)';
        docxContainer.style.transformOrigin = 'top left';
        updateDocxZoomButtons();
    }
};
// function zoomAtPoint(factor) {
//     const img = previewContent.querySelector('.new-preview-image');
//     if (!img) return;

//     const newScale = scale * factor;

//     // Prevent zooming out beyond fit or zooming in beyond 5x
//     if (newScale < initialFitScale || newScale > initialFitScale * 5) return;

//     const rect = contentBox.getBoundingClientRect();
//     const centerX = rect.width / 2;
//     const centerY = rect.height / 2;

//     // Zoom relative to center
//     translateX = translateX * factor;
//     translateY = translateY * factor;
//     scale = newScale;

//     updateTransform(img);
// }
function zoomAtPoint(factor) {
    const img = previewContent.querySelector('.new-preview-image');
    if (!img) return;

    const newScale = scale * factor;
    if (newScale > initialFitScale * 40) {
        $(".new-preview-zoom-in-btn").attr("disabled", true).css("color", "#d4d4d4");
        $(".new-preview-zoom-out-btn").attr("disabled", false).css("color", "");
        $(".new-preview-zoom-reset-btn svg").replaceWith(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zoom-in"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`);
    } else {
        $(".new-preview-zoom-in-btn").attr("disabled", false).css("color", "");
        $(".new-preview-zoom-reset-btn svg").replaceWith(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zoom-out">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
          </svg>`);
    }
    if (newScale > initialFitScale * 40) return;

    if (factor < 1 && newScale < initialFitScale) {
        scale = initialFitScale;
        translateX = 0;
        translateY = 0;
        updateTransform(img);
        return;
    }

    const rect = contentBox.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Zoom relative to center
    translateX = translateX * factor;
    translateY = translateY * factor;
    scale = newScale;

    updateTransform(img);
}

// Wheel zoom
contentBox.onwheel = (e) => {

    const img = previewContent.querySelector('.new-preview-image');
    if (!img) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.25 : 0.8;
    const newScale = scale * factor;
    // Prevent zooming out beyond fit
    if (newScale < initialFitScale) {
        fitToContainer(img);
        return;
    }
    if (newScale > initialFitScale * 40) {
        $(".new-preview-zoom-in-btn").attr("disabled", true).css("color", "#d4d4d4");
        $(".new-preview-zoom-out-btn").attr("disabled", false).css("color", "");
        $(".new-preview-zoom-reset-btn svg").replaceWith(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zoom-in"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`);
    } else {
        $(".new-preview-zoom-reset-btn svg").replaceWith(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zoom-out">
  <circle cx="11" cy="11" r="8"></circle>
  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  <line x1="8" y1="11" x2="14" y2="11"></line>
  <line x1="11" y1="8" x2="11" y2="14"></line>
</svg>`);
        $(".new-preview-zoom-in-btn").attr("disabled", false).css("color", "");
    }
    // Prevent zooming in too much
    if (newScale > initialFitScale * 40) return;

    const rect = contentBox.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const offsetX = x - rect.width / 2;
    const offsetY = y - rect.height / 2;

    translateX = offsetX + (translateX - offsetX) * factor;
    translateY = offsetY + (translateY - offsetY) * factor;
    scale = newScale;

    updateTransform(img);
};

// Drag
contentBox.onmousedown = (e) => {
    const img = previewContent.querySelector('.new-preview-image');
    if (img && scale > initialFitScale) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        contentBox.style.cursor = 'grabbing';
        e.preventDefault();
    }
};

document.onmousemove = (e) => {
    if (isDragging) {
        const img = previewContent.querySelector('.new-preview-image');
        if (!img) return;

        let newTranslateX = e.clientX - startX;
        let newTranslateY = e.clientY - startY;

        const containerRect = contentBox.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();

        const scaledWidth = imgRect.width;
        const scaledHeight = imgRect.height;

        const maxTranslateX = (scaledWidth - containerRect.width) / 2;
        const maxTranslateY = (scaledHeight - containerRect.height) / 2;

        if (scaledWidth > containerRect.width) {
            newTranslateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, newTranslateX));
        } else {
            newTranslateX = 0;
        }

        if (scaledHeight > containerRect.height) {
            newTranslateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, newTranslateY));
        } else {
            newTranslateY = 0;
        }

        translateX = newTranslateX;
        translateY = newTranslateY;
        updateTransform(img);
    }
};

document.onmouseup = () => {
    if (isDragging) {
        isDragging = false;
        const img = previewContent.querySelector('.new-preview-image');
        if (img && scale > initialFitScale) {
            contentBox.style.cursor = 'grab';
        } else {
            contentBox.style.cursor = 'default';
        }
    }
};

contentBox.ondblclick = () => {
    const img = previewContent.querySelector('.new-preview-image');
    if (img) {
        fitToContainer(img);
    }
};

// Close
closeBtns.forEach(btn => btn.addEventListener('click', () => modal.classList.remove('active')));
modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
});
