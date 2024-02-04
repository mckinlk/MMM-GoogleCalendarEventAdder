# MMM-GoogleCalendarEventAdder
Adds, edits, or deletes an event from a google calendar, using API. Currently tokens require user reauthorization approximately every 7 days. Any progress towards persistent or tokens that will be automatically refreshed will be posted. 

## Prerequesite
This module currently requires MMM-SimpleKeyboard and my fork of MMRIZE's fantastic MMM-CalendarExt3 module. Both are also in my git.  

## Installation

To install the module, use your terminal to:
 
1. Navigate to your MagicMirror's modules folder. If you are using the default installation directory, use the command:<br />`cd ~/MagicMirror/modules`
2. Clone the module:<br />`git clone https://github.com/tjat84/MMM-GoogleCalendarEventAdder.git`
3. Install dependencies:<br /> run `npm install` from the MMM-GoogleCalendarEventAdder directory.

## Authentication Setup

This process is similar to that used by randomBrainstormer's MMM-GoogleCalendar. My setup utilizes the same project as GoogleCalendar, but I have two separate credentials. 

1. Go [here](https://developers.google.com/calendar/api/quickstart/nodejs), and follow the instructions found in the `prerequisites` section to create the Google Cloud project (you could also use an existing project if you wish). Make sure to enable the GoogleCalendarAPI and turn on readonly and write access scopes.
2. Once you have enabled setup the project and created your OAuth ID client, download the client ID as `json` (look for the download option) and rename it `credentials.json`. NOTE: When creating the OAuth ID client you should see a list of diffrent credential types, this module is currently only supporting `Desktop app`.
3. Move `credentials.json` to your MMM-GoogleCalendarEventAdder directory (MagicMirror/modules/MMM-GoogleCalendarEventAdder/)
4. Open 'credentials.json' and change the redirect_uri to 'http://localhost:3000/oauth2callback'. This will create a temporary callback server for authentication, which will be closed upon successful authentication. 
5. [Enable Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com). Select the same project as in step 1.
6. Run this command from the MMM-GoogleCalendarEventAdder directory: `node authenticate.js` and follow the instructions that will display in the console. 

## Sample Config
```javascript

        {
			module: 'MMM-GoogleCalendarEventAdder',
			position: 'top_right', 
			config: {
				//no config options exist
		},	

```

## Screenshots
![screenshot](https://github.com/tjat84/MMM-GoogleCalendarEventAdder/blob/acdaec83f70b661e92c1537108e85b91c52b1e3c/main_snippet.png)

![screenshot](https://github.com/tjat84/MMM-GoogleCalendarEventAdder/blob/acdaec83f70b661e92c1537108e85b91c52b1e3c/delete_snip.png)