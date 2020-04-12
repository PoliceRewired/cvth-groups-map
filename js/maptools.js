var maptools = {

    map: null,
    geocoder: null,
    markers: [],
    markerGroups: [],
    markerGroupCounts: {},
    markerCluster: null,

    sourceSelectControlDiv: null,
    geolocatorControlDiv: null,
    externalLinksControlDiv: null,

    initMap: function() {
        console.log("Map ready.");

        var c = {lat: 55.3781, lng: -3.436}; // centre on the UK
        maptools.map = new google.maps.Map(document.getElementById('map'), {
            zoom: 6, 
            center: c,
            mapTypeControlOptions: {
                mapTypeIds: [ 'roadmap', 'terrain', 'satellite', 'hybrid', 'silver', 'dark' ]
            }
        });
        maptypes.init();
        maptools.map.mapTypes.set('silver', maptypes.silver);
        maptools.map.mapTypes.set('dark', maptypes.dark);
        //maptools.map.setMapTypeId('silver');

        maptools.geocoder = new google.maps.Geocoder();
        maptools.markerCluster = new MarkerClusterer(maptools.map, [], {imagePath: 'markers/m'});

        maptools.initDocument();
        //$('.initfocus').focus();
    },

    initDocument: function() {
        $(document).ready(function() {
            console.log("Document ready.");
            maptools.readMarkers();
        });
    },

    readMarkers: function() {
        $.ajax({
            url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS-iLVH2EU_R8pmaf_Gp9Z21976nt4L_45VcJAE7NDJin8I6RJZF20Prr3CFatgdo0udGCGVPnXiLxY/pub?gid=986442863&single=true&output=csv",
            success: function(data) {
                console.log("Data CSV retrieved.");
                var objects = $.csv.toObjects(data);
                maptools.parseSheetData(objects);

                console.log('Creating control divs');
                maptools.sourceSelectControlDiv = maptools.createSourceSelector();
                maptools.map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(maptools.sourceSelectControlDiv);
                maptools.geolocatorControlDiv = maptools.createGeolocator();
                maptools.map.controls[google.maps.ControlPosition.LEFT_TOP].push(maptools.geolocatorControlDiv);
                // removed - as external links now provided at helpisavailable.org.uk
                // maptools.externalLinksControlDiv = maptools.createExternalLinks();
                // maptools.map.controls[google.maps.ControlPosition.TOP_CENTER].push(maptools.externalLinksControlDiv);
            },
            dataType: "text",
        });
    },

    parseSheetData: function(data) {
        console.log("Data objects ready.");
        console.debug(data);
        for (var i = 0; i < data.length; i++) {
            var community = data[i];
            if (community.Display === 'VISIBLE' || community.Display === 'UPDATED') {
                if (community.Lat && community.Lng) {
                    console.debug('Direct plot for: ' + community.Title + " - At: " + community.Lat + ", " + community.Lng);
                    var myLatLng = { lat: parseFloat(community.Lat), lng: parseFloat(community.Lng) };
                    var marker = maptools.createMarker(community, myLatLng);
                    maptools.storeMarker(community, marker);
                } else {
                    console.log('Attempting geocode for: ' + community.Title + ' with address: ' + community.Location);
                    // only geocode if necessary
                    setTimeout(maptools.plotAddress, i*300, community);
                }
            } else {
                console.warn('Display == ' + community.Display + ' for: ' + community.Title);
            }
        }
    },

    plotAddress: function(community) {
        maptools.geocoder.geocode({'address': community.Location}, function(results, status) {
            if (status == 'OK') {
                console.log('Geocode succeeded for: ' + community.Title);
                try {
                    var marker = maptools.createMarker(community, results[0].geometry.location);
                    maptools.storeMarker(community, marker);
                } catch (e) {
                    console.error('Marker creation failed for geocoded community: ' + community.Title);
                    console.warn(community);
                    console.warn(results);
                }
            } else if (status == 'OVER_QUERY_LIMIT') {
                setTimeout(maptools.plotAddress, 200, community); // try again in a short while

            } else {
                console.warn('Geocode failed for: ' + community.Title + ' - ' + status);
            }
        });
    },

    storeMarker: function(community, marker) {
        if (!maptools.markers[community.Source]) { maptools.markers[community.Source] = []; }
        
        // add group to groups list, and count them
        if (!maptools.markerGroups.includes(community.Source)) {
            maptools.markerGroups.push(community.Source);
        }
        if (!maptools.markerGroupCounts[community.Source]) {
          maptools.markerGroupCounts[community.Source] = 1;
        } else {
          maptools.markerGroupCounts[community.Source] = maptools.markerGroupCounts[community.Source] + 1;
        }

        maptools.markers[community.Source].push(marker); // store marker against its group
        maptools.markerCluster.addMarker(marker); // display marker in the cluster
    },
    
    createMarker: function(community, location) {
        console.debug('Creating marker for: ' + community.Title);

        var latFuzz = (0.001 * Math.random()) - 0.0005;
        var lngFuzz = (0.001 * Math.random()) - 0.0005;
        var fuzzedLocation = { lat: location.lat+latFuzz, lng: location.lng+lngFuzz };

        var infoWindowContent =
            '<div class="infoWindow">'
            + '<h1><a href="'+community.URL+'" target="_blank">'+community.Title+'</a></h1>'
            + '<h2>'+community.Location+'</h2>'
            + '<a href="'+community.URL+'" target="_blank">Visit '+community.Source+'...</a>';

        infoWindowContent += maptools.getInfoWindowSafetyContent(community);

        infoWindowContent += '</div>';

        var infowindow = new google.maps.InfoWindow({
            content: infoWindowContent
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
            case "localhalo community":
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

    getInfoWindowSafetyContent: function(community) {
        var safetyInfo = '';

        if (community.Force || community.Neighbourhood) {
            safetyInfo += '<h3>Safety</h3>';

            safetyInfo += maptools.getSafetyFieldContent('Your local force:', community.Force, community['Force URL']);
            safetyInfo += maptools.getSafetyFieldContent(
                'Your neighbourhood policing team: ', community.Neighbourhood, community['Neighbourhood URL']);

            if (community['Neighbourhood email']) {
                safetyInfo += '<p><label>Email: </label>' +
                    '<a href="mailto:'+community['Neighbourhood email']+'">'+community['Neighbourhood email']+'</a>';
            }
        }

        return safetyInfo;
    },

    getSafetyFieldContent: function(label, value, url) {
        fieldContent = '';

        if (value) {
            fieldContent += '<p><label>' + label + ' </label>';
            if (url) {
                fieldContent += '<a href="'+url+'" target="_blank">';
            }

            fieldContent += value;

            if (url) {
                fieldContent += '</a>';
            }
            fieldContent += '</p>';
        }

        return fieldContent;
    },

    createExternalLinks: function() {
        var controlDiv = document.createElement('div');

        var controlUI = document.createElement('div');
        controlUI.className = 'controlUi';
        controlUI.id = 'geolocateUi';
        controlUI.title = 'Other volunteering options...';

        controlUI.innerHTML =
            '<span id="findHelpHeader" style="font-size: 12pt; font-weight: bold;">+ Find or volunteer help...</span>' +
            '<div id="helpListDiv" style="display: none;">' +
            '<p style="font-size: 11pt;">Find a community to join on the map, or visit:</p>' +
            '<ul style="font-size: 11pt;">' +
            '<li><a target="_blank" href="https://localhelpers.org/">LocalHelpers.org</a> (offer/request help, UK)</li>' +
            '<li><a target="_blank" href="https://randall.ie/help/">Self Isolation Helpers</a> (offer/request help, IE)</li>' +
            '<li><a target="_blank" href="https://www.localhalo.com/coronavirus">Halo coronavirus communities</a></li>' +
            '<li><a target="_blank" href="https://nextdoor.co.uk/">Nextdoor communities</a></li>' +
            '</ul>' +
            '</div>';

        controlDiv.appendChild(controlUI);

        controlUI.addEventListener('click', function(e) {
            if (e.target.id === 'findHelpHeader') {
                $('#helpListDiv').toggle();
            }
        });

        controlDiv.index = 1;
        controlDiv.style.margin = "10px";
        return controlDiv;
    },

    createGeolocator: function() {
        var controlDiv = document.createElement('div');

        var controlUI = document.createElement('div');
        controlUI.className = 'controlUi';
        controlUI.id = 'geolocateUi';
        controlUI.title = 'Click to see your location';

        controlUI.innerHTML = '<img src="icons/baseline_home_black_48dp.png" style="width: 32px; height: auto;" id="geolocateIcon" />';
        controlDiv.appendChild(controlUI);

        controlUI.addEventListener('click', function(e) {
            if (e.target.id === 'geolocateUi' || e.target.id === 'geolocateIcon') {
                maptools.geolocate();
            }
        });

        controlDiv.index = 1;
        controlDiv.style.marginLeft = "10px";
        return controlDiv;
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
        controlText.innerHTML = '+ Filter pins...';
        controlUI.appendChild(controlText);

        var controlTable = document.createElement('table');
        controlTable.className = 'markerGroupTable';

        // step through each marker group
        for (var i = 0; i < maptools.markerGroups.length; i++) {
            var group = '<b>' + maptools.markerGroups[i] + '</b> (' + maptools.markerGroupCounts[maptools.markerGroups[i]] + ')'

            if (maptools.markerGroups[i]) {
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
        controlDiv.style.margin = "10px";
        return controlDiv;
    },

    filterSubset: function(selection) {
      var newSelection = [];

      switch (selection) {
        case 'halo':
          newSelection = ['localhalo community'];
          break;
        case 'council':
          newSelection = ['council'];
          break;
        case 'groups':
          for (g = 0; g < maptools.markerGroups.length; g++) {
            if (maptools.markerGroups[g] != 'localhalo community' && maptools.markerGroups[g] != 'council') {
              newSelection.push(maptools.markerGroups[g]);
            }
          }
          break;
        case 'all':
          for (g = 0; g < maptools.markerGroups.length; g++) {
            newSelection.push(maptools.markerGroups[g]);
          }
          break;
      }
      console.debug(newSelection);
      for (var i = 0; i < maptools.markerGroups.length; i++) {
        if (newSelection.includes(maptools.markerGroups[i])) {
          $('#check_group_'+i).prop("checked", true);
        } else {
          $('#check_group_'+i).prop("checked", false);
        }
      }
      maptools.updateSources();
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
      maptools.reAddMarkers();
    },

    reAddMarkers: function() {
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
    },

    geolocate: function() {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(position) {
            var pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };

            // infoWindow = new google.maps.InfoWindow;
            // infoWindow.setPosition(pos);
            // infoWindow.setContent('Location found.');
            // infoWindow.open(maptools.map);
            maptools.map.panTo(pos);
            maptools.smoothZoom(maptools.map, 12, maptools.map.getZoom());

          }, function() {
            maptools.handleLocationError(true);
          });
        } else {
          // Browser doesn't support Geolocation
          maptools.handleLocationError(false);
        }
    },

    visitOnMap: function(address) {
        maptools.geocoder.geocode({'address': address}, function(results, status) {
            if (status == 'OK') {
                console.log('Geocode succeeded for: ' + community.Title);
                try {
                    var location = results[0].geometry.location;
                    maptools.map.panTo(location);
                    maptools.smoothZoom(maptools.map, 12, maptools.map.getZoom());
        
                } catch (e) {
                    console.error('Marker creation failed for geocoded community: ' + community.Title);
                    console.warn(community);
                    console.warn(results);
                }
            } else if (status == 'OVER_QUERY_LIMIT') {
                setTimeout(maptools.visitOnMap, 200, address); // try again in a short while

            } else {
                console.warn('Geocode failed for: ' + address + ' - ' + status);
                alert('Unfortunately, unable to find: ' + address);
            }
        });
    },

    handleLocationError: function(browserHasGeolocation) {
        console.warn(browserHasGeolocation ? 'Geolocation service failed.' : 'Browser does not support geolocation.');
        alert('Unable to locate you.');
    },

    // the smooth zoom function
    smoothZoom: function(map, max, cnt) {
        if (cnt >= max) {
            return;
        } else {
            z = google.maps.event.addListener(map, 'zoom_changed', function(event){
                google.maps.event.removeListener(z);
                maptools.smoothZoom(map, max, cnt + 1);
            });
            setTimeout(function(){map.setZoom(cnt)}, 80); // 80ms is what I found to work well on my system -- it might not work well on all systems
        }
    },

};

var maptypes = {
    silver: null,
    dark: null,

    init: function() {
        maptypes.dark = new google.maps.StyledMapType(
            [
                {
                  "elementType": "geometry",
                  "stylers": [
                    {
                      "color": "#212121"
                    }
                  ]
                },
                {
                  "elementType": "labels.icon",
                  "stylers": [
                    {
                      "visibility": "off"
                    }
                  ]
                },
                {
                  "elementType": "labels.text.fill",
                  "stylers": [
                    {
                      "color": "#757575"
                    }
                  ]
                },
                {
                  "elementType": "labels.text.stroke",
                  "stylers": [
                    {
                      "color": "#212121"
                    }
                  ]
                },
                {
                  "featureType": "administrative",
                  "elementType": "geometry",
                  "stylers": [
                    {
                      "color": "#757575"
                    }
                  ]
                },
                {
                  "featureType": "administrative.country",
                  "elementType": "labels.text.fill",
                  "stylers": [
                    {
                      "color": "#9e9e9e"
                    }
                  ]
                },
                {
                  "featureType": "administrative.land_parcel",
                  "stylers": [
                    {
                      "visibility": "off"
                    }
                  ]
                },
                {
                  "featureType": "administrative.locality",
                  "elementType": "labels.text.fill",
                  "stylers": [
                    {
                      "color": "#bdbdbd"
                    }
                  ]
                },
                {
                  "featureType": "poi",
                  "elementType": "labels.text.fill",
                  "stylers": [
                    {
                      "color": "#757575"
                    }
                  ]
                },
                {
                  "featureType": "poi.park",
                  "elementType": "geometry",
                  "stylers": [
                    {
                      "color": "#181818"
                    }
                  ]
                },
                {
                  "featureType": "poi.park",
                  "elementType": "labels.text.fill",
                  "stylers": [
                    {
                      "color": "#616161"
                    }
                  ]
                },
                {
                  "featureType": "poi.park",
                  "elementType": "labels.text.stroke",
                  "stylers": [
                    {
                      "color": "#1b1b1b"
                    }
                  ]
                },
                {
                  "featureType": "road",
                  "elementType": "geometry.fill",
                  "stylers": [
                    {
                      "color": "#2c2c2c"
                    }
                  ]
                },
                {
                  "featureType": "road",
                  "elementType": "labels.text.fill",
                  "stylers": [
                    {
                      "color": "#8a8a8a"
                    }
                  ]
                },
                {
                  "featureType": "road.arterial",
                  "elementType": "geometry",
                  "stylers": [
                    {
                      "color": "#373737"
                    }
                  ]
                },
                {
                  "featureType": "road.highway",
                  "elementType": "geometry",
                  "stylers": [
                    {
                      "color": "#3c3c3c"
                    }
                  ]
                },
                {
                  "featureType": "road.highway.controlled_access",
                  "elementType": "geometry",
                  "stylers": [
                    {
                      "color": "#4e4e4e"
                    }
                  ]
                },
                {
                  "featureType": "road.local",
                  "elementType": "labels.text.fill",
                  "stylers": [
                    {
                      "color": "#616161"
                    }
                  ]
                },
                {
                  "featureType": "transit",
                  "elementType": "labels.text.fill",
                  "stylers": [
                    {
                      "color": "#757575"
                    }
                  ]
                },
                {
                  "featureType": "water",
                  "elementType": "geometry",
                  "stylers": [
                    {
                      "color": "#000000"
                    }
                  ]
                },
                {
                  "featureType": "water",
                  "elementType": "labels.text.fill",
                  "stylers": [
                    {
                      "color": "#3d3d3d"
                    }
                  ]
                }
            ], {name: 'Dark'});

        maptypes.silver = new google.maps.StyledMapType(
        [
            {
                "elementType": "geometry",
                "stylers": [
                {
                    "color": "#f5f5f5" // #
                }
                ]
            },
            {
                "elementType": "labels.icon",
                "stylers": [
                {
                    "visibility": "on"
                }
                ]
            },
            {
                "elementType": "labels.text.fill",
                "stylers": [
                {
                    "color": "#616161"
                }
                ]
            },
            {
                "elementType": "labels.text.stroke",
                "stylers": [
                {
                    "color": "#f5f5f5"
                }
                ]
            },
            {
                "featureType": "administrative.land_parcel",
                "elementType": "labels.text.fill",
                "stylers": [
                {
                    "color": "#bdbdbd"
                }
                ]
            },
            {
                "featureType": "poi",
                "elementType": "geometry",
                "stylers": [
                {
                    "color": "#eeeeee"
                }
                ]
            },
            {
                "featureType": "poi",
                "elementType": "labels.text.fill",
                "stylers": [
                {
                    "color": "#757575"
                }
                ]
            },
            {
                "featureType": "poi.park",
                "elementType": "geometry",
                "stylers": [
                {
                    "color": "#e5e5e5" // #
                }
                ]
            },
            {
                "featureType": "poi.park",
                "elementType": "labels.text.fill",
                "stylers": [
                {
                    "color": "#9e9e9e"
                }
                ]
            },
            {
                "featureType": "road",
                "elementType": "geometry",
                "stylers": [
                {
                    "color": "#ffffff"
                }
                ]
            },
            {
                "featureType": "road.arterial",
                "elementType": "labels.text.fill",
                "stylers": [
                {
                    "color": "#757575"
                }
                ]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry",
                "stylers": [
                {
                    "color": "#dadada"
                }
                ]
            },
            {
                "featureType": "road.highway",
                "elementType": "labels.text.fill",
                "stylers": [
                {
                    "color": "#616161"
                }
                ]
            },
            {
                "featureType": "road.local",
                "elementType": "labels.text.fill",
                "stylers": [
                {
                    "color": "#9e9e9e"
                }
                ]
            },
            {
                "featureType": "transit.line",
                "elementType": "geometry",
                "stylers": [
                {
                    "color": "#e5e5e5"
                }
                ]
            },
            {
                "featureType": "transit.station",
                "elementType": "geometry",
                "stylers": [
                {
                    "color": "#eeeeee"
                }
                ]
            },
            {
                "featureType": "water",
                "elementType": "geometry",
                "stylers": [
                {
                    "color": "#a6a6a6"
                }
                ]
            },
            {
                "featureType": "water",
                "elementType": "labels.text.fill",
                "stylers": [
                {
                    "color": "#9e9e9e"
                }
                ]
            }
        ], {name: 'Silver'});
    }
};