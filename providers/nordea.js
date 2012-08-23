var crypto = require('crypto')
  , IpizzaBank = require('./ipizzabank')
  , _ = require('underscore')._

function Nordea (opt) {
  this.name = 'nordea'
  if (!opt.algorithm) opt.algorithm = 'SHA1'

  IpizzaBank.apply(this, arguments)
}
Nordea.prototype = Object.create(IpizzaBank.prototype)

Nordea.prototype.gateways =
  { development: 'https://pangalink.net/banklink/0003/nordea'
  , production: 'https://netbank.nordea.com/pnbepay/epayn.jsp'
  }

Nordea.prototype.json = function () {
  var ipizza = require('ipizza')
  var params = {}
  params.SOLOPMT_VERSION = '0003'
  params.SOLOPMT_STAMP = this.get('id')
  params.SOLOPMT_RCV_ID = this.get('clientId')
  if (this.get('account') && this.get('accountName')) {
    params.SOLOPMT_RCV_ACCOUNT = this.get('account')
    params.SOLOPMT_RCV_NAME = this.get('accountName')
  }
  params.SOLOPMT_LANGUAGE = this.get('lang') === 'EST' ? '4' : '3'
  params.SOLOPMT_AMOUNT = this.get('amount')
  params.SOLOPMT_REF = this.get('ref')
  params.SOLOPMT_DATE = 'EXPRESS'
  params.SOLOPMT_MSG = this.get('msg')
  params.SOLOPMT_RETURN = params.SOLOPMT_CANCEL = params.SOLOPMT_REJECT =
    ipizza.get('hostname') + ipizza.get('response') + '/' + this.get('provider')
  params.SOLOPMT_KEYVERS = '0001'
  params.SOLOPMT_CUR = this.get('curr')
  params.SOLOPMT_CONFIRM = 'YES'
  var pack = [ params.SOLOPMT_VERSION
             , params.SOLOPMT_STAMP
             , params.SOLOPMT_RCV_ID
             , params.SOLOPMT_AMOUNT
             , params.SOLOPMT_REF
             , params.SOLOPMT_DATE
             , params.SOLOPMT_CUR
             , this.get('mac')
             , ''].join('&')
  var hash = crypto.createHash(this.get('algorithm').toLowerCase())
  hash.update(pack)
  params.SOLOPMT_MAC = hash.digest('hex').toUpperCase()
  return params
}

Nordea.prototype.response = function (req, resp) {
  params = req.query
  var pack = [ params.SOLOPMT_RETURN_VERSION
             , params.SOLOPMT_RETURN_STAMP
             , params.SOLOPMT_RETURN_REF
             , params.SOLOPMT_RETURN_PAID
             , this.get('mac')
             , ''
             ]
  if (!params.SOLOPMT_RETURN_PAID) {
    pack.splice(3, 1)
  }
  pack = pack.join('&')
  var hash = crypto.createHash(this.get('algorithm').toLowerCase())
  hash.update(pack)
  var ret = hash.digest('hex').toUpperCase() === params.SOLOPMT_RETURN_MAC
  var ipizza = require('ipizza')
  var reply = { provider: this.name
              , bankId: 'nordea'
              , clientId: this.get('clientId')
              , id: params.SOLOPMT_RETURN_STAMP
              , ref: params.SOLOPMT_RETURN_REF
              }
  if (!ret) {
    ipizza.emit('error', _.extend({type: 'not verified'}, reply), req, resp)
  }
  else if (!params.SOLOPMT_RETURN_PAID) {
    ipizza.emit('error', _.extend({type: 'not paid'}, reply), req, resp)
  }
  else {
    ipizza.emit('success', _.extend(
      {transactionId: params.SOLOPMT_RETURN_PAID}, reply), req, resp)
  }
}

module.exports = Nordea