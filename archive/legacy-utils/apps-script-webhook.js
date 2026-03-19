// ============================================
// TM Energy — Access Log Webhook
// Google Apps Script — paste in Sheet script editor
// ============================================
// SETUP:
// 1. Open "TM Energy — Access Log" Google Sheet
// 2. Extensions → Apps Script
// 3. Paste this entire code (replace default code)
// 4. Click Deploy → New Deployment
// 5. Type: Web App
// 6. Execute as: Me
// 7. Who has access: Anyone
// 8. Deploy → Copy the URL
// 9. Paste URL in auth.js (TM_LOG_URL)
// ============================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');

    // If header row is missing, add it
    if (sheet.getRange('A1').getValue() !== 'Name') {
      sheet.getRange('A1:E1').setValues([['Name', 'Page', 'Time (IST)', 'Device', 'IP']]);
      sheet.getRange('A1:E1').setFontWeight('bold');
    }

    // Convert to Israel time
    var time = new Date(data.time);
    var istTime = Utilities.formatDate(time, 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm:ss');

    // Append row
    sheet.appendRow([
      data.name || 'Unknown',
      data.page || '',
      istTime,
      (data.ua || '').substring(0, 60),
      ''
    ]);

    // Send email notification to Kaniel
    var subject = 'TM Energy — ' + (data.name || '?') + ' נכנס/ה';
    var body = 'שם: ' + data.name + '\n'
             + 'דף: ' + data.page + '\n'
             + 'זמן: ' + istTime + '\n'
             + 'מכשיר: ' + (data.ua || '').substring(0, 60);

    GmailApp.sendEmail('k@kanielt.com', subject, body);

    return ContentService.createTextOutput(JSON.stringify({ok: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput('TM Energy Webhook Active')
    .setMimeType(ContentService.MimeType.TEXT);
}

// Test function — run manually to verify
function testWebhook() {
  var testData = {
    postData: {
      contents: JSON.stringify({
        name: 'Test',
        page: 'Test Page',
        time: new Date().toISOString(),
        ua: 'Manual Test'
      })
    }
  };
  doPost(testData);
  Logger.log('Test entry added to sheet + email sent');
}
