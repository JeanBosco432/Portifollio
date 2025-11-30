// === CONFIG ===
const NOTION_TOKEN = "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"; 
const NOTION_DATABASE_ID = "2b1e62d0d5e6806badd8cd85ba5f7dd7"; 
const BACKUP_SHEET_NAME = "Backup"; // feuille pour stocker l'ancien état du sheet

// === FONCTION PRINCIPALE ===
function syncSheetToNotion() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    if (!sheet) throw new Error("Feuille active introuvable.");
    
    // Lecture des données
    const allValues = sheet.getDataRange().getValues();
    if (allValues.length < 2) return Logger.log("Aucune donnée.");
    const headers = allValues[0].map(h => (h||"").toString().trim());
    const notionCol = headers.indexOf("NotionPageID");
    if (notionCol === -1) throw new Error("Colonne 'NotionPageID' introuvable.");
    
    // Lecture du backup
    let backupSheet = ss.getSheetByName(BACKUP_SHEET_NAME);
    if (!backupSheet) backupSheet = ss.insertSheet(BACKUP_SHEET_NAME);
    const backupValues = backupSheet.getDataRange().getValues();
    
    // Créer dictionnaire backup pour comparer facilement
    const backupMap = {};
    if (backupValues.length > 1) {
        const bHeaders = backupValues[0];
        for (let r=1; r<backupValues.length; r++) {
            const row = backupValues[r];
            const id = row[notionCol];
            if (id) backupMap[id] = row;
        }
    }
    
    for (let r = 1; r < allValues.length; r++) {
        const row = allValues[r];
        const notionId = row[notionCol];
        const isEmptyRow = row.every((v,i)=> i!==notionCol ? !v || v.toString().trim()==="" : true);
        
        if (!notionId && !isEmptyRow) {
            // 1️⃣Création nouvelle page Notion
            createNotionPage(row, headers, sheet, r, notionCol);
        } else if (notionId) {
            if (isEmptyRow) {
                // 2️⃣Suppression page Notion si ligne effacée
                deleteNotionPage(notionId);
                sheet.getRange(r+1, notionCol+1).setValue(""); // nettoyer colonne
            } else {
                // 3️⃣Mise à jour si ligne modifiée
                const backupRow = backupMap[notionId];
                if (!backupRow || !rowsEqual(row, backupRow)) {
                    updateNotionPage(notionId, row, headers);
                }
            }
        }
    }
    
    // 4️⃣Mettre à jour backup
    backupSheet.clear();
    backupSheet.getRange(1,1,1,headers.length).setValues([headers]);
    backupSheet.getRange(2,1,allValues.length,headers.length).setValues(allValues);
    Logger.log("Synchronisation terminée.");
}

// === FONCTIONS UTILITAIRES ===
function buildNotionPropertiesFromRow(headers,row){
    const props = {};
    for (let i=0;i<headers.length;i++){
        const col = headers[i];
        if (!col || col==="NotionPageID") continue;
        const val = row[i]===null||row[i]===undefined ? "" : String(row[i]);
        if (col.toLowerCase()==="name"){
            props[col] = { title:[{text:{content:val}}] };
        } else {
            props[col] = { rich_text:[{text:{content:val}}] };
        }
    }
    return props;
}

function createNotionPage(row, headers, sheet, r, notionCol){
    const payload = {
        parent:{ database_id: NOTION_DATABASE_ID },
        properties: buildNotionPropertiesFromRow(headers,row)
    };
    const options = {
        method:"post",
        contentType:"application/json",
        headers:{
            "Authorization":"Bearer "+NOTION_TOKEN,
            "Notion-Version":"2022-06-28"
        },
        payload:JSON.stringify(payload),
        muteHttpExceptions:true
    };
    const resp = UrlFetchApp.fetch("https://api.notion.com/v1/pages",options);
    const body = JSON.parse(resp.getContentText());
    if(resp.getResponseCode()>=200 && resp.getResponseCode()<300){
        sheet.getRange(r+1, notionCol+1).setValue(body.id);
        Logger.log(`Création ligne ${r+1} -> Notion page ${body.id}`);
    } else {
        Logger.log(`Erreur création Notion (ligne ${r+1}): ${resp.getContentText()}`);
    }
}

function updateNotionPage(notionId,row,headers){
    const payload = { properties: buildNotionPropertiesFromRow(headers,row) };
    const options = {
        method:"patch",
        contentType:"application/json",
        headers:{
            "Authorization":"Bearer "+NOTION_TOKEN,
            "Notion-Version":"2022-06-28"
        },
        payload:JSON.stringify(payload),
        muteHttpExceptions:true
    };
    const resp = UrlFetchApp.fetch(`https://api.notion.com/v1/pages/${notionId}`,options);
    if(resp.getResponseCode()>=200 && resp.getResponseCode()<300){
        Logger.log(`Mise à jour Notion page ${notionId}`);
    } else {
        Logger.log(`Erreur update Notion ${notionId}: ${resp.getContentText()}`);
    }
}

function deleteNotionPage(notionId){
    const options = {
        method:"patch",
        contentType:"application/json",
        headers:{
            "Authorization":"Bearer "+NOTION_TOKEN,
            "Notion-Version":"2022-06-28"
        },
        payload:JSON.stringify({ archived:true }),
        muteHttpExceptions:true
    };
    const resp = UrlFetchApp.fetch(`https://api.notion.com/v1/pages/${notionId}`,options);
    if(resp.getResponseCode()>=200 && resp.getResponseCode()<300){
        Logger.log(`Page Notion ${notionId} archivée`);
    } else {
        Logger.log(`Erreur suppression Notion ${notionId}: ${resp.getContentText()}`);
    }
}

function rowsEqual(row1,row2){
    if(!row1 || !row2 || row1.length!==row2.length) return false;
    for(let i=0;i<row1.length;i++){
        if(row1[i]!==row2[i]) return false;
    }
    return true;
}