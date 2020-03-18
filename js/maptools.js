var maptools = {

    map: null,
    geocoder: null,
    markers: [],
    markerGroups: [],
    markerCluster: null,

    sourceSelectControlDiv: null,

    initMap: function() {
        console.log("Map ready.");

        var c = {lat: 55.3781, lng: -3.436}; // centre on the UK
        maptools.map = new google.maps.Map(document.getElementById('map'), {zoom: 6, center: c});
        maptools.geocoder = new google.maps.Geocoder();
        maptools.markerCluster = new MarkerClusterer(maptools.map, [], {imagePath: 'markers/m'});

        maptools.initDocument();
    },

    initDocument: function() {
        $(document).ready(function() {
            console.log("Document ready.");
            maptools.readMarkers();
        });
    },

    readMarkers: function() {
        $.ajax({
            url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSndAxLFYXZxfphygVkQbVhwtV9d-hwMXqNa6VdckqCkR0S7WgMqPY0zD6mCSQ4S-w89DtsjNVhNSeV/pub?gid=0&single=true&output=csv",
            success: function(data) {
                console.log("Data CSV retrieved.");
                var objects = $.csv.toObjects(data);
                maptools.parseSheetData(objects);

                console.log('Creating control divs');
                maptools.sourceSelectControlDiv = maptools.createSourceSelector();
                maptools.map.controls[google.maps.ControlPosition.TOP_CENTER].push(maptools.sourceSelectControlDiv);
            },
            dataType: "text",
        });
    },

    parseSheetData: function(data) {
        console.log("Data objects ready.");
        console.debug(data);
        for (var i = 0; i < data.length; i++) {
            var community = data[i];
            if (community.Display === 'TRUE') {
                if (community.Lat && community.Lng) {
                    console.debug('Direct plot for: ' + community.Title + " - At: " + community.Lat + ", " + community.Lng);
                    var myLatLng = { lat: parseFloat(community.Lat), lng: parseFloat(community.Lng) };
                    var marker = maptools.createMarker(community, myLatLng);
                    maptools.storeMarker(community, marker);
                } else {
                    console.log('Attempting geocode for: ' + community.Title);
                    // only geocode if necessary
                    setTimeout(maptools.plotAddress, i*300, community);
                }
            } else {
                console.warn('Display == FALSE for: ' + community.Title);
            }
        }
    },

    plotAddress: function(community) {
        maptools.geocoder.geocode({'address': community.Location}, function(results, status) {
            if (status == 'OK') {
                console.log('Geocode succeeded for: ' + community.Title);
                var marker = maptools.createMarker(community, results[0].geometry.location);
                maptools.storeMarker(community, marker);

            } else if (status == 'OVER_QUERY_LIMIT') {
                setTimeout(maptools.plotAddress, 200, community); // try again in a short while

            } else {
                console.warn('Geocode failed for: ' + community.Title + ' - ' + status);
            }
        });
    },

    storeMarker: function(community, marker) {
        if (!maptools.markers[community.Source]) { maptools.markers[community.Source] = []; }
        
        if (!maptools.markerGroups.includes(community.Source)) {
            maptools.markerGroups.push(community.Source); // add group to groups list
        }

        maptools.markers[community.Source].push(marker); // store marker against its group
        maptools.markerCluster.addMarker(marker); // display marker in the cluster
    },
    
    createMarker: function(community, location) {
        console.debug('Creating marker for: ' + community.Title);

        var latFuzz = (0.001 * Math.random()) - 0.0005;
        var lngFuzz = (0.001 * Math.random()) - 0.0005;
        var fuzzedLocation = { lat: location.lat+latFuzz, lng: location.lng+lngFuzz };

        var infowindow = new google.maps.InfoWindow({
            content: '<h1><a href="'+community.URL+'" target="_blank">'+community.Title+'</a></h1>' 
                    + '<h2>'+community.Source+'</h2>' 
                    + '<a href="'+community.URL+'" target="_blank">Visit...</a>'
        });

        var iconChoice;
        switch (community.Source) {
            case "facebook group":
            case "facebook chat":
                iconChoice = "http://maps.google.com/mapfiles/kml/pushpin/blue-pushpin.png";
                break;
            case "whatsapp group":
                iconChoice = "http://maps.google.com/mapfiles/kml/pushpin/grn-pushpin.png";
                break;
            case "nextdoor community":
                iconChoice = "http://maps.google.com/mapfiles/kml/pushpin/orange-pushpin.png";
                break;
            case "instagram":
                iconChoice = "http://maps.google.com/mapfiles/kml/pushpin/pink-pushpin.png";
                break;
            case "unknown (url shortened)":
                iconChoice = "http://maps.google.com/mapfiles/kml/pushpin/wht-pushpin.png";
                break;
            case "twitter account":
                iconChoice = "http://maps.google.com/mapfiles/kml/pushpin/ltblu-pushpin.png";
                break;
            case "shared google doc":
            case "shared google folder":
                iconChoice = "http://maps.google.com/mapfiles/kml/pushpin/purple-pushpin.png";
                break;
            case "halo community":
                iconChoice = "http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png";
                break;
            default:
                iconChoice = 'http://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png';
                break;
        }

        var marker = new google.maps.Marker({
            position: fuzzedLocation,
            title: community.Title,
            icon: iconChoice
        });

        marker.addListener('click', function() {
            infowindow.open(maptools.map, marker);
        });

        return marker;
    },

    createSourceSelector: function() {
        var controlDiv = document.createElement('div');

        var controlUI = document.createElement('div');
        controlUI.className = 'controlUi';
        controlUI.title = 'Click to select sources';
        controlDiv.appendChild(controlUI);
      
        // Set CSS for the control interior.
        var controlText = document.createElement('div');
        controlText.id = 'sourceSelectHeader';
        controlText.className = 'controlHeader';
        controlText.innerHTML = '+ Select community sources...';
        controlUI.appendChild(controlText);

        var controlTable = document.createElement('table');
        controlTable.className = 'markerGroupTable';

        // step through each marker group
        for (var i = 0; i < maptools.markerGroups.length; i++) {
            var group = maptools.markerGroups[i];
            var tr = document.createElement('tr');
            
            var td_check = document.createElement('td');
            var check = document.createElement('input');
            check.type = 'checkbox';
            check.id = 'check_group_'+i;
            check.name = 'check_group_'+i;
            check.checked = true;
            check.className = 'sourceCheck';
            check.innerHTML = group;
            td_check.appendChild(check);

            var td_group = document.createElement('td');
            td_group.innerHTML = "<label for='check_group_"+i+"'>"+group+"</label>";

            tr.appendChild(td_check);
            tr.appendChild(td_group);
            controlTable.appendChild(tr);
        }

        controlUI.appendChild(controlTable);

        controlUI.addEventListener('change', function(e) {
            if (e.target.className === 'sourceCheck') {
                maptools.updateSources();
            }
        });

        controlUI.addEventListener('click', function(e) {
            if (e.target.id === 'sourceSelectHeader') {
                $('.markerGroupTable').toggle();
            }
        });

        controlDiv.index = 1;
        controlDiv.style.marginTop = "10px";
        return controlDiv;
    },

    updateSources: function() {
        console.debug('checkbox clicked.');
        maptools.selectedGroups = [];
        for (c = 0; c < maptools.markerGroups.length; c++) {
            if ($('#check_group_'+c).is(":checked")) {
                maptools.selectedGroups.push(maptools.markerGroups[c]);
            }
        }
        console.debug(maptools.selectedGroups);

        // clear and re-add markers
        maptools.markerCluster.clearMarkers();
        for (s = 0; s < maptools.selectedGroups.length; s++) {
            var selectedGroup = maptools.selectedGroups[s];
            console.debug('Adding: ' + selectedGroup + ' (' + maptools.markers[selectedGroup].length + ')');
            for (m = 0; m < maptools.markers[selectedGroup].length; m++) {
                var marker = maptools.markers[selectedGroup][m];
                maptools.markerCluster.addMarker(marker);
            }
        }
    }
};

