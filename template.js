const JSON = require('JSON');
const sendHttpRequest = require('sendHttpRequest');
const getContainerVersion = require('getContainerVersion');
const logToConsole = require('logToConsole');
const getRequestHeader = require('getRequestHeader');
const encodeUriComponent = require('encodeUriComponent');
const getGoogleAuth = require('getGoogleAuth');

/*==============================================================================
==============================================================================*/

const traceId = getRequestHeader('trace-id');

const useOptimisticScenario = isUIFieldTrue(data.useOptimisticScenario);

const spreadsheetId = getSpreadsheetId(data);
const sheetRange = getSheetRange(data);
let method = data.type === 'add' ? 'POST' : 'PUT';
const postBody = getData();
const postUrl = getUrl();

if (data.authFlow === 'stape') {
  method = 'POST';
  sendStapeApiRequest();
} else {
  sendStoreRequest();
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
  const sheetName = data.sheetName ? "'" + data.sheetName + "'!" : '';
  return sheetName + data.rows;
}

function getUrl() {
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

  return (
    'https://content-sheets.googleapis.com/v4/spreadsheets/' +
    spreadsheetId +
    '/values/' +
    enc(sheetRange) +
    (data.type === 'add' ? ':append' : '') +
    '?includeValuesInResponse=true&valueInputOption=RAW&alt=json'
  );
}

function getData() {
  const mappedData = [];

  if (data.dataList) {
    data.dataList.forEach((d) => {
      mappedData.push(d.value);
    });
  }

  if (data.authFlow == 'stape') {
    return {
      spreadsheetId: spreadsheetId,
      range: enc(sheetRange),
      type: data.type === 'add' ? 'add' : 'edit',
      values: [mappedData]
    };
  }

  return {
    values: [mappedData]
  };
}

function sendStapeApiRequest() {
  log({
    Name: 'Spreadsheet',
    Type: 'Request',
    TraceId: traceId,
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
        TraceId: traceId,
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

function sendStoreRequest() {
  log({
    Name: 'Spreadsheet',
    Type: 'Request',
    TraceId: traceId,
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
        TraceId: traceId,
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
        TraceId: traceId,
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
  return encodeUriComponent(data || '');
}

function isUIFieldTrue(field) {
  return [true, 'true'].indexOf(field) !== -1;
}

function log(rawDataToLog) {
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
