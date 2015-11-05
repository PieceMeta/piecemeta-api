'use strict';

var sendMail = function (mailObject, callback) {
    var fs = require('fs'),
        path = require('path'),
        nodemailer = require('nodemailer'),
        config = require('../config');

    if (!config.get.mailer) {
        console.log('Warning: Skipping EMail, mailer not configured.');
        callback(null, null);
        return;
    }

    var transport = nodemailer.createTransport({
            host: config.get.mailer.host,
            port: config.get.mailer.port,
            secure: config.get.mailer.secure,
            auth: {
                user: config.get.mailer.user,
                pass: config.get.mailer.pass
            }
        });

    fs.readFile(path.resolve(__dirname, 'mails/' + mailObject.template + '.' + mailObject.lang + '.txt'), function (err, data) {
        if (err) {
            return callback(err, null);
        }
        var processedBody = data.toString();
        for (var i = 0; i < mailObject.substitutions.length; i += 1) {
            processedBody = processedBody.replace(mailObject.substitutions[i].key, mailObject.substitutions[i].value);
        }
        transport.sendMail({
            from: config.get.mailer.address,
            to: mailObject.recipient,
            subject: mailObject.subject,
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