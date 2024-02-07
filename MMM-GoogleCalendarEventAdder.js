Module.register("MMM-GoogleCalendarEventAdder", {
    // Default module configuration
    defaults: {
        text: "Add event",
        calendarId: "primary",
        updateNotification: 'GCAL_UPDATE',
        names: [],
        shortcuts: []
    },
    
    endContainer: null,
    isNewEvent: false,
    currentEventId: "",

    start: function () {
        Log.info("Starting module: " + this.name);
    },

    getStyles: function () {
        return ['MMM-GoogleCalendarEventAdder.css', 'https://use.fontawesome.com/releases/v5.15.3/css/all.css'];
    },

    createFormElement: function (element, attributes, properties) {
        let el = document.createElement(element);
        for (let attr in attributes) {
            el.setAttribute(attr, attributes[attr]);
        }
        for (let prop in properties) {
            el[prop] = properties[prop];
        }
        return el;
    },

    getDom: function () {
        let wrapper = document.createElement("div");

        // Assign the ID to the wrapper
        wrapper.id = "MMM-GoogleCalendarEventAdder";

        // If there's a message to show
        if (this.message) {
            var messageElem = document.createElement('div');
            messageElem.innerHTML = this.message;

            // Set the class based on the message type
            if (this.messageType === 'success') {
                messageElem.className = 'message success';
            } else if (this.messageType === 'error') {
                messageElem.className = 'message error';
            } else if (this.messageType === 'info') {
                messageElem.className = 'message info';
          }

            wrapper.appendChild(messageElem);

            // Clear the message after 4 seconds
            setTimeout(() => {
                this.message = null;
                this.messageType = null;
                this.updateDom();
            }, 4000);
        }

        // Create the form
        let form = this.createFormElement("form", { id: "eventForm" });
        form.style.display = "none"; // Hidden by default
        form.style.zIndex = "1000";

        // Create the "Add event" button
        let addButton = document.createElement("button");
        addButton.className = "add-event-button";
        addButton.innerHTML = '<i class="fas fa-plus"></i>';
        addButton.addEventListener("click", () => {
            this.currentEventId = "";
            this.isNewEvent = true;  // Set the flag
            this.openForm();
        });

        // Create header bar on form
        let headerBar = this.createFormElement("div", {class: "headerBar"});
        form.appendChild(headerBar);
        
        // Create a new container for form elements, excluding the header bar
        let formContentContainer = this.createFormElement("div", { class: "form-content-container" });
        
        // Create a wrapper for the name buttons
        const nameButtonWrapper = document.createElement('div');
        nameButtonWrapper.id = 'nameButtonWrapper';

        // Append the nameButtonWrapper to formContentContainer
        formContentContainer.appendChild(nameButtonWrapper);

        // Create the event title field
        let titleContainer = this.createFormElement("div", {class: "form-group"});
        titleContainer.appendChild(this.createFormElement("label", {for: "eventTitle"}, {textContent: "Event Title:"}));
        titleContainer.appendChild(this.createFormElement("input", {id: "eventTitle", type: "text"}));
        formContentContainer.appendChild(titleContainer);

        // Variable to store the selected name
        let selectedName = null;
        let myNames = this.config.names.split(",");
        myNames.forEach(name => {
            // Create a new button element
            const button = document.createElement('button');
            button.textContent = name;
            button.setAttribute('type', 'button'); 
            button.classList.add('nameButton');
            button.setAttribute('data-name', name);

            // Add event listener to the button
            button.addEventListener('click', function(event) {
                const clickedName = event.target.getAttribute('data-name');
                
                if (selectedName === clickedName) {
                    event.target.classList.remove('selected');
                    selectedName = null;
                } else {
                    if (selectedName) {
                        document.querySelector(`[data-name="${selectedName}"]`).classList.remove('selected');
                    }
                    selectedName = clickedName;
                    event.target.classList.add('selected');
                }
                event.target.blur(); 
            });

            // Append the button to the nameButtonWrapper
            nameButtonWrapper.appendChild(button);
        });

        // Create the all-day event checkbox
        let allDayContainer = this.createFormElement("div", {class: "form-group"});
        allDayContainer.appendChild(this.createFormElement("label", {for: "allDay"}, {textContent: "All-day event:"}));
        let allDayCheckbox = this.createFormElement("input", {id: "allDay", type: "checkbox"});
        allDayContainer.appendChild(allDayCheckbox);
        formContentContainer.appendChild(allDayContainer);
        
        // Create a container for both time fields
        let timeContainer = this.createFormElement("div", {class: "form-group time-container"});
        formContentContainer.appendChild(timeContainer);
        
        // Create the start time field
        let startContainer = this.createFormElement("div", {class: "form-group"});
        let startTimeLabel = this.createFormElement("label", {for: "startTime"}, {textContent: "Start Time: "});
        startContainer.appendChild(startTimeLabel);
        let startTimeInput = this.createFormElement("input", {id: "startTime", type: "datetime-local"});
        startContainer.appendChild(startTimeInput);
        timeContainer.appendChild(startContainer);

        allDayCheckbox.addEventListener('change', () => {
            let datePortion = startTimeInput.value.split('T')[0];  // Extract just the date
        
            if (allDayCheckbox.checked) {
                // If the checkbox is checked, change the inputs to "date" type
                startTimeInput.type = 'date';
                endTimeInput.type = 'date';
                this.endContainer.style.display = 'block';
            } else {
                // If the checkbox is unchecked, change the inputs back to "datetime-local" type
                startTimeInput.type = 'datetime-local';
                endTimeInput.type = 'datetime-local';
                this.endContainer.style.display = 'none';
            }
        
            // Reassign the date portion and, if applicable, the default time
            startTimeInput.value = allDayCheckbox.checked ? datePortion : datePortion + 'T00:00';
            endTimeInput.value = allDayCheckbox.checked ? datePortion : datePortion + 'T00:30';
        });
        

        // Create the end time field
        this.endContainer = this.createFormElement("div", {class: "form-group"});
        this.endContainer.appendChild(this.createFormElement("label", {for: "endTime"}, {textContent: "End Date: "}));
        let endTimeInput = this.createFormElement("input", {id: "endTime", type: "datetime-local"});
        this.endContainer.appendChild(endTimeInput);
        timeContainer.appendChild(this.endContainer);

        // Hide end time by default
        this.endContainer.style.display = 'none';
        
        startTimeInput.addEventListener('change', () => {
        let startDate = new Date(startTimeInput.value);
        let endDate;
        if (allDayCheckbox.checked) {
            // If the event is all-day, the end date should be the same as the start date
            endDate = new Date(startDate.getTime());
        } else {
            // If the event is not all-day, the end date should be 30 minutes later
            endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
        }

        let year = endDate.getFullYear();
        let month = ("0" + (endDate.getMonth() + 1)).slice(-2);
        let day = ("0" + endDate.getDate()).slice(-2);
        if (allDayCheckbox.checked) {
            // If the event is all-day, only set the date
            endTimeInput.value = `${year}-${month}-${day}`;
        } else {
            // If the event is not all-day, set the date and time
            let hours = ("0" + endDate.getHours()).slice(-2);
            let minutes = ("0" + endDate.getMinutes()).slice(-2);
            endTimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
        });

        //Every time the start time is changed, the end time defaults to 30 min later
        startTimeInput.addEventListener('change', () => {
            let startDate = new Date(startTimeInput.value);
            let endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 minutes later
            let year = endDate.getFullYear();
            let month = ("0" + (endDate.getMonth() + 1)).slice(-2);
            let day = ("0" + endDate.getDate()).slice(-2);
            let hours = ("0" + endDate.getHours()).slice(-2);
            let minutes = ("0" + endDate.getMinutes()).slice(-2);
            endTimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
          });
               
        formContentContainer.appendChild(timeContainer);  

        // Create a wrapper for the shortcut text buttons
        const shortcutButtonWrapper = document.createElement('div');
        shortcutButtonWrapper.id = 'shortcutButtonWrapper';

        // Append the shortcutButtonWrapper to formContentContainer
        formContentContainer.appendChild(shortcutButtonWrapper);

        //Variable to store the select shortcut text
        let selectedShortcut = null;
        let myShortcuts = this.config.shortcuts.split(",");
        myShortcuts.forEach(name => {
            // Create a new button element
            const button = document.createElement('button');
            button.textContent = name;
            button.setAttribute('type', 'button'); 
            button.classList.add('shortcutButton');
            button.setAttribute('data-name', name);

            // Add event listener to the button
            button.addEventListener('click', function(event) {
                const clickedName = event.target.getAttribute('data-name');
                let eventTitleField = document.getElementById("eventTitle");  
                if (selectedShortcut === clickedName) {
                    event.target.classList.remove('selected');
                    selectedShortcut = null;
                    eventTitleField.value = "";
                } else {
                    if (selectedShortcut) {
                        document.querySelector(`[data-name="${selectedShortcut}"]`).classList.remove('selected');
                    }
                    selectedShortcut = clickedName;
                    eventTitleField.value = clickedName;
                    event.target.classList.add('selected');
                }
                event.target.blur(); 
            });

            // Append the button to the shortcutButtonWrapper
            shortcutButtonWrapper.appendChild(button);
        });

        // Create the submit button
        let submitButton = this.createFormElement("button", {type: "submit", class: "btn"}, {textContent: "Submit"});
        submitButton.addEventListener("click", (event) => {
            event.preventDefault();  
            this.addEvent();
        });

        // Create a container for the submit button
        let submitButtonContainer = this.createFormElement("div", {class: "form-group submit-button-container"});
        submitButtonContainer.appendChild(submitButton);
        formContentContainer.appendChild(submitButtonContainer);  

        // Create the cancel button
        let cancelButton = this.createFormElement("button", {type: "cancel", class: "btn"}, {innerHTML: '<i class="fas fa-times"></i>'});
        cancelButton.addEventListener("click", (event) => {
            event.preventDefault();  
            this.closeForm();
        });
        
        formContentContainer.appendChild(cancelButton); 
        
        // Create the delete event button
        let deleteButton = this.createFormElement("button", {type: "delete", class: "btn"}, {textContent: "Delete Event"});
        let self = this;
        deleteButton.addEventListener("click", function(event) {
            event.preventDefault();
            self.showModal();
        });

        // Function to create and show the modal
        this.showModal = function() {
        // Create the modal and its elements
        let modal = document.createElement("div");
        modal.setAttribute("id", "deleteModal");
        modal.style.cssText = "display:block; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999;";

        let content = document.createElement("div");
        content.style.cssText = "background:white; padding:20px; max-width:300px; margin:100px auto; text-align:center;";

        let message = document.createElement("p");
        message.textContent = "Please confirm you wish to delete this event";
        
        let cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancel";
        cancelButton.style.cssText = "float: left; margin-right: 10px;"; // Float to the left with some margin
        cancelButton.addEventListener("click", () => {
            document.body.removeChild(modal);
        });
        
        let confirmButton = document.createElement("button");
        confirmButton.textContent = "Confirm";
        confirmButton.style.cssText = "float: right; margin-left: 10px;"; // Float to the right with some margin
        confirmButton.addEventListener("click", () => {
            console.log ("confirm event listener hit" + this.currentEventId);
            if (this.currentEventId) { // Only delete if an event ID is present
                console.log ("confirm delete");
                this.deleteEvent(this.currentEventId);
            }
            document.body.removeChild(modal);
        });
        
        // Clear the floats after the buttons
        let clearDiv = document.createElement("div");
        clearDiv.style.clear = "both";
        
        // Append everything to the modal
        content.appendChild(message);
        content.appendChild(cancelButton);
        content.appendChild(confirmButton);
        content.appendChild(clearDiv); // Add the clearDiv after the buttons
        modal.appendChild(content);

        // Append the modal to the body
        document.body.appendChild(modal);
        }

        // function to attach the virtual keyboard to the delete password input
        this.attachKeyboardToInputForDelete = function() {
            let self = this; // Store the reference of 'this' for use inside the event listener
            let deletePasswordInput = document.getElementById("deletePasswordInput");
            if (deletePasswordInput) {
                deletePasswordInput.addEventListener("focus", function(event) {
                    console.log("Delete password input field focused.");
                    // Notify the keyboard module to show the keyboard
                    self.sendNotification("SHOW_KEYBOARD");
                });
            } else {
                console.log("Delete password input field not found.");
            }
        };

        formContentContainer.appendChild(deleteButton);

        form.appendChild(formContentContainer);

        // Append the button and the form to the wrapper
        wrapper.appendChild(addButton);
        wrapper.appendChild(form);

        return wrapper;
    },

    openForm: function (isNewEvent = true) { 
        let form = document.getElementById("eventForm");
        let startTimeInput = document.getElementById("startTime");
        console.log("startTimeInput element:", startTimeInput);

        if (form) {
            form.style.display = "block";
            // Check if it's a new event before overwriting the startTime
            if (isNewEvent && !startTimeInput.value) {
                let now = new Date();
                let year = now.getFullYear();
                let month = ("0" + (now.getMonth() + 1)).slice(-2);
                let day = ("0" + now.getDate()).slice(-2);
                let hours = ("0" + now.getHours()).slice(-2);
                let minutes = ("0" + now.getMinutes()).slice(-2);
                startTimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
                console.log("Inside openForm. startTime.value:", startTime.value);
            } 
        }
    },

    closeForm: function () {
        let form = document.getElementById("eventForm");
        if (form) {
            form.style.display = "none";
            form.reset(); // Clear the input fields
            this.sendNotification('FORM_CLOSED');
            console.log("Sent Notification that form was closed")
        }
    },

    capitalizeFirstLetter: function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    // Function to add an event
    addEvent: function () {
        let eventTitleElement = document.getElementById("eventTitle");
        let eventTitle = eventTitleElement.value;
        let startTime = document.getElementById("startTime").value;
        let endTime = document.getElementById("endTime").value;
        let allDay = document.getElementById("allDay").checked;
    
        // Capitalize the first letter of the event title
        eventTitle = this.capitalizeFirstLetter(eventTitle);
    
        // Check if a name button is selected
        const selectedButton = document.querySelector('.nameButton.selected');
        if (selectedButton) {
            const selectedName = selectedButton.textContent;
            eventTitle = `${eventTitle} - ${selectedName}`;  
            eventTitleElement.value = eventTitle;
        }

        if (allDay) {
            // Add the time to the end date
            endTime += "T23:59:59";
    
            let endDate = new Date(endTime);
            endDate.setDate(endDate.getDate() + 1);
    
            let year = endDate.getFullYear();
            let month = ("0" + (endDate.getMonth() + 1)).slice(-2);
            let day = ("0" + endDate.getDate()).slice(-2);
            endTime = `${year}-${month}-${day}`;
        }
    
        let payload = {
            calendarId: this.config.calendarId,
            eventTitle: eventTitle,
            startTime: startTime,
            endTime: endTime,
            allDay: allDay
        };
    
        if (this.currentEventId !== "") {
            // If an event ID exists, treat this as an update
            payload.eventId = this.currentEventId;
            this.sendSocketNotification("UPDATE_CALENDAR_EVENT", payload);
        } else {
            // Otherwise, treat this as a new event
            this.sendSocketNotification("ADD_CALENDAR_EVENT", payload);
        }
    
        this.closeForm();
        //this.sendNotification("REFRESH_CALENDAR");
        this.message = this.currentEventId ? "Updating event..." : "Adding event...";
        this.messageType = "info";
        this.updateDom();
    },
    
    // Function to delete an event
    deleteEvent: function(eventId) {
        let payload = {
            calendarId: this.config.calendarId,
            eventId: eventId
        };
        console.log ("socket notification sent to delete event");
        if (eventId !== "") {
            this.sendSocketNotification("DELETE_CALENDAR_EVENT", payload);
            this.message = "Deleting event...";
            this.messageType = "info";
        } else {
            this.message = "Not an event!";
            this.messageType = "warn";
        }
        this.closeForm();
        this.updateDom();
    },
    
    notificationReceived: function(notification, payload, sender) {
        // Event listener for the event being clicked on the calendar
        switch (notification) {
            case "EDIT_CALENDAR_EVENT":
                // Populate the form with event details
                this.openForm(false);
                this.populateFormWithEventDetails(payload);
                return; 
        }
        
        // If the notification is BUTTON_CLICKED and the sender is the MMM-CalendarExt3 module
        if (notification === 'BUTTON_CLICKED' && sender.name === 'MMM-CalendarExt3') {
            // Open the form and prepopulate it for a new event
            this.openForm(true);
            this.populateFormForNewEvent(payload);
        }
    },

    populateFormForNewEvent: function(payload) {
        console.log("Inside populateFormForNewEvent.", payload);
        this.currentEventId = "";
        // Prepopulate the start date with the date from the payload
        let startTime = document.getElementById('startTime');
        if (startTime) {
            let date = new Date(payload.date); // Assuming you're passing a specific date in the payload
            let year = date.getFullYear();
            let month = ("0" + (date.getMonth() + 1)).slice(-2);
            let day = ("0" + date.getDate()).slice(-2);
            let hours = "08";
            let minutes = "00";
            startTime.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }

        let endTime = document.getElementById('endTime');
            if (endTime) {
            let date = new Date(payload.date); // Assuming you're passing a specific date in the payload
            let year = date.getFullYear();
            let month = ("0" + (date.getMonth() + 1)).slice(-2);
            let day = ("0" + date.getDate()).slice(-2);
            let hours = "08";
            let minutes = "30";
            endTime.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
        this.attachKeyboardToInput();
    },

    populateFormWithEventDetails: function(eventDetails) {
        console.log("Inside populateFormWithEventDetails.", eventDetails);
        let eid = document.getElementById("id");
        console.log(eid);
        // Populate the event title
        document.getElementById("eventTitle").value = eventDetails.title;

        // Set the all-day event checkbox
        let allDayCheckbox = document.getElementById("allDay");
        allDayCheckbox.checked = eventDetails.allDay === "true";
        allDayCheckbox.dispatchEvent(new Event('change', { 'bubbles': true }));
        
        let offset = 16;
        allDayCheckbox.checked ? offset = 10 : offset = 16; //Format: "YYYY-MM-DD" "YYYY-MM-DDTHH:MM"
        
        if (startTime && eventDetails.startDate) {
            let startDate = new Date(Number(eventDetails.startDate));
            // Get the UTC offset in minutes
            const utcOffsetInMinutes = startDate.getTimezoneOffset();
            // Adjust the date by adding the UTC offset
            startDate.setMinutes(startDate.getMinutes() - utcOffsetInMinutes);
            let formattedEndDate = startDate.toISOString().slice(0,offset);
            document.getElementById('startTime').value = formattedEndDate;
        }

        // Handle end time
        if (eventDetails.endDate) {
            let endDate = new Date(Number(eventDetails.endDate));  
            // Get the UTC offset in minutes
            const utcOffsetInMinutes = endDate.getTimezoneOffset();
            // Adjust the date by adding the UTC offset
            endDate.setMinutes(endDate.getMinutes() - utcOffsetInMinutes);
            let formattedEndDate = endDate.toISOString().slice(0,offset); 
            document.getElementById("endTime").value = formattedEndDate;
        }

        // Store the event ID in a hidden field or as a module variable
        this.currentEventId = eventDetails.id;
        console.log("currentEventId: ", eventDetails.id);
        this.attachKeyboardToInput();
    },

    attachKeyboardToInput: function() {
        let self = this; // Store the reference of 'this' for use inside the event listener
        let eventTitleInput = document.getElementById("eventTitle");
        if (eventTitleInput) {
            eventTitleInput.addEventListener("focus", function(event) {
                console.log("Event Title input field focused.");
                // Notify the keyboard module to show the keyboard
                console.log("Attempting to send SHOW_KEYBOARD notification");
                self.sendNotification("SHOW_KEYBOARD");
            });
        } else {
            console.log("Event Title input field not found.");
        }
    },  

    socketNotificationReceived: function(notification, payload) {
        switch (notification) {
            case "EVENT_ADD_SUCCESS_MAIN":
                this.showMessage('Event added!', 'success');
                break;

            case "EVENT_ADD_FAILED":
                this.showMessage('Event not added', 'error');
                break;

            case "EVENT_UPDATE_SUCCESS":
                this.showMessage('Event updated!', 'success');
                break;

            case "EVENT_UPDATE_FAILED":
                this.showMessage('Failed to update event', 'error');
                break;

            case "EVENT_DELETE_SUCCESS":
                this.showMessage('Event deleted!', 'success');
                break;

            case "EVENT_DELETE_FAILED":
                this.showMessage('Failed to delete event', 'error');
                break;
        }
        Log.info("Sending update notification");
        this.sendNotification(this.config.updateNotification, {});
    },

    showMessage: function (message, type) {
        this.message = message;
        this.messageType = type;
        this.updateDom(); // Update DOM immediately to show the message
    },
});
