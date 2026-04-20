# Google Sheets Tag for Google Tag Manager Server-Side

The **Google Sheets Tag** for Google Tag Manager Server-Side allows you to send data directly from your server container to a specified Google Sheet. This enables you to log events, capture form submissions, or store any other data for analysis and reporting.

The tag supports two primary actions:

- **Append data**: Appends a new row with your specified data to the end of the selected range.
- **Update data**: Overwrites the data in a specific cell or range of cells.

## How to use the Google Sheets Tag

1.  Add the **Google Sheets Tag** to your server container in GTM.
2.  Select the **Action Type** (`Append data` or `Update data`).
3.  Provide the **Spreadsheet URL** of the Google Sheet you want to write to.
4.  **(Optional)** Specify the Sheet Name (e.g., `Sheet1`). If omitted, the first visible sheet will be used.
5.  Select the **Dimension** (`Row` or `Column`). This determines whether the data is added horizontally (row) or vertically (column).
6.  Specify the **Range** using A1 notation (e.g., `A1:Z1`).
7.  **(Optional)** Enable **Force new rows** if you are appending data and want to ensure no overwrites if multiple operations are sent simultaneously and the ranges overlap.
8.  In the **Data** section, map the values you want to send to the sheet.
9.  Choose your **Authentication** method.
    - **Stape Google Connection** – Uses a simplified setup via Stape's connection.
    - **Own Google Credentials** – Uses Application Default Credentials from your GCP environment.
10. Add a trigger to fire the tag.

## Parameters

### Main Configuration

- **Type**: The action to perform.
  - **Append data**: Appends data. The `Range` parameter will be used to determine the last row of the table to append the new data.
  - **Update data**: Replaces data in the specified `Range`.
- **Dimension**: Choose whether to insert values as a **Row** (horizontally) or as a **Column** (vertically) in the specified range.
  - Note: For **Append** operations, selecting **Column** adds the data vertically into the next empty row of your range.
- **Spreadsheet URL**: The full URL of the target Google Spreadsheet.
- **Sheet Name**: The name of the specific sheet (tab) within the spreadsheet you want to write to. This is optional if the sheet name is included in the `Range`.
- **Range**: The A1 notation of the range to interact with. For example, `A1:D1` for the first four columns of the first row. If `Sheet Name` is not provided, you can specify it here (e.g., `'My Sheet'!A1:D1`).
- **Force new rows**: (Only for **Append data**) Enable this to force the spreadsheet to always write data in a new row. This prevents overwriting when multiple requests are sent simultaneously and ranges overlap.

### Authentication Credentials

- **Auth Type**:
  - **Stape Google Connection**: A simplified authentication method for Stape users. Requires enabling the **Google Sheets Connection** in your container settings. [Learn more](https://stape.io/blog/write-data-from-server-google-tag-manager-to-google-sheets#google-sheets-connection).
  - **Own Google Credentials**: Uses Application Default Credentials from a Google Cloud Platform environment. This requires enabling the Google Sheets API on GCP, setting up a service account and granting it access to your Google Sheet. [Learn more](https://stape.io/blog/write-data-from-server-google-tag-manager-to-google-sheets#how-to-set-google-sheets-tag-up-for-non-stape-userstials).

### Data

- **Data List**: A table where you define the values to be sent. Each "Cell Value" you add will be placed in the next available cell of the range you defined, following the orientation set in **Dimension** (left to right for rows, top to bottom for columns).

## Useful resources

- [How to write data from server Google Tag Manager to Google Sheets](https://stape.io/blog/write-data-from-server-google-tag-manager-to-google-sheets)
- [How to set up the Stape Google Connection](https://stape.io/blog/write-data-from-server-google-tag-manager-to-google-sheets#google-sheets-connection)
- [How to set up the Own Google Credentials](https://stape.io/blog/write-data-from-server-google-tag-manager-to-google-sheets#how-to-set-google-sheets-tag-up-for-non-stape-users)

## Open Source

The **Google Sheets Tag for GTM Server-Side** is developed and maintained by the [Stape Team](https://stape.io/) under the Apache 2.0 license.
