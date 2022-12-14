"use strict";

/**
 * Options that can be applied to a message before sending it.
 * @typedef {(object)} MessageOptions
 * @property {boolean} [tts=false] Whether or not the message should be sent as text-to-speech.
*/

exports.__esModule = true;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _UtilCache = require("../Util/Cache");

var _UtilCache2 = _interopRequireDefault(_UtilCache);

var _User = require("./User");

var _User2 = _interopRequireDefault(_User);

var _UtilArgumentRegulariser = require("../Util/ArgumentRegulariser");

var _UtilEquality = require("../Util/Equality");

var _UtilEquality2 = _interopRequireDefault(_UtilEquality);

var Message = (function (_Equality) {
	_inherits(Message, _Equality);

	function Message(data, channel, client) {
		var _this = this;

		_classCallCheck(this, Message);

		_Equality.call(this);
		this.type = data.type;
		this.channel = channel;
		this.server = channel.server;
		this.client = client;
		this.nonce = data.nonce;
		this.attachments = data.attachments;
		this.tts = data.tts;
		this.pinned = data.pinned;
		this.embeds = data.embeds;
		this.timestamp = Date.parse(data.timestamp);
		this.everyoneMentioned = data.mention_everyone !== undefined ? data.mention_everyone : data.everyoneMentioned;
		this.pinned = data.pinned;
		this.id = data.id;

		if (data.edited_timestamp) {
			this.editedTimestamp = Date.parse(data.edited_timestamp);
		}

		if (data.author instanceof _User2["default"]) {
			this.author = data.author;
		} else if (data.author) {
			this.author = client.internal.users.add(new _User2["default"](data.author, client));
		}

		this.content = data.content;
		if (!this.type) {} else if (this.type === 1) {
			this.content = this.author.mention() + " added <@" + data.mentions[0].id + ">.";
		} else if (this.type === 2) {
			if (this.author.id === data.mentions[0].id) {
				this.content = this.author.mention() + " left the group.";
			} else {
				this.content = this.author.mention() + " removed <@" + data.mentions[0].id + ">.";
			}
		} else if (this.type === 3) {
			this.content = this.author.mention() + " started a call.";
		} else if (this.type === 4) {
			this.content = this.author.mention() + " changed the channel name: " + data.content;
		} else if (this.type === 5) {
			this.content = this.author.mention() + " changed the channel icon.";
		} else if (this.type === 6) {
			this.content = this.author.mention() + " pinned a message to this channel. See all the pins.";
		}

		var mentionData = client.internal.resolver.resolveMentions(data.content, channel);
		this.cleanContent = mentionData[1];
		this.mentions = [];

		mentionData[0].forEach(function (mention) {
			// this is .add and not .get because it allows the bot to cache
			// users from messages from logs who may have left the server and were
			// not previously cached.
			if (mention instanceof _User2["default"]) {
				_this.mentions.push(mention);
			} else {
				_this.mentions.push(client.internal.users.add(new _User2["default"](mention, client)));
			}
		});
	}

	Message.prototype.toObject = function toObject() {
		var keys = ['id', 'timestamp', 'everyoneMentioned', 'pinned', 'editedTimestamp', 'content', 'cleanContent', 'tts', 'attachments', 'embeds'],
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

		obj.channelID = this.channel ? this.channel.id : null;
		obj.serverID = this.server ? this.server.id : null;
		obj.author = this.author.toObject();
		obj.mentions = this.mentions.map(function (m) {
			return m.toObject();
		});

		return obj;
	};

	Message.prototype.isMentioned = function isMentioned(user) {
		user = this.client.internal.resolver.resolveUser(user);
		if (!user) {
			return false;
		}
		for (var _iterator2 = this.mentions, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
			var _ref2;

			if (_isArray2) {
				if (_i2 >= _iterator2.length) break;
				_ref2 = _iterator2[_i2++];
			} else {
				_i2 = _iterator2.next();
				if (_i2.done) break;
				_ref2 = _i2.value;
			}

			var mention = _ref2;

			if (mention.id == user.id) {
				return true;
			}
		}
		return false;
	};

	Message.prototype.toString = function toString() {
		return this.content;
	};

	Message.prototype["delete"] = function _delete() {
		return this.client.deleteMessage.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	Message.prototype.update = function update() {
		return this.client.updateMessage.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	Message.prototype.edit = function edit() {
		return this.client.updateMessage.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	Message.prototype.reply = function reply() {
		return this.client.reply.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	Message.prototype.replyTTS = function replyTTS() {
		return this.client.replyTTS.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	Message.prototype.pin = function pin() {
		return this.client.pinMessage.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	Message.prototype.unpin = function unpin() {
		return this.client.unpinMessage.apply(this.client, req(this, arguments));
	};

	_createClass(Message, [{
		key: "sender",
		get: function get() {
			return this.author;
		}
	}]);

	return Message;
})(_UtilEquality2["default"]);

exports["default"] = Message;
module.exports = exports["default"];
