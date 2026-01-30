const JSON = require('JSON');
const sendHttpRequest = require('sendHttpRequest');
const getContainerVersion = require('getContainerVersion');
const logToConsole = require('logToConsole');
const getRequestHeader = require('getRequestHeader');
const encodeUriComponent = require('encodeUriComponent');
const getGoogleAuth = require('getGoogleAuth');
const getType = require('getType');
const makeString = require('makeString');

/*==============================================================================
==============================================================================*/

const useOptimisticScenario = isUIFieldTrue(data.useOptimisticScenario);

const spreadsheetId = getSpreadsheetId(data);
const sheetRange = getSheetRange(data);
const postBody = getData(data);
const postUrl = getUrl(data);

if (data.authFlow === 'stape') {
  const method = 'POST';
  sendStapeApiRequest(postUrl, postBody, method);
} else {
  const method = data.type === 'add' ? 'POST' : 'PUT';
  sendStoreRequest(postUrl, postBody, method);
}

if (useOptimisticScenario) {
  return data.gtmOnSuccess();
}

/*==============================================================================
  Vendor related functions
==============================================================================*/

function getSpreadsheetId(data) {
  return data.url.replace('https://docs.google.com/spreadsheets/d/', '').split('/')[0];
}

function getSheetRange(data) {
  return data.sheetName ? "'" + data.sheetName + "'!" + data.rows : data.rows;
}

function getUrl(data) {
  if (data.authFlow == 'stape') {
    const containerIdentifier = getRequestHeader('x-gtm-identifier');
    const defaultDomain = getRequestHeader('x-gtm-default-domain');
    const containerApiKey = getRequestHeader('x-gtm-api-key');

    return (
      'https://' +
      enc(containerIdentifier) +
      '.' +
      enc(defaultDomain) +
      '/stape-api/' +
      enc(containerApiKey) +
      '/v1/spreadsheet/auth-proxy'
    );
  }

  const forceNewRow =
    data.type === 'add' && data.insertDataOption ? '&insertDataOption=INSERT_ROWS' : '';
  return (
    'https://content-sheets.googleapis.com/v4/spreadsheets/' +
    spreadsheetId +
    '/values/' +
    enc(sheetRange) +
    (data.type === 'add' ? ':append' : '') +
    '?includeValuesInResponse=true&valueInputOption=RAW&alt=json' +
    forceNewRow
  );
}

function getData(data) {
  const mappedData = [];

  if (data.dataList) {
    data.dataList.forEach((d) => {
      mappedData.push(d.value);
    });
  }

  if (data.authFlow === 'stape') {
    const forceNewRow = data.type === 'add' && data.insertDataOption ? 'INSERT_ROWS' : undefined;
    return {
      spreadsheetId: spreadsheetId,
      range: enc(sheetRange),
      type: data.type === 'add' ? 'add' : 'edit',
      values: [mappedData],
      majorDimension: data.majorDimension,
      insertDataOption: forceNewRow
    };
  }

  return {
    values: [mappedData],
    majorDimension: data.majorDimension
  };
}

function sendStapeApiRequest(postUrl, postBody, method) {
  log({
    Name: 'Spreadsheet',
    Type: 'Request',
    EventName: data.type,
    RequestMethod: method,
    RequestUrl: postUrl,
    RequestBody: postBody
  });

  sendHttpRequest(
    postUrl,
    (statusCode, headers, body) => {
      log({
        Name: 'Spreadsheet',
        Type: 'Response',
        EventName: data.type,
        ResponseStatusCode: statusCode,
        ResponseHeaders: headers,
        ResponseBody: body,
        method: method
      });

      if (!useOptimisticScenario) {
        if (statusCode >= 200 && statusCode < 400) {
          data.gtmOnSuccess();
        } else {
          data.gtmOnFailure();
        }
      }
    },
    { headers: { 'Content-Type': 'application/json' }, method: method },
    JSON.stringify(postBody)
  );
}

function sendStoreRequest(postUrl, postBody, method) {
  log({
    Name: 'Spreadsheet',
    Type: 'Request',
    EventName: data.type,
    RequestMethod: method,
    RequestUrl: postUrl,
    RequestBody: postBody
  });

  const auth = getGoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  sendHttpRequest(
    postUrl,
    { headers: { 'Content-Type': 'application/json' }, authorization: auth, method: method },
    JSON.stringify(postBody)
  )
    .then((result) => {
      log({
        Name: 'Spreadsheet',
        Type: 'Response',
        EventName: data.type,
        ResponseStatusCode: result.statusCode,
        ResponseHeaders: result.headers,
        ResponseBody: result.body
      });

      if (!useOptimisticScenario) {
        if (result.statusCode >= 200 && result.statusCode < 400) {
          data.gtmOnSuccess();
        } else {
          data.gtmOnFailure();
        }
      }
    })
    .catch((result) => {
      log({
        Name: 'Spreadsheet',
        Type: 'Message',
        EventName: data.type,
        Message: 'The request failed or timed out.',
        Reason: JSON.stringify(result)
      });

      if (!useOptimisticScenario) data.gtmOnFailure();
    });
}

/*==============================================================================
  Helpers
==============================================================================*/

function enc(data) {
  if (['null', 'undefined'].indexOf(getType(data)) !== -1) data = '';
  return encodeUriComponent(makeString(data));
}

function isUIFieldTrue(field) {
  return [true, 'true'].indexOf(field) !== -1;
}

function log(rawDataToLog) {
  rawDataToLog.TraceId = getRequestHeader('trace-id');
  if (determinateIsLoggingEnabled()) logConsole(rawDataToLog);
}

function logConsole(dataToLog) {
  logToConsole(JSON.stringify(dataToLog));
}

function determinateIsLoggingEnabled() {
  const containerVersion = getContainerVersion();
  const isDebug = !!(
    containerVersion &&
    (containerVersion.debugMode || containerVersion.previewMode)
  );

  if (!data.logType) {
    return isDebug;
  }

  if (data.logType === 'no') {
    return false;
  }

  if (data.logType === 'debug') {
    return isDebug;
  }

  return data.logType === 'always';
}
