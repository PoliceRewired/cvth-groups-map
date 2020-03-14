var maptools = {

    map: null,
    geocoder: null,
    markers: [],
    markerCluster: null,

    initMap: function() {
        console.log("Map ready.");
        var c = {lat: 0, lng: 0};
        maptools.map = new google.maps.Map(document.getElementById('map'), {zoom: 2, center: c});
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
                console.log('Attempting plot for: ' + community.Title);
                setTimeout(maptools.plotAddress, i*50, community);
                //maptools.plotAddress(community);
            } else {
                console.log('Not attempting plotting: ' + community.Title);
            }
        }
    },

    plotAddress: function(community) {
        maptools.geocoder.geocode({'address': community.Location}, function(results, status) {
            if (status == 'OK') {
                console.log('Geocode succeeded for: ' + community.Title);
                // map.setCenter(results[0].geometry.location);

                var infowindow = new google.maps.InfoWindow({
                    content: '<b>'+community.Title+'</b><br/><a href="'+community.URL+'" target="_blank">Visit...</a>'
                });
                var marker = new google.maps.Marker({
                    //map: maptools.map,
                    position: results[0].geometry.location,
                    title: community.Title
                });
                marker.addListener('click', function() {
                    infowindow.open(maptools.map, marker);
                });

                maptools.markers.push(marker);
                maptools.markerCluster.addMarker(marker);
            } else if (status == 'OVER_QUERY_LIMIT') {
                setTimeout(maptools.plotAddress, 1000, community); // try again in a second

            } else {
                console.log('Geocode failed for: ' + community.Title + ' - ' + status);
            }
        });
    }

};
