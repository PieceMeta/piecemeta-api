module.exports.sendConfirmationRequest = function (user, callback) {
    'use strict';
    sendMail({
        recipient: user.email,
        subject: 'Please confirm your registration at PieceMeta.com',
        template: 'confirm_email',
        lang: 'en',
        substitutions: [
            { key: '!CONFIRM_URL!', value: 'http://www.piecemeta.com/confirm/' + user.single_access_token }
        ]
    }, callback);
};

var sendMail = function (config, callback) {
    'use strict';
    var fs = require('fs'),
        path = require('path'),
        nodemailer = require('nodemailer'),
        Settings = require('settings'),
        sysConfig = new Settings(require('../config')),
        transport = nodemailer.createTransport(sysConfig.smtp_options);

    fs.readFile(path.resolve(__dirname, '../mails/' + config.template + '.' + config.lang + '.txt'), function (err, data) {
        if (err) {
            return callback(err, null);
        }
        var processedBody = data.toString();
        for (var i = 0; i < config.substitutions.length; i += 1) {
            processedBody = processedBody.replace(config.substitutions[i].key, config.substitutions[i].value);
        }
        transport.sendMail({
            from: sysConfig.system_email,
            to: config.recipient,
            subject: config.subject,
            text: processedBody
        }, function (err, response) {
            if (err) {
                callback(err, response);
            } else {
                callback(null, response);
            }
        });
    });
};
