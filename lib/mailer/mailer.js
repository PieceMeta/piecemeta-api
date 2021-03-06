var sendMail = function (config, callback) {
    'use strict';
    var fs = require('fs'),
        path = require('path'),
        nodemailer = require('nodemailer'),
        serverConfig = require('../config');

    if (!serverConfig.get.mailer) {
        console.log('Warning: Skipping EMail, mailer not configured.');
        callback(null, null);
        return;
    }

    var transport = nodemailer.createTransport({
            host: serverConfig.get.mailer.host,
            port: serverConfig.get.mailer.port,
            secure: serverConfig.get.mailer.secure,
            auth: {
                user: serverConfig.get.mailer.user,
                pass: serverConfig.get.mailer.pass
            }
        });

    fs.readFile(path.resolve(__dirname, 'mails/' + config.template + '.' + config.lang + '.txt'), function (err, data) {
        if (err) {
            return callback(err, null);
        }
        var processedBody = data.toString();
        for (var i = 0; i < config.substitutions.length; i += 1) {
            processedBody = processedBody.replace(config.substitutions[i].key, config.substitutions[i].value);
        }
        transport.sendMail({
            from: serverConfig.mailer.address,
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

module.exports.sendConfirmationRequest = function (user, callback) {
    'use strict';
    sendMail({
        recipient: user.email,
        subject: 'Please confirm your registration at PieceMeta.com',
        template: 'confirm_email',
        lang: 'en',
        substitutions: [
            {key: '!CONFIRM_URL!', value: 'http://www.piecemeta.com/confirm/' + user.single_access_token}
        ]
    }, callback);
};