/* 地图初始化喽~~~~ */
var NAV_GPS = [120.001524, 30.279998];
var map, marker, marklist = [],
    polyLine, lineArr = [],
    clickPointLatLng;
lineArr.push({
    lng: NAV_GPS[0],
    lat: NAV_GPS[1]
});
var flagMap = 0;
var flagRight = 0;

function initMap() {
    map = new google.maps.Map(document.getElementById('container'), {
        center: {
            lat: NAV_GPS[1],
            lng: NAV_GPS[0]
        },
        zoom: 13
    });
    map.data.setStyle({
        cursor: 'crosshair'
    });
    map.addListener('click', function(e) {
        clickPointLatLng = e.latLng;
        var ele = new google.maps.ElevationService();
        ele.getElevationForLocations({
            locations: [e.latLng]
        }, function(param1, param2) {
            if (param2.toUpperCase() == 'OK') {
                $('#elevation').text(param1[0].elevation.toFixed(1));
            }
        });
        if (flagRight == 0 && flagMap == 0) {
            if (marker) {
                marker.setPosition(clickPointLatLng);
            } else {
                marker = new google.maps.Marker({
                    map: map,
                    draggable: true,
                    position: clickPointLatLng,
                    title: Local_count.toString(),
                    icon: {
                        size: new google.maps.Size(22, 34),
                        anchor: new google.maps.Point(10, 32),
                        origin: new google.maps.Point(((Local_count - 1) % 10) * 21, Math.floor((Local_count - 1) / 10) * 35),
                        scaledSize: new google.maps.Size(212, 350),
                        url: '../images/markers.png'
                    }
                });
                marker.addListener('drag', function(e) {
                    var num = this.title * 1;
                    if (num <= lineArr.length) {
                        if ($('.single-right-up-sub').eq(num).length > 0) {
                            lineArr[num] = e.latLng;
                            polyLine.setPath(lineArr);
                            var inputs = $('.single-right-up-sub').eq(num).find('input');
                            inputs[0].value = e.latLng.lng().toFixed(7);
                            inputs[1].value = e.latLng.lat().toFixed(7);
                        }

                    }
                });
                marklist.push(marker);
                Local_count++;

            }
            flagMap = 1;
            flagRight = 0;
            // console.log("flagMap is",flagMap);
            // console.log("flagRight is", flagRight);
        }
        IWantYou({
            map: map,
            target: $('body')
        });
    });
    map.addListener('rightclick', function(e) {
        marker = null;
        if (flagRight == 0 && flagMap == 1) {
            if (lineArr.length == Local_count - 1) {
                lineArr.push(clickPointLatLng);
                polyLine.setPath(lineArr);
                addFlightPoint();
                flagMap = 0;
                flagRight = 0;
            }
        }
        // console.log("flagMap is",flagMap);
        // console.log("flagRight is", flagRight);

    });
    polyLine = new google.maps.Polyline({
        map: map,
        path: lineArr,
        strokeColor: common.colors.PointLine,
        strokeOpacity: 1,
        strokeWeight: 3,
        strokeStyle: "solid"
    });
    marklist[0] = null;
    map.data.setStyle({
        cursor: 'crosshair'
    });
    connect();
}

var finalData = {};
var results = {};
var infos = {
    local_position_ned: {
        x: 0,
        y: 0,
        z: 0
    },
    heartbeat: {
        base_mode: 0,
        system_status: 0
    },
    mission_ack_2: {
        target_uav: 1,
        target_system: 1,
        type: 8,
        count: 4,
        point: [{
            lat: 30.27760124206543,
            lon: 120.00386047363281,
            alt: 25,
            v: 2
        }, {
            lat: 30.276304244995117,
            lon: 120.0072021484375,
            alt: 25,
            v: 2
        }, {
            lat: 30.2739315032959,
            lon: 120.0066909790039,
            alt: 25,
            v: 2
        }, {
            lat: 30.2739315032959,
            lon: 120.00291442871094,
            alt: 25,
            v: 2
        }]
    },
    mission_ack_3: {
        target_uav: 1,
        target_system: 1,
        type: 8,
        count: 4,
        point: [{
            lat: 30.27760124206543,
            lon: 120.00386047363281,
            alt: 25
        }, {
            lat: 30.276304244995117,
            lon: 120.0072021484375,
            alt: 25
        }, {
            lat: 30.2739315032959,
            lon: 120.0066909790039,
            alt: 25
        }, {
            lat: 30.2739315032959,
            lon: 120.00291442871094,
            alt: 25
        }]
    }
};
var common = {
    colors: {
        PointLine: '#e63f00',
        FlightLine: '#1188fa'
    }
};
var flight;
var Local_count = 1;
var length = 0;
var FilghtPoints = [];
var LE = true;
var ctrH = 0;
var draw_line = 0;
var imageReturn = {};
var imageNum = 9;
var imageAllData = '';
var flightPointClick = function(ele) {
    var target = $(ele).parent();
    if (target.hasClass('select')) {
        target.removeClass('select');
    } else {
        target.addClass('select');
    }
};

if (window.location.search.split('?')[1]) {
    var tempinfos = window.location.search.split('?')[1];
    if (tempinfos.split('&').length == 2) {
        infos['token'] = decodeURIComponent(tempinfos.split('&')[1].split('=')[1]);
    }
    infos['heartbeat']['id_uav_xyi'] = tempinfos.split('&')[0].split('=')[1];
    document.getElementById('heartbeat.id_uav_xyi').innerText = infos['heartbeat']['id_uav_xyi'];
} else {
    alert('未选择飞行器id！');
}
var ws = null;
var curDataTime, lastDataTime, dataTime;
var flagTime = 0;

function connect() {
    ws = new WebSocket(server);
    console.info('in connect!');
    if (!ws) {
        alert("您的浏览器版本太低,不支持WebSocket,建议使用最新版本的Chrome Firefox或者IE");
        window.opener = null;
        window.open('', '_self');
        window.close();
    }
    ws.binaryType = "arraybuffer";

    ws.onopen = function() {
        console.log('websocket connected', server);
        var token = "";
        if (infos['token']) {
            token = infos['token'];
            console.log(token);
            var length = 7 + token.length;
            var ab = new ArrayBuffer(length);
            var buffer = new DataView(ab);
            var result = '';
            buffer.setUint8(0, 249);
            buffer.setInt32(1, infos['heartbeat']['id_uav_xyi'], LE);
            buffer.setUint16(5, token.length, LE);
            for (var i = 0; i < token.length; i++) {
                buffer.setUint8(7 + i, token[i].charCodeAt());
            }
            //console.log(buffer.byteLength,buffer.getInt32(1,LE),buffer.getUint16(5,LE),String.fromCharCode.apply(null, new Uint8Array(buffer, 7, token.length)));
            ws.send(buffer);
        } else {
            var length = 5;
            var ab = new ArrayBuffer(length);
            var buffer = new DataView(ab);
            buffer.setUint8(0, 249);
            buffer.setInt32(1, infos['heartbeat']['id_uav_xyi'], LE);
            //console.log(buffer.byteLength,buffer.getUint8(0),buffer.getInt32(1,LE));
            ws.send(buffer);
            $("#clearRemoteData").hide();
        }
    };
    ws.onerror = function(error) {
        console.log("websocket", error);
    };

    // function abandonData(curtime,lasttime){
    //     curDataTime=curtime;
    //     lastDataTime=lasttime;
    //     if(curDataTime<lastDataTime){
    //         return
    //     }else{
    //         lastDataTime=curDataTime;
    //     }
    // }
    ws.onmessage = function(res) {
        losingTime = 0;
        results = res;
        finalData = res.data;
        var dv = new DataView(res.data);
        var begin = 0;
        // var old = [infos['local_position_ned']['x'], infos['local_position_ned']['y'], infos['local_position_ned']['z']];
        var old = [infos['local_position_ned']['x'], infos['local_position_ned']['y'], infos['local_position_ned']['z']];



        var msgid = dv.getUint8(begin);
        // console.log('msgid is',msgid);
        // console.log('infos["heartbeat"]["base_mode"] is',infos['heartbeat']['base_mode']);
        if (msgid == 1) {
            //heartbeat解析
            begin += 1;
            console.info('Heart beng~beng~beng~');

            if (dv.getUint8(begin) == document.getElementById('heartbeat.id_uav_xyi').innerText) {
                infos['heartbeat'] = {};
                infos['heartbeat']['id_uav_xyi'] = dv.getUint8(begin);
                begin += 1;
                infos['heartbeat']['id_iso_xyi'] = dv.getUint8(begin);
                begin += 1;
                //新协议
                infos['heartbeat']['base_mode'] = dv.getUint8(begin);
                begin += 1;
                infos['heartbeat']['system_status'] = dv.getUint8(begin);
                begin += 1;
                //新协议结束
                infos['heartbeat']['xylink_version'] = dv.getUint8(begin);
                begin += 1;
                if (flight) {

                } else {
                    drapExpFlightMarker();
                }
            }
            setValueFromInfos('heartbeat', 'id_uav_xyi');
            setValueFromInfos('heartbeat', 'base_mode', system_status_flag[infos.heartbeat.base_mode], true);
            // console.log(" infos['heartbeat']['system_status'] is ", infos['heartbeat']['system_status']);
            changeCtlIcons(infos['heartbeat']['system_status']);
            //降落后，起点为降落点
            if (infos['heartbeat'] && infos['heartbeat']['base_mode'] == 11) {
                // var inputs = $('.single-right-up-block').eq(0).find('input');
                var inputs = $('.single-right-up-sub').eq(0).find('input');
                inputs[1].value = infos['gps_raw']['lat_gps'];
                inputs[0].value = infos['gps_raw']['lon_gps'];
            }
            var txtColor = document.getElementById('heartbeat.base_mode');
            if (infos['heartbeat'] && infos['heartbeat']['base_mode'] == 34) {
                txtColor.style.color = "#fd0";
            } else {
                txtColor.style.color = "#bbfbfc";
            }
        } else if (msgid == 2) {
            //battery_status解析
            begin += 1;
            if (dv.getUint8(begin) == document.getElementById('heartbeat.id_uav_xyi').innerText) {
                begin += 1;
                // 数据包是否过时
                if (flagTime == 0) {
                    // console.log('flagTime is', flagTime);
                    dataTime = dv.getUint32(begin, LE);
                    curDataTime = dv.getUint32(begin, LE);
                    lastDataTime = curDataTime;
                    flagTime = 1;
                    // console.log('dataTime is',dataTime);
                    // console.log('curDataTime is',curDataTime);
                    // console.log('lastDataTime is',lastDataTime);
                } else {
                    lastDataTime = dataTime;
                    curDataTime = dv.getUint32(begin, LE);

                    if (curDataTime < lastDataTime) {
                        return;
                        console.log("不接受过时包");
                        // alert('该包已经过时了！');
                    } else {

                        lastDataTime = curDataTime;
                        dataTime = curDataTime;
                        // console.log("接受新包");
                        // console.log('flagTime is' ,flagTime);
                        // console.log('dataTime is',dataTime);
                        // console.log('curDataTime is',curDataTime);
                        // console.log('lastDataTime is',lastDataTime);


                        /* 20160529新协议，增加time_std_s*/
                        infos['battery_status'] = {};
                        infos['battery_status']['time_std_s'] = 0;
                        infos['battery_status']['time_std_s'] = dv.getUint32(begin, LE);
                        infos['time_step'] = new Date().getTime() / 1000 - dv.getUint32(begin, LE);
                        infos['last_date'] = dv.getUint32(begin, LE);
                        begin += 4;
                        /* 20160529新协议，增加time_std_s*/
                        infos['battery_status']['voltages'] = [];
                        for (var i = 0; i < 10; i++) {
                            infos['battery_status']['voltages'][i] = (dv.getUint16(begin, LE) / 1000).toFixed(2);
                            begin += 2;
                        }
                        // var voltagesOne=(infos['battery_status']['voltages'][0] / 1000).toFixed(2);
                        infos['battery_status']['current_battery'] = dv.getInt16(begin, LE);
                        begin += 2;
                        infos['battery_status']['battery_remaining'] = dv.getInt8(begin);
                        begin += 1;
                        // infos['battery_status']['fc_output_ave'] = dv.getUint16(begin, LE);
                        // begin += 2;

                        // setValueFromInfos('battery_status', 'voltages',(infos['battery_status']['voltages'][0] / 1000).toFixed(2),true);
                        setValueFromInfos('battery_status', 'voltages');
                        setValueFromInfos('battery_status', 'current_battery');
                        setValueFromInfos('battery_status', 'battery_remaining');
                        setValueFromInfos('battery_status', 'fc_output_ave');
                        /*if (infos['battery_status']['battery_remaining'] <= 25) {
                         nav.src = "../images/uav/flight4.png";
                         } else if (infos['battery_status']['battery_remaining'] <= 50) {
                         nav.src = "../images/uav/flight3.png";
                         } else if (infos['battery_status']['battery_remaining'] <= 75) {
                         nav.src = "../images/uav/flight2.png";
                         } else {
                         nav.src = "../images/uav/flight1.png";
                         }*/

                    }

                }


            }
        } else if (msgid == 3) {
            //local_position_ned解析
            begin += 1;
            if (dv.getUint8(begin) == document.getElementById('heartbeat.id_uav_xyi').innerText) {
                begin += 1;
                infos['local_position_ned'] = {};
                infos['local_position_ned']['time_std_s'] = 0;
                infos['local_position_ned']['time_std_s'] = dv.getUint32(begin, LE);
                infos['time_step'] = new Date().getTime() / 1000 - dv.getUint32(begin, LE);
                infos['last_date'] = dv.getUint32(begin, LE);
                infos['local_position_ned']['loseWSTime'] = infos['local_position_ned']['time_std_s'];
                begin += 4;
                infos['local_position_ned']['x'] = dv.getFloat32(begin, LE).toFixed(2);
                begin += 4;
                infos['local_position_ned']['y'] = dv.getFloat32(begin, LE).toFixed(2);
                begin += 4;
                infos['local_position_ned']['z'] = dv.getFloat32(begin, LE).toFixed(2);
                begin += 4;
                infos['local_position_ned']['vx'] = dv.getFloat32(begin, LE).toFixed(2);
                begin += 4;
                infos['local_position_ned']['vy'] = dv.getFloat32(begin, LE).toFixed(2);
                begin += 4;
                infos['local_position_ned']['vz'] = dv.getFloat32(begin, LE).toFixed(2);
                begin += 4;
                infos['local_position_ned']['dis_m'] = dv.getFloat32(begin, LE).toFixed(1);
                begin += 4;
                setValueFromInfos('local_position_ned', 'time_std_s');
                setValueFromInfos('local_position_ned', 'x');
                setValueFromInfos('local_position_ned', 'y');
                setValueFromInfos('local_position_ned', 'z');
                setValueFromInfos('local_position_ned', 'vx');
                setValueFromInfos('local_position_ned', 'vy');
                setValueFromInfos('local_position_ned', 'vz');
                $('#FlightLength').text(infos['local_position_ned']['dis_m']);
            }
        } else if (msgid == 4) {
            //global_position_int解析
            begin += 1;
            if (dv.getUint8(begin) == document.getElementById('heartbeat.id_uav_xyi').innerText) {
                begin += 1;
                infos['global_position_int'] = {};
                infos['global_position_int']['time_std_s'] = 0;
                infos['global_position_int']['time_std_s'] = dv.getUint32(begin, LE);
                infos['time_step'] = new Date().getTime() / 1000 - dv.getUint32(begin, LE);
                infos['last_date'] = dv.getUint32(begin, LE);
                begin += 4;
                infos['global_position_int']['relative_alt'] = (dv.getInt32(begin, LE) / 1000).toFixed(1);
                begin += 4;
                infos['global_position_int']['hdg'] = dv.getUint16(begin, LE) / 100;
                begin += 2;
                setValueFromInfos('global_position_int', 'time_boot_ms', infos.global_position_int.time_boot_ms / 600, true);
                setValueFromInfos('global_position_int', 'relative_alt');
                setValueFromInfos('global_position_int', 'hdg');
                if (flight) {
                    //$('img[src="../images/uav/flight1.png"]').style.transform = 'rotate('+infos['global_position_int']['hdg']+'deg)';
                    // $('img[src="../images/uav/flight1.png"]').css('transform', 'rotate(' + infos['global_position_int']['hdg'] + 'deg)');
                    // console.log(infos['global_position_int']['hdg'])
                    // if (infos["heartbeat"] && ((infos["heartbeat"]["base_mode"] >= 1 && infos["heartbeat"]["base_mode"] <= 4) || infos["heartbeat"]["base_mode"] == 52)) {
                    //     $('#' + document.getElementById('heartbeat.id_uav_xyi').innerText).css('transform', 'rotate(0deg)');
                    // } else {
                    //     $('#' + document.getElementById('heartbeat.id_uav_xyi').innerText).css('transform', 'rotate(' + infos['global_position_int']['hdg'] + 'deg)');
                    // }
                    if (infos["heartbeat"]) {
                        $('#' + document.getElementById('heartbeat.id_uav_xyi').innerText).css('transform', 'rotate(' + infos['global_position_int']['hdg'] + 'deg)');
                    }
                    /*$('img[src="../images/uav/flight1.png"]').parent().each(function () {
                     if(this.title){
                     }else{
                     $(this).css('transform','rotate('+infos['global_position_int']['hdg']+'deg)');
                     }
                     });*/
                }
            }
        } else if (msgid == 5) {
            //gps_raw解析
            // console.log('msgid', msgid, 'id length', dv.byteLength);

            begin += 1;
            if (dv.getUint8(begin) == document.getElementById('heartbeat.id_uav_xyi').innerText) {
                begin += 1;
                infos['gps_raw'] = {};
                infos['gps_raw']['time_std_s'] = 0;
                infos['gps_raw']['time_std_s'] = dv.getUint32(begin, LE);
                infos['time_step'] = new Date().getTime() / 1000 - dv.getUint32(begin, LE);
                infos['last_date'] = dv.getUint32(begin, LE);
                begin += 4;
                infos['gps_raw']['fix_type'] = dv.getUint8(begin);
                begin += 1;
                var lat = parseFloat(dv.getInt32(begin, LE)) / 1E7
                infos['gps_raw']['lat_gps'] = lat;
                begin += 4;
                var lon = parseFloat(dv.getInt32(begin, LE)) / 1E7
                infos['gps_raw']['lon_gps'] = lon;
                begin += 4;
                var alt = parseFloat(dv.getInt32(begin, LE)) / 1E7
                infos['gps_raw']['alt_gps'] = alt;
                begin += 4;
                infos['gps_raw']['eph'] = dv.getUint16(begin, LE);
                begin += 2;
                infos['gps_raw']['epv'] = dv.getUint16(begin, LE);
                begin += 2;
                infos['gps_raw']['vel_gps'] = dv.getUint16(begin, LE) / 100;
                begin += 2;
                infos['gps_raw']['cog'] = dv.getUint16(begin, LE) / 100;
                begin += 2;
                infos['gps_raw']['satellites_visible'] = dv.getUint8(begin);
                begin += 1;
                setValueFromInfos('gps_raw', 'time_boot_ms', infos.gps_raw.time_boot_ms / 600, true);
                setValueFromInfos('gps_raw', 'fix_type');
                setValueFromInfos('gps_raw', 'lat_gps');
                setValueFromInfos('gps_raw', 'lon_gps');
                setValueFromInfos('gps_raw', 'alt_gps');
                setValueFromInfos('gps_raw', 'eph');
                setValueFromInfos('gps_raw', 'epv');
                setValueFromInfos('gps_raw', 'vel_gps');
                setValueFromInfos('gps_raw', 'cog');
                setValueFromInfos('gps_raw', 'satellites_visible');
                NAV_GPS = [infos['gps_raw']['lon_gps'], infos['gps_raw']['lat_gps']];
                lineArr[0] = {
                    lng: NAV_GPS[0],
                    lat: NAV_GPS[1]
                };
                if (infos['heartbeat']['system_status'] == 0) {
                    map.setCenter(lineArr[0]);
                }
                if (flight) {
                    flight.setPosition(lineArr[0]);
                }

                $('#start input[name=lon]').val(infos['gps_raw']['lon_gps']);
                $('#start input[name=lat]').val(infos['gps_raw']['lat_gps']);

                // console.log(infos.gps_raw);
            }
        } else if (msgid == 101) {} else if (msgid == 102) {
            //command_xyi_long解析
            console.log('msgid', msgid, dv.getUint8(begin + 1), dv.getUint16(begin + 2, LE), dv.getUint8(begin + 4));
            infos['command_ack'] = {};
            begin += 1;
            if (dv.getUint8(begin) == document.getElementById('heartbeat.id_uav_xyi').innerText) {
                begin += 1;
                infos['command_ack']['command'] = dv.getUint16(begin, LE);
                begin += 2;
                infos['command_ack']['result'] = dv.getUint8(begin);
                begin += 1;
                if (infos['command_ack']['command'] == 3 && infos['command_ack']['result'] == 0) { //指令3且执行成功
                    /* Just for you, my dear kongzhi tiaocan!! 就为了你，我亲爱的控制调参   */
                    alert(command_ack_flag[infos['command_ack']['result']]);
                    $('#pid').modal('hide');
                } else if (infos['command_ack']['command'] == 4 && infos['command_ack']['result'] == 0) {
                    /* Just for you, my dear kongzhi tiaocan!! 就为了你，我亲爱的控制调参   */
                    alert(command_ack_flag[infos['command_ack']['result']]);
                    $('#pid').modal('hide');
                    if (ctrH == 0) {
                        ctrH = 1;
                        // e.innerText="退出";
                        document.getElementById("ctrByHand").innerText = "退出";
                        document.getElementById("ctrHTips").innerText = "(——您已进入人工操控模式)";
                        console.info('control by hand');
                    } else {
                        ctrH = 0;
                        // e.innerText="退出";
                        document.getElementById("ctrByHand").innerText = "进入";
                        document.getElementById("ctrHTips").innerText = "(——您已退出人工操控模式)";
                        console.info('quit controling by hand');
                    }

                } else if (infos['command_ack']['command'] != 3 && infos['command_ack']['result'] > 0) {
                    alert(command_ack_flag[infos['command_ack']['result']]);
                }
            }
        } else if (msgid == 106) {
            //command_xyi_long解析
            console.log(msgid, 'back');
            infos['mission_ack'] = {};
            begin += 1;
            if (dv.getUint8(begin) == document.getElementById('heartbeat.id_uav_xyi').innerText) {
                infos['mission_ack']['target_uav'] = dv.getUint8(begin);
                begin += 1;
                infos['mission_ack']['target_system'] = dv.getUint8(begin);
                begin += 1;
                infos['mission_ack']['type'] = dv.getUint8(begin);
                begin += 1;
                if (infos['mission_ack']['type'] > 0) {
                    alert(mission_ack_flag[infos['mission_ack']['type']][0]);
                }
            }
        } else if (msgid == 108) {
            //mission_ack_2航点查询解析
            console.log(msgid, 'back', dv.byteLength, dv.getUint8(begin + 1));
            begin += 1;
            if (dv.getUint8(begin) == infos['heartbeat'].id_uav_xyi) {
                infos['mission_ack_2'] = {};
                console.log('id', infos['heartbeat'].id_uav_xyi);
                infos['mission_ack_2']['target_uav'] = dv.getUint8(begin);
                begin += 1;
                infos['mission_ack_2']['target_system'] = dv.getUint8(begin);
                begin += 1;
                infos['mission_ack_2']['type'] = dv.getUint8(begin);
                begin += 1;
                infos['mission_ack_2']['count'] = dv.getUint16(begin, LE);
                if (infos['mission_ack_2']['count'] == 256) {
                    infos['mission_ack_2']['count'] = (dv.byteLength - 7) / 16;
                }
                begin += 2;
                infos['mission_ack_2']['frame'] = dv.getUint8(begin);
                begin += 1;
                infos['mission_ack_2']['point'] = [];
                for (var i = 0; i < infos['mission_ack_2']['count']; i++) {
                    var point = {}
                    var lat = dv.getFloat32(begin, LE);
                    point['lat'] = lat;
                    //point['lat'] = (lat / Math.PI) * 180 - 0.002450;
                    begin += 4;
                    var lon = dv.getFloat32(begin, LE);
                    point['lon'] = lon;
                    //point['lon'] = (lon / Math.PI) * 180 + 0.004740;
                    begin += 4;
                    point['alt'] = dv.getFloat32(begin, LE).toFixed(2);
                    begin += 4;
                    point['v'] = dv.getFloat32(begin, LE).toFixed(2);
                    begin += 4;
                    infos['mission_ack_2']['point'][i] = point;
                }

                if (infos['heartbeat']['base_mode']) {
                    drawSearchPoint();
                } else {
                    //一般情况下，在线状态显示的，才是上一次的返回点吧！！
                    drawSearchPoint(true);
                }
                // console.log(infos.gps_raw);

                // if(!flight){
                //     // NAV_GPS[0] = 120.001524;
                //     // NAV_GPS[1] = 30.279998;
                //     NAV_GPS[0] = infos['mission_ack_2']['point'][0].lon;
                //     NAV_GPS[1] = infos['mission_ack_2']['point'][0].lat;
                //     lineArr[0] = {
                //         lng:NAV_GPS[0],
                //         lat:NAV_GPS[1]
                //     }
                //     drapExpFlightMarker();
                // }
                if (draw_line == 0) {
                    draw_line = 1;
                }
                console.log("infos['mission_ack_2'] is", infos['mission_ack_2']);
            }
        } else if (msgid == 109) {
            //mission_ack_3备降点查询
            infos['mission_ack_3'] = {};
            begin += 1;
            if (dv.getUint8(begin) == document.getElementById('heartbeat.id_uav_xyi').innerText) {
                infos['mission_ack_3']['target_uav'] = dv.getUint8(begin);
                begin += 1;
                infos['mission_ack_3']['target_system'] = dv.getUint8(begin);
                begin += 1;
                infos['mission_ack_3']['type'] = dv.getUint8(begin);
                begin += 1;
                infos['mission_ack_3']['count_em'] = dv.getUint16(begin, LE);
                begin += 2;
                infos['mission_ack_3']['point'] = [];
                for (var i = 0; i < infos['mission_ack_3']['count_em']; i++) {
                    var point = {}
                    var lat = dv.getFloat32(begin, LE);
                    point['lat'] = (lat / Math.PI) * 180 - 0.002450;
                    begin += 4;
                    var lon = dv.getFloat32(begin, LE);
                    point['lon'] = (lon / Math.PI) * 180 + 0.004740;
                    begin += 4;
                    point['alt'] = dv.getFloat32(begin, LE).toFixed(2);
                    begin += 4;
                    infos['mission_ack_3']['point'][i] = point;
                }
                drawSearchEnd();
            }
        } else if (msgid == 125) {
            //图片分批回传
            console.log('msgid', msgid, 'id length', dv.byteLength);
            infos['image_data'] = {};
            begin += 1;
            // var id = dv.getUint8(begin);
            // console.log(dv.getUint8(begin),dv.getUint32(begin,LE));
            if (dv.getUint8(begin) == document.getElementById('heartbeat.id_uav_xyi').innerText) {
                begin += 1;
                infos['image_data']['image_id'] = dv.getUint32(begin, LE);
                var imageId = dv.getUint8(begin);
                begin += 4;
                infos['image_data']['image_piece_num'] = dv.getUint8(begin);
                begin += 1;
                // var curimageNum=infos['image_data']['image_piece_num'];
                infos['image_data']['image_piece_id'] = dv.getUint8(begin);
                begin += 1;
                // var length=dv.byteLength - begin;

                if (!imageReturn[imageId]) {
                    imageReturn[imageId] = {};
                    imageReturn[imageId]['image_data'] = {};
                }
                imageReturn[imageId]['image_data'] = infos['image_data'];
                if (imageReturn[imageId]['image_data']['image_id'] == infos['image_data']['image_id']) {
                    var len = dv.byteLength - begin;
                    var pic = "";
                    var arr = new Uint8Array(res.data, begin, len);
                    for (var i = 0; i < arr.length; ++i) {
                        pic += String.fromCharCode(arr[i]);
                    }
                    imageAllData += pic;
                    console.log(imageReturn[imageId]['image_data']);
                    console.log('imageReturn[imageId]["image_data"]["image_id"] is ', imageReturn[imageId]['image_data']['image_id']);
                    if (imageReturn[imageId]['image_data']['image_piece_id'] + 1 == imageReturn[imageId]['image_data']['image_piece_num']) {
                        // console.log(imageReturn[imageId]['image_data']['image_piece_num'], imageReturn[id]['image_data']['image_piece_id'] + 1);
                        console.log(imageReturn[imageId]['image_data']['image_piece_id']);
                        imageAllData = btoa(imageAllData);

                        if (infos.heartbeat && infos.heartbeat.base_mode && infos.heartbeat.base_mode == 33) {
                            // if (infos['uavStop'] && infos['uavStop'] == true) {
                            //     $('#image').modal('show');
                            // }
                            $('#image').modal('show');
                            $('#imgZoom').attr('src', 'data:image/jpg;base64,' + imageAllData);
                            imageAllData = '';
                        } else {
                            $("#leftMain1").hide();
                            $("#leftMain2").show();
                            $('#leftMainImg').attr('src', 'data:image/jpg;base64,' + imageAllData);
                            imageAllData = '';
                        }


                    }
                }
            }

        } else if (msgid == 126) {
            console.log('msgid', msgid, 'id length', dv.byteLength);
            begin += 1;
            var id = dv.getUint8(begin);
            begin += 4;
            var len = dv.byteLength - begin;
            var uid;
            if (infos['heartbeat']['id_uav_xyi'] == id && infos['heartbeat'] && infos['heartbeat']['base_mode'] == 5) {
                // uid = btoa(String.fromCharCode.apply(null, new Uint8Array(res.data, begin, len)));
                var pic = "";
                var arr = new Uint8Array(res.data, begin, len);
                for (var i = 0; i < arr.length; ++i) {
                    pic += String.fromCharCode(arr[i]);
                }
                pic = btoa(pic);
                $("#leftMain1").hide();
                $("#leftMain2").show();
                $('#leftMainImg').attr('src', 'data:image/jpg;base64,' + pic);
            } else {
                $("#leftMain1").show();
                $("#leftMain2").hide();
            }
        } else
        if (msgid == 128) {
            console.log('msgid', msgid, 'id length', dv.byteLength);
            begin += 1;
            if (infos['uavStop'] && infos['uavStop'] == true) {
                $('#image').modal('show');
            }
            $('#image').modal('show');
            /*var id = dv.getInt32(begin,LE);
             begin += 4;*/
            var id = dv.getUint8(begin);
            begin += 4;
            var len = dv.byteLength - begin;
            var uid;
            if (infos['heartbeat']['id_uav_xyi'] == id) {
                // uid = btoa(String.fromCharCode.apply(null, new Uint8Array(res.data, begin, len)));
                var pic = "";
                var arr = new Uint8Array(res.data, begin, len);
                for (var i = 0; i < arr.length; ++i) {
                    pic += String.fromCharCode(arr[i]);
                }
                pic = btoa(pic);
            }
            $('#imgZoom').attr('src', 'data:image/jpg;base64,' + pic);
        } else if (msgid == 247) {
            console.log('msgid', msgid);
            $('#system  .modal-body h3').text('抱歉，没有权限');
            $('#system').modal('show');
        } else if (msgid == 248) {
            console.log('msgid', msgid);
            //gps_raw解析
            begin += 1;
            var id = dv.getInt32(begin, LE);
            begin += 4;
            var result = dv.getUint8(begin);
            if (result == 1 || infos['heartbeat']['id_uav_xyi'] != id) {
                $('#system  .modal-body h3').text('控制获取失败');
                $('#system').modal('show');
            }
        } else if (msgid == 253) {
            console.log('msgid', msgid);
            //gps_raw解析
            begin += 1;
            var id = dv.getInt32(begin, LE);
            begin += 4;
            if (infos['heartbeat']['id_uav_xyi'] == id) {
                var len = dv.getUint16(begin, LE);
                var uid = String.fromCharCode.apply(null, new Uint8Array(res.data, begin + 2, len));
                //confirmAlert('用户'+uid+'申请控制当前飞行器！');
                $('#confirm').data('uid', uid).modal('show');
            }
        } else if (msgid == 250) {
            console.log('msgid', msgid);
            //gps_raw解析
            begin += 1;
            var id = dv.getInt32(begin, LE);
            begin += 4;
            if (infos['heartbeat']['id_uav_xyi'] == id) {
                var len = dv.getUint16(begin, LE);
                var token = String.fromCharCode.apply(null, new Uint8Array(res.data, begin + 2, len));
                infos['token'] = token;
                window.location.href = 'singlegoogle.html?id=' + id + '&t=' + encodeURI(token);
            }
        } else if (msgid == 254) {
            console.log('msgid', msgid);
            //gps_raw解析
            begin += 1;
            var id = dv.getInt32(begin, LE);
            if (infos['heartbeat']['id_uav_xyi'] == id) {
                begin += 4;
                var type = dv.getUint8(begin);
                console.info(type);
                infos['flight-type'] = type;
                if (type == 1) {
                    $('#losttime').text('0');
                } else {
                    if (infos['time_step']) {
                        $('#losttime').text((new Date().getTime() / 1000).toFixed(0) - infos['time_step'].toFixed(0) - infos['last_date']);
                    }
                }
            }
        } else {
            console.error('Msgid=' + msgid + ' is not found!');
            console.error('Msg Length is ' + dv.byteLength);
        }
        /* 飞行距离已经从无人机返回，不需要进行计算了 */
        /*
        if((infos['heartbeat']['system_status'] == 3) || (infos['heartbeat']['system_status'] == 4) || (infos['heartbeat']['system_status'] == 5) || (infos['heartbeat']['system_status'] == 6)){
        $('#FlightLength').text(calcLength(old[0]-infos.local_position_ned.x, old[1]-infos.local_position_ned.y, old[2]-infos.local_position_ned.z));
        FilghtPoints.push(NAV_GPS);
        }else if((infos['heartbeat']['system_status'] == 0) || (infos['heartbeat']['system_status'] == 1)){
        $('#FlightLength').text('0');
        }*/
        //flight.setPosition({lng:,lat:})
    };
    ws.onclose = function() {
        console.log('websocket disconnected, prepare reconnect');
        ws = null;
        setTimeout(connect, 100);
    };
}

var confirmAlert = function(info) {
        $('#confirm .modal-body h3').text(info);
        $('#confirm').modal('show');
    }
    //common function
var uavStart = function() {
        if (infos.heartbeat && infos.heartbeat.base_mode && infos.heartbeat.base_mode == 52) {
            var length = 6 + 4 * 7;
            var ab = new ArrayBuffer(length);
            var buffer = new DataView(ab);
            buffer.setUint8(0, 101);
            buffer.setUint8(1, document.getElementById('heartbeat.id_uav_xyi').innerText * 1);
            buffer.setUint8(2, 0);
            //开始起飞指令
            buffer.setUint16(3, 1, LE);
            //buffer.setUint16(3, 4, LE);
            buffer.setUint8(5, 1);
            for (var i = 0; i < 7; i++) {
                buffer.setFloat32(6 + 4 * i, 0, LE);
            }
            ws.send(buffer);
            console.info('flight start');
        }
    }
    //common control by hands
var handI = 0;
var uavCtrlByHands = function(el) {
    if (infos.heartbeat && infos.heartbeat.base_mode && infos.heartbeat.base_mode == 55) {
        $('#image').modal('show');
        var length = 6 + 4 * 7;
        var ab = new ArrayBuffer(length);
        var buffer = new DataView(ab);
        buffer.setUint8(0, 101);
        buffer.setUint8(1, document.getElementById('heartbeat.id_uav_xyi').innerText * 1);
        buffer.setUint8(2, 0);
        //开始起飞指令
        buffer.setUint16(3, 4, LE);
        buffer.setUint8(5, 0);
        var tempi = 0;
        if (el == 1) {
            if (ctrH == 0) {
                // alert(1);
                // var tempi = 0;
                buffer.setFloat32(6 + 4 * (tempi++), 1.0, LE);
                //enter
                //(——您已进入人工操控模式)";
                buffer.setFloat32(6 + 4 * (tempi++), -1, LE);
                buffer.setFloat32(6 + 4 * (tempi++), $("#imageX").val() * 1, LE);
                //pararm3对应X坐标
                buffer.setFloat32(6 + 4 * (tempi++), $("#imageY").val(), LE);
                buffer.setFloat32(6 + 4 * (tempi++), -1, LE);
                buffer.setFloat32(6 + 4 * (tempi++), $("#imageH").val(), LE);
                //pararm6对应高度坐标
                buffer.setFloat32(6 + 4 * (tempi++), 0, LE);
                console.info('click sent flight by hands');
                // alert(tempi);
                handI = 1;

            } else {
                // var tempi = 0;
                // buffer.setFloat32(6 , 0, LE);//enter
                buffer.setFloat32(6 + 4 * (tempi++), -1.0, LE); //quit
                // (——您已退出人工操控模式)";
                buffer.setFloat32(6 + 4 * (tempi++), 1, LE);
                buffer.setFloat32(6 + 4 * (tempi++), $("#imageX").val() * 1, LE);
                //pararm3对应X坐标
                buffer.setFloat32(6 + 4 * (tempi++), $("#imageY").val(), LE);
                buffer.setFloat32(6 + 4 * (tempi++), 1, LE);
                buffer.setFloat32(6 + 4 * (tempi++), $("#imageH").val(), LE);
                //pararm6对应高度坐标
                buffer.setFloat32(6 + 4 * (tempi++), 0, LE);
                console.info('quit flight by hands');
                handI = 0;
                // alert(tempi);
            }

        }
        ws.send(buffer);
        console.info('click sent flight');
    }
    if (handI == 1) {
        $('#image').modal('show');
        var length = 6 + 4 * 7;
        var ab = new ArrayBuffer(length);
        var buffer = new DataView(ab);
        buffer.setUint8(0, 101);
        buffer.setUint8(1, document.getElementById('heartbeat.id_uav_xyi').innerText * 1);
        buffer.setUint8(2, 0);
        //开始起飞指令
        buffer.setUint16(3, 4, LE);
        buffer.setUint8(5, 0);
        var tempi = 0;
        if (el == 2) {
            // alert(2);
            // var tempi = 0;
            buffer.setFloat32(6 + 4 * (tempi++), 1.0, LE);
            //enter
            buffer.setFloat32(6 + 4 * (tempi++), 1, LE);
            buffer.setFloat32(6 + 4 * (tempi++), $("#imageX").val() * 1, LE);
            //pararm3对应X坐标
            buffer.setFloat32(6 + 4 * (tempi++), $("#imageY").val(), LE);
            buffer.setFloat32(6 + 4 * (tempi++), -1, LE);
            buffer.setFloat32(6 + 4 * (tempi++), $("#imageH").val(), LE);
            //pararm6对应高度坐标
            buffer.setFloat32(6 + 4 * (tempi++), 0, LE);
            // ws.send(buffer);
            // alert(tempi);

            console.info('click sent horizontal value');
        } else if (el == 3) {
            // alert(3);
            // var tempi = 0;
            buffer.setFloat32(6 + 4 * (tempi++), 1.0, LE);
            //enter
            buffer.setFloat32(6 + 4 * (tempi++), -1, LE);
            buffer.setFloat32(6 + 4 * (tempi++), $("#imageX").val() * 1, LE);
            //pararm3对应X坐标
            buffer.setFloat32(6 + 4 * (tempi++), $("#imageY").val(), LE);
            buffer.setFloat32(6 + 4 * (tempi++), 1, LE);
            buffer.setFloat32(6 + 4 * (tempi++), $("#imageH").val(), LE);
            //pararm6对应高度坐标
            buffer.setFloat32(6 + 4 * (tempi++), 0, LE);
            // ws.send(buffer);
            // alert(tempi);
            console.info('click sent vertical value');
        }
        ws.send(buffer);
        console.info('click sent flight');
    } else {
        alert("error");
    }

}
var uavStop = function() {
    if (infos.heartbeat.base_mode && infos.heartbeat.base_mode == 5) {
        infos['uavStop'] = true;
        var length = 6 + 4 * 7;
        var ab = new ArrayBuffer(length);
        var buffer = new DataView(ab);
        buffer.setUint8(0, 101);
        buffer.setUint8(1, document.getElementById('heartbeat.id_uav_xyi').innerText * 1);
        buffer.setUint8(2, 0);
        //应急着陆指令
        buffer.setUint16(3, 2, LE);
        buffer.setUint8(5, 1);
        for (var i = 0; i < 7; i++) {
            buffer.setFloat32(6 + 4 * i, 0, LE);
        }
        ws.send(buffer);
        console.info('flight stop');
    }
}
$('#pid').on('show.bs.modal', function() {
    if (infos.heartbeat.base_mode && infos.heartbeat.base_mode == 1) {
        $(this).find('input').val('');
        $(this).find('.ok').show();
    } else {
        $(this).find('.ok').hide();
        $('#pid').modal('hide');
    }
});
$('#pid .ok').on('click', function() {
    var inputs = $('#pid').find('input');
    uavCMDPId(inputs[0].value, inputs[1].value, inputs[2].value, inputs[3].value, inputs[4].value, inputs[5].value, inputs[6].value);
});
var uavCMDPId = function(p1, p2, p3, p4, p5, p6, p7) {
    if (infos.heartbeat.base_mode && infos.heartbeat.base_mode == 1) {
        var length = 6 + 4 * 7;
        var ab = new ArrayBuffer(length);
        var buffer = new DataView(ab);
        buffer.setUint8(0, 101);
        buffer.setUint8(1, document.getElementById('heartbeat.id_uav_xyi').innerText * 1);
        buffer.setUint8(2, 0);
        buffer.setUint16(3, 3, LE);
        buffer.setUint8(5, infos.heartbeat.system_status);
        var i = 0;
        if (p1) {
            buffer.setFloat32(6 + 4 * i, parseFloat(p1), LE);
        } else {
            buffer.setFloat32(6 + 4 * i, 0.0, LE);
        }
        i++;
        if (p2) {
            buffer.setFloat32(6 + 4 * i, parseFloat(p2), LE);
        } else {
            buffer.setFloat32(6 + 4 * i, 0.0, LE);
        }
        i++;
        if (p3) {
            buffer.setFloat32(6 + 4 * i, parseFloat(p3), LE);
        } else {
            buffer.setFloat32(6 + 4 * i, 0.0, LE);
        }
        i++;
        if (p4) {
            buffer.setFloat32(6 + 4 * i, parseFloat(p4), LE);
        } else {
            buffer.setFloat32(6 + 4 * i, 0.0, LE);
        }
        i++;
        if (p5) {
            buffer.setFloat32(6 + 4 * i, parseFloat(p5), LE);
        } else {
            buffer.setFloat32(6 + 4 * i, 0.0, LE);
        }
        i++;
        if (p6) {
            buffer.setFloat32(6 + 4 * i, parseFloat(p6), LE);
        } else {
            buffer.setFloat32(6 + 4 * i, 0.0, LE);
        }
        i++;
        if (p7) {
            buffer.setFloat32(6 + 4 * i, parseFloat(p7), LE);
        } else {
            buffer.setFloat32(6 + 4 * i, 0, LE);
        }
        i++;
        ws.send(buffer);
        console.info('flight PID');
    } else {
        alert('注入未成功，请重试')
    }
}
var uavCMDMaunCtrl = function(state, x, y, z) {
    if (infos.heartbeat.base_mode && infos.heartbeat.base_mode == 5) {
        var length = 6 + 4 * 7;
        var ab = new ArrayBuffer(length);
        var buffer = new DataView(ab);
        buffer.setUint8(0, 101);
        buffer.setUint8(1, document.getElementById('heartbeat.id_uav_xyi').innerText * 1);
        buffer.setUint8(2, 0);
        //应急着陆指令
        buffer.setUint16(3, 4, LE);
        buffer.setUint8(5, 1);
        var i = 0;
        buffer.setFloat32(6 + 4 * i++, state, LE);
        buffer.setFloat32(6 + 4 * i++, parseFloat(x), LE);
        buffer.setFloat32(6 + 4 * i++, parseFloat(y), LE);
        buffer.setFloat32(6 + 4 * i++, parseFloat(z), LE);
        for (var j = i;
            (j < 7); j++) {
            buffer.setFloat32(6 + 4 * j, 0, LE);
        }
        ws.send(buffer);
        console.info('uavCMDMaunCtrl');
    }
}
var calcLength = function(x, y, z) {
    length += (Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2)));
    return length.toFixed(2);
}
var setValue = function(id1, id2, value, needTrueValue, trueValue) {

    if (trueValue && needTrueValue && needTrueValue == true) {
        $(document.getElementById(id1 + "." + id2)).text(value).attr('data-value', trueValue);
    } else {
        $(document.getElementById(id1 + "." + id2)).text(value);
    }
}
var setValueFromInfos = function(id1, id2, value, needTrueValue) {

    if (needTrueValue && needTrueValue == true) {
        $(document.getElementById(id1 + "." + id2)).text(value).attr('data-value', infos[id1][id2]);
    } else {
        $(document.getElementById(id1 + "." + id2)).text(infos[id1][id2]);
    }
}
var direction = function(vn, ve) {
    var result = '0deg';
    if (vn == 0 && ve == 0) {
        return result;
    }
    var vne = Math.sqrt(Math.pow(vn, 2) + Math.pow(ve, 2));
    if (ve > 0) {
        if (vn < 0) {
            result = 180 - Math.asin(ve / vne) * 180 / Math.PI;
        } else {
            result = Math.asin(ve / vne) * 180 / Math.PI;
        }
    } else {
        if (vn < 0) {
            result = -Math.asin(ve / vne) * 180 / Math.PI - 180;
        } else {
            result = Math.asin(ve / vne) * 180 / Math.PI;
        }
    }
    return result + 'deg';
}
var clickLnglat = [];

// 图片拼接
// function imageAllData(data){

// }
/* 添加点 */
var addFlightPoint = function() {
        $('.single-right-up-sub').removeClass('select');
        var outside = $('<div class="single-right-up-sub select"></div>'),
            upDel = $('<span class="sanjiao glyphicon glyphicon-remove-circle" title="close" onclick="flightPointDelete(this)">&nbsp;</span>'),
            upInfo = $('<div class="single-right-up-block" onclick="flightPointClick(this)"></div>'),
            upInfoNumber = $('<span class="number">' + (Local_count - 1) + '</span>'),
            upInfoTitle = $('<span class="infos">航点</span>'),
            downinfo = $('<div class="single-right-up-hidden"><table><tbody><tr><td class="info">lon :</td><td class="input"><input name="lon" onkeyup="enterLonLatValues(this)" type="text" style="width: 100%;" value="' + clickPointLatLng.lng().toFixed(7) + '"/></td></tr><tr><td class="info">lat :</td><td class="input"><input name="lat" onkeyup="enterLonLatValues(this)" style="width: 100%;" value="' + clickPointLatLng.lat().toFixed(7) + '" type="text"/></td></tr><tr><td class="info">速度 :</td><td class="input"><input name="speed" type="text" value="2"/><span>m/s</span></td></tr><tr><td class="info">高度 :</td><td class="input"><input name="altitude" value="25" type="text"/><span>m</span></td></tr></tbody></table></div>')
        $('.single-right-up').append(outside.append(upDel).append(upInfo.prepend(upInfoTitle).prepend(upInfoNumber)).append(downinfo));
    }
    /* 输入航点经纬度，修改marker在地图上的位置 */
var enterLonLatValues = function(eve) {
        var sub = $(eve).parents('.single-right-up-sub');
        var count = sub.find('.number:first').text();
        var modifyPoint = marklist[count];
        var lnglat = {
            lng: sub.find('input')[0].value * 1,
            lat: sub.find('input')[1].value * 1
        };
        modifyPoint.setPosition(lnglat);
        lineArr[count] = lnglat;
        polyLine.setPath(lineArr);
    }
    /* 删除航点 */
var flightPointDelete = function(eve) {
        if (confirm('确认删除该航点？')) {
            var sub = $(eve).parents('.single-right-up-sub');
            var count = sub.find('.number:first').text();
            lineArr.splice(count, 1);
            polyLine.setPath(lineArr);
            marklist[count].setMap(null);
            var flightPointNoList = $('.single-right-up-block>.number');
            var i = count * 1 + 1;
            while (i < marklist.length) {
                marklist[i].setTitle((i - 1).toString());
                marklist[i].setLabel({
                    color: '#ffffff',
                    text: (i - 1).toString()
                });
                if (flightPointNoList[i]) {
                    flightPointNoList[i].innerText = i - 1;
                }
                i++;
            }
            if (marker) {
                Local_count -= 1;
            } else {
                Local_count -= 1;
            }
            marklist.splice(count, 1);
            sub.remove();
        }
    }
    // 清空航点
var flightPointDeleteAll = function() {
    $(".single-right-up-sub:not(:first)").remove();
    // console.log("航点数", $(".single-right-up-sub").length);
    // console.log("curpoint is ", infos.mission_ack_2.point[0].lon);
    // console.log("curpoint is ", infos.mission_ack_2.point[0]);
    // var points = $('.single-right-up-sub');
    var newpoints = infos.mission_ack_2['point'];
    console.log("curpoint is ", newpoints);

    polyLine.setPath([]);
    drawSearchPoint(true, 1, newpoints);
}

$('#addStartEndPoint').on('click', function() {
    var outside = $('<div class="single-right-up-sub select"></div>'),
        upInfo = $('<div class="single-right-up-block" onclick="flightPointClick(this)"><span class="sanjiao glyphicon glyphicon-remove-circle" title="close">&nbsp;</span></div>'),
        upInfoNumber = $('<span class="number">' + +'</span>'),
        upInfoTitleStart = $('<span class="infos">起飞点</span>'),
        upInfoTitleEnd = $('<span class="infos">着陆点</span>'),
        downinfo = $('<div class="single-right-up-hidden"><table><tbody><tr><td>速度 :</td><td><input name="speed" type="text" value="2"/><span>m/s</span></td></tr><tr><td>高度 :</td><td><input name="altitude" value="25" type="text"/><span style="float: right;">meters</span></td></tr></tbody></table></div>')
    $('.single-right-up').append(outside.append(upInfo.prepend(upInfoTitleStart).prepend(upInfoNumber)).append(downinfo));
    $('.single-right-up').append(outside.append(upInfo.prepend(upInfoTitleEnd).prepend(upInfoNumber)).append(downinfo));
});

//页面控件事件
$('#addFlightLine').on('click', function() {
    if ($(document.getElementById('heartbeat.base_mode')).eq(0).attr('data-value') == 1) {
        var points = $('.single-right-up-sub');
        var length = 7 + 16 * points.length;
        var ab = new ArrayBuffer(length);
        var buffer = new DataView(ab);
        var result = '';
        buffer.setUint8(1, document.getElementById('heartbeat.id_uav_xyi').innerText * 1);
        buffer.setUint8(0, 105);
        buffer.setUint8(2, 0);
        buffer.setUint16(3, points.length, LE);
        buffer.setUint8(5, 1);
        result += buffer.getUint8(0) + ',';
        result += buffer.getUint8(1) + ',';
        result += buffer.getUint8(2) + ',';
        result += buffer.getUint16(3, LE) + ',';
        result += buffer.getUint8(5) + ',';
        var bc = 6;
        for (var i = 0; i < points.length; i++) {
            var inputs = points.eq(i).find('input');
            console.info(inputs[1].value);
            console.info(inputs[0].value);
            console.info(inputs[3].value);
            console.info(inputs[2].value);
            buffer.setFloat32(bc + 16 * i, inputs[1].value, LE);
            result += buffer.getFloat32(bc + 16 * i, LE) + ',';

            buffer.setFloat32(bc + 16 * i + 4, inputs[0].value, LE);
            result += buffer.getFloat32(bc + 16 * i + 4, LE) + ',';

            buffer.setFloat32(bc + 16 * i + 8, inputs[3].value, LE);
            result += buffer.getFloat32(bc + 16 * i + 8, LE) + ',';

            buffer.setFloat32(bc + 16 * i + 12, inputs[2].value, LE);
            result += buffer.getFloat32(bc + 16 * i + 12, LE) + ',';
        }
        ws.send(buffer);
        console.info('sent ' + result);
    }
});
var drapExpFlightMarker = function() {
    var id = 0,
        position = {
            lng: NAV_GPS[0],
            lat: NAV_GPS[1]
        },
        bettery = 100,
        weight = 50;
    var myLatlng = new google.maps.LatLng(NAV_GPS[1], NAV_GPS[0]);

    // $('#start input[name=lon]').val(infos['gps_raw']['lon_gps']);
    // $('#start input[name=lat]').val(infos['gps_raw']['lat_gps']);
    if (infos.heartbeat && infos.heartbeat.id_uav_xyi) {
        id = infos.heartbeat.id_uav_xyi;
    }
    if (infos.gps_raw && infos['gps_raw']['lon_gps'] && infos['gps_raw']['lat_gps']) {
        position = {
            lng: infos['gps_raw']['lon_gps'],
            lat: infos['gps_raw']['lat_gps']
        }
        if (flight) {
            var myLatlng = new google.maps.LatLng(flight[id].gps_raw.lat_gps, flight[id].gps_raw.lon_gps);
        }
    }
    // console.log("position is", position);
    var singletitle = '电池' + bettery + '%,载重' + weight + '%';
    if (flight) {
        deg = flight[id].global_position_int.hdg;
    } else {
        deg = 0;
    }
    flight = new CustomMarker(
        myLatlng,
        map, {
            marker_id: '123',
            id: id,
            title: singletitle,
            deg: deg
        }
    );
    // map.setCenter(lineArr[0]);
    console.info("lineArr[0] is", lineArr[0]);
}
$('#satellite').on('click', function() {
    if ($(this).attr('data-satellite')) {
        map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
        $(this).removeAttr('data-satellite');
    } else {
        map.setMapTypeId(google.maps.MapTypeId.HYBRID);
        $(this).attr('data-satellite', true);
    }
});

$('#searchFlightPoint').on('click', function() {
    /* 搜索航点的状态是不是应该是在上线状态呢？ */
    if ($(document.getElementById('heartbeat.base_mode')).eq(0).attr('data-value') * 1 > 1) {
        var length = 5;
        var ab = new ArrayBuffer(length);
        var buffer = new DataView(ab);
        var result = '';
        buffer.setUint8(1, document.getElementById('heartbeat.id_uav_xyi').innerText * 1);
        buffer.setUint8(0, 107);
        buffer.setUint8(2, 0);
        buffer.setUint8(3, 2);
        result += buffer.getUint8(0) + ',';
        result += buffer.getUint8(1) + ',';
        result += buffer.getUint8(2) + ',';
        result += buffer.getUint8(3) + ',';
        ws.send(buffer);
        console.info('sent SearchStartResult is :' + result);
    }
});
// var drawSearchPoint = function(draggable) {
var drawSearchPoint = function(draggable, curcount, curpoint) {
    if (!curcount && !curpoint) {
        var counts = infos.mission_ack_2.count;
        var points = infos.mission_ack_2.point;
        console.log('航路点传值');
    } else {
        var counts = curcount;
        var points = curpoint;
        console.log('默认航路点');

    }
    // var counts = infos.mission_ack_2.count;
    // var points = infos.mission_ack_2.point;

    console.info("加载的counts is", counts);
    console.info("加载的points is", points);
    Local_count = 1;
    lineArr = [];
    if (counts == 1) {
        if (infos.gps_raw && infos.gps_raw.lon_gps && infos.gps_raw.lat_gps) {
            NAV_GPS[0] = infos.gps_raw.lon_gps;
            NAV_GPS[1] = infos.gps_raw.lat_gps;
        }
        lineArr.push({
            lng: NAV_GPS[0],
            lat: NAV_GPS[1]
        });
        console.log(lineArr);
    }

    for (var mk in marklist) {
        if (marklist[mk]) {
            marklist[mk].setMap(null);
        }
    }
    marklist = [];
    marklist[0] = null;
    if (counts > 1) {
        $('.single-right-up').empty();
    }
    // for (var i = 0; i < counts; i++) {
    for (var i = 0; i < counts; i++) {
        console.log("points",points);
        // if(counts==1){
        //     // points[i]=points;
        //     var lnglat = {
        //         lng: points.lon,
        //         lat: points.lat
        //     };
        // }else{
             var lnglat = {
                lng: points[i].lon,
                lat: points[i].lat
            };
        // }
       
        // console.log(lnglat);
        if (i == 0) {
            if (infos.gps_raw && infos.gps_raw.lon_gps && infos.gps_raw.lat_gps) {
                console.log(points);
                points[i].lon = infos.gps_raw.lon_gps;
                points[i].lat = infos.gps_raw.lat_gps;

                lnglat = {
                    lng: points[i].lon,
                    lat: points[i].lat
                }
            }
        }
        lineArr.push(lnglat);

        if (i > 0) {
            var mk = new google.maps.Marker({
                map: map,
                draggable: true,
                position: lnglat,
                title: (i).toString(),
                icon: {
                    size: new google.maps.Size(22, 34),
                    anchor: new google.maps.Point(10, 32),
                    origin: new google.maps.Point(((i - 1) % 10) * 21, Math.floor((i - 1) / 10) * 35),
                    scaledSize: new google.maps.Size(212, 350),
                    url: '../images/markers.png'
                }
            });

            if (draggable && draggable == true) {
                console.log('draggable', draggable);
                mk.addListener('drag', function(e) {
                    var num = this.title * 1;
                    console.log(num, lineArr.length);
                    if (num <= lineArr.length) {
                        // if($('.single-right-up-sub').eq(num).length > 0){
                        lineArr[num] = e.latLng;
                        polyLine.setPath(lineArr);
                        var inputs = $('.single-right-up-sub').eq(num).find('input');
                        inputs[0].value = e.latLng.lng();
                        inputs[1].value = e.latLng.lat();
                        // }
                    }
                });
            }
            marklist.push(mk);
            // console.log("marklist",marklist);
        }

        $('.single-right-up-sub').removeClass('select');
        var outside = $('<div class="single-right-up-sub select"></div>'),
            upDel = $('<span class="sanjiao glyphicon glyphicon-remove-circle" title="close" onclick="flightPointDelete(this)">&nbsp;</span>'),
            upInfo = $('<div class="single-right-up-block" onclick="flightPointClick(this)"></div>'),
            upInfoNumber = $('<span class="number">' + i + '</span>'),
            upInfoTitle = $('<span class="infos">航点</span>'),
            downinfo = $('<div class="single-right-up-hidden"><table><tbody><tr><td class="info">lon :</td><td class="input"><input name="lon" onkeyup="enterLonLatValues(this)" type="text" style="width: 100%;" value="' + points[i].lon + '"/></td></tr><tr><td class="info">lat :</td><td class="input"><input name="lat" onkeyup="enterLonLatValues(this)" style="width: 100%;" value="' + points[i].lat + '" type="text"/></td></tr><tr><td class="info">速度 :</td><td class="input"><input name="speed" type="text" value="' + points[i].v + '"/><span>m/s</span></td></tr><tr><td class="info">高度 :</td><td class="input"><input name="altitude" value="' + points[i].alt + '" type="text"/><span>m</span></td></tr></tbody></table></div>')
        $('.single-right-up').append(outside.append(upDel).append(upInfo.prepend(upInfoTitle).prepend(upInfoNumber)).append(downinfo));
    }
    if (flight) {
        flight.setPosition(lineArr[0]);
    }
    if (!curcount && !curpoint && infos['heartbeat'] && infos['heartbeat']['base_mode'] <= 1) {
        lineArr[0] = lineArr[1];
    }else{
        lineArr[0]=points[0];
    }

    Local_count = counts;
    polyLine.setPath(lineArr);
}
$('#searchFlightEnd').on('click', function() {
    /* 搜索应急着陆点，应该是什么状态呢？ */
    if ($(document.getElementById('heartbeat.base_mode')).eq(0).attr('data-value') * 1 > 1) {
        var length = 4;
        var ab = new ArrayBuffer(length);
        var buffer = new DataView(ab);
        var result = '';
        buffer.setUint8(1, document.getElementById('heartbeat.id_uav_xyi').innerText * 1);
        buffer.setUint8(0, 107);
        buffer.setUint8(2, 0);
        buffer.setUint8(3, 3);
        result += buffer.getUint8(0) + ',';
        result += buffer.getUint8(1) + ',';
        result += buffer.getUint8(2) + ',';
        result += buffer.getUint8(3) + ',';
        ws.send(buffer);
        console.info('sent SearchEndResult is :' + result);
    }
});

var drawSearchEnd = function() {
    var counts = infos.mission_ack_3.count;
    var points = infos.mission_ack_3.point;
    var result = [];
    for (var t in points) {
        new google.maps.Marker({
            map: map,
            position: {
                lng: points[t].lon,
                lat: points[t].lat
            },
            label: {
                color: '#ffffff',
                fontSize: '10px',
                text: t.toString()
            },
            icon: '../images/mark_bs_red.png'
        });
    }
}
var changeCtlIcons = function(params) {
    var param2 = params.toString(2);
    // console.log('param2 is ',param2);
    var length = param2.length;
    for (var i = param2.length - 1; i >= 0; i--) {
        var type = control_icons.ids[length - 1 - i];

        $('#' + type).attr('src', '../images/ctrlogo/' + control_icons.status[param2[i]] + control_icons.icons[type])
            // console.log('param2[i] is',param2[i]);
            // console.log('type is ', type);
            // console.log('control_icons.status  is ', control_icons.status[param2[i]]);

        // }
        // if (param2[i] == "1") {
        //     var type = control_icons.ids[length - 1 - i];
        //     console.log('param2[i] is',param2[i]);
        //     console.log('type is ', type);
        //     $('#' + type).attr('src', '../images/ctrlogo/' + control_icons.status[param2[i]] + control_icons.icons[type])
        // } else{
        //     var type = control_icons.ids[length - 1 - i];
        //     console.log('param2[i] is',param2[i]);
        //     console.log('type is ', type);
        //     $('#' + type).attr('src', '../images/ctrlogo/' + control_icons.status[param2[i]] + control_icons.icons[type])
        // }
    }
};
var realTimeData = function() {
    if (document.getElementById('heartbeat.id_uav_xyi').innerText) {
        window.location.href = 'realtimedata.html?' + document.getElementById('heartbeat.id_uav_xyi').innerText;
    } else {
        window.location.href = 'realtimedata.html?' + 1;
    }
};
var backToMain = function() {
    window.location.href = 'maingoogle.html';
}
var canvasDraw = function(vn, ve, beforevn, beforeve) {
    var canvas = document.getElementById('center-left-canvas');
    var width = canvas.width;
    var height = canvas.height;
    var context = canvas.getContext("2d");
    var result;
    var commonParam = 0.12;
    var rotateX = 'rotateX(65deg)',
        rotateZ = 'rotateZ(90deg)';
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#01A752";
    context.lineWidth = 1;
    context.beginPath();
    if (ve && vn) {
        var trueVE = ve,
            trueVN = vn;
        if (beforevn && beforeve) {
            trueVE = ve - beforeve;
            trueVN = vn - beforevn;
        }
        var vne = Math.sqrt(Math.pow(trueVN, 2) + Math.pow(trueVE, 2));
        if (trueVE > 0) {
            if (trueVN < 0) {
                result = 180 - Math.asin(trueVE / vne) * 180 / Math.PI;
            } else {
                result = Math.asin(trueVE / vne) * 180 / Math.PI;
            }
        } else {
            if (trueVN < 0) {
                result = -Math.asin(trueVE / vne) * 180 / Math.PI - 180;
            } else {
                result = Math.asin(trueVE / vne) * 180 / Math.PI;
            }
        }
        $('#compass').css('transform', 'rotate(' + result + 'deg)');
        var moreHeight = 0;
        if (trueVE != 0 && trueVN != 0) {
            if (trueVE < 0) {
                moreHeight = commonParam * (trueVE / trueVN) * width / 2;
                if (Math.abs(moreHeight) > 50) {
                    moreHeight = 50;
                }
                $('.left-main-flight').css('transform', rotateX + ' rotateY(' + (0 - Math.asin(moreHeight / (width / 2)) * 180 / Math.PI) + 'deg) ' + rotateZ);
            } else {
                moreHeight = commonParam * (trueVE / trueVN) * width / 2;
                if (Math.abs(moreHeight) > 50) {
                    moreHeight = 50;
                }
                $('.left-main-flight').css('transform', rotateX + ' rotateY(' + Math.asin(moreHeight / (width / 2)) * 180 / Math.PI + 'deg) ' + rotateZ);
                moreHeight = 0 - moreHeight;
            }
            context.moveTo(0, height / 2 + moreHeight);
            context.lineTo(width, height / 2 - moreHeight);
            context.lineTo(width, height);
            context.lineTo(0, height);
            context.fill();
        } else {
            $('#compass').css('transform', 'rotate(0deg)');
            context.moveTo(0, height / 2);
            context.lineTo(width, height / 2);
            context.lineTo(width, height);
            context.lineTo(0, height);
            context.fill();
        }
    } else {
        $('#compass').css('transform', 'rotate(0deg)');
        context.moveTo(0, height / 2);
        context.lineTo(width, height / 2);
        context.lineTo(width, height);
        context.lineTo(0, height);
        context.fill();
    }
};
canvasDraw();

/* 放弃控制飞行器 */
/* 20160805 修改为不需要*/
// var giveupControl = function() {
//     if (confirm('确认放弃控制飞行器？')) {
//         var length = 5;
//         var ab = new ArrayBuffer(length);
//         var buffer = new DataView(ab);
//         buffer.setUint8(0, 252);
//         buffer.setInt32(1, infos['heartbeat']['id_uav_xyi'], LE);
//         ws.send(buffer);
//         console.log('give up control');
//     }
// };
/* 重新获取控制权 */
var getControl = function() {
        var length = 5;
        var ab = new ArrayBuffer(length);
        var buffer = new DataView(ab);
        var result = '';
        buffer.setUint8(0, 253);
        buffer.setInt32(1, infos['heartbeat']['id_uav_xyi'], LE);
        ws.send(buffer);
        console.log('get control');
    }
    /* 当收到获取控制权的申请时候，将控制权给别人 */
$('#confirm #ok').on('click', function() {
    if ($('#confirm').data('uid') && infos['token']) {
        var uid = $('#confirm').data('uid');
        var length = 7 + uid.length;
        var ab = new ArrayBuffer(length);
        var buffer = new DataView(ab);
        var result = '';
        buffer.setUint8(0, 251);
        buffer.setInt32(1, infos['heartbeat']['id_uav_xyi'], LE);
        buffer.setUint16(5, uid.length, LE);
        for (var i = 0; i < uid.length; i++) {
            buffer.setUint8(7 + i, uid[i].charCodeAt());
        }
        ws.send(buffer);
        $('#confirm').modal('hide');
    }
});

// 保存航路
$('#saveAirLine').on('click', function() {
    if (infos.heartbeat.base_mode && infos.heartbeat.base_mode >= 1) {
        // if (infos.heartbeat.base_mode && infos.heartbeat.base_mode >= 2) {
        // $("#searchFlightPoint").trigger("click");
        // var msgid = dv.getUint8(begin);
        // if(msgid==102){
        var data = {};
        if ($('#pointID').val() == "") {
            alert('请输入航路点名称');
        } else {
            data['name'] = $('#pointID').val().toString();
        }
        // 飞行之后
        // var counts = infos.mission_ack_2.count;
        // var points = infos.mission_ack_2.point;

        //直接保存页面可视航点，无权限限制
        var inputpoints = $('.single-right-up-sub');
        var savecounts = inputpoints.length;
        console.log(savecounts);
        var points = [];
        for (var i = 0; i < savecounts; i++) {
            var savepoints = {
                lat: '',
                lon: '',
                alt: '',
                v: '',
            };
            var inputs = inputpoints.eq(i).find('input');
            savepoints.lat = inputs[1].value * 1;
            savepoints.lon = inputs[0].value * 1;
            savepoints.alt = inputs[3].value * 1;
            savepoints.v = inputs[2].value * 1;

            points.push(savepoints);
            // points[i]=savepoints;
        }
        console.log("points is", points)
        var points = JSON.stringify(points);

        data['detail'] = points;
        // console.info("counts is",counts);
        // console.info("points is", points);
        // console.info("count is",(JSON.parse(points)).length);
        console.info("data is ", data);
        $.ajax({
            url: pointurl + 'submitroute',
            // url:'http://121.199.53.63:9999/submitbatch',
            type: 'post',
            data: data,
            success: function(result) {
                result = JSON.parse(result);
                if (result.err * 1 == 0) {
                    alert('添加成功');
                    console.log('正确', result);
                    $('input').val('');
                    // $("#routeLine").modal('hide');

                } else {
                    alert('错误：' + result.msg);
                }
            }
        });
        // }

    } else {
        // alert("注入航路后方可保存！");
        alert("飞机上线后方可保存！");
    }
    $('#routeLine').modal('hide');
});

// 查询航路点
$("#searchLineBtn").on('click', function() {
    var reData;
    var sHtml = "";
    var pointData;
    var point;
    $("#infobody").empty();
    $.ajax({
        url: pointurl + 'route',
        type: 'get',
        data: {
            name: $('#pointsearch').val()
        },
        success: function(result) {
            pointData = JSON.parse(result);
            if (pointData.err == 0) {
                // console.log('正确',pointData);
                console.log('正确', pointData.items.length);
                if (pointData.items.length > 0) {
                    $("#bodynone").hide();
                    $.each(pointData.items, function(n, value) {
                        console.log('detail', value);
                        // console.log("id is",value.id,JSON.parse(value.detail));
                        console.log("id is", value.id);
                        point = JSON.parse(value.detail);
                        var tr = $('<tr onclick="checkTr($(this))"><td><input type="radio" data-id="' + value.id + '" name="radioline"></td><td>' + value.name + '</td><td>' + point.length + '</td></tr>').data('points', value);
                        $("#infobody").append(tr);
                    });
                } else {
                    $("#bodynone").show();
                }
            } else {
                alert('错误：' + result.msg);
            }
        },
        error: function(result) {
            alert("出错啦！");
        }
    });
});

function checkTr(e) {
    e.find("input").prop("checked", true);
}
$("#confirmRe").click(function() {
    // if ($(document.getElementById('heartbeat.base_mode')).eq(0).attr('data-value') == 1) {
    var curId = $("input[name='radioline']:checked").attr("data-id");
    var target_infos = $("input[name='radioline']:checked").parents('tr').data("points");
    // console.log("curId is", curId);
    // console.log("target_infos  is", target_infos);
    curPoint = JSON.parse(target_infos.detail);
    curCount = curPoint.length;
    // console.log("current point is", curPoint);
    // console.log("current count length is", curCount);
    // console.log("current point id is", target_infos.id);

    $("#searchLine").modal("hide");
    drawSearchPoint(true, curCount, curPoint);
    drapExpFlightMarker();
    // }
});
// 清空飞机远程数据
$("#clearRemoteData").click(function() {
        var data = {};
        data['fid'] = $('#heartbeat.id_uav_xyi').text();
        console.log("data is", data);

        if (confirm('确认清空该飞机航点？')) {
            $.ajax({
                url: pointurl + 'cleardata',
                data: data,
                success: function(result) {
                    result = JSON.parse(result);
                    if (result.err == 0) {
                        alert('清除成功');
                        console.log('正确', result);
                        $('input').val('');
                        $("#routeLine").modal('hide');

                    } else {
                        alert('错误：' + result.msg);
                    }
                }
            });
        }
    })
    /*
     var vbefore = [0,0];
     setInterval(function () {
     var v = Math.random().toFixed(1).toString().split('.')[1];
     var now = [];
     now[0] = Math.random()>0.5?0-Math.random().toFixed(1).toString().split('.')[1]*Math.random():Math.random().toFixed(1).toString().split('.')[1]*Math.random();
     now[1] = Math.random()>0.5?0-Math.random().toFixed(1).toString().split('.')[1]*Math.random():Math.random().toFixed(1).toString().split('.')[1]*Math.random();
     canvasDraw(now[0],now[1],vbefore[0],vbefore[1]);
     vbefore[0] += now[0];
     vbefore[1] += now[1];
     },1000);
     */
initMap();
$('#imgZoom').on('mousemove', function(e) {
    $("#spanX").text(e.offsetX / this.width - 0.5).css({
        "left": e.offsetX + 10,
        "top": e.offsetY
    });
    $("#spanY").text(e.offsetY / this.height - 0.5).css({
        "left": e.offsetX + 10,
        "top": e.offsetY + 20
    });
});
$('#imgZoom').on('click', function(e) {
    $("#imageX").val(e.offsetX / this.width - 0.5);
    $("#imageY").val(e.offsetY / this.height - 0.5);
});
$("#ruleZoom").click(function() {
    flagRight = 1;
    flagMap = 1
})