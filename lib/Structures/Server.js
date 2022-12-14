"use strict";

/**
 * Types of region for a server, include: `us-west`, `us-east`, `us-south`, `us-central`, `singapore`, `london`, `sydney`, `amsterdam` and `frankfurt`
 * @typedef {(string)} region
 */

exports.__esModule = true;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _UtilBucket = require("../Util/Bucket");

var _UtilBucket2 = _interopRequireDefault(_UtilBucket);

var _UtilEquality = require("../Util/Equality");

var _UtilEquality2 = _interopRequireDefault(_UtilEquality);

var _Constants = require("../Constants");

var _UtilCache = require("../Util/Cache");

var _UtilCache2 = _interopRequireDefault(_UtilCache);

var _User = require("./User");

var _User2 = _interopRequireDefault(_User);

var _TextChannel = require("./TextChannel");

var _TextChannel2 = _interopRequireDefault(_TextChannel);

var _VoiceChannel = require("./VoiceChannel");

var _VoiceChannel2 = _interopRequireDefault(_VoiceChannel);

var _Role = require("./Role");

var _Role2 = _interopRequireDefault(_Role);

var _Emoji = require("./Emoji");

var _Emoji2 = _interopRequireDefault(_Emoji);

var _UtilArgumentRegulariser = require("../Util/ArgumentRegulariser");

var strictKeys = ["region", "ownerID", "name", "id", "icon", "afkTimeout", "afkChannelID"];

var Server = (function (_Equality) {
	_inherits(Server, _Equality);

	function Server(data, client) {
		var _this = this;

		_classCallCheck(this, Server);

		_Equality.call(this);

		this.client = client;
		this.id = data.id;

		if (data.owner_id) {
			// new server data
			client.internal.buckets["bot:msg:guild:" + this.id] = new _UtilBucket2["default"](5, 5000);
			client.internal.buckets["dmsg:" + this.id] = new _UtilBucket2["default"](5, 1000);
			client.internal.buckets["bdmsg:" + this.id] = new _UtilBucket2["default"](1, 1000);
			client.internal.buckets["guild_member:" + this.id] = new _UtilBucket2["default"](10, 10000);
			client.internal.buckets["guild_member_nick:" + this.id] = new _UtilBucket2["default"](1, 1000);
		}

		this.region = data.region;
		this.ownerID = data.owner_id || data.ownerID;
		this.name = data.name;
		this.members = new _UtilCache2["default"]();
		this.channels = new _UtilCache2["default"]();
		this.roles = new _UtilCache2["default"]();
		this.emojis = new _UtilCache2["default"]();
		this.icon = data.icon;
		this.afkTimeout = data.afk_timeout;
		this.afkChannelID = data.afk_channel_id || data.afkChannelID;
		this.memberMap = data.memberMap || {};
		this.memberCount = data.member_count || data.memberCount;
		this.large = data.large || this.memberCount > 250;

		if (data.roles instanceof _UtilCache2["default"]) {
			data.roles.forEach(function (role) {
				return _this.roles.add(role);
			});
		} else {
			data.roles.forEach(function (dataRole) {
				_this.roles.add(new _Role2["default"](dataRole, _this, client));
			});
		}

		if (data.emojis instanceof _UtilCache2["default"]) {
			data.emojis.forEach(function (emoji) {
				return _this.emojis.add(emoji);
			});
		} else {
			data.emojis.forEach(function (dataEmoji) {
				_this.emojis.add(new _Emoji2["default"](dataEmoji, _this));
			});
		}

		if (data.members instanceof _UtilCache2["default"]) {
			data.members.forEach(function (member) {
				return _this.members.add(member);
			});
		} else {
			data.members.forEach(function (dataUser) {
				_this.memberMap[dataUser.user.id] = {
					roles: dataUser.roles,
					mute: dataUser.mute,
					selfMute: dataUser.self_mute,
					deaf: dataUser.deaf,
					selfDeaf: dataUser.self_deaf,
					joinedAt: Date.parse(dataUser.joined_at),
					nick: dataUser.nick || null
				};
				_this.members.add(client.internal.users.add(new _User2["default"](dataUser.user, client)));
			});
		}

		if (data.channels instanceof _UtilCache2["default"]) {
			data.channels.forEach(function (channel) {
				return _this.channels.add(channel);
			});
		} else {
			data.channels.forEach(function (dataChannel) {
				if (dataChannel.type === 0) {
					_this.channels.add(client.internal.channels.add(new _TextChannel2["default"](dataChannel, client, _this)));
				} else {
					_this.channels.add(client.internal.channels.add(new _VoiceChannel2["default"](dataChannel, client, _this)));
				}
			});
		}

		if (data.presences) {
			for (var _iterator = data.presences, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
				var _ref;

				if (_isArray) {
					if (_i >= _iterator.length) break;
					_ref = _iterator[_i++];
				} else {
					_i = _iterator.next();
					if (_i.done) break;
					_ref = _i.value;
				}

				var presence = _ref;

				var user = client.internal.users.get("id", presence.user.id);
				if (user) {
					user.status = presence.status;
					user.game = presence.game;
				}
			}
		}

		if (data.voice_states) {
			if (this.client.options.bot) {
				for (var _iterator2 = data.voice_states, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
					var _ref2;

					if (_isArray2) {
						if (_i2 >= _iterator2.length) break;
						_ref2 = _iterator2[_i2++];
					} else {
						_i2 = _iterator2.next();
						if (_i2.done) break;
						_ref2 = _i2.value;
					}

					var voiceState = _ref2;

					var _user = this.members.get("id", voiceState.user_id);
					if (_user) {
						this.memberMap[_user.id] = this.memberMap[_user.id] || {};
						this.memberMap[_user.id].mute = voiceState.mute || this.memberMap[_user.id].mute;
						this.memberMap[_user.id].selfMute = voiceState.self_mute === undefined ? this.memberMap[_user.id].selfMute : voiceState.self_mute;
						this.memberMap[_user.id].deaf = voiceState.deaf || this.memberMap[_user.id].deaf;
						this.memberMap[_user.id].selfDeaf = voiceState.self_deaf === undefined ? this.memberMap[_user.id].selfDeaf : voiceState.self_deaf;
						var channel = this.channels.get("id", voiceState.channel_id);
						if (channel) {
							this.eventVoiceJoin(_user, channel);
						} else {
							this.client.emit("warn", "channel doesn't exist even though READY expects them to");
						}
					} else {
						this.client.emit("warn", "user doesn't exist even though READY expects them to");
					}
				}
			} else {
				this.pendingVoiceStates = data.voice_states;
			}
		}
	}

	Server.prototype.toObject = function toObject() {
		var keys = ['id', 'name', 'region', 'ownerID', 'icon', 'afkTimeout', 'afkChannelID', 'large', 'memberCount'],
		    obj = {};

		for (var _iterator3 = keys, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
			var _ref3;

			if (_isArray3) {
				if (_i3 >= _iterator3.length) break;
				_ref3 = _iterator3[_i3++];
			} else {
				_i3 = _iterator3.next();
				if (_i3.done) break;
				_ref3 = _i3.value;
			}

			var k = _ref3;

			obj[k] = this[k];
		}

		obj.members = this.members.map(function (member) {
			return member.toObject();
		});
		obj.channels = this.channels.map(function (channel) {
			return channel.toObject();
		});
		obj.roles = this.roles.map(function (role) {
			return role.toObject();
		});
		obj.emojis = this.emojis.map(function (emoji) {
			return emoji.toObject();
		});

		return obj;
	};

	Server.prototype.detailsOf = function detailsOf(user) {
		var _this2 = this;

		user = this.client.internal.resolver.resolveUser(user);
		if (user) {
			var result = this.memberMap[user.id] || {};
			if (result && result.roles) {
				result.roles = result.roles.map(function (pid) {
					return _this2.roles.get("id", pid) || pid;
				});
			}
			return result;
		} else {
			return {};
		}
	};

	Server.prototype.detailsOfUser = function detailsOfUser(user) {
		return this.detailsOf(user);
	};

	Server.prototype.detailsOfMember = function detailsOfMember(user) {
		return this.detailsOf(user);
	};

	Server.prototype.details = function details(user) {
		return this.detailsOf(user);
	};

	Server.prototype.rolesOfUser = function rolesOfUser(user) {
		return this.detailsOf(user).roles || [];
	};

	Server.prototype.rolesOfMember = function rolesOfMember(member) {
		return this.rolesOfUser(member);
	};

	Server.prototype.rolesOf = function rolesOf(user) {
		return this.rolesOfUser(user);
	};

	Server.prototype.toString = function toString() {
		return this.name;
	};

	Server.prototype.eventVoiceJoin = function eventVoiceJoin(user, channel) {
		// removes from other speaking channels first
		var oldChannel = this.eventVoiceLeave(user);

		channel.members.add(user);
		user.voiceChannel = channel;

		if (oldChannel.id && channel.id !== oldChannel.id) {
			this.client.emit("voiceLeave", oldChannel, user);
			this.client.emit("voiceSwitch", oldChannel, channel, user);
		}

		this.client.emit("voiceJoin", channel, user);
	};

	Server.prototype.eventVoiceStateUpdate = function eventVoiceStateUpdate(channel, user, data) {
		if (!user.voiceChannel || user.voiceChannel.id !== channel.id) {
			return this.eventVoiceJoin(user, channel);
		}
		if (!this.memberMap[user.id]) {
			this.memberMap[user.id] = {};
		}
		var oldState = {
			mute: this.memberMap[user.id].mute,
			selfMute: this.memberMap[user.id].self_mute,
			deaf: this.memberMap[user.id].deaf,
			selfDeaf: this.memberMap[user.id].self_deaf
		};
		this.memberMap[user.id].mute = data.mute;
		this.memberMap[user.id].selfMute = data.self_mute;
		this.memberMap[user.id].deaf = data.deaf;
		this.memberMap[user.id].selfDeaf = data.self_deaf;
		if (oldState.mute !== undefined && (oldState.mute != data.mute || oldState.self_mute != data.self_mute || oldState.deaf != data.deaf || oldState.self_deaf != data.self_deaf)) {
			this.client.emit("voiceStateUpdate", channel, user, oldState, this.memberMap[user.id]);
		} else {
			this.eventVoiceJoin(user, channel);
		}
	};

	Server.prototype.eventVoiceLeave = function eventVoiceLeave(user) {
		for (var _iterator4 = this.channels.getAll("type", 2), _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
			var _ref4;

			if (_isArray4) {
				if (_i4 >= _iterator4.length) break;
				_ref4 = _iterator4[_i4++];
			} else {
				_i4 = _iterator4.next();
				if (_i4.done) break;
				_ref4 = _i4.value;
			}

			var chan = _ref4;

			if (chan.members.has("id", user.id)) {
				chan.members.remove(user);
				user.voiceChannel = null;
				return chan;
			}
		}
		return { server: this };
	};

	Server.prototype.equalsStrict = function equalsStrict(obj) {
		if (obj instanceof Server) {
			for (var _iterator5 = strictKeys, _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
				var _ref5;

				if (_isArray5) {
					if (_i5 >= _iterator5.length) break;
					_ref5 = _iterator5[_i5++];
				} else {
					_i5 = _iterator5.next();
					if (_i5.done) break;
					_ref5 = _i5.value;
				}

				var key = _ref5;

				if (obj[key] !== this[key]) {
					return false;
				}
			}
		} else {
			return false;
		}
		return true;
	};

	Server.prototype.leave = function leave() {
		return this.client.leaveServer.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	Server.prototype["delete"] = function _delete() {
		return this.client.leaveServer.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	Server.prototype.createInvite = function createInvite() {
		return this.client.createInvite.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	Server.prototype.createRole = function createRole() {
		return this.client.createRole.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	Server.prototype.banMember = function banMember(user, tlength, callback) {
		return this.client.banMember.apply(this.client, [user, this, tlength, callback]);
	};

	Server.prototype.banUser = function banUser(user, tlength, callback) {
		return this.client.banMember.apply(this.client, [user, this, tlength, callback]);
	};

	Server.prototype.ban = function ban(user, tlength, callback) {
		return this.client.banMember.apply(this.client, [user, this, tlength, callback]);
	};

	Server.prototype.unbanMember = function unbanMember(user, callback) {
		return this.client.unbanMember.apply(this.client, [user, this, callback]);
	};

	Server.prototype.unbanUser = function unbanUser(user, callback) {
		return this.client.unbanMember.apply(this.client, [user, this, callback]);
	};

	Server.prototype.unban = function unban(user, callback) {
		return this.client.unbanMember.apply(this.client, [user, this, callback]);
	};

	Server.prototype.kickMember = function kickMember(user, callback) {
		return this.client.kickMember.apply(this.client, [user, this, callback]);
	};

	Server.prototype.kickUser = function kickUser(user, callback) {
		return this.client.kickMember.apply(this.client, [user, this, callback]);
	};

	Server.prototype.kick = function kick(user, callback) {
		return this.client.kickMember.apply(this.client, [user, this, callback]);
	};

	Server.prototype.getBans = function getBans() {
		return this.client.getBans.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	Server.prototype.createChannel = function createChannel() {
		return this.client.createChannel.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	Server.prototype.setNickname = function setNickname() {
		return this.client.setNickname.apply(this.client, _UtilArgumentRegulariser.reg(this, arguments));
	};

	Server.prototype.membersWithRole = function membersWithRole(role) {
		return this.members.filter(function (m) {
			return m.hasRole(role);
		});
	};

	Server.prototype.usersWithRole = function usersWithRole(role) {
		return this.membersWithRole(role);
	};

	_createClass(Server, [{
		key: "webhooks",
		get: function get() {
			return this.channels.map(function (c) {
				return c.webhooks;
			}).reduce(function (previousChannel, currentChannel) {
				if (currentChannel) {
					currentChannel.forEach(function (webhook) {
						previousChannel.add(webhook);
					});
				}
				return previousChannel;
			}, new _UtilCache2["default"]("id"));
		}
	}, {
		key: "createdAt",
		get: function get() {
			return new Date(+this.id / 4194304 + 1420070400000);
		}
	}, {
		key: "iconURL",
		get: function get() {
			if (!this.icon) {
				return null;
			} else {
				return _Constants.Endpoints.SERVER_ICON(this.id, this.icon);
			}
		}
	}, {
		key: "afkChannel",
		get: function get() {
			return this.channels.get("id", this.afkChannelID);
		}
	}, {
		key: "defaultChannel",
		get: function get() {
			return this.channels.get("id", this.id);
		}
	}, {
		key: "generalChannel",
		get: function get() {
			return this.defaultChannel;
		}
	}, {
		key: "general",
		get: function get() {
			return this.defaultChannel;
		}
	}, {
		key: "owner",
		get: function get() {
			return this.members.get("id", this.ownerID);
		}
	}]);

	return Server;
})(_UtilEquality2["default"]);

exports["default"] = Server;
module.exports = exports["default"];
