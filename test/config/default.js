var path = require('path')
var winston = require('winston')
var containerized = require('containerized')()

var API_PREFIX = '/api'

module.exports = {
  port: process.env.PORT || 8081,

  apiPath: API_PREFIX,

  host: 'localhost',
  paginate: {
    default: 10,
    max: 50
  },
  authentication: {
    secret: 'b5KqXTye4fVxhGFpwMVZRO3R56wS5LNoJHifwgGOFkB5GfMWvIdrWyQxEJXswhAC',
    strategies: [
      'jwt',
      'local'
    ],
    path: API_PREFIX + '/authentication',
    service: API_PREFIX + '/users'
  },
  logs: {
    Console: {
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      level: 'verbose'
    },
    DailyRotateFile: {
      format: winston.format.json(),
      filename: path.join(__dirname, '..', 'test-log-%DATE%.log'),
      datePattern: 'YYYY-MM-DD'
    }
  },
  db: {
    adapter: 'mongodb',
    url: (containerized ? 'mongodb://mongodb:27017/kdk-test' : 'mongodb://127.0.0.1:27017/kdk-test')
  },
  storage: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    bucket: process.env.S3_BUCKET
  },
  billing: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    daysUntilInvoiceDue: 7,
    plans: {
      // First plan is the default one
      bronze: {
        color: 'light-green-4',
        default: true
      },
      silver: {
        color: 'light-green-6',
        stripeId: 'plan_DHd5HGwsl31NoC'
      },
      gold: {
        color: 'light-green-8',
        stripeId: 'plan_DHd5RMLMSlpUmQ'
      },
      diamond: {
        color: 'light-green-10',
        url: 'https://aktnmap.com/#footer'
      }
    }
  }
}
