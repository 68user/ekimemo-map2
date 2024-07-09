var DISPLAY_MARKER_THRESHOLD, MAP_CENTER_DEFAULT, checkedList, geocoder, main, map;

MAP_CENTER_DEFAULT = {
  lat: 35.659,
  lng: 139.745
};

DISPLAY_MARKER_THRESHOLD = 8;

// 取済済駅色
checkedFillColor = '#f00';
// 取済済廃駅色
checkedAbandonedFillColor = '#f00';

checkedList = [];

geocoder = null;
currentPrefCode = null;
map = null;

main = function(stations, prefs) {
  // 都道府県プルダウン設定
  var select = document.querySelector('#pref');
  prefs.forEach(function(v) {
    var option = document.createElement('option');
    option.value = v.pref_code;
    option.text = v.pref_name+"("+v.ekimemo_count+"駅)";
    select.appendChild(option);
  });

  var changedHash, initMap;
  initMap = function(lat, lng, zoom) {
    var addRaderMarker, currentLatLng, currentZoom, enableMarker, enablePolygon, iconList, markers, polygons, raderCenter, raderMarkers, redraw, stationsFilter, useRader;
    if (lat == null) {
      let oldLat = localStorage.getItem('ekimemo_lat');
      if ( oldLat != null && oldLat !== undefined ){
        lat = oldLat;
      } else {
        lat = MAP_CENTER_DEFAULT.lat;
      }
    }

    if (lng == null) {
      let oldLng = localStorage.getItem('ekimemo_lng');
      if ( oldLng != null && oldLng !== undefined ){
        lng = oldLng;
      } else {
        lng = MAP_CENTER_DEFAULT.lng;
      }
    }
    if (zoom == null) {
      let oldZoom = localStorage.getItem('ekimemo_zoom');
      if ( oldZoom != null && oldZoom !== undefined ){
        zoom = Number(oldZoom);
//  zoom=13;
      } else {
        zoom = 13;
      }
    }

    polygons = [];
    markers = [];
    raderMarkers = [];
    stationsFilter = null;
    currentLatLng = null;
    currentZoom = null;
    enablePolygon = true;
    enableMarker = true;
    iconList = {
      sphereRed: new google.maps.MarkerImage('images/icon-sphere_red.png', new google.maps.Size(8, 8), new google.maps.Point(0, 0), new google.maps.Point(4, 4)),
      sphereGray: new google.maps.MarkerImage('images/icon-sphere_gray.png', new google.maps.Size(8, 8), new google.maps.Point(0, 0), new google.maps.Point(4, 4)),
      raderCenter: new google.maps.MarkerImage('https://www.google.com/mapfiles/gadget/arrowSmall80.png', new google.maps.Size(31, 27), new google.maps.Point(0, 0), new google.maps.Point(9, 27))
    };
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: zoom,
      center: new google.maps.LatLng(lat, lng),
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      streetViewControl: false,
      disableDoubleClickZoom: true,  // ダブルクリックでのズーム無効化
      fullscreenControl: false,  // フルスクリーンアイコン非表示
      scaleControl: true
    });
    (function() {
      var set;
      set = google.maps.InfoWindow.prototype.set;
      return google.maps.InfoWindow.prototype.set = function(k, v) {
        if (k === 'map') {
          if (!this.get('noSupress')) {
            return;
          }
        }
        return set.apply(this, arguments);
      };
    })();
    google.maps.Map.prototype.clearOverlays = function() {
      polygons.forEach(function(v) {
        return v.setMap(null);
      });
      if (!enableMarker || currentZoom < DISPLAY_MARKER_THRESHOLD) {
        return markers.forEach(function(v) {
          return v.setMap(null);
        });
      }
    };
    redraw = function(force) {
      var bounds, bufferRange, newLatLng, newZoom, voronoi, voronois;
      if (force == null) {
        force = false;
      }
      newLatLng = map.getCenter();
      newZoom = map.getZoom();
      if (!force && currentLatLng && Math.abs(currentLatLng.lat() - newLatLng.lat()) < 0.2 && Math.abs(currentLatLng.lng() - newLatLng.lng()) < 0.2 && currentZoom && currentZoom === newZoom) {
        return;
      }
      currentLatLng = newLatLng;
      currentZoom = newZoom;
      map.clearOverlays();
      bufferRange = 0.5;
      bounds = map.getBounds();
      stationsFilter = stations.filter(function(v) {
	let select = document.getElementById('abandoned');
        let abandoned_mode = select.options[select.selectedIndex].value;

        if ( abandoned_mode==='1' && v.type === "1" ){
	  // 廃駅のみモードなら、現行駅は対象外
          return false;
        } else if ( abandoned_mode==='2' && v.type === "2" ){
          // 現行駅のみモードなら、廃駅は対象外
          return false;
        }
	// 表示範囲外の駅なら対象外
        if ( ! ( v.lat > bounds.getSouthWest().lat() - bufferRange
		 && v.lat < bounds.getNorthEast().lat() + bufferRange
		 && v.lng > bounds.getSouthWest().lng() - bufferRange
		 && v.lng < bounds.getNorthEast().lng() + bufferRange ) ){
	  return false;
	}
	// 都道府県選択済かつ、それ以外の都道府県なら対象外
	if ( currentPrefCode !== null && currentPrefCode !== v.prefcd ){
	    return false;
	}
//	console.dir("OK v.cd="+v.cd);
	return true;
      });

      if (enablePolygon) {
        voronoi = d3.geom.voronoi().clipExtent([[0, 110], [60, 170]]);
        voronois = voronoi(stationsFilter.map(function(v) {
          return [v.lat, v.lng];
        }));
      }
      return stationsFilter.forEach(function(d, i) {
        var fillColor, icon, marker, paths, polygon, strokeWeight;
        if (enablePolygon) {
          paths = voronois[i].map(function(v) {
            if (Object.keys(v !== 'point')) {
              return new google.maps.LatLng(v[0], v[1]);
            }
          });
          if (checkedList.indexOf(d.cd) !== -1) {
            fillColor = '#f00';
          } else {
            fillColor = 'transparent';
          }
          if (currentZoom >= DISPLAY_MARKER_THRESHOLD) {
            strokeWeight = 2;
          } else {
            strokeWeight = 1;
          }
          polygon = new google.maps.Polygon({
            paths: paths,
            strokeColor: '#f00',
            strokeOpacity: .4,
            strokeWeight: strokeWeight,
            fillColor: fillColor,
            fillOpacity: .2
          });
          google.maps.event.addListener(polygon, 'dblclick', function() {
            if (checkedList.indexOf(d.cd) !== -1) {
              checkedList = checkedList.filter(function(v) {
                return v !== d.cd;
              });
              this.setOptions({
                fillColor: 'transparent'
              });
            } else {
              checkedList.push(d.cd);
              this.setOptions({
                fillColor: '#f00'
              });
            }
            return localStorage.setItem('ekimemo_checkedList', JSON.stringify(checkedList));
          });
          polygon.setMap(map);
          polygons.push(polygon);
        }

//	console.dir("polygons: "+Object.keys(polygons).length);
//	console.dir("markers: "+Object.keys(markers).length);

        if (enableMarker && currentZoom >= DISPLAY_MARKER_THRESHOLD) {
          if (!markers[d.cd]) {
            if (+d.type === 2) {
              icon = iconList.sphereGray;
            } else {
              icon = iconList.sphereRed;
            }
            marker = new google.maps.Marker({
              position: new google.maps.LatLng(d.lat, d.lng),
              map: map,
              icon: icon,
              title: d.name
            });
            return markers[d.cd] = marker;
          } else if (markers[d.cd].getMap() === null) {
            return markers[d.cd].setMap(map);
          }
        }
      });
    };
    // レーダー 1・2・3 のアイコン
    addRaderMarker = function(latLng, dist, i) {
      return raderMarkers.push(new google.maps.Marker({
        position: latLng,
        map: map,
	icon: {
	  url: 'https://maps.google.com/mapfiles/ms/icons/yellow.png',
	  labelOrigin: new google.maps.Point(15,10), // ラベル位置 X・Y座標微調整
	},
        animation: google.maps.Animation.DROP, // 上から降ってくる
	label: ""+(i+1), // 1から順のラベル
        clickable: false
      }));
    };
    // レーダー中心点
    raderCenter = new google.maps.Marker({
      icon: iconList.raderCenter,
      animation: google.maps.Animation.DROP, // 上から降ってくる
      draggable: true // ドラッグで移動できるよ
    });
    useRader = function(latLng) {
      var d, distances, i, j, len, ref, results1;
      distances = [];

      stationsFilter.forEach(function(d, i) {
        var stationLatLng;
        stationLatLng = new google.maps.LatLng(d.lat, d.lng);
        return distances.push({
          dist: Math.sqrt(Math.pow(Math.abs(d.lat - latLng.lat()), 2) + Math.pow(Math.abs(d.lng - latLng.lng()), 2)),
          cd: d.cd,
          latLng: stationLatLng
        });
      });
      distances.sort(function(a, b) {
        return d3.ascending(a.dist, b.dist);
      });
      raderMarkers.forEach(function(v) {
        return v.setMap(null);
      });
      raderMarkers = [];
      // 距離の近いN駅を取得。
      ref = distances.slice(0, 18);
      results1 = [];
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        d = ref[i];
	// setTimeout で少しずつ時間をずらしながらマーカー追加
        results1.push(setTimeout(function(d, i) {
          return addRaderMarker(d.latLng, d.dist, i);
        }, i * 100, d, i));
      }
      return results1;
    };
    // 都道府県切り替え
    document.getElementById("pref").onchange = function(event){
      let select = document.getElementById("pref");
      currentPrefCode = select.options[select.selectedIndex].value;
      if ( currentPrefCode === "" ){
	currentPrefCode = null;
      } else {
	prefs.forEach(function(v) {
	  if ( currentPrefCode == v.pref_code ){
	    localStorage.setItem('ekimemo_lat', v.lat);
	    localStorage.setItem('ekimemo_lng', v.lng);
	  }
	});
      }
      return initMap();
      if ( false ){
	map.clearOverlays();
	polygons = [];
	markers = [];
	return redraw(true);
      }
    };

    document.getElementById("searchbox_detail").onchange = function(event){
      var detail = document.getElementById("searchbox_detail");
      var v = detail.options[detail.selectedIndex].value;
      console.dir(v);
      var lat = v.split(',')[1];
      var lng = v.split(',')[2];
      console.dir(lat);
      console.dir(lng);

      localStorage.setItem('ekimemo_lat', lat);
      localStorage.setItem('ekimemo_lng', lng);
      var latlng = new google.maps.LatLng(lat, lng);
      map.setCenter(latlng);
      //      localStorage.setItem('ekimemo_zoom', 3);
      map.setZoom(13);
    };
    document.getElementById("searchbox").onchange = function(event){
      var searchBox = document.getElementById("searchbox");
      var s = searchBox.value;
      if ( s === '' ){
	return;
      }
      var matched = stations.filter(function(v) {
	return v.name.indexOf(s) !== -1;
//	return v.name === s;
      });
      console.log(matched);

      var station;
      if ( matched.length == 1 ){
	var detail = document.getElementById('searchbox_detail');
	while(detail.lastChild){
	  detail.removeChild(detail.lastChild);
	}
	detail.style.display = 'hidden';

	station = matched[0];

	localStorage.setItem('ekimemo_lat', station.lat);
	localStorage.setItem('ekimemo_lng', station.lng);
	var latlng = new google.maps.LatLng(station.lat, station.lng);
	map.setCenter(latlng);
	map.setZoom(13);

      } else {
	// 1駅に絞り込めなかった
	var detail = document.getElementById('searchbox_detail');
	while(detail.lastChild){
	  detail.removeChild(detail.lastChild);
	}
	detail.style.display = 'inline';

	var option = document.createElement('option');
	option.value = "";
	option.text = matched.length+"駅マッチ";
	detail.appendChild(option);

	matched.forEach(function(v){
	  var option = document.createElement('option');
	  option.value = v.cd+","+v.lat+","+v.lng;
	  option.text = v.name + '(' + v.prefname + ')';
	  console.dir(option.text);
	  detail.appendChild(option);
	});
      }
    };
    document.getElementById("abandoned").onchange = function(event){
      return initMap();
    };
    google.maps.event.addListener(raderCenter, 'dragend', function(e) {
      return useRader(e.latLng);
    });
    google.maps.event.addListener(map, 'idle', function() {
      return redraw();
    });
    if (!localStorage.getItem('ekimemo_updated') || $("#modal .update-date").data('updated') > localStorage.getItem('ekimemo_updated')) {
      localStorage.setItem('ekimemo_updated', $("#modal .update-date").data('updated'));
      $("#modal").openModal();
    }
    $(".js-btn-polygon").on('click', function() {
      if ($(this).hasClass('disabled')) {
        $(this).removeClass('disabled');
        $(this).addClass('teal');
        enablePolygon = true;
      } else {
        $(this).removeClass('teal');
        $(this).addClass('disabled');
        enablePolygon = false;
      }
      $(".fixed-action-btn").removeClass('active');
      return redraw(true);
    });
    $(".js-btn-marker").on('click', function() {
      if ($(this).hasClass('disabled')) {
        $(this).removeClass('disabled');
        $(this).addClass('cyan');
        enableMarker = true;
      } else {
        $(this).removeClass('cyan');
        $(this).addClass('disabled');
        enableMarker = false;
      }
      $(".fixed-action-btn").removeClass('active');
      return redraw(true);
    });
    $(".js-btn-rader").on('click', function() {
      if ($(this).hasClass('disabled')) {
        $(this).removeClass('disabled');
        $(this).addClass('light-blue');
        raderCenter.setPosition(map.getCenter());
        useRader(map.getCenter());
        raderCenter.setMap(map);
      } else {
        $(this).removeClass('light-blue');
        $(this).addClass('disabled');
        raderMarkers.forEach(function(v) {
          return v.setMap(null);
        });
        raderCenter.setMap(null);
      }
      return $(".fixed-action-btn").removeClass('active');
    });
    return $(window).on('hashchange', function() {
      return changedHash();
    });
  };
  changedHash = function() {
    var matches;
    if (matches = location.hash.match(/#([+-]?[\d\.]+),([+-]?[\d\.]+)/)) {
      return initMap(matches[1], matches[2]);
    } else {
      if (!geocoder) {
        geocoder = new google.maps.Geocoder();
      }
      return geocoder.geocode({
        address: location.hash.substr(1)
      }, function(results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
          if (map) {
            return map.setCenter(results[0].geometry.location);
          } else {
            return initMap(results[0].geometry.location.lat(), results[0].geometry.location.lng());
          }
        } else {
          if (!map) {
            return initMap();
          }
        }
      });
    }
  };
  if (location.hash) {
    return changedHash();
  } else if (navigator.geolocation) {
    return navigator.geolocation.getCurrentPosition(function(position) {
      if (position != null ? position.coords : void 0) {
        // リロードのたびに位置がクリアされるのはよろしくないので、とりあえず現在位置の取得は外す
        //        return initMap(position.coords.latitude, position.coords.longitude);
        return initMap();
      } else {
        return initMap();
      }
    }, function() {
      return initMap();
    });
  } else {
    return initMap();
  }
};

$(function() {
  var e, error;
  if (localStorage.getItem('ekimemo_checkedList')) {
    try {
      checkedList = JSON.parse(localStorage.getItem('ekimemo_checkedList'));
    } catch (error) {
      e = error;
      console.log(e);
      checkedList = [];
    }
  }
  return d3.csv('./data/stations.csv', function(stations) {
    d3.csv('./data/prefs_ekimemo.csv?x', function(prefs){
      return main(stations, prefs);
    })
  });
});
