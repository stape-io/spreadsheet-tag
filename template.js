const JSON = require('JSON');
const sendHttpRequest = require('sendHttpRequest');
const getContainerVersion = require('getContainerVersion');
const logToConsole = require('logToConsole');
const getRequestHeader = require('getRequestHeader');
const encodeUriComponent = require('encodeUriComponent');
const Firestore = require('Firestore');

const containerVersion = getContainerVersion();
const isDebug = containerVersion.debugMode;
const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = getRequestHeader('trace-id');

const method = data.type === 'add' ? 'POST' : 'PUT';
const postBody = getData();

let firebaseOptions = {};
if (data.firebaseProjectId) firebaseOptions.projectId = data.firebaseProjectId;

Firestore.read(data.firebasePath, firebaseOptions)
    .then((result) => {
        return sendStoreRequest(result.data.access_token, result.data.refresh_token);
    }, () => updateAccessToken(data.refreshToken));

function sendStoreRequest(accessToken, refreshToken) {
    const postUrl = getUrl();

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
            }));
        }

        if (statusCode >= 200 && statusCode < 400) {
            data.gtmOnSuccess();
        } else if (statusCode === 401) {
            updateAccessToken(refreshToken);
        } else {
            data.gtmOnFailure();
        }
    }, {headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken}, method: method}, JSON.stringify(postBody));
}

function updateAccessToken(refreshToken) {
    const authUrl = 'https://oauth2.googleapis.com/token';
    const authBody = 'refresh_token='+enc(refreshToken || data.refreshToken)+'&client_id='+enc(data.clientId)+'&client_secret='+enc(data.clientSecret)+'&grant_type=refresh_token';

    if (isLoggingEnabled) {
        logToConsole(JSON.stringify({
            'Name': 'Spreadsheet',
            'Type': 'Request',
            'TraceId': traceId,
            'EventName': 'Auth',
            'RequestMethod': 'POST',
            'RequestUrl': authUrl,
        }));
    }

    sendHttpRequest(authUrl, (statusCode, headers, body) => {
        if (isLoggingEnabled) {
            logToConsole(JSON.stringify({
                'Name': 'Spreadsheet',
                'Type': 'Response',
                'TraceId': traceId,
                'EventName': 'Auth',
                'ResponseStatusCode': statusCode,
                'ResponseHeaders': headers,
            }));
        }

        if (statusCode >= 200 && statusCode < 400) {
            let bodyParsed = JSON.parse(body);

            Firestore.write(data.firebasePath, bodyParsed, firebaseOptions)
                .then((id) => {
                    sendStoreRequest(bodyParsed.access_token, bodyParsed.refresh_token);
                }, data.gtmOnFailure);
        } else {
            data.gtmOnFailure();
        }
    }, {headers: {'Content-Type': 'application/x-www-form-urlencoded'}, method: 'POST'}, authBody);
}

function getUrl() {
    let spreadsheetId = data.url.replace('https://docs.google.com/spreadsheets/d/', '').split('/')[0];

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
