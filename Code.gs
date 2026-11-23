// ═════════════════════════════════════════════════════════════════════
// BRANDEX LAW ASSOCIATES — FULL MAILMERGE + WEB FORM HANDLER
// Single Consolidated Code.gs — Complete Backend Script
// 
// HOW TO FIX: "Specified permissions are not sufficient to call DocumentApp.openById"
// 1. In Apps Script Editor, go to Project Settings (⚙️) on the left.
//    Check "Show 'appsscript.json' manifest file in editor".
// 2. Click the editor (< >) and make sure "appsscript.json" has:
//    "oauthScopes": [
//      "https://www.googleapis.com/auth/documents",
//      "https://www.googleapis.com/auth/drive"
//    ]
// 3. Select function "authorizeScript" in the toolbar dropdown and click "Run".
//    Google will prompt "Authorization required". Click:
//    Review permissions -> Select account -> Advanced -> Go to ... (unsafe) -> Allow.
// 4. CRITICAL: Deploy -> Manage deployments -> Click the Edit (pencil) icon.
//    Under Version, select "New version" -> Click "Deploy".
//    (If you do not select "New version", the old deployment without permissions remains active!)
// ═════════════════════════════════════════════════════════════════════

/** Run this function to authorize Google Docs and Drive document generation. */
function authorizeScript() {
  Logger.log("Testing permissions for DocumentApp and DriveApp...");
  try {
    var user = Session.getActiveUser().getEmail();
    Logger.log("Active User: " + user);
    var doc = DocumentApp.create("Brandex_Permission_Check_Temp");
    var docId = doc.getId();
    doc.getBody().setText("Brandex Law Associates Permission Authorization Test OK");
    doc.saveAndClose();
    DriveApp.getFileById(docId).setTrashed(true);
    Logger.log("✅ DocumentApp & DriveApp permissions authorized successfully!");
  } catch (err) {
    Logger.log("❌ Error during authorization check: " + err.message);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────
// 🌐 WEB APP ENDPOINTS (doGet & doPost)
// ─────────────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
    if (action === "getRecords") {
      return jsonResponse({ ok: false, error: "Authentication required" });
    }
    return jsonResponse({
      ok: true,
      message: "Brandex MailMerge backend is live."
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || "{}");

    if (!isAuthorizedBackendRequest(body)) {
      return jsonResponse({ ok: false, error: "Authentication required" });
    }

    if (body.action === "validateDriveFolder") {
      return jsonResponse(validateDriveFolder(body.folderId));
    }
    if (body.action === "exportBackupAsset") {
      return jsonResponse(exportBackupAsset(body.fileId));
    }
    if (body.action === "generateFromForm") {
      var result = processFormSubmission(body);
      return jsonResponse({
        ok: true,
        serialNo: result.serialNo,
        folderUrl: result.folderUrl,
        tm1Url: result.tm1Url,
        tm48Url: result.tm48Url,
        attachments: result.attachments || [],
        imageWarning: result.imageWarning || ""
      });
    }

    return jsonResponse({ ok: false, error: "Unknown action" });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

function isAuthorizedBackendRequest(body) {
  var expectedToken = PropertiesService.getScriptProperties().getProperty("RECORDS_ACCESS_TOKEN");
  return Boolean(expectedToken && body && body.accessToken && body.accessToken === expectedToken);
}

function validateDriveFolder(folderId) {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(String(folderId || ''))) throw new Error('Invalid Drive folder ID');
  var folder = DriveApp.getFolderById(folderId);
  if (folder.isTrashed()) throw new Error('Selected folder is in trash');
  var permission = folder.getAccess(Session.getEffectiveUser().getEmail());
  if (permission !== DriveApp.Permission.EDIT && permission !== DriveApp.Permission.OWNER) throw new Error('The generation account needs editor access to the selected folder');
  return { ok: true, folderId: folder.getId(), name: folder.getName(), url: folder.getUrl() };
}

function exportBackupAsset(fileId) {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(String(fileId || ''))) throw new Error('Invalid Drive file ID');
  var file = DriveApp.getFileById(fileId);
  if (file.isTrashed()) throw new Error('Drive file is in trash');
  if (file.getSize() > 8 * 1024 * 1024) throw new Error('Drive file exceeds backup byte limit');
  var mime = file.getMimeType();
  var formats = {
    'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  };
  var blob;
  if (formats[mime]) {
    var response = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '/export?mimeType=' + encodeURIComponent(formats[mime]), {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true
    });
    if (response.getResponseCode() !== 200) throw new Error('Google Workspace file export failed');
    blob = response.getBlob().setContentType(formats[mime]);
  } else {
    if (mime.indexOf('application/vnd.google-apps.') === 0) throw new Error('Unsupported native Google file type');
    blob = file.getBlob();
  }
  var bytes = blob.getBytes();
  if (bytes.length > 8 * 1024 * 1024) throw new Error('Exported file exceeds backup byte limit');
  var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes).map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
  return { ok: true, name: file.getName(), originalMimeType: mime, dataUrl: 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(bytes), sha256: hash };
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────────────────────────────
// ⚙️ CONFIG — SINGLE SOURCE OF TRUTH
// ─────────────────────────────────────────────────────────────────────
var MAIN_FOLDER_ID   = "1R-cQ1qYLat0DlnYKs699kXBX0zr7BZDP"; // Drive MAIN folder ID
var TM1_TEMPLATE_ID  = "1STwQUmtknPf1TcWuK1YtEib1ZWiM1yN3tyILlVGwglg"; // TM-1 Google Doc template ID
var TM48_TEMPLATE_ID = "1HyQyz-_tMFIy1X1bH0-sAToZmE2QJL5NFhGUwI_vLgE"; // TM-48 Google Doc template ID

// ─────────────────────────────────────────────────────────────────────
// CLASS & CONSULTANT MASTER DATA
// ─────────────────────────────────────────────────────────────────────
var CLASS_DATA = [
  {n:1,type:'GOODS',desc:'Chemicals for use in industry, science and photography, as well as in agriculture, horticulture and forestry; unprocessed artificial resins, unprocessed plastics; fire extinguishing and fire prevention compositions; tempering and soldering preparations; substances for tanning animal skins and hides; adhesives for use in industry; putties and other paste fillers; compost, manures, fertilizers; biological preparations for use in industry and science.'},
  {n:2,type:'GOODS',desc:'Paints, varnishes, lacquers; preservatives against rust and against deterioration of wood; colorants, dyes; inks for printing, marking and engraving; raw natural resins; metals in foil and powder form for use in painting, decorating, printing and art.'},
  {n:3,type:'GOODS',desc:'Non-medicated cosmetics and toiletry preparations; non-medicated dentifrices; perfumery, essential oils; bleaching preparations and other substances for laundry use; cleaning, polishing and abrasive preparations.'},
  {n:4,type:'GOODS',desc:'Industrial oils and greases, wax; lubricants; dust absorbing, wetting and binding compositions; fuels and illuminants; candles and wicks for lighting.'},
  {n:5,type:'GOODS',desc:'Pharmaceuticals, medical and veterinary preparations; sanitary preparations for medical purposes; dietetic food and substances adapted for medical or veterinary use, food for babies; dietary supplements for human beings and animals; plasters, materials for dressings; material for stopping teeth, dental wax; disinfectants; preparations for destroying vermin; fungicides, herbicides.'},
  {n:6,type:'GOODS',desc:'Common metals and their alloys, ores; metal materials for building and construction; transportable buildings of metal; non-electric cables and wires of common metal; small items of metal hardware; metal containers for storage or transport; safes.'},
  {n:7,type:'GOODS',desc:'Machines, machine tools, power-operated tools; motors and engines, except for land vehicles; machine coupling and transmission components, except for land vehicles; agricultural implements, other than hand-operated hand tools; incubators for eggs; automatic vending machines.'},
  {n:8,type:'GOODS',desc:'Hand tools and implements, hand-operated; cutlery; side arms, except firearms; razors.'},
  {n:9,type:'GOODS',desc:'Scientific, research, navigation, surveying, photographic, cinematographic, audiovisual, optical, weighing, measuring, signalling, detecting, testing, inspecting, life-saving and teaching apparatus and instruments; apparatus and instruments for conducting, switching, transforming, accumulating, regulating or controlling the distribution or use of electricity; apparatus and instruments for recording, transmitting, reproducing or processing sound, images or data; recorded and downloadable media, computer software, blank digital or analogue recording and storage media; mechanisms for coin-operated apparatus; cash registers, calculating devices; computers and computer peripheral devices; diving suits, divers\' masks, ear plugs for divers, nose clips for divers and swimmers, gloves for divers, breathing apparatus for underwater swimming; fire-extinguishing apparatus.'},
  {n:10,type:'GOODS',desc:'Surgical, medical, dental and veterinary apparatus and instruments; artificial limbs, eyes and teeth; orthopaedic articles; suture materials; therapeutic and assistive devices adapted for persons with disabilities; massage apparatus; apparatus, devices and articles for nursing infants; sexual activity apparatus, devices and articles.'},
  {n:11,type:'GOODS',desc:'Apparatus and installations for lighting, heating, cooling, steam generating, cooking, drying, ventilating, water supply and sanitary purposes.'},
  {n:12,type:'GOODS',desc:'Vehicles; apparatus for locomotion by land, air or water.'},
  {n:13,type:'GOODS',desc:'Firearms; ammunition and projectiles; explosives; fireworks.'},
  {n:14,type:'GOODS',desc:'Precious metals and their alloys; jewellery, precious and semi-precious stones; horological and chronometric instruments.'},
  {n:15,type:'GOODS',desc:'Musical instruments; music stands and stands for musical instruments; conductors\' batons.'},
  {n:16,type:'GOODS',desc:'Paper and cardboard; printed matter; bookbinding material; photographs; stationery and office requisites, except furniture; adhesives for stationery or household purposes; drawing materials and materials for artists; paintbrushes; instructional and teaching materials; plastic sheets, films and bags for wrapping and packaging; printers\' type, printing blocks.'},
  {n:17,type:'GOODS',desc:'Unprocessed and semi-processed rubber, gutta-percha, gum, asbestos, mica and substitutes for all these materials; plastics and resins in extruded form for use in manufacture; packing, stopping and insulating materials; flexible pipes, tubes and hoses, not of metal.'},
  {n:18,type:'GOODS',desc:'Leather and imitations of leather; animal skins and hides; luggage and carrying bags; umbrellas and parasols; walking sticks; whips, harness and saddlery; collars, leashes and clothing for animals.'},
  {n:19,type:'GOODS',desc:'Materials, not of metal, for building and construction; rigid pipes, not of metal, for building; asphalt, pitch, tar and bitumen; transportable buildings, not of metal; monuments, not of metal.'},
  {n:20,type:'GOODS',desc:'Furniture, mirrors, picture frames; containers, not of metal, for storage or transport; unworked or semi-worked bone, horn, whalebone or mother-of-pearl; shells; meerschaum; yellow amber.'},
  {n:21,type:'GOODS',desc:'Household or kitchen utensils and containers; cookware and tableware, except forks, knives and spoons; combs and sponges; brushes, except paintbrushes; brush-making materials; articles for cleaning purposes; unworked or semi-worked glass, except building glass; glassware, porcelain and earthenware.'},
  {n:22,type:'GOODS',desc:'Ropes and string; nets; tents and tarpaulins; awnings of textile or synthetic materials; sails; sacks for the transport and storage of materials in bulk; padding, cushioning and stuffing materials, except of paper, cardboard, rubber or plastics; raw fibrous textile materials and substitutes therefor.'},
  {n:23,type:'GOODS',desc:'Yarns and threads for textile use.'},
  {n:24,type:'GOODS',desc:'Textiles and substitutes for textiles; household linen; curtains of textile or plastic.'},
  {n:25,type:'GOODS',desc:'Clothing, footwear, headwear.'},
  {n:26,type:'GOODS',desc:'Lace, braid and embroidery, and haberdashery ribbons and bows; buttons, hooks and eyes, pins and needles; artificial flowers; hair decorations; false hair.'},
  {n:27,type:'GOODS',desc:'Carpets, rugs, mats and matting, linoleum and other materials for covering existing floors; wall hangings, not of textile.'},
  {n:28,type:'GOODS',desc:'Games, toys and playthings; video game apparatus; gymnastic and sporting articles; decorations for Christmas trees.'},
  {n:29,type:'GOODS',desc:'Meat, fish, poultry and game; meat extracts; preserved, frozen, dried and cooked fruits and vegetables; jellies, jams, compotes; eggs; milk, cheese, butter, yogurt and other milk products; oils and fats for food.'},
  {n:30,type:'GOODS',desc:'Coffee, tea, cocoa and substitutes therefor; rice, pasta and noodles; tapioca and sago; flour and preparations made from cereals; bread, pastries and confectionery; chocolate; ice cream, sorbets and other edible ices; sugar, honey, treacle; yeast, baking powder; salt, seasonings, spices, preserved herbs; vinegar, sauces and other condiments; ice (frozen water).'},
  {n:31,type:'GOODS',desc:'Raw and unprocessed agricultural, aquacultural, horticultural and forestry products; raw and unprocessed grains and seeds; fresh fruits and vegetables, fresh herbs; natural plants and flowers; bulbs, seedlings and seeds for planting; live animals; foodstuffs and beverages for animals; malt.'},
  {n:32,type:'GOODS',desc:'Beers; non-alcoholic beverages; mineral and aerated waters; fruit beverages and fruit juices; syrups and other preparations for making non-alcoholic beverages.'},
  {n:33,type:'GOODS',desc:'Alcoholic beverages, except beers; alcoholic preparations for making beverages.'},
  {n:34,type:'GOODS',desc:'Tobacco and tobacco substitutes; cigarettes and cigars; electronic cigarettes and oral vaporizers for smokers; smokers\' articles; matches.'},
  {n:35,type:'SERVICES',desc:'Advertising; business management, organization and administration; office functions.'},
  {n:36,type:'SERVICES',desc:'Financial, monetary and banking services; insurance services; real estate services.'},
  {n:37,type:'SERVICES',desc:'Construction services; installation and repair services; mining extraction, oil and gas drilling.'},
  {n:38,type:'SERVICES',desc:'Telecommunications services.'},
  {n:39,type:'SERVICES',desc:'Transport; packaging and storage of goods; travel arrangement.'},
  {n:40,type:'SERVICES',desc:'Treatment of materials; recycling of waste and trash; air purification and treatment of water; printing services; food and drink preservation.'},
  {n:41,type:'SERVICES',desc:'Education; providing of training; entertainment; sporting and cultural activities.'},
  {n:42,type:'SERVICES',desc:'Scientific and technological services and research and design relating thereto; industrial analysis, industrial research and industrial design services; quality control and authentication services; design and development of computer hardware and software.'},
  {n:43,type:'SERVICES',desc:'Services for providing food and drink; temporary accommodation.'},
  {n:44,type:'SERVICES',desc:'Medical services; veterinary services; hygienic and beauty care for human beings or animals; agriculture, aquaculture, horticulture and forestry services.'},
  {n:45,type:'SERVICES',desc:'Legal services; security services for the physical protection of tangible property and individuals; dating services, online social networking services; funerary services; babysitting.'}
];

var CONSULTANT_DATA = [
  {name:"JAN ONLINE SERVICES/ÀDISTAAN", addr:"OPPOSITE GRASSY GROUND, SAIDU SHARIF, SWAT CELL # 0307-9118062, 0343-9832412"},
  {name:"BRANDEX LAW ASSOCIATES", addr:"DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004"},
  {name:"ABID ALI & CO", addr:"PROPERTY NO.1284, CHOWK FAROOQ-E-AZAM, COLONY NO.1, KHANEWAL 03006339721"},
  {name:"A2Z CONSULTANTS", addr:"DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004"},
  {name:"AZIZ LAW ASSOCIATES", addr:"OFFICE NO 1, AL-GHURAIR GIGA PAKISTAN (PVT LTD), DHA 2, ISLAMABAD"},
  {name:"TAX & FINANCE CONSULTANT", addr:"OFFICE # FF-275 & FF-183, DEANS TRADE CENTER OPPOSITE STATE BANK PESHAWAR CANTT CELL # 03149090397, 03349027935"},
  {name:"BRAND EXPERTS (PVT.) LIMITED", addr:"OFFICE NO 06-07,1ST FLOOR, WALAYAT PLAZA REHMANABAD, MURREE ROAD, RAWALPINDI PHONE # 051-4932363"},
  {name:"SHEIKH LAW ASSOCIATES", addr:"DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # +92 303 2200723"},
  {name:"M. TARIQ SHAIKH LAW FIRM", addr:"DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004"},
  {name:"CONSULTANCYFIN", addr:"FLAT # D905, GREY NOOR TOWER, SCHEME 33, KARACHI"},
  {name:"SOLUTION LEGACY", addr:"F-173/2. MARTIN ROAD KARACHI PH +92 335 4522225"},
  {name:"S.A.T.H CONSULTANTS", addr:"DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004"},
  {name:"BADAR CONSULTANTS", addr:"OPPOSITE GRASSY GROUND, SAIDU SHARIF, SWAT CELL # 0307-9118062, 0343-9832412"},
  {name:"MS HAFIZ M. ALI WARRAICH", addr:"DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004"},
  {name:"PROTAX ADVISORS", addr:"DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004"},
  {name:"NOOR BAAF LAW ASSOCIATES", addr:"PROPERTY NO.1284, CHOWK FAROOQ-E-AZAM, COLONY NO.1, KHANEWAL 03006339721"},
  {name:"HAFIZ M. ALI WARRAICH", addr:"DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004"},
  {name:"MUHAMMAD ADNAN BIN YOUSAF ASSOCIATES", addr:"DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004"},
  {name:"TAXATIONIST CORPORATE CONSULTANTS", addr:"DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004"}
];

var FILING_PROCESS_OPTIONS = ["APPLICATION FILED", "EXAMINATION / REPLY", "PUBLISHED / DEMAND NOTE", "PAYMENT SUBMITTED / REGISTRATION COMPLETED"];

function generateUniqueSerial() {
  var prefix = "PB-ISB-";
  function makeRandom18() {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var result = "";
    for (var i = 0; i < 18; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  return prefix + makeRandom18();
}

function getOrCreateClientFolder(parentFolder, rawFolderName) {
  var folderName = (rawFolderName || "UNTITLED").toString()
    .replace(/[\\/:*?"<>|]/g, "_").trim();

  var existing = parentFolder.getFoldersByName(folderName);
  if (existing.hasNext()) {
    return existing.next();
  }
  return parentFolder.createFolder(folderName);
}

function saveAdditionalFiles(caseFolder, files, formData) {
  if (!files) return [];
  if (!Array.isArray(files) || files.length > 10) throw new Error("Attach no more than 10 files");

  var allowedTypes = { "application/pdf": true, "image/jpeg": true, "image/png": true };
  var totalBytes = 0;
  var saved = [];
  var caseKey = [formData.clientCode || "UNASSIGNED", formData.selectionMenu || "A", formData.caseNo || "001"]
    .map(function(value) { return String(value).replace(/[^A-Za-z0-9_-]/g, "_"); })
    .join("-");

  files.forEach(function(item) {
    if (!item || !allowedTypes[item.mimeType] || typeof item.name !== "string" || typeof item.dataUrl !== "string") {
      throw new Error("An attachment has an unsupported type or invalid content");
    }
    var match = item.dataUrl.match(/^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/=]+)$/);
    if (!match || match[1] !== item.mimeType) throw new Error("An attachment could not be decoded");

    var bytes = Utilities.base64Decode(match[2]);
    if (bytes.length > 4 * 1024 * 1024) throw new Error("Each attachment must be 4 MB or smaller");
    totalBytes += bytes.length;
    if (totalBytes > 8 * 1024 * 1024) throw new Error("Combined attachments must be 8 MB or smaller");

    var safeOriginalName = item.name.replace(/[\\/:*?"<>|]/g, "_").trim() || "attachment";
    var storedName = caseKey + "_" + safeOriginalName;
    var existing = caseFolder.getFilesByName(storedName);
    var file = existing.hasNext()
      ? existing.next()
      : caseFolder.createFile(Utilities.newBlob(bytes, item.mimeType, storedName));
    saved.push({ name: item.name, mimeType: item.mimeType, size: bytes.length, fileId: file.getId(), url: file.getUrl() });
  });

  return saved;
}

function processFormSubmission(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var serial = data.serialNo || generateUniqueSerial(null);
    var input = Object.assign({}, data, { serialNo: serial });
    var processResult = processRowAndReturnLinks(
      MAIN_FOLDER_ID, TM1_TEMPLATE_ID, TM48_TEMPLATE_ID, input
    );

    return {
      serialNo: serial,
      folderUrl: processResult.folderUrl,
      tm1Url: processResult.tm1Url,
      tm48Url: processResult.tm48Url,
      attachments: processResult.attachments || [],
      imageWarning: processResult.imageWarning
    };
  } catch (procErr) {
    throw procErr;
  } finally {
    lock.releaseLock();
  }
}

function processRowAndReturnLinks(mainFolderId, tm1TemplateId, tm48TemplateId, formData) {
  var rowData = formData;
  if (!rowData.goodsServices) {
    var classNumber = rowData.classNo ? parseInt(String(rowData.classNo).replace(/\D/g, ""), 10) : 0;
    rowData.goodsServices = classNumber >= 1 && classNumber <= 34 ? "GOODS" : "SERVICES";
  }
  if (rowData.date === undefined || !rowData.date) rowData.date = Utilities.formatDate(new Date(), "Asia/Karachi", "EEEE, dd MMMM yyyy");
  validateRequiredData(rowData);

  if (!rowData.serialNo || rowData.serialNo.toString().trim() === "") {
    rowData.serialNo = generateUniqueSerial();
  }
  if (!rowData.date) {
    rowData.date = Utilities.formatDate(new Date(), "Asia/Karachi", "EEEE, dd MMMM yyyy");
  }

  var selectedDestination = Boolean(formData.driveFolderId);
  if (selectedDestination) validateDriveFolder(formData.driveFolderId);
  var parentFolder = DriveApp.getFolderById(selectedDestination ? formData.driveFolderId : mainFolderId);
  var newFolder;
  if (formData && (formData.clientCode || formData.caseNo)) {
    var clientCode = String(formData.clientCode || "000").replace(/\D/g, "").padStart(3, "0");
    var clientPrefix = String(formData.clientPrefix || "A").toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 8) || "A";
    var caseSeries = String(formData.selectionMenu || "A").toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 8) || "A";
    var caseNo = String(formData.caseNo || "001").replace(/\D/g, "").padStart(3, "0");
    var clientName = String(formData.clientName || formData.appName || "CLIENT").toUpperCase().replace(/[\\/:*?"<>|]/g, "_").trim();
    var clientCity = String(formData.clientCity || "").toUpperCase().replace(/[\\/:*?"<>|]/g, "_").trim();
    var clientReference = String(formData.clientFolderReference || "").toUpperCase().replace(/[\\/:*?"<>|]/g, "_").trim();
    var clientFolderName = clientPrefix + "-" + clientCode + " " + clientName
      + (clientCity ? " " + clientCity : "")
      + (clientReference ? " " + clientReference : "");
    var caseIdentity = caseSeries + clientCode + "-" + caseNo;
    var caseFolderName = caseIdentity + " " + String(rowData.folder || "UNTITLED CASE").toUpperCase()
      + (rowData.tm && rowData.tm !== "PENDING" ? " " + rowData.tm : "")
      + (rowData.classNo ? " C" + String(rowData.classNo).replace(/\D/g, "") : "");
    var clientRootName = clientPrefix === "A" ? "2 CONSULTANTS" : "1 ALL CLIENTS";
    var clientRootFolder = selectedDestination ? parentFolder : getOrCreateClientFolder(parentFolder, clientRootName);
    var clientFolder = selectedDestination ? parentFolder : getOrCreateClientFolder(clientRootFolder, clientFolderName);
    newFolder = getOrCreateClientFolder(clientFolder, caseFolderName);
  } else {
    newFolder = getOrCreateClientFolder(parentFolder, rowData.folder);
  }

  var logoFolder = selectedDestination ? getOrCreateClientFolder(newFolder, 'Logo') : newFolder;
  var documentsFolder = selectedDestination ? getOrCreateClientFolder(newFolder, 'Documents') : newFolder;
  if (selectedDestination) getOrCreateClientFolder(newFolder, 'Dispatch');
  var imageId = "";
  var tmImageBlob = null;
  var imageWarning = "";

  if (formData && formData.imageBase64) {
    try {
      var base64 = formData.imageBase64.split(",")[1];
      var bytes  = Utilities.base64Decode(base64);
      var ext = "jpg";
      if (formData.imageMime) {
        if (formData.imageMime.indexOf("png") !== -1) ext = "png";
        else if (formData.imageMime.indexOf("gif") !== -1) ext = "gif";
        else if (formData.imageMime.indexOf("webp") !== -1) ext = "webp";
      }
      var safeName = (rowData.folder || "trademark").toString().replace(/[\\/:*?"<>|]/g, "_").trim();
      var imageFileName = safeName + "_logo." + ext;

      var blob = Utilities.newBlob(bytes, formData.imageMime || "image/jpeg", imageFileName);
      var existingLogo = logoFolder.getFilesByName(imageFileName);
      var file = existingLogo.hasNext() ? existingLogo.next() : logoFolder.createFile(blob);
      imageId = file.getId();
      tmImageBlob = blob;

      Logger.log("Image saved in folder: " + newFolder.getName() + " | File: " + imageFileName);
    } catch (imgErr) {
      imageWarning = "Image upload warning: " + imgErr;
      Logger.log("Image upload warning: " + imgErr);
    }
  } else if (rowData.img) {
    imageId = rowData.img;
    tmImageBlob = getImageFromDriveId(rowData.img);
  }

  var mergeData = buildCanonicalMergeData(rowData);

  var tm1Doc = null, tm48Doc = null;
  if (tm1TemplateId) {
    tm1Doc = generateWordDocReturn(tm1TemplateId, documentsFolder, rowData.folder + " - TM-1",
      mergeData, tmImageBlob, "{{IMAGE}}", rowData.noImg, "TM1_TEMPLATE_ID");
  }
  if (tm48TemplateId) {
    tm48Doc = generateWordDocReturn(tm48TemplateId, documentsFolder, rowData.folder + " - TM-48",
      mergeData, tmImageBlob, "{{IMAGE}}", rowData.noImg, "TM48_TEMPLATE_ID");
  }

  var attachments = saveAdditionalFiles(documentsFolder, formData && formData.additionalFiles, formData || {});

  return {
    folderUrl: newFolder.getUrl(),
    tm1Url: tm1Doc ? tm1Doc.getUrl() : null,
    tm48Url: tm48Doc ? tm48Doc.getUrl() : null,
    attachments: attachments,
    imageId: imageId || rowData.img || '',
    imageWarning: imageWarning
  };
}

function generateWordDocReturn(templateId, folder, docName, mergeData, imageBlob, imagePlaceholder, fallbackText, templateLabel) {
  var existing = folder.getFilesByName(docName);
  var doc = existing.hasNext()
    ? existing.next()
    : DriveApp.getFileById(templateId).makeCopy(docName, folder);
  var document = DocumentApp.openById(doc.getId());
  var body = document.getBody();

  for (var key in mergeData) {
    body.replaceText(escapeRegex(key), (mergeData[key] || "").toString());
  }

  if (imageBlob) {
    var inserted = replaceTextWithImage(body, imagePlaceholder, imageBlob);
    if (!inserted) {
      body.replaceText(escapeRegex(imagePlaceholder), fallbackText || "[IMAGE FAILED]");
    }
  } else {
    body.replaceText(escapeRegex(imagePlaceholder), fallbackText || "[NO IMAGE PROVIDED]");
  }

  document.saveAndClose();
  return doc;
}

function validateRequiredData(rowData) {
  var missing = [];
  if (!rowData.folder)  missing.push("mark/folder");
  if (!rowData.classNo) missing.push("class");
  if (!rowData.appType) missing.push("application type");
  if (!rowData.appName) missing.push("applicant");

  if (missing.length > 0) {
    throw new Error("Missing required case fields: " + missing.join(", "));
  }
}

function getImageFromDriveId(imageId) {
  try {
    if (!imageId || imageId.toString().trim() === "") return null;
    var cleanId = imageId.toString().trim();
    if (cleanId.indexOf("drive.google.com") !== -1) {
      var match = cleanId.match(/[-\w]{25,}/);
      if (match) cleanId = match[0];
      else return null;
    }
    var file = DriveApp.getFileById(cleanId);
    var mimeType = file.getMimeType();
    if (!mimeType.startsWith("image/")) return null;
    return file.getBlob();
  } catch (error) {
    Logger.log("getImageFromDriveId error: " + error.toString());
    return null;
  }
}

function generateDocuments(rowData, folder, tm1TemplateId, tm48TemplateId, imageBlob) {
  var mergeData = buildCanonicalMergeData(rowData);

  if (tm1TemplateId) {
    generateWordDoc(tm1TemplateId, folder, rowData.folder + " - TM-1", mergeData, imageBlob, "{{IMAGE}}", rowData.noImg, "TM1_TEMPLATE_ID");
  }
  if (tm48TemplateId) {
    generateWordDoc(tm48TemplateId, folder, rowData.folder + " - TM-48", mergeData, imageBlob, "{{IMAGE}}", rowData.noImg, "TM48_TEMPLATE_ID");
  }
}

function generateWordDoc(templateId, folder, docName, mergeData, imageBlob, imagePlaceholder, fallbackText, templateLabel) {
  var existing = folder.getFilesByName(docName);
  var doc = existing.hasNext()
    ? existing.next()
    : DriveApp.getFileById(templateId).makeCopy(docName, folder);
  var document = DocumentApp.openById(doc.getId());
  var body = document.getBody();

  for (var key in mergeData) {
    body.replaceText(escapeRegex(key), (mergeData[key] || "").toString());
  }

  if (imageBlob) {
    var imageInserted = replaceTextWithImage(body, imagePlaceholder, imageBlob);
    if (!imageInserted) {
      body.replaceText(escapeRegex(imagePlaceholder), fallbackText || "[IMAGE FAILED]");
    }
  } else {
    body.replaceText(escapeRegex(imagePlaceholder), fallbackText || "[NO IMAGE PROVIDED]");
  }

  document.saveAndClose();
}

function replaceTextWithImage(body, placeholder, imageBlob) {
  try {
    var searchResult = body.findText(escapeRegex(placeholder));
    if (!searchResult) return false;

    var textElement = searchResult.getElement();
    var parent      = textElement.getParent();
    var childIndex  = parent.getChildIndex(textElement);

    parent.removeChild(textElement);
    var image = parent.insertInlineImage(childIndex, imageBlob);
    image.setWidth(200);
    image.setHeight(200);
    return true;
  } catch (error) {
    Logger.log("replaceTextWithImage error: " + error.toString());
    return false;
  }
}

function escapeRegex(str) {
  return str.replace(/[{}]/g, "\\$&");
}

// BEGIN GENERATED MERGE CONTRACT
var CASE_MERGE_FIELDS = [{"tag":"SERIAL","api":"serialNo","record":"serialNo","storage":"serial_no"},{"tag":"TM","api":"tm","record":"tm","storage":"trademark_no"},{"tag":"CLASS","api":"classNo","record":"classNo","storage":"class_no"},{"tag":"CLASS_DESC","api":"classDesc","record":"classDesc","storage":"class_desc"},{"tag":"APP_TYPE","api":"appType","record":"appType","storage":"app_type"},{"tag":"APP_NAME","api":"appName","record":"appName","storage":"applicant_name"},{"tag":"APP_SO","api":"appSo","record":"fatherName","storage":"father_name"},{"tag":"APP_CNIC","api":"appCnic","record":"cnic","storage":"cnic"},{"tag":"ISSUE_DATE","api":"issueDate","record":"issueDate","storage":"issue_date"},{"tag":"EXPIRY_DATE","api":"expiryDate","record":"expiryDate","storage":"expiry_date"},{"tag":"APP_TRADE","api":"appTrade","record":"appTrade","storage":"trading_as"},{"tag":"APP_ADD","api":"appAdd","record":"address","storage":"address"},{"tag":"YEAR","api":"year","record":"year","storage":"usage_year"},{"tag":"CON_NAME","api":"conName","record":"conName","storage":"consultant_name"},{"tag":"CON_ADD","api":"conAdd","record":"conAddr","storage":"consultant_addr"},{"tag":"GOODS_SERVICES","api":"goodsServices","record":"goodsServices","storage":"derived from numeric class"},{"tag":"DATE","api":"date","record":"generationDate","storage":"generation timestamp; not CNIC issue_date"},{"tag":"FOLDER","api":"folder","record":"folder","storage":"mark_name"},{"tag":"CLIENT_ID","api":"clientId","record":"clientId","storage":"client_id"},{"tag":"CLIENT_CODE","api":"clientCode","record":"clientCode","storage":"client_code"},{"tag":"CASE_NO","api":"caseNo","record":"caseNo","storage":"case_no"},{"tag":"SERIES","api":"selectionMenu","record":"selectionMenu","storage":"selection_menu"},{"tag":"CATEGORY","api":"category","record":"category","storage":"category"},{"tag":"STATUS","api":"status","record":"status","storage":"status"},{"tag":"LEGAL_STAGE","api":"filingProcess","record":"filingProcess","storage":"filing_process"},{"tag":"TRACKING_ID","api":"trackingId","record":"trackingId","storage":"tracking_id"},{"tag":"NOTES","api":"notes","record":"notes","storage":"notes (decoded)"},{"tag":"NO_IMAGE_TEXT","api":"noImg","record":"noImg","storage":"notes (encoded companion)"},{"tag":"DISPATCH_DATE","api":"dispatchedDate","record":"dispatchedDate","storage":"dispatched_date"},{"tag":"DISPATCH_NOTE","api":"dispatchedNote","record":"dispatchedNote","storage":"dispatched_note"},{"tag":"DELIVERY_DATE","api":"deliveredDate","record":"deliveredDate","storage":"delivered_date"},{"tag":"RECEIVER","api":"receiverName","record":"receiverName","storage":"receiver_name"},{"tag":"CLIENT_PREFIX","api":"clientPrefix","record":"clientPrefix","storage":"clients.client_prefix"},{"tag":"CLIENT_NAME","api":"clientName","record":"clientName","storage":"clients.name"},{"tag":"CLIENT_CITY","api":"clientCity","record":"clientCity","storage":"clients.city"},{"tag":"CLIENT_FOLDER_REFERENCE","api":"clientFolderReference","record":"clientFolderReference","storage":"clients.folder_reference"},{"tag":"DRIVE_FOLDER_ID","api":"driveFolderId","record":"driveFolderId","storage":"drive_folder_id"},{"tag":"RECORD_ID","api":"recordId","record":"id","storage":"id"},{"tag":"LOGO_URL","api":"img","record":"img","storage":"logo_url; IMAGE is the binary placeholder"},{"tag":"DISPATCH_PROOF_URL","api":"dispatchedImage","record":"dispatchedImage","storage":"trademark_documents.file_url"},{"tag":"DISPATCH_PROOF_NAME","api":"dispatchedDocName","record":"dispatchedDocName","storage":"trademark_documents.file_name"},{"tag":"DISPATCH_PROOF_TYPE","api":"dispatchedDocType","record":"dispatchedDocType","storage":"trademark_documents.file_type"},{"tag":"RECEIPT_URL","api":"receiptImage","record":"receiptImage","storage":"receipt_image"},{"tag":"CREATED_AT","api":"createdAt","record":"createdAt","storage":"created_at"},{"tag":"UPDATED_AT","api":"updatedAt","record":"updatedAt","storage":"updated_at"}];
function buildCanonicalMergeData(row) {
  var result = {};
  CASE_MERGE_FIELDS.forEach(function(field) {
    var value = row[field.api];
    if (value === undefined) value = row[field.record];
    result['{{' + field.tag + '}}'] = value === undefined || value === null ? '' : String(value);
  });
  return result;
}
// END GENERATED MERGE CONTRACT
