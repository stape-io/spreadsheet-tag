const BigQuery = require('BigQuery');
const encodeUriComponent = require('encodeUriComponent');
const getAllEventData = require('getAllEventData');
const getContainerVersion = require('getContainerVersion');
const getGoogleAuth = require('getGoogleAuth');
const getRequestHeader = require('getRequestHeader');
const getTimestampMillis = require('getTimestampMillis');
const getType = require('getType');
const JSON = require('JSON');
const logToConsole = require('logToConsole');
const makeString = require('makeString');
const sendHttpRequest = require('sendHttpRequest');

/*==============================================================================
==============================================================================*/
const eventData = getAllEventData();

if (shouldExitEarly(data, eventData)) return;

const useOptimisticScenario = isUIFieldTrue(data.useOptimisticScenario);
const spreadsheetId = getSpreadsheetId(data);
const sheetRange = getSheetRange(data);
const postBody = JSON.stringify(getData(data) || []);
const postUrl = getUrl(data);
const method = data.type === 'add' ? 'POST' : 'PUT';
let requestOptions = {
  headers: { 'Content-Type': 'application/json' },
  method: method
};

if (data.authFlow === 'stape') {
  sendStapeApiRequest(postUrl, requestOptions, postBody);
} else {
  sendGoogleSheetsRequest(postUrl, requestOptions, postBody);
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
  const forceNewRow =
    data.type === 'add' && data.insertDataOption ? '&insertDataOption=INSERT_ROWS' : '';
  const sheetsPath =
    '/v4/spreadsheets/' +
    spreadsheetId +
    '/values/' +
    enc(sheetRange) +
    (data.type === 'add' ? ':append' : '') +
    '?includeValuesInResponse=true&valueInputOption=RAW&alt=json' +
    forceNewRow;

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
      '/v2/spreadsheet?originalPath=' +
      enc(sheetsPath)
    );
  }

  return 'https://content-sheets.googleapis.com' + enc(sheetsPath);
}

function getData(data) {
  let mappedData = [];
  if (data.dataList && data.dataList.length) {
    mappedData = data.dataList.map((d) => d.value) || [];
  }

  return {
    values: [mappedData],
    majorDimension: data.majorDimension
  };
}

function sendStapeApiRequest(postUrl, options, postBody) {
  log({
    Name: 'Spreadsheet',
    Type: 'Request',
    EventName: data.type,
    RequestMethod: options.method,
    RequestUrl: postUrl,
    RequestBody: postBody
  });

  sendHttpRequest(postUrl, options, postBody)
    .then((response) => {
      log({
        Name: 'Spreadsheet',
        Type: 'Response',
        EventName: data.type,
        ResponseStatusCode: response.statusCode,
        ResponseHeaders: response.headers,
        ResponseBody: response.body,
        method: method
      });
      if (!useOptimisticScenario) {
        if (response.statusCode >= 200 && response.statusCode < 400) {
          return data.gtmOnSuccess();
        } else {
          return data.gtmOnFailure();
        }
      }
    })
    .catch((error) => {
      log({
        Name: 'Spreadsheet',
        Type: 'Message',
        EventName: data.type,
        Message: 'The request failed or timed out.',
        Reason: JSON.stringify(error)
      });
      if (!useOptimisticScenario) return data.gtmOnFailure();
    });
}

function sendGoogleSheetsRequest(postUrl, options, postBody) {
  log({
    Name: 'Spreadsheet',
    Type: 'Request',
    EventName: data.type,
    RequestMethod: options.method,
    RequestUrl: postUrl,
    RequestBody: postBody
  });

  const auth = getGoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  options.authorization = auth;

  sendHttpRequest(postUrl, options, postBody)
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
function shouldExitEarly(data, eventData) {
  const url = eventData.page_location || getRequestHeader('referer');
  if (url && url.lastIndexOf('https://gtm-msr.appspot.com/', 0) === 0) return true;
  return false;
}

function enc(data) {
  if (['null', 'undefined'].indexOf(getType(data)) !== -1) data = '';
  return encodeUriComponent(makeString(data));
}

function isUIFieldTrue(field) {
  return [true, 'true'].indexOf(field) !== -1;
}

function log(rawDataToLog) {
  const logDestinationsHandlers = {};
  if (determinateIsLoggingEnabled()) logDestinationsHandlers.console = logConsole;
  if (determinateIsLoggingEnabledForBigQuery()) logDestinationsHandlers.bigQuery = logToBigQuery;

  rawDataToLog.TraceId = getRequestHeader('trace-id');

  const keyMappings = {
    bigQuery: {
      Name: 'tag_name',
      Type: 'type',
      TraceId: 'trace_id',
      EventName: 'event_name',
      RequestMethod: 'request_method',
      RequestUrl: 'request_url',
      RequestBody: 'request_body',
      ResponseStatusCode: 'response_status_code',
      ResponseHeaders: 'response_headers',
      ResponseBody: 'response_body'
    }
  };

  for (const logDestination in logDestinationsHandlers) {
    const handler = logDestinationsHandlers[logDestination];
    if (!handler) continue;

    const mapping = keyMappings[logDestination];
    const dataToLog = mapping ? {} : rawDataToLog;

    if (mapping) {
      for (const key in rawDataToLog) {
        const mappedKey = mapping[key] || key;
        dataToLog[mappedKey] = rawDataToLog[key];
      }
    }

    handler(dataToLog);
  }
}

function logConsole(dataToLog) {
  logToConsole(JSON.stringify(dataToLog));
}

function logToBigQuery(dataToLog) {
  const connectionInfo = {
    projectId: data.logBigQueryProjectId,
    datasetId: data.logBigQueryDatasetId,
    tableId: data.logBigQueryTableId
  };
  dataToLog.timestamp = getTimestampMillis();

  ['request_body', 'response_headers', 'response_body'].forEach((p) => {
    if (dataToLog[p]) dataToLog[p] = JSON.stringify(dataToLog[p]);
  });
  BigQuery.insert(connectionInfo, [dataToLog], { ignoreUnknownValues: true });
}

function determinateIsLoggingEnabled() {
  const containerVersion = getContainerVersion();
  const isDebug = !!(
    containerVersion &&
    (containerVersion.debugMode || containerVersion.previewMode)
  );

  if (!data.logType) return isDebug;
  if (data.logType === 'no') return false;
  if (data.logType === 'debug') return isDebug;

  return data.logType === 'always';
}

function determinateIsLoggingEnabledForBigQuery() {
  if (data.bigQueryLogType === 'no') return false;
  return data.bigQueryLogType === 'always';
}
