const link = require('../src/index.js');
let token = null;
let hubId = null;

beforeAll(async function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
})

beforeEach(async function() {
    //insert setup actions
});

describe('authenticate', function() {
    it('should fail to login with invalid credentials', async function(done) {
        try {
            const result = await link.authenticate('bob@bob.com', 'Bobville');
            expect(result.success).toBeFalse();
            done();       
        } catch(error) {
            done().fail(error);
        }
    });
    
    it('should login with valid credentials', async function(done) {
        try {
            const result = await link.authenticate('cj@saretto.com', 'FarmPool');
            expect(result.success).toBeTrue();
            expect(result.api_token).toBeDefined();
            expect(result.api_token).toBeTruthy();
            token = result.api_token; 
            done();       
        } catch(error) {
            done().fail(error);
        }
    });
})

describe('authorize', function() {
    it('should fail to authorize an invalid authentication token', async function(done) {
        try {
            const result = await link.validateAuthToken('abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWX'); 
            expect(result).toBeFalse();
            done();       
        } catch(error) {
            done().fail(error);
        }
    });
    
    it('should confirm authorization of a procured authentication token', async function(done) {
        try {
            const result = await link.validateAuthToken(token);
            expect(result).toBeTrue();
            done();       
        } catch(error) {
            done().fail(error);
        }
    });
})

describe('getIntelliConnectID', function() {
    it('should retrieve the ID of the IntelliConnect device', async function(done) {
        try {
            const result = await link.getIntelliConnectID(token);
            expect(result).toBeGreaterThanOrEqual(1);
            hubId = result;
            done();       
        } catch(error) {
            done.fail(error);
        }
    });
})
// /*
describe('getDeviceTitle', function() {
    it('should retrieve the name of the IntelliConnect device', async function(done) {
        try {
            const result = await link.getDeviceTitle(token, hubId);
            expect(result).toBeTruthy();
            done();       
        } catch(error) {
            done.fail(error);
        }
    });
})

describe('getHubDetails', function() {
    it('should retrieve hub details', async function(done) {
        try {
            const result = await link.getHubDetails(token, hubId);
            expect(result.owner).toBeTruthy();
            expect(result.hostFirmware).toBeTruthy();
            expect(result.wifiFirmware).toBeTruthy();
            expect(result.serialNumber).toBeTruthy();
            done();       
        } catch(error) {
            done.fail(error);
        }
    });
})

describe('getHubStatus', function() {
    it('should retrieve hub status', async function(done) {
        try {
            const result = await link.getHubStatus(token, hubId);
            expect(result.connectionStatus.status).not.toContain('Unknown');
            expect(result.connectionStatus.signalStrength).not.toContain('Unknown');
            expect(result.devices.relay1).toBeTrue();
            expect(result.devices.relay2).toBeTrue();
            expect([true, false]).toContain(result.devices.intelliFlo);
            expect([true, false]).toContain(result.devices.intelliChlor);
            expect([true, false]).toContain(result.devices.heater);
            done();       
        } catch(error) {
            done.fail(error);
        }
    });
})

describe('getIntelliFloStatus', function() {
    it('should retrieve IntelliFlo status', async function(done) {
        try {
            const result = await link.getIntelliFloStatus(token, hubId);
            expect([true, false]).toContain(result.onRunningSchedule);
            expect(result.activePreset).toBeGreaterThanOrEqual(0);
            expect(result.activePreset).toBeLessThanOrEqual(4);
            expect(result.rpm).toBeGreaterThanOrEqual(0);
            expect(result.rpm).toBeLessThanOrEqual(4000);
            expect(result.watts).toBeGreaterThanOrEqual(0);
            expect(result.watts).toBeLessThanOrEqual(5000);
            done();       
        } catch(error) {
            done.fail(error);
        }
    });
})

describe('getIntelliChlorStatus', function() {
    it('should retrieve IntelliChlor status', async function(done) {
        try {
            const result = await link.getIntelliChlorStatus(token, hubId);
            expect([true, false]).toContain(result.boost);
            expect([true, false]).toContain(result.flow);
            expect(result.outputPercent).toBeGreaterThanOrEqual(0);
            expect(result.outputPercent).toBeLessThanOrEqual(100);
            expect((32 <= result.temp <= 110) || (result.flow == false && result.temp == 0)).toBeTrue();
            expect(result.saltPpm).toBeGreaterThanOrEqual(0);
            expect(result.saltPpm).toBeLessThanOrEqual(5000);
            done();       
        } catch(error) {
            done.fail(error);
        }
    });
})

describe('getRelayStatus', function() {
    it('should retrieve status of relays', async function(done) {
        try {
            const result = await link.getRelayStatus(token, hubId);
            // Relay1
            expect(['none', 'Pentair Color Light', 'Light (Other)']).toContain(result.relay1.deviceType);
            expect(['on', 'off']).toContain(result.relay1.state);
            expect(['Unsupported','1','2','3','4','5','6','7','8','9','10','11','12','13','14']).toContain(result.relay1.colorMode);
            expect(['Unsupported','Unknown','SAM','Party','Romance','Caribbean','American','California Sunset','Royal','Blue','Green','Red','White','Magenta','Hold','Recall']).toContain(result.relay1.colorModeName);
            expect(result.relay1.watts).toBeGreaterThanOrEqual(0);
            expect(result.relay1.watts).toBeLessThanOrEqual(5000);
            // Relay2
            expect(['none', 'Pentair Color Light', 'Light (Other)']).toContain(result.relay2.deviceType);
            expect(['on', 'off']).toContain(result.relay2.state);
            expect(['Unsupported','1','2','3','4','5','6','7','8','9','10','11','12','13','14']).toContain(result.relay2.colorMode);
            expect(['Unsupported','Unknown','SAM','Party','Romance','Caribbean','American','California Sunset','Royal','Blue','Green','Red','White','Magenta','Hold','Recall']).toContain(result.relay2.colorModeName);
            expect(result.relay2.watts).toBeGreaterThanOrEqual(0);
            expect(result.relay2.watts).toBeLessThanOrEqual(5000);
            done();       
        } catch(error) {
            done.fail(error);
        }
    });
})

describe('getHeaterStatus', function() {
    it('should retrieve heater status', async function(done) {
        try {
            const result = await link.getHeaterStatus(token, hubId);
            expect(['on','off']).toContain(result.state);
            expect(32 <= result.tempF <= 110).toBeTrue();
            expect(32 <= result.setpointF <= 104).toBeTrue();
            expect(0 <= result.tempF <= 42).toBeTrue();
            expect(0 <= result.setpointF <= 40).toBeTrue();
            done();       
        } catch(error) {
            done.fail(error);
        }
    });
})
// */
// THESE TESTS SHOULD BE COMMENTED OUT.
// THEY SHOULD ONLY BE RUN ONE AT A TIME WHEN HARDWARE IS UNDER OBSERVATION.
/*
describe('stop everything', function() {
    it('should stop pump, salt boost, relays, heater', async function(done) {
        try {
            console.log('stop the flow');
            var result = await link.stopIntelliFlo(token, hubId);
            expect(result.success).toBeTrue();
            console.log('stop the salt boost');
            result = await link.setIntelliChlorBoostOff(token, hubId);
            expect(result.success).toBeTrue();
            console.log('stop relay 1');
            result = await link.setRelayOff(token, hubId, 1);
            expect(result.success).toBeTrue();
            console.log('stop relay 2');
            result = await link.setRelayOff(token, hubId, 2);
            expect(result.success).toBeTrue();
            console.log('stop the heater');
            result = await link.setHeaterOff(token, hubId);
            expect(result.success).toBeTrue();
            done();
        } catch(error) {
            done.fail(error);
        }
    })
})
*/
/*
describe('start everything', function() {
    it('should start pump, relays, heater', async function(done) {
        try {
            var result = await link.startIntelliFlo(token, hubId);
            expect(result.success).toBeTrue();
            result = await link.setRelayOn(token, hubId, 1);
            expect(result.success).toBeTrue();
            result = await link.setRelayOn(token, hubId, 2);
            expect(result.success).toBeTrue();
            result = await link.setHeaterOn(token, hubId);
            expect(result.success).toBeTrue();
            done();
        } catch(error) {
            done.fail(error);
        }
    })
})
*/
/*
describe('start salt and light show', function() {
    it('should start salt boost, royal light show', async function(done) {
        try {
            var result = await link.setIntelliChlorBoostOn(token, hubId);
            expect(result.success).toBeTrue();
            result = await link.setRelayLightColorMode(token, hubId, 2, 7);
            expect(result.success).toBeTrue();
            result = await link.setRelayOn(token, hubId, 2);
            expect(result.success).toBeTrue();
            done();
        } catch(error) {
            done.fail(error);
        }
    })
})
*/
/*
describe('set speed, chlor and heat', function() {
    it('should set pump speed to 3, chlorine to 50%, heater setpoint to 90', async function(done) {
        try {
            var result = await link.setIntelliFloSpeed(token, hubId, 3);
            expect(result.success).toBeTrue();
            result = await link.setIntelliChlorLevel(token, hubId, 50);
            expect(result.success).toBeTrue();
            result = await link.setHeaterSetpoint(token, hubId, 90);
            expect(result.success).toBeTrue();
            done();
        } catch(error) {
            done.fail(error);
        }
    })
})
*/