var DISPLAY_MARKER_THRESHOLD, MAP_CENTER_DEFAULT, checkedList, geocoder, main, map;

MAP_CENTER_DEFAULT = {
  lat: 35.659,
  lng: 139.745
};

DISPLAY_MARKER_THRESHOLD = 9;

// 取済済駅色
checkedFillColor = '#f00';
// 取済済廃駅色
checkedAbandonedFillColor = '#f00';

checkedList = [];

geocoder = null;
currentPrefCode = null;
map = null;

main = function(stations, stationPrefs, prefs) {
  var stationPrefs = d3.map(stationPrefs, function(v){
    return v.station_code;
  });

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
      raderCenter: new google.maps.MarkerImage('http://www.google.com/mapfiles/gadget/arrowSmall80.png', new google.maps.Size(31, 27), new google.maps.Point(0, 0), new google.maps.Point(9, 27))
    };
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: zoom,
      center: new google.maps.LatLng(lat, lng),
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      streetViewControl: false,
      disableDoubleClickZoom: true,  // ダブルクリックでのズーム無効化
      fullscreenControl: false,  // フルスクリーンアイコン非表示

      styles:[
	{
	  featureType:'administrative.province',//学校関連
	  elementType:'geometry',//
	  stylers:[{color: '#000000',
		    weight: 2,
		    // weight:0.2, lightness:0.1
		   }]
	},
	{
	  featureType:'transit.line',//
	  elementType:'geometry.stroke',//
	  stylers:[{ color: '#0000cc',
		     lightness:0
		    //weight:0.2,
		   }]
	},
	{
	  featureType:'transit.station.rail',//
	  elementType:'geometry',//
	  stylers:[{ color: '#00ffcc',
		     lightness:0,
		     visibility: 'on',
		    //weight:0.2,
		   }]
	},
      ],
//      featureType: "administrative.province",
//      stylers:[{color: '#ff0004' }],
//      travelMode: google.maps.TravelMode.TRANSIT,
//      transitOptions: {
//	modes: [google.maps.TransitMode.TRAIN]
//      },
    });

    // 何のためのコードかわからない。
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

    // ポリゴン・マーカークリア
    google.maps.Map.prototype.clearOverlays = function() {
      console.dir("START clearOverlays ===============");
      var polygonsCleared = 0;
      var markersCleared = 0;
      var noPolygonsCleared = 0;
      var noMarkersCleared = 0;
//      console.dir("polygons:");
//      console.dir(polygons);
      console.dir("polygons len: "+Object.keys(polygons).length);

      polygons.forEach(function(v) {
	if ( v && v.setMap ){
	  polygonsCleared++;
          return v.setMap(null);
	} else {
	  noPolygonsCleared++;
	}
      });
//      console.dir("markers:");
//      console.dir(markers);
      console.dir("markers len: "+Object.keys(markers).length);
      if (!enableMarker || currentZoom < DISPLAY_MARKER_THRESHOLD) {
//      if (!enableMarker ){
//      if (true){
        return markers.forEach(function(v) {
	  if ( v && v.setMap ){
	    markersCleared++;
            return v.setMap(null);
	  } else {
	    noMarkersCleared++;
	  }
        });
      } else {
	console.dir("! enableMarker");
      }
//      markers = [];
//      polygons = [];
      console.dir("after polygons: " + Object.keys(polygons).length);
      console.dir("after polygonsCleared: " + polygonsCleared);
      console.dir("after noPolygonsCleared: " + noPolygonsCleared);
      console.dir("after markers: " + Object.keys(markers).length);
      console.dir("after markersCleared: " + markersCleared);
      console.dir("after noMarkersCleared: " + noMarkersCleared);
    };
    //

    redraw = function(force) {
      var bounds, bufferRange, newLatLng, newZoom, voronoi, voronois;
      newLatLng = map.getCenter();
      newZoom = map.getZoom();

      // 最新の座標とズームを localStorage に保存
      if ( newLatLng ){
	localStorage.setItem('ekimemo_lat', newLatLng.lat());
	localStorage.setItem('ekimemo_lng', newLatLng.lng());
      } else {
	localStorage.setItem('ekimemo_lat', MAP_CENTER_DEFAULT.lat);
	localStorage.setItem('ekimemo_lng', MAP_CENTER_DEFAULT.lng);
      }

      localStorage.setItem('ekimemo_zoom', newZoom);

      document.getElementById('all_stations_num').textContent = stations.length;
      document.getElementById('checked_stations_num').textContent = checkedList.length;
      document.getElementById('checked_percentage').textContent = Math.trunc(checkedList.length / stations.length*10000)/100;

      if (force == null) {
        force = false;
      }

      // force でない、経度/緯度の変更が少ない、zoom レベル変動なし をすべて満たす場合、
      // 再描画の必要なしとして戻る。
      if (!force && currentLatLng &&
	  Math.abs(currentLatLng.lat() - newLatLng.lat()) < 0.2 &&
	  Math.abs(currentLatLng.lng() - newLatLng.lng()) < 0.2 &&
	  currentZoom && currentZoom === newZoom) {

        return;
      }
      currentLatLng = newLatLng;
      currentZoom = newZoom;
      map.clearOverlays();
//      polygons = [];
//      markers = [];
      bufferRange = 0.5;
      bounds = map.getBounds();

      console.log("stations.filter");
      let tmp = stations.filter(function(v) {
	let select = document.getElementById('abandoned');
        let abandoned_mode = select.options[select.selectedIndex].value;

        if ( abandoned_mode==='0' ){
          // 現行駅・廃駅両方表示
          return true;
        } else if ( abandoned_mode==='1' ){
          // 廃駅のみ
          return v.type === "2";
        } else if ( abandoned_mode==='2' ){
          // 現行駅のみ
          return v.type === "1";
        }
      });
      stationsFilter = tmp.filter(function(v) {
	if ( ! ( v.lat > bounds.getSouthWest().lat() - bufferRange
		 && v.lat < bounds.getNorthEast().lat() + bufferRange
		 && v.lng > bounds.getSouthWest().lng() - bufferRange
		 && v.lng < bounds.getNorthEast().lng() + bufferRange ) ){
	  return false;
	}

	if ( currentPrefCode !== null ){
	  if ( ! stationPrefs.has(v.cd) || currentPrefCode !== stationPrefs.get(v.cd).pref_code ){
	    return false;
	  }
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
            fillColor = +d.type===1 ? checkedFillColor : checkedAbandonedFillColor; // 取得済みポリゴン塗りつぶし色 (初期表示)
          } else {
            fillColor = 'transparent';
          }
          if (currentZoom >= DISPLAY_MARKER_THRESHOLD) {
            strokeWeight = 1;
          } else {
            strokeWeight = 1;
          }
          polygon = new google.maps.Polygon({
            paths: paths,
            strokeColor: '#f00', // ポリゴン枠線
            strokeOpacity: .3, // ポリゴン枠線不透明度
            strokeWeight: strokeWeight,
            fillColor: fillColor,
            fillOpacity: .2 // 塗りつぶし不透明度
          });

          // ポリゴンダブルクリック時のトグル動作 (駅取得/クリア)
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
                  fillColor: +d.type===1 ? checkedFillColor : checkedAbandonedFillColor // 取得済み駅塗りつぶし (ダブルクリック時)
              });
            }
            redraw();
            return localStorage.setItem('ekimemo_checkedList', JSON.stringify(checkedList));
          });

          polygon.setMap(map);
//          polygons.push(polygon);
          polygons[d.cd]=polygon;
        }
	document.querySelector('#polygons_num').textContent = Object.keys(polygons).length;
	document.querySelector('#markers_num').textContent = Object.keys(markers).length;

        if (enableMarker && currentZoom >= DISPLAY_MARKER_THRESHOLD) {
          if (!markers[d.cd]) {
            if (+d.type === 2) {
              icon = iconList.sphereGray;
            } else {
              icon = iconList.sphereRed;
            }
	    // 廃駅か、通常駅で未取得か、都道府県絞り込み中ならマーカー表示
            if (+d.type === 2 || checkedList.indexOf(d.cd) === -1 || currentPrefCode ) {
              marker = new google.maps.Marker({
                position: new google.maps.LatLng(d.lat, d.lng),
                map: map,
                icon: icon,
                title: d.name,

		/*
		label: {
		  text: d.name,
		  color: '#ff0000',
		  fontFamily: 'sans-serif',
		  fontWeight: 'bold',
		  fontSize: '14px',
		}
		*/
              });
            }
            return markers[d.cd] = marker;
          }
        }
      });
    };
    addRaderMarker = function(latLng, dist, i) {
      var bgColor;
      bgColor = (255 - i * 15).toString(16) + (220 - i * 8).toString(16) + '66';
      return raderMarkers.push(new google.maps.Marker({
        position: latLng,
        map: map,
        icon: 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=' + (i + 1) + '|' + bgColor + '|000000',
        animation: google.maps.Animation.DROP,
        clickable: false
      }));
    };
    raderCenter = new google.maps.Marker({
      icon: iconList.raderCenter,
      animation: google.maps.Animation.DROP,
      draggable: true
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
      ref = distances.slice(0, 14);
      results1 = [];
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        d = ref[i];
        results1.push(setTimeout(function(d, i) {
          return addRaderMarker(d.latLng, d.dist, i);
        }, i * 150, d, i));
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
	  option.text = v.name + '(' + stationPrefs.get(v.cd).pref_name + ')';
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

    // マップ移動・ズームなどを行ったあと、処理に余裕ができた (idle) ら再描画
    google.maps.event.addListener(map, 'idle', function() {
      return redraw();
    });

    if (!localStorage.getItem('ekimemo_updated') || $("#modal .update-date").data('updated') > localStorage.getItem('ekimemo_updated')) {
      localStorage.setItem('ekimemo_updated', $("#modal .update-date").data('updated'));
      $("#modal").openModal();
    }
    // ポリゴンボタンクリック (トグル)
    $(".js-btn-polygon").off('click');
    $(".js-btn-polygon").on('click', function() {
      console.log("polygon-click");
      if ($(this).hasClass('disabled')) {
	console.log("polygon change to enable");
        $(this).removeClass('disabled');
        $(this).addClass('teal');
        enablePolygon = true;
      } else {
	console.log("polygon change to disable");
        $(this).removeClass('teal');
        $(this).addClass('disabled');
        enablePolygon = false;
      }
      $(".fixed-action-btn").removeClass('active');
      return redraw(true);
    });
    // マーカーボタンクリック (トグル)
    $(".js-btn-marker").off('click');
    $(".js-btn-marker").on('click', function() {
      console.log("marker-click");
      if ($(this).hasClass('disabled')) {
	console.log("marker change to enable");
        $(this).removeClass('disabled');
        $(this).addClass('cyan');
        enableMarker = true;
      } else {
	console.log("marker change to disable");
        $(this).removeClass('cyan');
        $(this).addClass('disabled');
        enableMarker = false;
      }
      $(".fixed-action-btn").removeClass('active');
      return redraw(true);
    });
    // レーダーボタンクリック
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

function init(){
  var e;
  if (localStorage.getItem('ekimemo_checkedList')) {
    // 不正な JSON 形式であった場合のチェック
    try {
      checkedList = JSON.parse(localStorage.getItem('ekimemo_checkedList'));
    } catch (error) {
      e = error;
      console.log(e);
      checkedList = [];
    }
  }

  return d3.csv('./data/stations.csv?xxxx', function(stations) {
    d3.csv('./data/station_pref.csv?xxxxx', function(stationPrefs){
      d3.csv('./data/prefs_ekimemo.csv?x', function(prefs){
	return main(stations, stationPrefs, prefs);
      })
    })
  });
}

$(function() {
    init();
});
