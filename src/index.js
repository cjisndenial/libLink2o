// Considered using HTML Parser for finding values, but the way they are placed in the HTML fragments
// varies so much that regular expressions just seemed easier.  Both methods are likely just as pronet
// to breaking when Link2O app is changed, as we're screen scraping no matter how you look at it.
//
//var HTMLParser = require('node-html-parser');

const axios = require('axios');
const apiUrlBase = 'https://calc.mylink2o.com/api/';

// CONNECTION & DISCOVERY FUNCTIONS //

module.exports.authenticate = async function authenticate(username, password) {
   try {
      const response = await axios.get(apiUrlBase + 'user/login',{
          params: {
              email: username,
              password: password
          }
      });
      return response.data;
    } catch (error) {
        console.error(error);
    }
}

module.exports.validateAuthToken = async function validateAuthToken(token){
    try {
        const response = await axios.get(apiUrlBase + 'user/validate', {
            params: {
                api_token: token
            }
        });
        if (response.data == 1) {return true} else {return false};
    } catch (error) {
        console.error(error);
    }
}

module.exports.getIntelliConnectID = async function getIntelliConnectID(token){
    try {
        const response = await axios.get(apiUrlBase + 'home/deviceList', {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        const hubPaths = response.data.match(/device-hub.html\?id=\d+/g);
        const hubIds = [];
        hubPaths.forEach(element => {
            const id = element.match(/\d+/)[0];
            if (!hubIds.includes(id)) {hubIds.push(id)}
        });
        // Make sure we received 1 and only 1 link2o hub ID
        if (hubIds.length > 1) {throw 'Multiple link2o hubs detected! Only a single IntelliConnect hub device is supported at this time.'}
        if (hubIds.length == 0) {throw 'IntelliConnect not found in link2o account!'}
        return hubIds[0];
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.getDeviceTitle = async function getDeviceTitle(token, deviceId){
    // We've only ever seen this API called on the IntelliConnect hub.  Though it might support any enumerable device.
    try {
        const response = await axios.post(apiUrlBase + 'device/title', 
        {
            api_token: token,
            id: deviceId
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // This response comes with boundary quotes that must be removed.
        return response.data.trim(); 
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.getHubDetails = async function getHubDetails(token, hubId){
    try {
        const response = await axios.post(apiUrlBase + 'hub/details', 
        {
            api_token: token,
            id: hubId,
            device_id: hubId
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // Lets go fishing for interesting details
        let details = {};
        // Hunt for values that might exist
        let foundSerial = response.data.match(/(?<=Serial #\: )[A-Za-z0-9]+/);
        if (foundSerial && foundSerial.length > 0) { details.serialNumber = foundSerial[0] }
        let foundWifi = response.data.match(/(?<=WiFi Firmware\: )[0-9.]+/);
        if (foundWifi && foundWifi.length > 0) { details.wifiFirmware = foundWifi[0] } 
        let foundFirm = response.data.match(/(?<=Host Firmware\: )[0-9.]+/);
        if (foundFirm && foundFirm.length > 0) { details.hostFirmware = foundFirm[0] }
        let foundOwner = response.data.match(/(?<=Owner\: )[A-Za-z0-9 ]+/);
        if (foundOwner && foundOwner.length > 0)  { details.owner = foundOwner[0] }
        return details;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.getHubStatus = async function getHubStatus(token, hubId){
    try {
        const response = await axios.post(apiUrlBase + 'hub/status', 
        {
            api_token: token,
            id: hubId
            // delay: 0  //observed varying values of 0-7 in link2o app
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // Lets get setup to go fishing for device details
        let details = {
            devices: {
                intelliFlo: false,
                intelliChlor: false,
                // Relays are built-in so always exist
                relay1: true,
                relay2: true,
                heater: false
            },
            connectionStatus: {
                status: 'Unknown',
                signalStrength: 'Unknown'
            } 
        };
        // Presence of string indicates presence of device
        details.devices.intelliFlo = RegExp(/device-intelliflo/).test(response.data);
        details.devices.intelliChlor = RegExp(/device-ichlor/).test(response.data);
        details.devices.heater = !RegExp(/(?<=device-heating[\s\S]+)-not-activated/).test(response.data);
        // Untangle connection values from status pairs
        let statuses = response.data.match(/(?<=sg-title">)[A-Za-z0-9\s]+/g);
        let values = response.data.match(/(?<=sg-status">)[A-Za-z0-9\s]+/g);
        for (let i = 0; i < statuses.length; i++) {
            if (statuses[i].trim().toLowerCase() == 'CONNECTION'.toLowerCase()) {
                details.connectionStatus.status = values[i].trim().toLowerCase();
            }
            if (statuses[i].trim().toLowerCase() == 'SIGNAL'.toLowerCase()) {
                details.connectionStatus.signalStrength = values[i].trim().toLowerCase();
            }
        }
        return details;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

// INTELLIFLO FUNCTIONS //

module.exports.getIntelliFloStatus = async function getIntelliFloStatus(token, hubId){
    try {
        const response = await axios.post(apiUrlBase + 'pif/status', 
        {
            api_token: token,
            id: hubId
            // delay: 5  //observed varying values of 0-6 in link2o app
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // Lets get setup to go fishing for device details
        let details = {
            onRunningSchedule: false,
            activePreset: 0,
            rpm: 0,
            watts: 0
        };
        // Presence of string tells us if pump is active / schedule is running
        details.onRunningSchedule = RegExp(/(?<=pif-toggle-active[\s\w=']+)pif-scheduledMode/).test(response.data);
        // Hunt for values that might exist
        let foundPreset = response.data.match(/(?<=active-preset_speed[\s\S]+preset_speed_button_)\d/);
        if (foundPreset && foundPreset.length > 0) { details.activePreset = foundPreset[0] }
        let foundRpm = response.data.match(/(?<=new_dial_container_text_1'>)\d+/);
        if (foundRpm && foundRpm.length > 0) { details.rpm = foundRpm[0] }
        // Untangle values from status pairs
        let statuses = response.data.match(/(?<=sg-title">)[A-Za-z0-9\s]+/g);
        let values = response.data.match(/(?<=sg-status">)[A-Za-z0-9\s]+/g);
        for (let i = 0; i < statuses.length; i++) {
            if (statuses[i].trim().toLowerCase() == 'POWER'.toLowerCase()) {
                let foundWatts = values[i].match(/\d+/g)
                if (foundWatts && foundWatts.length > 0) { details.watts = foundWatts[0] }
            }
        }
        return details;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.stopIntelliFlo = async function stopIntelliFlo(token, hubId){
    try {
        const response = await axios.post(apiUrlBase + 'pif/stop',
        {
            api_token: token,
            id: hubId
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // This simple API gives back a JSON blob which we will pass back as-is.
        // Ex: {"success":true,"message":"Device Stopped"}
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.startIntelliFlo = async function startIntelliFlo(token, hubId){
    try {
        const response = await axios.post(apiUrlBase + 'pif/scheduledMode',
        {
            api_token: token,
            id: hubId
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // This simple API gives back a JSON blob which we will pass back as-is.
        // Ex: {"success":true,"message":"Running Schedule"}
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.setIntelliFloSpeed = async function setIntelliFloSpeed(token, hubId, presetSpeed){
    try {
        const response = await axios.post(apiUrlBase + 'pif/activateSpeed',
        {
            api_token: token,
            id: hubId,
            speed: presetSpeed
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // This simple API gives back a JSON blob which we will pass back as-is.
        // Ex: {"success":true,"message":"Activated Speed 1","speed":"1"}
        // Ex: {"success":false,"message":"That is not a valid Speed"}
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

// INTELLICHLOR FUNCTIONS //

module.exports.getIntelliChlorStatus = async function getIntelliChlorStatus(token, hubId){
    try {
        const response = await axios.post(apiUrlBase + 'ichlor/status', 
        {
            api_token: token,
            id: hubId
            // delay: 5  //observed varying values of 0-6 in link2o app
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // Lets get setup to go fishing for device details
        let details = {
            outputPercent: 0,
            boost: false,
            flow: true,
            temp: 0,
            saltPpm: 0 
        };
        // Presence of string tells us if boost is active / schedule is running
        details.boost = !RegExp(/(?<=ichlor-mode-button-active[\s\d\w-='">]+)REGULAR/).test(response.data);
        // If boosting, report 100% output, else hunt for reported output 
        if (details.boost) {details.outputPercent = 100} else {
            let foundOutput = response.data.match(/(?<=new_dial_container_text_1'>)\d+/);
            if (foundOutput && foundOutput.length > 0) { details.outputPercent = foundOutput[0] }    
        }
        // Untangle values from status pairs
        let statuses = response.data.match(/(?<=sg-title">)[A-Za-z0-9\s]+/g);
        let values = response.data.match(/(?<=sg-status">)[A-Za-z0-9\s]+/g);
        for (let i = 0; i < statuses.length; i++) {
            // Temp unit is reported in a different API call, so this number is unitless
            if (statuses[i].trim().toLowerCase() == 'TEMPERATURE'.toLowerCase()) {
                let foundTemp = values[i].match(/\d+/g)
                if (foundTemp && foundTemp.length > 0) { details.temp = foundTemp[0] }
            }
            if (statuses[i].trim().toLowerCase() == 'SALT LEVEL'.toLowerCase()) {
                let foundSalt = values[i].match(/\d+/g)
                if (foundSalt && foundSalt.length > 0) { details.saltPpm = foundSalt[0] }
            }
        }
        // Hunt for a no flow warning - flow exists when not present
        details.flow = !RegExp(/no flow/i).test(response.data);
        return details;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.setIntelliChlorBoostOn = async function setIntelliChlorBoostOn(token, hubId){
    try {
        const response = await axios.post(apiUrlBase + 'ichlor/enableBoostMode',
        {
            api_token: token,
            id: hubId
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // This simple API gives back a JSON blob which we will pass back as-is.
        // Ex: {"success":true,"message":"Boost Mode Enabled!"}
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.setIntelliChlorBoostOff = async function setIntelliChlorBoostOff(token, hubId){
    try {
        const response = await axios.post(apiUrlBase + 'ichlor/disableBoostMode',
        {
            api_token: token,
            id: hubId
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // This simple API gives back a JSON blob which we will pass back as-is.
        // Ex: {"success":true,"message":"Boost Mode Disabled!"}
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.setIntelliChlorLevel = async function setIntelliChlorLevel(token, hubId, outputPercent){
    try {
        const response = await axios.post(apiUrlBase + 'ichlor/setChlorPercentage',
        {
            api_token: token,
            id: hubId,
            value: outputPercent
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // This simple API gives back a JSON blob which we will pass back as-is.
        // Ex: {"success":true,"value":"35","message":"The Chlorine Level has been changed!","boostModeOn":false}
        // Ex: {"success":false,"message":"Please set a value 0-101"}
        // Note:  Sending a value of 101 will produce a successful response indicating boost mode has been enabled
        //        but field testing shows this to be a lie.  You must use the enableBoostMode endpoint instead.
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

// RELAY FUNCTIONS //

module.exports.getRelayStatus = async function getRelayStatus(token, hubId){
    // Pentair Color Light Show Deocder
    const pentairColorShows = {
        1: 'SAM',
        2: 'Party',
        3: 'Romance',
        4: 'Caribbean',
        5: 'American',
        6: 'California Sunset',
        7: 'Royal',
        8: 'Blue',
        9: 'Green',
        10: 'Red',
        11: 'White',
        12: 'Magenta',
        13: 'Hold',
        14: 'Recall'
    }
    try {
        const response = await axios.post(apiUrlBase + 'relay/status', 
        {
            api_token: token,
            id: hubId
            // delay: 5  //observed varying values of 0-6 in link2o app
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // Lets get setup to go fishing for device details
        let details = {
            relay1: {
                deviceType: 'none',
                state: 'off',
                colorMode: 'Unsupported',
                colorModeName: 'Unsupported',
                watts: 0
            },
            relay2: {
                deviceType: 'none',
                state: 'off',
                colorMode: 'Unsupported',
                colorModeName: 'Unsupported',
                watts: 0
            }
        };
        // First let's split the response so we can process for each relay seperately
        let relayText = response.data.split(/data-outlet='2'/);
        // If we got more than 2 relay strings, we have a problem.
        if (!relayText || relayText.length != 2) {throw 'We didn\'t find 2 relays and there must be 2.'}
        // Now we go fishing for details one relay at a time
        for (let i = 0; i < 2; i++) {
            let ri = 'relay' + (i+1);
            // Discover configured device type
            if (RegExp(/NO DEVICE YET/).test(relayText[i])) {continue}
            else if (RegExp(/DEVICE TYPE: PENTAIR COLOR LIGHT/).test(relayText[i])) {details[ri].deviceType = 'Pentair Color Light'}
            else if (RegExp(/LIGHT (OTHER)/).test(relayText[i])) {details[ri].deviceType = 'Light'}
            else {throw 'Relay set to unsupported device type.'}
            // Determine on/off state
            if (RegExp(/class='js-relay-tap' data-action='off'/).test(relayText[i])) {details[ri].state = 'on'}
            // Find the energy consumption
            let foundWatts = relayText[i].match(/(?<=POWER:\s+)\d+(?=\s+WATTS)/);
            if (foundWatts && foundWatts.length > 0) {details[ri].watts = foundWatts[0]}
            // Find the selected color show for color lights
            let foundColor = relayText[i].match(/(?<=selected_color_preset' data-lightshow-id=')\d+/);
            if (foundColor && foundColor.length >0) {
                details[ri].colorMode = foundColor[0];
                if (1 <= foundColor[0] <= 14) {
                    details[ri].colorModeName = pentairColorShows[foundColor[0]];
                } else {
                    details[ri].colorModeName = 'Unknown';
                }
                
            }             
        }
        return details;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.setRelayLightColorMode = async function setRelayLightColorMode(token, hubId, relayNumber, colorModeNumber){
    try {
        const response = await axios.post(apiUrlBase + 'relay/change_light_show',
        {
            api_token: token,
            id: hubId,
            light_show_id: colorModeNumber,
            light_show_state: 'true',
            outlet: relayNumber
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // This simple API gives back a JSON blob which we will pass back as-is.
        // Ex: {"success":true,"message":""}
        // Note:  This API will REPORT SUCCESS for color modes ouside the range 1-14, or on relays not configured
        //        for color lights.  It SEEMS to relay the bad command to the hardware and put itself in a bad state.
        // Ex: {"success":false,"message":""}
        // Note:  This API will REPORT FAILURE for relays outside the range 1-2. 
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.setRelayOn = async function setRelayOn(token, hubId, relayNumber){
    try {
        const response = await axios.post(apiUrlBase + 'relay/start',
        {
            api_token: token,
            id: hubId,
            outlet: relayNumber
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // This simple API gives back a JSON blob which we will pass back as-is.
        // Ex: {"success":true,"message":"Outlet Turned On"}
        // Ex: {"success":false,"message":"That is not a valid outlet"}
        // Note:  This API WILL turn on a relay NOT configured in the UI.        
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.setRelayOff = async function setRelayOff(token, hubId, relayNumber){
    try {
        const response = await axios.post(apiUrlBase + 'relay/stop',
        {
            api_token: token,
            id: hubId,
            outlet: relayNumber
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // This simple API gives back a JSON blob which we will pass back as-is.
        // Ex: {"success":true,"message":"Outlet Turned Off"}
        // Ex: {"success":false,"message":"That is not a valid outlet"}
        // Note:  This API WILL turn on a relay NOT configured in the UI.        
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

// HEATER FUNCTIONS //

module.exports.getHeaterStatus = async function getHeaterStatus(token, hubId){
    try {
        const response = await axios.post(apiUrlBase + 'pools/heating/tab_status', 
        {
            api_token: token,
            id: hubId
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // Lets get setup to go fishing for device details
        let details = {
            state: 'off',
            tempF: 0,
            tempC: 0,
            setpointF: 0,
            setpointC: 0
        };
        // Hunt for values 
        let foundState = response.data.match(/(?<=js_heating_dial_toggle[ \w]*'>)[A-Za-z]+(?=<)/);
        if (foundState && foundState.length > 0) {details.state = foundState[0].toLowerCase()}
        let foundTempF = response.data.match(/(?<=class='current_temp_f[ \w]*'>)\d+/);
        if (foundTempF && foundTempF.length > 0) {details.tempF = foundTempF[0]}
        let foundTempC = response.data.match(/(?<=class='current_temp_c[ \w]*'>)\d+/);
        if (foundTempC && foundTempC.length > 0) {details.tempC = foundTempC[0]}
        let foundSetF = response.data.match(/(?<=data-target-temp=')\d+/);
        if (foundSetF && foundSetF.length > 0) {details.setpointF = foundSetF[0]}
        let foundSetC = response.data.match(/(?<=data-target-temp-c=')\d+/);
        if (foundSetC && foundSetC.length > 0) {details.setpointC = foundSetC[0]}
        return details;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.setHeaterOn = async function setHeaterOn(token, hubId){
    try {
        const response = await axios.post(apiUrlBase + 'pools/heating/toggle_heating_dial',  
        {
            api_token: token,
            id: hubId,
            target_state: 'on',
            context: 'status_tab'
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // This simple API gives back a JSON blob which we will pass back as-is.
        // Ex: {"success":true,"message":""}
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.setHeaterOff = async function setHeaterOff(token, hubId){
    try {
        const response = await axios.post(apiUrlBase + 'pools/heating/toggle_heating_dial',
        {
            api_token: token,
            id: hubId,
            target_state: 'off',
            context: 'status_tab'
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // This simple API gives back a JSON blob which we will pass back as-is.
        // Ex: {"success":true,"message":""}
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.setHeaterSetpoint = async function setHeaterSetpoint(token, hubId, setpoint){
    try {
        const response = await axios.post(apiUrlBase + 'pools/heating/save_set_point',
        {
            api_token: token,
            id: hubId,
            set_point: setpoint
        }, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        // This simple API gives back a JSON blob which we will pass back as-is.
        // Ex: {"success":true,"message":""}
        // Note:  This API will REPORT SUCCESS for values ouside the range 32-104, but DO NOTHING.
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}