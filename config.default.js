module.exports = {
    common: {
        http_port: 8080,
        system_email: 'PieceMeta <info@piecemeta.com>',
        smtp_options: {
            // use a service
            service: 'Gmail',
            // or specify manually
            /*
            host: '',
            secureConnection: true,
            port: 465,
            */
            auth: {
                user: '',
                pass: ''
            }
        }
    },
    development: {
        mongodb: {
            host: 'localhost',
            port: '27017',
            database: 'piecemeta-api-dev'
        }
    },
    production: {
        mongodb: {
            host: 'localhost',
            port: '27017',
            database: 'piecemeta-api'
        }
    }
};