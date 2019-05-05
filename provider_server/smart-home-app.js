/* eslint-disable require-jsdoc */
// Copyright 2017, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const fetch = require('node-fetch');
const config = require('./cloud/config-provider');
const datastore = require('./cloud/datastore');
const authProvider = require('./cloud/auth-provider');
const DEVICE_INTERFACE = require('./devices-interface').interface;
const DEVICES = require('./cloud/devices').DEVICES;

let brightnessVal = 0;
let gardenRotation = 0;
let gardenRotationDeg = 0;
let humidityVal = 0;
let gardenBool = false;
let mode = [''];
const PIN = '1805';

// const PIN = '333444';

function registerAgent(app, socket, deviceStore) {
  console.log('smart-home-app registerAgent');
  console.log('Socket', socket);
  console.log('Socket id', socket.id);

  app.post('/smarthome', function(request, response) {
    // console.log('post /smarthome', request.headers);
    let reqdata = request.body;
    // console.log('post /smarthome', reqdata);

    // let authToken = authProvider.getAccessToken(request);
    // let uid = datastore.Auth.tokens[authToken].uid;

    if (!reqdata.inputs) {
      response
        .status(401)
        .set({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        })
        .json({error: 'missing inputs'});
    }
    for (let i = 0; i < reqdata.inputs.length; i++) {
      let input = reqdata.inputs[i];
      let intent = input.intent;
      if (!intent) {
        response
          .status(401)
          .set({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          })
          .json({error: 'missing inputs'});
        continue;
      }
      switch (intent) {
        case 'action.devices.SYNC':
          // console.log('post /smarthome SYNC');
          /**
           * request:
           * {
           *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
           *  "inputs": [{
           *      "intent": "action.devices.SYNC",
           *  }]
           * }
           */
          sync(
            {
              uid: '98709sad0f9j09a',
              auth: '0s9dj0f9jsd0f9jsdf',
              requestId: reqdata.requestId,
            },
            response
          );
          break;
        case 'action.devices.QUERY':
          // console.log('post /smarthome QUERY');

          query(
            {
              uid: '98709sad0f9j09a',
              auth: '0s9dj0f9jsd0f9jsdf',
              requestId: reqdata.requestId,
              devices: reqdata.inputs[0].payload.devices,
            },
            response
          );

          break;
        case 'action.devices.EXECUTE':
          // console.log('post /smarthome EXECUTE');

          exec(
            {
              uid: '98709sad0f9j09a',
              auth: '0s9dj0f9jsd0f9jsdf',
              requestId: reqdata.requestId,
              commands: reqdata.inputs[0].payload.commands,
            },
            response
          );

          break;
        default:
          response
            .status(401)
            .set({
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            })
            .json({error: 'missing intent'});
          break;
      }
    }
  });
  /**
   * Enables prelight (OPTIONS) requests made cross-domain.
   */
  app.options('/smarthome', function(request, response) {
    response
      .status(200)
      .set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      })
      .send('null');
  });

  function sync(data, response) {
    console.log('sync', JSON.stringify(data));
    let devices = app.smartHomePropertiesSync(data.uid);
    if (!devices) {
      response
        .status(500)
        .set({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        })
        .json({error: 'failed'});
      return;
    }
    let deviceList = [];
    Object.keys(devices).forEach(function(key) {
      if (devices.hasOwnProperty(key) && devices[key]) {
        // console.log('Getting device information for id \'' + key + '\'');
        let device = devices[key];
        device.id = key;
        deviceList.push(device);
      }
    });
    let deviceProps = {
      requestId: data.requestId,
      payload: {
        agentUserId: data.uid,
        devices: DEVICES,
      },
    };
    console.log('sync response', JSON.stringify(deviceProps));
    response.status(200).json(deviceProps);
    return deviceProps;
  }

  function query(data, response) {
    console.log('query', JSON.stringify(data));
    let id = 'Garden';
    if (data.devices.length > 0) {
      id = data.devices[0].id;
    }
    let payload = {devices: {}};

    if (id == 'Cookie') {
      payload.devices = {
        Cookie: {
          online: true,
          isLocked: true,
          isJammed: false,
        },
      };
    } else if (id == 'Sprinkler') {
      payload.devices = {
        Garden: {
          online: true,
          isRunning: false,
        },
      };
    } else if (id == 'Garden') {
      console.log('query humidity val ', humidityVal);
      payload.devices = {
        Garden: {
          on: gardenBool,
          online: true,
          isRunning: false,
          brightness: brightnessVal,
          rotationPercent: (gardenRotation * 100) / 360,
          rotationDegrees: gardenRotation,
          humiditySetpointPercent: humidityVal,
          humidityAmbientPercent: 33,
          dispenseItems: [
            {
              itemName: 'water',
              amountRemaining: {
                amount: 100.0,
                unit: 'NO_UNITS',
              },
              amountLastDispensed: {
                amount: 2.0,
                unit: 'NO_UNITS',
              },
              isCurrentlyDispensing: false,
            },
          ],
        },
      };
    } else {
      payload.devices[id] = deviceStore[id];
    }

    let deviceStates = {
      requestId: data.requestId,
      payload: payload,
    };

    socket.on('response', function(data) {
      console.log('********************', data);
    });
    console.log('query response', JSON.stringify(deviceStates));
    response.status(200).json(deviceStates);
    return deviceStates;
  }

  function getDeviceIds(devices) {
    let deviceIds = [];
    for (let i = 0; i < devices.length; i++) {
      if (devices[i] && devices[i].id) {
        deviceIds.push(devices[i].id);
      }
    }
    return deviceIds;
  }

  function exec(data, response) {
    console.log('exec', JSON.stringify(data));
    console.log('data commands', data.commands);
    let id = 'Garden';
    let resBody = '';
    for (let i = 0; i < data.commands.length; i++) {
      for (let j = 0; j < data.commands[i].devices.length; j++) {
        id = data.commands[i].devices[j].id;
        resBody = handleExecEmission(
          data.requestId,
          data.commands[i].devices[j].id,
          data.commands[i].execution
        );
      }
    }
    console.log('exec response', JSON.stringify(resBody));

    response.status(200).json(resBody);

    return resBody;
  }

  registerAgent.exec = exec;

  function handleExecEmission(requestId, id, executions) {
    for (let i = 0; i < executions.length; i++) {
      if (id == 'Cookie') {
        console.log('Cookie should ' + JSON.stringify(executions));
        socket.emit(DEVICE_INTERFACE.DEVICES.COOKIE, executions);
        let execStatus = whatCommand(requestId, 'Cookie', executions);
        return execStatus;
      } else if (id == 'Sprinkler') {
        console.log('Sprinkler should ' + JSON.stringify(executions));
        socket.emit(DEVICE_INTERFACE.DEVICES.SPRINKLER, executions);
        let execStatus = whatCommand(requestId, 'Sprinkler', executions);
        return execStatus;
      } else if (id == 'Garden') {
        console.log('Garden should ' + JSON.stringify(executions));
        socket.emit(DEVICE_INTERFACE.DEVICES.GARDEN, executions);
        let execStatus = whatCommand(requestId, 'Garden', executions);
        return execStatus;
      }
    }
  }

  function execDevice(uid, command, device) {
    let curDevice = {
      id: device.id,
      states: {},
    };
    Object.keys(command.params).forEach(function(key) {
      if (command.params.hasOwnProperty(key)) {
        curDevice.states[key] = command.params[key];
      }
    });
    let payLoadDevice = {
      ids: [curDevice.id],
      status: 'SUCCESS',
      states: {},
    };
    let execDevice = app.smartHomeExec(uid, curDevice);
    console.info('execDevice', JSON.stringify(execDevice[device.id]));
    // Check whether the device exists or whether it exists and it is disconnected.
    if (!execDevice || !execDevice[device.id].states.online) {
      console.warn('The device you want to control is offline');
      return {status: 'ERROR', errorCode: 'deviceOffline'};
    }
    let deviceCommand = {
      type: 'change',
      state: {},
    };
    // TODO - add error and debug to response

    deviceCommand.state[curDevice.id] = execDevice[curDevice.id].states;
    app.changeState(deviceCommand);

    execDevice = execDevice[curDevice.id];

    payLoadDevice.states = execDevice.states;

    Object.keys(command.params).forEach(function(key) {
      if (command.params.hasOwnProperty(key)) {
        if (payLoadDevice.states[key] != command.params[key]) {
          return {status: 'ERROR', errorCode: 'notSupported'};
        }
      }
    });
    return {status: 'SUCCESS'};
  }
}

exports.registerAgent = registerAgent;

function whatCommand(requestId, name, data) {
  if (data[0].command == 'action.devices.commands.StartStop') {
    console.log('Start Stop now');
    let status = {
      requestId: requestId,
      payload: {
        commands: [
          {
            ids: [name],
            status: 'SUCCESS',
            states: {
              isRunning: true,
              activeZones: ['basil'],
            },
          },
        ],
      },
    };
    return status;
  } else if (data[0].command == 'action.devices.commands.OnOff') {
    console.log('OnOff now');
    gardenBool = true;
    let status = {
      requestId: requestId,
      payload: {
        commands: [
          {
            ids: [name],
            status: 'SUCCESS',
            states: {
              on: true,
              online: true,
              brightness: data[0].params.brightness,
            },
          },
        ],
      },
    };

    return status;
  } else if (data[0].command == 'action.devices.commands.BrightnessAbsolute') {
    console.log('Brightness now');
    console.log('Brightness = ', data[0].params.brightness);
    brightnessVal = data[0].params.brightness;
    let status = {
      requestId: requestId,
      payload: {
        commands: [
          {
            ids: [name],
            status: 'SUCCESS',
            states: {
              brightness: data[0].params.brightness,
            },
          },
        ],
      },
    };

    return status;
  } else if (data[0].command == 'action.devices.commands.RotateAbsolute') {
    console.log('Rotation now');
    console.log('rotationDegrees = ', data[0].params.rotationDegrees);
    console.log('rotationPercent = ', data[0].params.rotationPercent);
    gardenRotation =
      data[0].params.rotationDegrees != null
        ? data[0].params.rotationDegrees
        : (data[0].params.rotationPercent * 100) / 360;
    let status = {
      requestId: requestId,
      payload: {
        commands: [
          {
            ids: [name],
            status: 'SUCCESS',
            states: {
              rotationPercent: (gardenRotation * 100) / 360,
              rotationDegrees: gardenRotation,
              online: true,
            },
          },
        ],
      },
    };

    return status;
  } else if (data[0].command == 'action.devices.commands.LockUnlock') {
    if (typeof data[0].challenge === 'undefined') {
      let status = {
        requestId: requestId,
        payload: {
          commands: [
            {
              ids: [name],
              status: 'ERROR',
              errorCode: 'challengeNeeded',
              challengeNeeded: {
                type: 'pinNeeded',
              },
            },
          ],
        },
      };
      return status;
    } else if (data[0].challenge.pin !== PIN) {
      console.log('Wrong pin entered = ', data[0].challenge.pin);
      let status = {
        requestId: requestId,
        payload: {
          commands: [
            {
              ids: [name],
              status: 'ERROR',
              errorCode: 'challengeNeeded',
              challengeNeeded: {
                type: 'challengeFailedPinNeeded',
              },
            },
          ],
        },
      };

      return status;
    } else if (data[0].challenge.pin === PIN) {
      console.log('Pin = ', data[0].challenge.pin);
      let status = {
        requestId: requestId,
        payload: {
          commands: [
            {
              ids: [name],
              status: 'SUCCESS',
              states: {
                isLocked: false,
                isJammed: false,
              },
            },
          ],
        },
      };
      return status;
    }
  } else if (data[0].command == 'action.devices.commands.SetHumidity') {
    console.log('Humidity now');
    console.log('Humidity = ', data[0].params.humidity);
    humidityVal = data[0].params.humidity;
    let status = {
      requestId: requestId,
      payload: {
        commands: [
          {
            ids: [name],
            status: 'SUCCESS',
            states: {
              humiditySetpointPercent: data[0].params.humidity,
              humidityAmbientPercent: 33,
            },
          },
        ],
      },
    };

    return status;
  } else if (data[0].command == 'action.devices.commands.Dispense') {
    console.log('Dispense now');
    console.log('Dispense = ', data[0].params.amount);

    let status = {
      requestId: requestId,
      payload: {
        commands: [
          {
            ids: [name],
            status: 'SUCCESS',
            states: {
              dispenseItems: [
                {
                  itemName: 'herb garden',
                  amountLastDispensed: {
                    amount: data[0].params.amount,
                    unit: 'CUPS',
                  },
                  isCurrentlyDispensing: true,
                },
              ],
            },
          },
        ],
      },
    };

    return status;
  }
}
