module.exports = {
    common: {
        admin_user_id: '',
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
        },
        mongodb: {
            host: 'localhost',
            port: '27017',
            database: 'piecemeta-api'
        }
    },
    development: {
        mongodb: {
            host: 'localhost',
            port: '27017',
            database: 'piecemeta-api-dev'
        }
    }
};