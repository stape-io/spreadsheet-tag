const JSON = require('JSON');
const sendHttpRequest = require('sendHttpRequest');
const getContainerVersion = require('getContainerVersion');
const logToConsole = require('logToConsole');
const getRequestHeader = require('getRequestHeader');
const encodeUriComponent = require('encodeUriComponent');
const getGoogleAuth = require('getGoogleAuth');

const containerVersion = getContainerVersion();
const isDebug = containerVersion.debugMode;
const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = getRequestHeader('trace-id');

const spreadsheetId = data.url.replace('https://docs.google.com/spreadsheets/d/', '').split('/')[0];
let method = data.type === 'add' ? 'POST' : 'PUT';
const postBody = getData();
const postUrl = getUrl();



if (data.authFlow === 'stape') {
    method = 'POST';
    return sendStapeApiReqeust();
} else {
  return sendStoreRequest();
}

function sendStapeApiReqeust() {
    
    if (isLoggingEnabled) {
        logToConsole(JSON.stringify({
            'Name': 'Spreadsheet',
            'Type': 'Request',
            'TraceId': traceId,
            'EventName': data.type,
            'RequestMethod': method,
            'RequestUrl': postUrl,
            'RequestBody': postBody,
        }));
    }


    sendHttpRequest(postUrl, (statusCode, headers, body) => {
        if (isLoggingEnabled) {
            logToConsole(JSON.stringify({
                'Name': 'Spreadsheet',
                'Type': 'Response',
                'TraceId': traceId,
                'EventName': data.type,
                'ResponseStatusCode': statusCode,
                'ResponseHeaders': headers,
                'ResponseBody': body,
                'method': method,
            }));
        }

        if (statusCode >= 200 && statusCode < 400) {
            data.gtmOnSuccess();
        } else {
            data.gtmOnFailure();
        }
    }, {headers: {'Content-Type': 'application/json'}, method: method}, JSON.stringify(postBody));
}

function sendStoreRequest() {
    let auth = getGoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    if (isLoggingEnabled) {
        logToConsole(JSON.stringify({
            'Name': 'Spreadsheet',
            'Type': 'Request',
            'TraceId': traceId,
            'EventName': data.type,
            'RequestMethod': method,
            'RequestUrl': postUrl,
            'RequestBody': postBody,
        }));
    }

    sendHttpRequest(postUrl, {headers: {'Content-Type': 'application/json'}, authorization: auth, method: method}, JSON.stringify(postBody)).then((statusCode, headers, body) => {
        if (isLoggingEnabled) {
            logToConsole(JSON.stringify({
                'Name': 'Spreadsheet',
                'Type': 'Response',
                'TraceId': traceId,
                'EventName': data.type,
                'ResponseStatusCode': statusCode,
                'ResponseHeaders': headers,
                'ResponseBody': body,
            }));
        }

        if (statusCode >= 200 && statusCode < 400) {
            data.gtmOnSuccess();
        } else {
            data.gtmOnFailure();
        }
    });
}


function getUrl() {
    if (data.authFlow == 'stape'){
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
          '/v1/spreadsheet/auth-proxy');
    }
    

    if (data.type === 'add') {
        return 'https://content-sheets.googleapis.com/v4/spreadsheets/'+spreadsheetId+'/values/'+enc(data.rows)+':append?includeValuesInResponse=true&valueInputOption=RAW&alt=json';
    }

    return 'https://content-sheets.googleapis.com/v4/spreadsheets/'+spreadsheetId+'/values/'+enc(data.rows)+'?valueInputOption=RAW&includeValuesInResponse=true&alt=json';
}

function getData() {
    let mappedData = [];

    if (data.dataList) {
        data.dataList.forEach(d => {
            mappedData.push(d.value);
        });
    }
    if (data.authFlow == 'stape'){
        return {
            'spreadsheetId': spreadsheetId,
            "range": enc(data.rows),
            "type": data.type === 'add' ? 'add' : 'edit',
            "values":  [mappedData]
        };
    }
    
    return {
        'values': [mappedData],
    };
}

function determinateIsLoggingEnabled() {
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

function enc(data) {
    data = data || '';
    return encodeUriComponent(data);
}
