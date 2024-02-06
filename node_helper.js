const NodeHelper = require("node_helper");
const { google } = require("googleapis");
const fs = require('fs');
const path = require('path');
const express = require('express');
const moment = require('moment-timezone');
const OAuth2 = google.auth.OAuth2;

// Path to the secrets.json file
const secretsPath = path.join(__dirname, 'secrets.json');
const credentialsPath = path.join(__dirname, 'credentials.json');

// Read the secrets file
let secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
// Read the credentials file
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

module.exports = NodeHelper.create({
  start: function() {
    console.log("MMM-GoogleCalendarEventAdder helper started...");
  },

  socketNotificationReceived: function(notification, payload) {
    console.log('Calendar ID from Payload: ', payload.calendarId);    
      switch(notification) {
	  case "ADD_CALENDAR_EVENT":
	      this.addCalendarEvent(payload);
	      break;
	  case "UPDATE_CALENDAR_EVENT":
	      this.updateCalendarEvent(payload);
	      break;
	  case "DELETE_CALENDAR_EVENT":
      console.log ("socket received to delete event");
	      this.deleteCalendarEvent(payload);
	      break;
      }
  },

  getNewToken: function(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar']
    });
    console.log('Authorize this app by visiting this url: ', authUrl);

    var app = express();

    app.get('/oauth2callback', function(req, res) {
      var code = req.query.code;
      if (code) {
        oauth2Client.getToken(code, function(err, token) {
          if (err) {
            console.log('Error while trying to retrieve access token', err);
            return;
          }
          oauth2Client.credentials = token;
          secrets = {...secrets, ...token};
          fs.writeFileSync(secretsPath, JSON.stringify(secrets)); // Store the token
          callback(oauth2Client);
          res.send('Authentication successful! Please return to the console.');
          process.exit(1); // Stop the Express server
        });
      } else {
        res.send('Authentication failed! Please return to the console.');
      }
    });

    app.listen(3000, function () {
      console.log('App listening on port 3000');
    });
  },

  addCalendarEvent: function(payload) {
    const oauth2Client = new OAuth2(
      credentials.installed.client_id,
      credentials.installed.client_secret,
      credentials.installed.redirect_uris[0],
    );

    // Check if we have previously stored a token.
    if (secrets.access_token && secrets.refresh_token) {
      oauth2Client.credentials = secrets;
      this.insertCalendarEvent(payload, oauth2Client);
    } else {
      this.getNewToken(oauth2Client, this.insertCalendarEvent.bind(this, payload));
    }
  },

  insertCalendarEvent: function(payload, oauth2Client) {
    console.log('insertCalendarEvent payload:', payload);

    const startTime = moment(payload.startTime).tz("America/New_York").format();
    const endTime = moment(payload.endTime).tz("America/New_York").format();

    // Retrieve the allDay property directly from the payload
    const isAllDay = payload.allDay;

    const event = {
      summary: payload.eventTitle,
    };

    if (isAllDay) {
        // If it's an "all day" event, set only the date property
        event.start = {
            date: moment(startTime).format('YYYY-MM-DD'),
        };
        event.end = {
            date: moment(startTime).add(1, 'days').format('YYYY-MM-DD'),  // End date is one day after the start date
        };
    } else {
        // Regular event with specific start and end times
        event.start = {
            dateTime: startTime,
            timeZone: "America/New_York",
        };
        event.end = {
            dateTime: endTime,
            timeZone: "America/New_York",
        };
    }

    console.log("Constructed event: ", event); // Log constructed event
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    calendar.events.insert(
      {
        auth: oauth2Client,
        calendarId: payload.calendarId,
        resource: event,
      },
      (err, event) => {
		  if (err) {
			console.log("There was an error contacting the Calendar service: ", err);
			return;
		  }

		  console.log("Event created: %s", event.data.htmlLink);
		  this.sendSocketNotification("EVENT_ADD_SUCCESS_MAIN", {});
		  console.log("Event has been created and sent to main module");
	}
  );
},

updateCalendarEvent: function(payload) {
  console.log('updateCalendarEvent payload:', payload);

    const oauth2Client = new OAuth2(
      credentials.installed.client_id,
      credentials.installed.client_secret,
      credentials.installed.redirect_uris[0],
    );

    // Check if we have previously stored a token.
    if (secrets.access_token && secrets.refresh_token) {
      oauth2Client.credentials = secrets;
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      
      const startTime = moment(payload.startTime).tz("America/New_York").format();
      const endTime = moment(payload.endTime).tz("America/New_York").format();
      let myEvent = null;
      if (payload.allDay === true){
        myEvent = {
          summary: payload.eventTitle,
          start: {
              date: payload.startTime,
              dateTime: startTime,
              timeZone: "America/New_York",
          },
          end: {
              date: payload.endTime,
              dateTime: endTime,
              timeZone: "America/New_York",
          },
        };
      } else {
        myEvent = {
          summary: payload.eventTitle,
          start: {
              dateTime: startTime,
              timeZone: "America/New_York",
          },
          end: {
              dateTime: endTime,
              timeZone: "America/New_York",
          },
        };
    }
    const event = myEvent;
    console.log('event', event);

    calendar.events.update({
      calendarId: payload.calendarId,
      eventId: payload.eventId,  // Assuming you have the eventId in your payload
      resource: event
    }, (err, event) => {
      if (err) {
        console.log('There was an error updating the event: ', err);
        return;
      }
      console.log('Event updated: %s', event.data.htmlLink);
      this.sendSocketNotification("EVENT_UPDATE_SUCCESS", {});
    });

    } else {
      this.getNewToken(oauth2Client, this.updateCalendarEvent.bind(this, payload));
    }
},

deleteCalendarEvent: function(payload) {
  console.log('deleteCalendarEvent payload:', payload);

      const oauth2Client = new OAuth2(
	credentials.installed.client_id,
	credentials.installed.client_secret,
	credentials.installed.redirect_uris[0],
      );

      // Check if we have previously stored a token.
      if (secrets.access_token && secrets.refresh_token) {
	oauth2Client.credentials = secrets;
	const calendar = google.calendar({ version: "v3", auth: oauth2Client });
	
	calendar.events.delete({
	  calendarId: payload.calendarId,
	  eventId: payload.eventId,  // Assuming you have the eventId in your payload
	}, (err) => {
	  if (err) {
	    console.log('There was an error deleting the event: ', err);
	    return;
	  }
	  console.log('Event deleted');
	  this.sendSocketNotification("EVENT_DELETE_SUCCESS", {});
	});

      } else {
	this.getNewToken(oauth2Client, this.deleteCalendarEvent.bind(this, payload));
      }
  },
})

