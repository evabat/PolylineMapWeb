/* global variables */

var map; // Our map
var poly; // Our polygon
var coordsArr = []; // Our array of points
var markers = []; // Our array of markers (a marker is somehow a point but a point is not a marker, duh~)

// Initialization of the map
function initMap(pos) {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 18,
        center: pos,
        mapTypeId: 'roadmap'
    });

    // Initialization of the polyline element
    poly = new google.maps.Polyline({
        strokeColor: '#31B0D5',
        strokeOpacity: 1.0,
        strokeWeight: 3
    });

    // Add a listener for the click event on the map
    google.maps.event.addListener(map, 'click', function(event) {
        var evt = event.latLng;
        checkPolyLength();
        drawPolyAndSavePathData(evt);
    });
}

// When the app and it's elements are ready (DOM perspective)
$(document).ready(function() {
    // Check the geolocation response by the user and initialize the map accordingly
    if (navigator.geolocation) {
        // If accepted, focus on user's location and init
        navigator.geolocation.watchPosition(function(position) {
                pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                initMap(pos);
            },
            // if denied focus on Rethymno, Crete, and init
            function(error) {
                if (error.code == error.PERMISSION_DENIED)
                    initMap({ lat: 35.363933, lng: 24.482068 });
            });

        // At any rate, focus again on the default location and init the map
    } else {
        initMap({ lat: 35.363933, lng: 24.482068 });
    }

    // Call check of polyline's length function
    checkPolyLength();
});

// Function for rendering elements according to polyline's state
function checkPolyLength() {
    // Get the elements by Id
    // Save button
    var saveBtn = $("#savePathBtn");
    // Clear button
    var clearBtn = $("#clearPathBtn");
    // Textfield of title's input
    var nameInput = $("#path-name-input");
    // Check the length of current points (they are stored in an array)
    if (coordsArr.length <= 0) {
        // if no data, disable input field and save button
        $(saveBtn).attr("disabled", true);
        $(nameInput).attr("disabled", true);
    } else {
        // Else enable both
        $(saveBtn).attr("disabled", false);
        $(nameInput).attr("disabled", false);
    }
}

// Handles click events on a map, adds a new point to the Polyline and push coords to data array
function drawPolyAndSavePathData(evtCoords) {
    // Get the path of polyline
    var path = poly.getPath();
    // Add new point to the path (coords created by click event)
    path.push(evtCoords);
    // Add point to the global array of coords (the temporary "memory" of the app)
    coordsArr.push({ lat: evtCoords.lat(), lng: evtCoords.lng() });
    // Add a new marker at the new plotted point on the polyline.
    var marker = new google.maps.Marker({
        position: evtCoords,
        title: '#' + path.getLength(),
        map: map,
        icon: "assets/img/map-marker.png"
    });
    // Populate markers' array accordingly
    markers.push(marker);
    // Make polyline appear to the map
    poly.setMap(map);
}

// Sets the map on all markers in the array.
function setMapOnAll(map) {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
    }
}

// Removes the markers from the map
function clearMarkers() {
    setMapOnAll(null);
}

// Event for toggling the appearance of paths' catalogue (side accordion menu)
$("#show-hide-paths").click(function() {
    $(this).find("span").toggleClass("hide-txt")
});

// Saving a new path! (click save button)
$("#savePathBtn").click(function() {
    // Init the validator (checks for an empty text-field)
    var validator = $("#input-path-frm").validate({
        // Highlight field with an 'errorous' color
        highlight: function(element) {
            $("#path-name-input").addClass('has-error');
        },
        // Remove the ominous highlight in case of an input
        unhighlight: function(element) {
            $("#path-name-input").removeClass('has-error');
        }
    });
    // The actual validation
    validator.element("#path-name-input");
    // if is valid...
    if ($("#input-path-frm").valid()) {
        // Push the data to the database!
        var newPath = db.ref('paths/').push({ name: $("#path-name-input").val(), coordsArr });
        // Clear temporary data
        clearElements();
        // Clear the text-field!
        $("#path-name-input").val('');
        // Finally, inform the user that her save was a SUCCESS
        $.bootstrapGrowl("Η διαδρομή αποθηκεύθηκε επιτυχώς!", {
            type: 'success',
            align: 'center',
            width: 'auto',
            offset: { from: 'top', amount: 20 },
            delay: 2500,
            allow_dismiss: true
        });
        // In the highly unlikely case of invalid input, again inform the user accordingly
    } else {
        // We are sorry, retry, etc...
        $.bootstrapGrowl("Προέκυψε κάποιο πρόβλημα, προσπαθήστε ξανά!", {
            type: 'warning',
            align: 'center',
            width: 'auto',
            offset: { from: 'top', amount: 20 },
            delay: 2000,
            allow_dismiss: true
        });
    }
});

// Just erase all map points! (not only)
$("#clearPathBtn").click(function(e) {
    // Prevents the annoying refresh
    e.preventDefault();
    // Clear any ominous "errorous" class
    $("#path-name-input").removeClass("has-error");
    // Clear input
    $("#path-name-input").val("");
    // Clear more error
    $("#path-name-input-error").css("display", "none");
    // Clear temporary data
    clearElements();
});

// Function for resetting map.
// Removes polyline and markers, empties the array, disables the buttons~
function clearElements() {
    // Clear polyline
    poly.getPath().clear();
    // Clear markers
    clearMarkers();
    // Clear global array of points (empty)
    coordsArr = [];
    // Arrange the appearance of buttons (enabled - disabled etc)
    checkPolyLength();
}

// Get the existing records of the database
var existingPaths = db.ref('paths/');
// Get data for rendering the relative elements!
existingPaths.on('value', function(snapshot) {
    // Reset the accordion menu
    $("#paths-tbl-tbody").empty();
    // A nice big template for each record
    // It populates every row of the accordion menu with text and buttons
    // The buttons are 'view' and 'delete'
    // Several data elements are connected with the dom
    // That's because each button should represent the accordind record
    $.each(snapshot.val(), function(key, value) {
        // The markup
        var markup = "<tr><td>" + value.name + "</td>" +
            "<td> <div data-toggle='tooltip' title='Διαγραφή διαδρομής' class='delete-btn-wrapper'>" +
            "<button class='btn btn-danger' id='btn-delete" + key + "'" +
            " data-toggle='modal' data-target='#confirm-modal' data-id='" + key + "'>" +
            "<span class='glyphicon glyphicon-floppy-remove'></span>" +
            "</button></div><button class='btn btn-primary' id='btn-show" + key +
            "' data-toggle='tooltip' title='Εμφάνιση διαδρομής'>" +
            "<span class='glyphicon glyphicon-eye-open'></span>" +
            "</button></td></tr>";
        // "Templatarize" the markup
        $.template("pathsTemplate", markup);
        // ...And append it to the father catalog
        $.tmpl("pathsTemplate", snapshot).appendTo("#paths-tbl-tbody");
        // All the events that concern the catalogue's elements are initialized here
        // Button which shows a saved path
        $("#btn-show" + key).click(function() {
            // Clear things before showing anything
            poly.setMap(null);
            setMapOnAll(null);
            coordsArr = [];
            markers = [];
            poly.setPath(value.coordsArr);
            // Iterate points from data and populate any according variable
            // Marker
            for (var i = 0; i < value.coordsArr.length; i++) {
                var marker = new google.maps.Marker({
                    position: new google.maps.LatLng(value.coordsArr[i].lat, value.coordsArr[i].lng),
                    title: '#' + poly.getPath().getLength(),
                    map: map,
                    icon: "assets/img/map-marker.png"
                });
                // Array of points
                coordsArr.push({ lat: value.coordsArr[i].lat, lng: value.coordsArr[i].lng });
                // Markers
                markers.push(marker);
            }
            // Find something like the "middle" of the path
            // Make map pan to that place
            var newLatLng = new google.maps.LatLng(coordsArr[Math.ceil(coordsArr.length / 2)]);
            map.panTo(newLatLng);
            // Trigger resize to prevent unrendered tiles of the map
            google.maps.event.trigger(map, 'resize');
            // Show the polyline!
            poly.setMap(map);
        });

        // Clicking the delete button (catalogue row)
        // Add the key of the record as id for the modal confirmation button
        $("#btn-delete" + key).click(function() {
            $(".modal-footer .btn-danger").attr("id", key);
        });
    });
});

// Event for confirmation of the record's deletion
$("#confirm-modal").on("click", '.btn-remove-record', function(e) {
    // Get the previously assinged id in order to focus the proper record
    var id = $(e.currentTarget).attr("id");
    // Remove the record
    existingPaths.child(id).remove();
    // Clear all
    clearElements();
    // Hide the modal - dialog
    $('#confirm-modal').modal('hide');
    // Inform the user that the deletion was successful!
    $.bootstrapGrowl("Η διαδρομή διεγράφη επιτυχώς.", {
        type: 'info',
        align: 'center',
        width: 'auto',
        offset: { from: 'top', amount: 20 },
        delay: 2000,
        allow_dismiss: true
    });
});