/*
 * Author: Daniel Holmlund <daniel.w.holmlund@Intel.com>
 * Copyright (c) 2015 Intel Corporation.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var _ = require("lodash");

// Require MQTT and setup the connection to the broker
var mqtt = require('mqtt');
var client  = mqtt.connect("mqtt://192.168.1.1");

// Require the Winston Logger
var logger = require('./logger.js');

// Require the MongoDB libraries and connect to the database
var mongoose = require('mongoose');
mongoose.connect("mongodb://localhost/iotdemo");
var db = mongoose.connection;

// Report database errors to the console 
db.on('error', console.error.bind(console, 'connection error:'));

// Log when a connection is established to the MongoDB server
db.once('open', function (callback) {
    logger.info("Connection to MongoDB successful");
});

// Import the Database Model Objects
var DataModel = require('intel-commercial-edge-network-database-models').DataModel;
var SensorModel = require('intel-commercial-edge-network-database-models').SensorModel;

if(config.debug != "true") {
    logger.remove(winston.transports.File);
    logger.remove(winston.transports.Console);
}

logger.info("Edge Device Daemon is starting");
// Connect to the MQTT server
var mqttClient  = mqtt.connect(config.mqtt.url);

// MQTT connection function
mqttClient.on('connect', function () {
    logger.info("Connected to MQTT server");
    
    // Subscribe to the MQTT topics
    mqttClient.subscribe('announcements');
    mqttClient.subscribe('sensors/+/data');
});

// A function that runs when MQTT receives a message
mqttClient.on('message', function (topic, message) {
    logger.trace(topic + ":" + message.toString());

    // Parse the incoming data
    try {
        json = JSON.parse(message);
    } catch(e){
        logger.error(e);
    }

    if (topic == "announcements") {
        logger.info("Received an announcement of a new edge sensor");
        logger.trace(topic + ":" + message.toString());

        var sensor = new SensorModel(json);
        sensor.save(function(err, sensor) {
            if (err)
                logger.error(err);
            else
                logger.trace("Wrote sensor to db:" + sensor.toString());
        });
    };

    if (topic.match(/data/)) {
        var value = new DataModel(json);
        value.save(function(err, data) {
            if (err)
                logger.error(err);
            else
                logger.info(data.sensor_id + ":" + data.value);
                logger.trace("Wrote data to db:" + data.toString());
        });
    }
});
