var maptools = {

    map: null,
    geocoder: null,
    markers: [],
    markerCluster: null,

    initMap: function() {
        console.log("Map ready.");
        // 55.3781° N, 3.4360° W
        var c = {lat: 55.3781, lng: -3.436};
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
            },
            dataType: "text",
        });
    },

    parseSheetData: function(data) {
        console.log("Data objects ready.");
        console.log(data);
        for (var i = 0; i < data.length; i++) {
            var community = data[i];
            if (community.Display === 'TRUE') {
                if (community.Lat && community.Lng) {
                    console.log('Direct plot for: ' + community.Title + " - At: " + community.Lat + ", " + community.Lng);
                    var myLatLng = { lat: parseFloat(community.Lat), lng: parseFloat(community.Lng) };
                    maptools.createMarker(community, myLatLng);
                } else {
                    console.log('Attempting geocode for: ' + community.Title);
                    // only geocode if necessary
                    setTimeout(maptools.plotAddress, i*300, community);
                }
            } else {
                console.log('Not attempting plotting: ' + community.Title);
            }
        }
    },

    plotAddress: function(community) {
        maptools.geocoder.geocode({'address': community.Location}, function(results, status) {
            if (status == 'OK') {
                console.log('Geocode succeeded for: ' + community.Title);
                maptools.createMarker(community, results[0].geometry.location);

            } else if (status == 'OVER_QUERY_LIMIT') {
                setTimeout(maptools.plotAddress, 200, community); // try again in a short while

            } else {
                console.log('Geocode failed for: ' + community.Title + ' - ' + status);
            }
        });
    },
    
    createMarker: function(community, location) {
        console.log('Creating marker for: ' + community.Title);

        var latFuzz = (0.0001 * Math.random()) - 0.0005;
        var lngFuzz = (0.0001 * Math.random()) - 0.0005;
        var fuzzedLocation = { lat: location.lat+latFuzz, lng: location.lng+lngFuzz };

        var infowindow = new google.maps.InfoWindow({
            content: '<b>'+community.Title+'</b><br/><a href="'+community.URL+'" target="_blank">Visit...</a>'
        });

        var marker = new google.maps.Marker({
            //map: maptools.map,
            position: fuzzedLocation,
            title: community.Title
        });

        marker.addListener('click', function() {
            infowindow.open(maptools.map, marker);
        });

        maptools.markers.push(marker);
        maptools.markerCluster.addMarker(marker);
    }
};
