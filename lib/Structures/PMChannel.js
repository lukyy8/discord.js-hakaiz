"use strict";

exports.__esModule = true;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _Channel2 = require("./Channel");

var _Channel3 = _interopRequireDefault(_Channel2);

var _User = require("./User");

var _User2 = _interopRequireDefault(_User);

var _UtilCache = require("../Util/Cache");

var _UtilCache2 = _interopRequireDefault(_UtilCache);

var _UtilArgumentRegulariser = require("../Util/ArgumentRegulariser");

var PMChannel = (function (_Channel) {
	_inherits(PMChannel, _Channel);

	function PMChannel(data, client) {
		var _this = this;

		_classCallCheck(this, PMChannel);

		_Channel.call(this, data, client);

		this.type = data.type;
		this.lastMessageID = data.last_message_id || data.lastMessageID;
		this.messages = new _UtilCache2["default"]("id", client.options.maxCachedMessages);
		if (data.recipients instanceof _UtilCache2["default"]) {
			this.recipients = data.recipients;
		} else {
			this.recipients = new _UtilCache2["default"]();
			data.recipients.forEach(function (recipient) {
				_this.recipients.add(_this.client.internal.users.add(new _User2["default"](recipient, _this.client)));
			});
		}
		this.name = data.name !== undefined ? data.name : this.name;
		this.owner = data.owner || this.client.internal.users.get("id", data.owner_id);
		this.icon = data.icon !== undefined ? data.icon : this.icon;
	}

	PMChannel.prototype.toString = function toString() {
		return this.recipient.toString();
	};

	PMChannel.prototype.toObject = function toObject() {
		var keys = ['type', 'lastMessageID', 'recipient'],
		    obj = {};

		for (var _iterator = keys, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
			var _ref;

			if (_isArray) {
				if (_i >= _iterator.length) break;
				_ref = _iterator[_i++];
			} else {
				_i = _iterator.next();
				if (_i.done) break;
				_ref = _i.value;
			}

			var k = _ref;

			obj[k] = this[k];
		}

		return obj;
	};

	PMChannel.prototype.sendMessage = function sendMessage() {
		return this.client.sendMessage.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	PMChannel.prototype.send = function send() {
		return this.client.sendMessage.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	PMChannel.prototype.sendTTSMessage = function sendTTSMessage() {
		return this.client.sendTTSMessage.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	PMChannel.prototype.sendTTS = function sendTTS() {
		return this.client.sendTTSMessage.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	PMChannel.prototype.sendFile = function sendFile() {
		return this.client.sendFile.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	PMChannel.prototype.startTyping = function startTyping() {
		return this.client.startTyping.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	PMChannel.prototype.stopTyping = function stopTyping() {
		return this.client.stopTyping.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	PMChannel.prototype.getLogs = function getLogs() {
		return this.client.getChannelLogs.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	PMChannel.prototype.getMessage = function getMessage() {
		return this.client.getMessage.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	_createClass(PMChannel, [{
		key: "recipient",
		get: function get() {
			return this.recipients[0];
		}

		/* warning! may return null */
	}, {
		key: "lastMessage",
		get: function get() {
			return this.messages.get("id", this.lastMessageID);
		}
	}]);

	return PMChannel;
})(_Channel3["default"]);

exports["default"] = PMChannel;
module.exports = exports["default"];
