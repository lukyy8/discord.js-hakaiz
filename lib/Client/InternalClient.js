"use strict";

exports.__esModule = true;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _superagent = require("superagent");

var _superagent2 = _interopRequireDefault(_superagent);

var _ws = require("ws");

var _ws2 = _interopRequireDefault(_ws);

var _ConnectionState = require("./ConnectionState");

var _ConnectionState2 = _interopRequireDefault(_ConnectionState);

var _querystring = require("querystring");

var _querystring2 = _interopRequireDefault(_querystring);

var _Constants = require("../Constants");

var _UtilBucket = require("../Util/Bucket");

var _UtilBucket2 = _interopRequireDefault(_UtilBucket);

var _UtilCache = require("../Util/Cache");

var _UtilCache2 = _interopRequireDefault(_UtilCache);

var _ResolverResolver = require("./Resolver/Resolver");

var _ResolverResolver2 = _interopRequireDefault(_ResolverResolver);

var _StructuresUser = require("../Structures/User");

var _StructuresUser2 = _interopRequireDefault(_StructuresUser);

var _StructuresChannel = require("../Structures/Channel");

var _StructuresChannel2 = _interopRequireDefault(_StructuresChannel);

var _StructuresServerChannel = require("../Structures/ServerChannel");

var _StructuresServerChannel2 = _interopRequireDefault(_StructuresServerChannel);

var _StructuresTextChannel = require("../Structures/TextChannel");

var _StructuresTextChannel2 = _interopRequireDefault(_StructuresTextChannel);

var _StructuresVoiceChannel = require("../Structures/VoiceChannel");

var _StructuresVoiceChannel2 = _interopRequireDefault(_StructuresVoiceChannel);

var _StructuresPMChannel = require("../Structures/PMChannel");

var _StructuresPMChannel2 = _interopRequireDefault(_StructuresPMChannel);

var _StructuresServer = require("../Structures/Server");

var _StructuresServer2 = _interopRequireDefault(_StructuresServer);

var _StructuresMessage = require("../Structures/Message");

var _StructuresMessage2 = _interopRequireDefault(_StructuresMessage);

var _StructuresRole = require("../Structures/Role");

var _StructuresRole2 = _interopRequireDefault(_StructuresRole);

var _StructuresInvite = require("../Structures/Invite");

var _StructuresInvite2 = _interopRequireDefault(_StructuresInvite);

var _StructuresWebhook = require("../Structures/Webhook");

var _StructuresWebhook2 = _interopRequireDefault(_StructuresWebhook);

var _VoiceVoiceConnection = require("../Voice/VoiceConnection");

var _VoiceVoiceConnection2 = _interopRequireDefault(_VoiceVoiceConnection);

var _UtilTokenCacher = require("../Util/TokenCacher");

var _UtilTokenCacher2 = _interopRequireDefault(_UtilTokenCacher);

var GATEWAY_VERSION = 6;
var zlib;
var libVersion = require('../../package.json').version;

function waitFor(condition) {
	var value = arguments.length <= 1 || arguments[1] === undefined ? condition : arguments[1];
	var interval = arguments.length <= 2 || arguments[2] === undefined ? 20 : arguments[2];
	return (function () {
		return new Promise(function (resolve) {
			var int = setInterval(function () {
				var isDone = condition();
				if (isDone) {
					if (condition === value) {
						resolve(isDone);
					} else {
						resolve(value(isDone));
					}
					return clearInterval(int);
				}
			}, interval);
		});
	})();
}

function delay(ms) {
	return new Promise(function (resolve) {
		return setTimeout(resolve, ms);
	});
}

var InternalClient = (function () {
	function InternalClient(discordClient) {
		_classCallCheck(this, InternalClient);

		this.setup(discordClient);
	}

	InternalClient.prototype.apiRequest = function apiRequest(method, url, useAuth, data, file) {
		var resolve, reject;
		var promise = new Promise(function (res, rej) {
			resolve = res;
			reject = rej;
		});
		var buckets = [];
		var match = url.match(/\/channels\/([0-9]+)\/messages(\/[0-9]+)?$/);
		if (match) {
			if (method === "del" && (match[1] = this.channels.get("id", match[1]) || this.private_channels.get("id", match[1]))) {
				buckets = ["dmsg:" + (match[1].server || {}).id];
			} else if (this.user.bot) {
				if (method === "post" || method === "patch") {
					if (this.private_channels.get("id", match[1])) {
						buckets = ["bot:msg:dm", "bot:msg:global"];
					} else if (match[1] = this.channels.get("id", match[1])) {
						buckets = ["bot:msg:guild:" + match[1].server.id, "bot:msg:global"];
					}
				}
			} else {
				buckets = ["msg"];
			}
		} else if (method === "patch") {
			if (url === "/users/@me" && this.user && data.username && data.username !== this.user.username) {
				buckets = ["username"];
			} else if (match = url.match(/\/guilds\/([0-9]+)\/members\/[0-9]+$/)) {
				buckets = ["guild_member:" + match[1]];
			} else if (match = url.match(/\/guilds\/([0-9]+)\/members\/@me\/nick$/)) {
				buckets = ["guild_member_nick:" + match[1]];
			}
		}

		var self = this;

		var actualCall = function actualCall() {
			var startTime = Date.now();
			var ret = _superagent2["default"][method](url);
			if (useAuth) {
				ret.set("authorization", self.token);
			}
			if (file) {
				ret.attach("file", file.file, file.name);
				if (data) {
					for (var i in data) {
						if (data[i] !== undefined) {
							ret.field(i, data[i]);
						}
					}
				}
			} else if (data) {
				ret.send(data);
			}
			ret.set('User-Agent', self.userAgentInfo.full);
			ret.end(function (error, data) {
				if (error) {
					if (data && data.status === 429) {
						self.client.emit("debug", "Encountered 429 at " + url + " | " + self.client.options.shard + " | Buckets" + buckets + " | " + (Date.now() - startTime) + "ms latency");
					}
					reject(error);
				} else {
					resolve(data.body);
				}
			});
		};
		var waitFor = 1;
		var i = 0;
		var done = function done() {
			if (++i === waitFor) {
				actualCall();
			}
		};
		for (var _iterator = buckets, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
			var _ref;

			if (_isArray) {
				if (_i >= _iterator.length) break;
				_ref = _iterator[_i++];
			} else {
				_i = _iterator.next();
				if (_i.done) break;
				_ref = _i.value;
			}

			var bucket = _ref;

			++waitFor;
			this.buckets[bucket].queue(done);
		}
		done();
		return promise;
	};

	InternalClient.prototype.setup = function setup(discordClient) {
		discordClient = discordClient || this.client;
		this.client = discordClient;
		this.state = _ConnectionState2["default"].IDLE;
		this.websocket = null;
		this.userAgent = {
			url: 'https://github.com/hydrabolt/discord.js',
			version: require('../../package.json').version
		};

		if (this.client.options.compress) {
			zlib = require("zlib");
		}

		// creates 4 caches with discriminators based on ID
		this.users = new _UtilCache2["default"]();
		this.friends = new _UtilCache2["default"]();
		this.blocked_users = new _UtilCache2["default"]();
		this.outgoing_friend_requests = new _UtilCache2["default"]();
		this.incoming_friend_requests = new _UtilCache2["default"]();
		this.channels = new _UtilCache2["default"]();
		this.servers = new _UtilCache2["default"]();
		this.unavailableServers = new _UtilCache2["default"]();
		this.private_channels = new _UtilCache2["default"]();
		this.autoReconnectInterval = 1000;
		this.unsyncedGuilds = 0;
		this.guildSyncQueue = [];
		this.guildSyncQueueLength = 1;

		this.intervals = {
			typing: [],
			kai: null,
			misc: []
		};

		this.voiceConnections = new _UtilCache2["default"]();
		this.resolver = new _ResolverResolver2["default"](this);
		this.readyTime = null;
		this.messageAwaits = {};
		this.buckets = {
			"bot:msg:dm": new _UtilBucket2["default"](5, 5000),
			"bot:msg:global": new _UtilBucket2["default"](50, 10000),
			"msg": new _UtilBucket2["default"](10, 10000),
			"dmsg:undefined": new _UtilBucket2["default"](5, 1000),
			"username": new _UtilBucket2["default"](2, 3600000)
		};

		if (!this.tokenCacher) {
			this.tokenCacher = new _UtilTokenCacher2["default"](this.client);
			this.tokenCacher.init(0);
		}
	};

	InternalClient.prototype.cleanIntervals = function cleanIntervals() {
		for (var _iterator2 = this.intervals.typing.concat(this.intervals.misc).concat(this.intervals.kai), _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
			var _ref2;

			if (_isArray2) {
				if (_i2 >= _iterator2.length) break;
				_ref2 = _iterator2[_i2++];
			} else {
				_i2 = _iterator2.next();
				if (_i2.done) break;
				_ref2 = _i2.value;
			}

			var interval = _ref2;

			if (interval) {
				clearInterval(interval);
			}
		}
	};

	InternalClient.prototype.disconnected = function disconnected() {
		var _this = this;

		var autoReconnect = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

		this.cleanIntervals();

		this.voiceConnections.forEach(function (vc) {
			_this.leaveVoiceChannel(vc);
		});

		if (autoReconnect) {
			this.autoReconnectInterval = Math.min(this.autoReconnectInterval * (Math.random() + 1), 60000);
			setTimeout(function () {
				if (!_this.email && !_this.token) {
					return;
				}

				// Check whether the email is set (if not, only a token has been used for login)
				_this.loginWithToken(_this.token, _this.email, _this.password)["catch"](function () {
					return _this.disconnected(true);
				});
			}, this.autoReconnectInterval);
		}

		this.client.emit("disconnected");
	};

	//def leaveVoiceChannel

	InternalClient.prototype.leaveVoiceChannel = function leaveVoiceChannel(chann) {
		var _this2 = this;

		if (this.user.bot) {
			var leave = function leave(connection) {
				return new Promise(function (resolve, reject) {
					connection.destroy();
					resolve();
				});
			};

			if (chann instanceof _StructuresVoiceChannel2["default"]) {
				return this.resolver.resolveChannel(chann).then(function (channel) {
					if (!channel) {
						return Promise.reject(new Error("voice channel does not exist"));
					}

					if (channel.type !== 2) {
						return Promise.reject(new Error("channel is not a voice channel!"));
					}

					var connection = _this2.voiceConnections.get("voiceChannel", channel);
					if (!connection) {
						return Promise.reject(new Error("not connected to that voice channel"));
					}
					return leave(connection);
				});
			} else if (chann instanceof _VoiceVoiceConnection2["default"]) {
				return leave(chann);
			} else {
				return Promise.reject(new Error("invalid voice channel/connection to leave"));
			}
		} else {
			// preserve old functionality for non-bots
			if (this.voiceConnections[0]) {
				this.voiceConnections[0].destroy();
			}
			return Promise.resolve();
		}
	};

	//def awaitResponse

	InternalClient.prototype.awaitResponse = function awaitResponse(msg) {
		var _this3 = this;

		return new Promise(function (resolve, reject) {

			msg = _this3.resolver.resolveMessage(msg);

			if (!msg) {
				reject(new Error("message undefined"));
				return;
			}

			var awaitID = msg.channel.id + msg.author.id;

			if (!_this3.messageAwaits[awaitID]) {
				_this3.messageAwaits[awaitID] = [];
			}

			_this3.messageAwaits[awaitID].push(resolve);
		});
	};

	//def joinVoiceChannel

	InternalClient.prototype.joinVoiceChannel = function joinVoiceChannel(chann) {
		var _this4 = this;

		return this.resolver.resolveChannel(chann).then(function (channel) {
			if (!channel) {
				return Promise.reject(new Error("voice channel does not exist"));
			}

			if (channel.type !== 2) {
				return Promise.reject(new Error("channel is not a voice channel!"));
			}

			var joinSendWS = function joinSendWS() {
				_this4.sendWS({
					op: 4,
					d: {
						"guild_id": channel.server.id,
						"channel_id": channel.id,
						"self_mute": false,
						"self_deaf": false
					}
				});
			};

			var joinVoice = function joinVoice() {
				return new Promise(function (resolve, reject) {
					var session = _this4.sessionID,
					    token,
					    server = channel.server,
					    endpoint;

					var timeout = null;

					var check = function check(data) {
						if (data.t === "VOICE_SERVER_UPDATE") {
							if (data.d.guild_id !== server.id) return; // ensure it is the right server
							token = data.d.token;
							endpoint = data.d.endpoint;
							if (!token || !endpoint) return;
							var chan = new _VoiceVoiceConnection2["default"](channel, _this4.client, session, token, server, endpoint);
							_this4.voiceConnections.add(chan);

							chan.on("ready", function () {
								return resolve(chan);
							});
							chan.on("error", reject);
							chan.on("close", reject);

							if (timeout) {
								clearTimeout(timeout);
							}
							_this4.client.removeListener("raw", check);
						}
					};

					timeout = setTimeout(function () {
						_this4.client.removeListener("raw", check);
						reject(new Error("No voice server details within 10 seconds"));
					}, 10000);

					_this4.client.on("raw", check);
					joinSendWS();
				});
			};

			var existingServerConn = _this4.voiceConnections.get("server", channel.server); // same server connection
			if (existingServerConn) {
				joinSendWS(); // Just needs to update by sending via WS, movement in cache will be handled by global handler
				return Promise.resolve(existingServerConn);
			}

			if (!_this4.user.bot && _this4.voiceConnections.length > 0) {
				// nonbot, one voiceconn only, just like last time just disconnect
				return _this4.leaveVoiceChannel().then(joinVoice);
			}

			return joinVoice();
		});
	};

	// Backwards-compatible utility getter method for the first voice connection
	// Thanks to #q (@qeled) for suggesting this

	InternalClient.prototype.getGuildMembers = function getGuildMembers(serverID, chunkCount) {
		this.forceFetchCount[serverID] = chunkCount;
		if (this.forceFetchLength + 3 + serverID.length > 4000) {
			// 4096 max, '{"op":8,"d":{"guild_id":[],"query":"","limit":0}}'.length = 49 plus some leeway
			this.requestGuildMembers(this.forceFetchQueue);
			this.forceFetchQueue = [serverID];
			this.forceFetchLength = 1 + serverID.length + 3;
		} else {
			this.forceFetchQueue.push(serverID);
			this.forceFetchLength += serverID.length + 3;
		}
	};

	InternalClient.prototype.requestGuildMembers = function requestGuildMembers(serverID, query, limit) {
		this.sendWS({ op: 8,
			d: {
				guild_id: serverID,
				query: query || "",
				limit: limit || 0
			}
		});
	};

	InternalClient.prototype.syncGuild = function syncGuild(guildID) {
		if (this.guildSyncQueueLength + 3 + guildID.length > 4050) {
			// 4096 max, '{"op":12,"d":[]}'.length = 16 plus some leeway
			this.sendWS({ op: 12, d: this.guildSyncQueue });
			this.guildSyncQueue = [guildID];
			this.guildSyncQueueLength = 1 + guildID.length + 3;
		} else {
			this.guildSyncQueue.push(guildID);
			this.guildSyncQueueLength += guildID.length + 3;
		}
	};

	InternalClient.prototype.checkReady = function checkReady() {
		if (!this.readyTime) {
			if (this.guildSyncQueue.length > 0) {
				this.sendWS({ op: 12, d: this.guildSyncQueue });
				this.guildSyncQueue = [];
				this.guildSyncQueueLength = 1;
				return;
			}
			if (this.unsyncedGuilds > 0) {
				return;
			}
			if (this.forceFetchQueue.length > 0) {
				this.requestGuildMembers(this.forceFetchQueue);
				this.forceFetchQueue = [];
				this.forceFetchLength = 1;
			} else {
				for (var key in this.forceFetchCount) {
					if (this.forceFetchCount.hasOwnProperty(key)) {
						return;
					}
				}
				this.readyTime = Date.now();
				this.client.emit("ready");
			}
		}
	};

	InternalClient.prototype.restartServerCreateTimeout = function restartServerCreateTimeout() {
		var _this5 = this;

		if (this.guildCreateTimeout) {
			clearTimeout(this.guildCreateTimeout);
			this.guildCreateTimeout = null;
		}
		if (!this.readyTime) {
			this.guildCreateTimeout = setTimeout(function () {
				_this5.checkReady();
			}, this.client.options.guildCreateTimeout);
		}
	};

	// def createServer

	InternalClient.prototype.createServer = function createServer(name) {
		var _this6 = this;

		var region = arguments.length <= 1 || arguments[1] === undefined ? "london" : arguments[1];

		name = this.resolver.resolveString(name);

		return this.apiRequest('post', _Constants.Endpoints.SERVERS, true, { name: name, region: region }).then(function (res) {
			// valid server, wait until it is cached
			return waitFor(function () {
				return _this6.servers.get("id", res.id);
			});
		});
	};

	//def joinServer

	InternalClient.prototype.joinServer = function joinServer(invite) {
		var _this7 = this;

		invite = this.resolver.resolveInviteID(invite);
		if (!invite) {
			return Promise.reject(new Error("Not a valid invite"));
		}

		return this.apiRequest("post", _Constants.Endpoints.INVITE(invite), true).then(function (res) {
			// valid server, wait until it is received via ws and cached
			return waitFor(function () {
				return _this7.servers.get("id", res.guild.id);
			});
		});
	};

	//def updateServer

	InternalClient.prototype.updateServer = function updateServer(server, options) {
		var _this8 = this;

		var server = this.resolver.resolveServer(server);
		if (!server) {
			return Promise.reject(new Error("server did not resolve"));
		}

		var newOptions = {
			name: options.name || server.name,
			region: options.region || server.region
		};

		if (options.icon) {
			newOptions.icon = this.resolver.resolveToBase64(options.icon);
		}
		if (options.splash) {
			newOptions.splash = this.resolver.resolveToBase64(options.splash);
		}
		if (options.owner) {
			var user = this.resolver.resolveUser(options.owner);
			if (!user) {
				return Promise.reject(new Error("owner could not be resolved"));
			}
			options.owner_id = user.id;
		}
		if (options.verificationLevel) {
			options.verification_level = user.verificationLevel;
		}
		if (options.afkChannel) {
			var channel = this.resolver.resolveUser(options.afkChannel);
			if (!channel) {
				return Promise.reject(new Error("afkChannel could not be resolved"));
			}
			options.afk_channel_id = channel.id;
		}
		if (options.afkTimeout) {
			options.afk_timeout = user.afkTimeout;
		}

		return this.apiRequest("patch", _Constants.Endpoints.SERVER(server.id), true, options).then(function (res) {
			// wait until the name and region are updated
			return waitFor(function () {
				return _this8.servers.get("name", res.name) ? _this8.servers.get("name", res.name).region === res.region ? _this8.servers.get("id", res.id) : false : false;
			});
		});
	};

	//def leaveServer

	InternalClient.prototype.leaveServer = function leaveServer(srv) {
		var server = this.resolver.resolveServer(srv);
		if (!server) {
			return Promise.reject(new Error("server did not resolve"));
		}

		return this.apiRequest("del", _Constants.Endpoints.ME_SERVER(server.id), true);
	};

	//def deleteServer

	InternalClient.prototype.deleteServer = function deleteServer(srv) {
		var server = this.resolver.resolveServer(srv);
		if (!server) {
			return Promise.reject(new Error("server did not resolve"));
		}

		return this.apiRequest("del", _Constants.Endpoints.SERVER(server.id), true);
	};

	// def loginWithToken
	// email and password are optional

	InternalClient.prototype.loginWithToken = function loginWithToken(token, email, password) {
		this.setup();

		this.state = _ConnectionState2["default"].LOGGED_IN;
		this.token = token;
		this.email = email;
		this.password = password;

		var self = this;
		return this.getGateway().then(function (url) {
			self.token = self.client.options.bot && !self.token.startsWith("Bot ") ? "Bot " + self.token : self.token;
			self.createWS(url);
			return self.token;
		});
	};

	// def login

	InternalClient.prototype.login = function login(email, password) {
		var _this9 = this;

		var client = this.client;

		if (!this.tokenCacher.done) {
			return new Promise(function (resolve, reject) {
				setTimeout(function () {
					_this9.login(email, password).then(resolve)["catch"](reject);
				}, 20);
			});
		} else {
			var tk = this.tokenCacher.getToken(email, password);
			if (tk) {
				this.client.emit("debug", "bypassed direct API login, used cached token");
				return this.loginWithToken(tk, email, password);
			}
		}

		if (this.state !== _ConnectionState2["default"].DISCONNECTED && this.state !== _ConnectionState2["default"].IDLE) {
			return Promise.reject(new Error("already logging in/logged in/ready!"));
		}

		this.state = _ConnectionState2["default"].LOGGING_IN;

		return this.apiRequest("post", _Constants.Endpoints.LOGIN, false, {
			email: email,
			password: password
		}).then(function (res) {
			_this9.client.emit("debug", "direct API login, cached token was unavailable");
			var token = res.token;
			_this9.tokenCacher.setToken(email, password, token);
			return _this9.loginWithToken(token, email, password);
		}, function (error) {
			_this9.websocket = null;
			throw error;
		})["catch"](function (error) {
			_this9.websocket = null;
			_this9.state = _ConnectionState2["default"].DISCONNECTED;
			client.emit("disconnected");
			throw error;
		});
	};

	// def logout

	InternalClient.prototype.logout = function logout() {
		var _this10 = this;

		if (this.state === _ConnectionState2["default"].DISCONNECTED || this.state === _ConnectionState2["default"].IDLE) {
			return Promise.reject(new Error("Client is not logged in!"));
		}

		var disconnect = function disconnect() {
			if (_this10.websocket) {
				_this10.websocket.close(1000);
				_this10.websocket = null;
			}
			_this10.token = null;
			_this10.email = null;
			_this10.password = null;
			_this10.state = _ConnectionState2["default"].DISCONNECTED;
			return Promise.resolve();
		};

		if (!this.user.bot) {
			return this.apiRequest("post", _Constants.Endpoints.LOGOUT, true).then(disconnect);
		} else {
			return disconnect();
		}
	};

	// def startPM

	InternalClient.prototype.startPM = function startPM(resUser) {
		var _this11 = this;

		var user = this.resolver.resolveUser(resUser);
		if (!user) {
			return Promise.reject(new Error("Unable to resolve resUser to a User"));
		}
		// start the PM
		return this.apiRequest("post", _Constants.Endpoints.ME_CHANNELS, true, {
			recipient_id: user.id
		}).then(function (res) {
			return _this11.private_channels.add(new _StructuresPMChannel2["default"](res, _this11.client));
		});
	};

	// def getGateway

	InternalClient.prototype.getGateway = function getGateway() {
		var _this12 = this;

		if (this.gatewayURL) {
			return Promise.resolve(this.gatewayURL);
		}
		return this.apiRequest("get", _Constants.Endpoints.GATEWAY, true).then(function (res) {
			return _this12.gatewayURL = res.url;
		});
	};

	// def sendMessage

	InternalClient.prototype.sendMessage = function sendMessage(where, _content) {
		var _this13 = this;

		var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

		if (options.file) {
			if (typeof options.file !== "object") {
				options.file = {
					file: options.file
				};
			}
			if (!options.file.name) {
				if (options.file.file instanceof String || typeof options.file.file === "string") {
					options.file.name = require("path").basename(options.file.file);
				} else if (options.file.file.path) {
					// fs.createReadStream()'s have .path that give the path. Not sure about other streams though.
					options.file.name = require("path").basename(options.file.file.path);
				} else {
					options.file.name = "default.png"; // Just have to go with default filenames.
				}
			}
		}

		return this.resolver.resolveChannel(where).then(function (destination) {
			var content = _this13.resolver.resolveString(_content);

			if (_this13.client.options.disableEveryone || options.disableEveryone) {
				content = content.replace(/(@)(everyone|here)/g, "$1???$2");
			}

			if (options.file) {
				return _this13.resolver.resolveFile(options.file.file).then(function (file) {
					return _this13.apiRequest("post", _Constants.Endpoints.CHANNEL_MESSAGES(destination.id), true, {
						content: content,
						tts: options.tts,
						nonce: options.nonce
					}, {
						name: options.file.name,
						file: file
					}).then(function (res) {
						return destination.messages.add(new _StructuresMessage2["default"](res, destination, _this13.client));
					});
				});
			} else {
				return _this13.apiRequest("post", _Constants.Endpoints.CHANNEL_MESSAGES(destination.id), true, {
					content: content,
					tts: options.tts,
					nonce: options.nonce
				}).then(function (res) {
					return destination.messages.add(new _StructuresMessage2["default"](res, destination, _this13.client));
				});
			}
		});
	};

	// def sendFile

	InternalClient.prototype.sendFile = function sendFile(where, _file, name, content) {
		var _this14 = this;

		if (!name) {
			if (_file instanceof String || typeof _file === "string") {
				name = require("path").basename(_file);
			} else if (_file && _file.path) {
				// fs.createReadStream()'s have .path that give the path. Not sure about other streams though.
				name = require("path").basename(_file.path);
			} else {
				name = "default.png"; // Just have to go with default filenames.
			}
		}

		if (content) {
			content = {
				content: this.resolver.resolveString(content)
			};
			if (this.client.options.disableEveryone) {
				content.content = content.content.replace(/(@)(everyone|here)/g, "$1???$2");
			}
		}

		return this.resolver.resolveChannel(where).then(function (channel) {
			return _this14.resolver.resolveFile(_file).then(function (file) {
				return _this14.apiRequest("post", _Constants.Endpoints.CHANNEL_MESSAGES(channel.id), true, content, {
					name: name,
					file: file
				}).then(function (res) {
					return channel.messages.add(new _StructuresMessage2["default"](res, channel, _this14.client));
				});
			});
		});
	};

	// def deleteMessage

	InternalClient.prototype.deleteMessage = function deleteMessage(_message) {
		var _this15 = this;

		var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

		var message = this.resolver.resolveMessage(_message);
		if (!message) {
			return Promise.reject(new Error("Supplied message did not resolve to a message!"));
		}

		var chain = options.wait ? delay(options.wait) : Promise.resolve();
		return chain.then(function () {
			return _this15.apiRequest("del", _Constants.Endpoints.CHANNEL_MESSAGE(message.channel.id, message.id), true);
		}).then(function () {
			return message.channel.messages.remove(message);
		});
	};

	// def deleteMessages

	InternalClient.prototype.deleteMessages = function deleteMessages(_messages) {
		if (!_messages instanceof Array) return Promise.reject(new Error("Messages provided must be in an array"));
		if (_messages.length < 1) return Promise.reject(new Error("You must provide at least one message to delete"));else if (_messages.length === 1) return this.deleteMessage(_messages[0]);

		var messages = [];
		var channel;
		for (var _iterator3 = _messages, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
			var _ref3;

			if (_isArray3) {
				if (_i3 >= _iterator3.length) break;
				_ref3 = _iterator3[_i3++];
			} else {
				_i3 = _iterator3.next();
				if (_i3.done) break;
				_ref3 = _i3.value;
			}

			var _message = _ref3;

			var message = this.resolver.resolveMessage(_message);
			if (!message) return Promise.reject(new Error("Something other than a message could not be resolved in the array..."));
			if (!message.server) return Promise.reject(new Error("You can only bulk delete messages on guild channels"));

			// ensure same channel
			if (!channel) {
				channel = message.channel;
			} else {
				if (message.channel.id !== channel.id) return Promise.reject(new Error("You can only bulk delete messages from the same channel at one time..."));
			}

			messages.push(message);
		}

		return this.apiRequest("post", _Constants.Endpoints.CHANNEL_MESSAGES(channel.id) + "/bulk_delete", true, {
			messages: messages.map(function (m) {
				return m.id;
			})
		}).then(function () {
			return messages.forEach(function (m) {
				return channel.messages.remove(m);
			});
		});
	};

	// def updateMessage

	InternalClient.prototype.updateMessage = function updateMessage(msg, _content) {
		var _this16 = this;

		var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

		var message = this.resolver.resolveMessage(msg);

		if (!message) {
			return Promise.reject(new Error("Supplied message did not resolve to a message!"));
		}

		var content = this.resolver.resolveString(_content);

		return this.apiRequest("patch", _Constants.Endpoints.CHANNEL_MESSAGE(message.channel.id, message.id), true, {
			content: content,
			tts: options.tts
		}).then(function (res) {
			return message.channel.messages.update(message, new _StructuresMessage2["default"](res, message.channel, _this16.client));
		});
	};

	// def getChannelLogs

	InternalClient.prototype.getChannelLogs = function getChannelLogs(_channel) {
		var _this17 = this;

		var limit = arguments.length <= 1 || arguments[1] === undefined ? 50 : arguments[1];
		var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

		return this.resolver.resolveChannel(_channel).then(function (channel) {
			var qsObject = { limit: limit };
			if (options.before) {
				var res = _this17.resolver.resolveMessage(options.before);
				if (res) {
					qsObject.before = res.id;
				}
			}
			if (options.after) {
				var res = _this17.resolver.resolveMessage(options.after);
				if (res) {
					qsObject.after = res.id;
				}
			}
			if (options.around) {
				var res = _this17.resolver.resolveMessage(options.around);
				if (res) {
					qsObject.around = res.id;
				}
			}

			return _this17.apiRequest("get", _Constants.Endpoints.CHANNEL_MESSAGES(channel.id) + "?" + _querystring2["default"].stringify(qsObject), true).then(function (res) {
				return res.map(function (msg) {
					return channel.messages.add(new _StructuresMessage2["default"](msg, channel, _this17.client));
				});
			});
		});
	};

	// def getMessage

	InternalClient.prototype.getMessage = function getMessage(_channel, messageID) {
		var _this18 = this;

		return this.resolver.resolveChannel(_channel).then(function (channel) {
			if (!_this18.user.bot) {
				return Promise.reject(new Error("Only OAuth bot accounts can use this function"));
			}

			if (!(channel instanceof _StructuresTextChannel2["default"] || channel instanceof _StructuresPMChannel2["default"])) {
				return Promise.reject(new Error("Provided channel is not a Text or PMChannel"));
			}

			var msg = channel.messages.get("id", messageID);
			if (msg) {
				return Promise.resolve(msg);
			}

			return _this18.apiRequest("get", _Constants.Endpoints.CHANNEL_MESSAGES(channel.id) + "/" + messageID, true).then(function (res) {
				return channel.messages.add(new _StructuresMessage2["default"](res, channel, _this18.client));
			});
		});
	};

	// def pinMessage

	InternalClient.prototype.pinMessage = function pinMessage(msg) {
		var message = this.resolver.resolveMessage(msg);

		if (!message) {
			return Promise.reject(new Error("Supplied message did not resolve to a message"));
		}

		return this.apiRequest("put", "" + _Constants.Endpoints.CHANNEL_PIN(msg.channel.id, msg.id), true);
	};

	// def unpinMessage

	InternalClient.prototype.unpinMessage = function unpinMessage(msg) {
		var message = this.resolver.resolveMessage(msg);

		if (!message) {
			return Promise.reject(new Error("Supplied message did not resolve to a message"));
		}

		if (!message.pinned) {
			return Promise.reject(new Error("Supplied message is not pinned"));
		}

		return this.apiRequest("del", "" + _Constants.Endpoints.CHANNEL_PIN(msg.channel.id, msg.id), true);
	};

	// def getPinnedMessages

	InternalClient.prototype.getPinnedMessages = function getPinnedMessages(_channel) {
		var _this19 = this;

		return this.resolver.resolveChannel(_channel).then(function (channel) {
			return _this19.apiRequest("get", "" + _Constants.Endpoints.CHANNEL_PINS(channel.id), true).then(function (res) {
				return res.map(function (msg) {
					return channel.messages.add(new _StructuresMessage2["default"](msg, channel, _this19.client));
				});
			});
		});
	};

	// def getBans

	InternalClient.prototype.getBans = function getBans(server) {
		var _this20 = this;

		server = this.resolver.resolveServer(server);

		return this.apiRequest("get", _Constants.Endpoints.SERVER_BANS(server.id), true).then(function (res) {
			return res.map(function (ban) {
				return _this20.users.add(new _StructuresUser2["default"](ban.user, _this20.client));
			});
		});
	};

	// def createChannel

	InternalClient.prototype.createChannel = function createChannel(server, name) {
		var _this21 = this;

		var type = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

		server = this.resolver.resolveServer(server);

		return this.apiRequest("post", _Constants.Endpoints.SERVER_CHANNELS(server.id), true, {
			name: name,
			type: type
		}).then(function (res) {
			var channel;
			if (res.type === 0) {
				channel = new _StructuresTextChannel2["default"](res, _this21.client, server);
			} else {
				channel = new _StructuresVoiceChannel2["default"](res, _this21.client, server);
			}
			return server.channels.add(_this21.channels.add(channel));
		});
	};

	// def deleteChannel

	InternalClient.prototype.deleteChannel = function deleteChannel(_channel) {
		var _this22 = this;

		return this.resolver.resolveChannel(_channel).then(function (channel) {
			return _this22.apiRequest("del", _Constants.Endpoints.CHANNEL(channel.id), true).then(function () {
				if (channel.server) {
					channel.server.channels.remove(channel);
					_this22.channels.remove(channel);
				} else {
					_this22.private_channels.remove(channel);
				}
			});
		});
	};

	// def banMember

	InternalClient.prototype.banMember = function banMember(user, server) {
		var length = arguments.length <= 2 || arguments[2] === undefined ? 1 : arguments[2];

		user = this.resolver.resolveUser(user);
		server = this.resolver.resolveServer(server);

		return this.apiRequest("put", _Constants.Endpoints.SERVER_BANS(server.id) + "/" + user.id + "?delete-message-days=" + length, true);
	};

	// def unbanMember

	InternalClient.prototype.unbanMember = function unbanMember(user, server) {

		server = this.resolver.resolveServer(server);
		user = this.resolver.resolveUser(user);

		return this.apiRequest("del", _Constants.Endpoints.SERVER_BANS(server.id) + "/" + user.id, true);
	};

	// def kickMember

	InternalClient.prototype.kickMember = function kickMember(user, server) {
		user = this.resolver.resolveUser(user);
		server = this.resolver.resolveServer(server);

		return this.apiRequest("del", _Constants.Endpoints.SERVER_MEMBERS(server.id) + "/" + user.id, true);
	};

	// def moveMember

	InternalClient.prototype.moveMember = function moveMember(user, channel) {
		var _this23 = this;

		user = this.resolver.resolveUser(user);
		return this.resolver.resolveChannel(channel).then(function (channel) {
			var server = channel.server;

			// Make sure `channel` is a voice channel
			if (channel.type !== 2) {
				throw new Error("Can't moveMember into a non-voice channel");
			} else {
				return _this23.apiRequest("patch", _Constants.Endpoints.SERVER_MEMBERS(server.id) + "/" + user.id, true, { channel_id: channel.id }).then(function (res) {
					user.voiceChannel = channel;
					return res;
				});
			}
		});
	};

	// def muteMember

	InternalClient.prototype.muteMember = function muteMember(user, server) {
		user = this.resolver.resolveUser(user);
		server = this.resolver.resolveServer(server);
		return this.apiRequest("patch", _Constants.Endpoints.SERVER_MEMBERS(server.id) + "/" + user.id, true, { mute: true });
	};

	// def unmuteMember

	InternalClient.prototype.unmuteMember = function unmuteMember(user, server) {
		user = this.resolver.resolveUser(user);
		server = this.resolver.resolveServer(server);
		return this.apiRequest("patch", _Constants.Endpoints.SERVER_MEMBERS(server.id) + "/" + user.id, true, { mute: false });
	};

	// def deafenMember

	InternalClient.prototype.deafenMember = function deafenMember(user, server) {
		user = this.resolver.resolveUser(user);
		server = this.resolver.resolveServer(server);
		return this.apiRequest("patch", _Constants.Endpoints.SERVER_MEMBERS(server.id) + "/" + user.id, true, { deaf: true });
	};

	// def undeafenMember

	InternalClient.prototype.undeafenMember = function undeafenMember(user, server) {
		user = this.resolver.resolveUser(user);
		server = this.resolver.resolveServer(server);
		return this.apiRequest("patch", _Constants.Endpoints.SERVER_MEMBERS(server.id) + "/" + user.id, true, { deaf: false });
	};

	// def setNickname

	InternalClient.prototype.setNickname = function setNickname(server, nick, user) {
		nick = nick || "";
		user = this.resolver.resolveUser(user);
		server = this.resolver.resolveServer(server);
		return this.apiRequest("patch", _Constants.Endpoints.SERVER_MEMBERS(server.id) + "/" + (user.id === this.user.id ? "@me/nick" : user.id), true, { nick: nick });
	};

	//def setNote

	InternalClient.prototype.setNote = function setNote(user, note) {
		user = this.resolver.resolveUser(user);
		note = note || "";

		if (!user) {
			return Promise.reject(new Error("Failed to resolve user"));
		}

		return this.apiRequest("put", _Constants.Endpoints.ME_NOTES + "/" + user.id, true, { note: note });
	};

	// def createRole

	InternalClient.prototype.createRole = function createRole(server, data) {
		var _this24 = this;

		server = this.resolver.resolveServer(server);

		return this.apiRequest("post", _Constants.Endpoints.SERVER_ROLES(server.id), true).then(function (res) {
			var role = server.roles.add(new _StructuresRole2["default"](res, server, _this24.client));

			if (data) {
				return _this24.updateRole(role, data);
			}
			return role;
		});
	};

	// def updateRole

	InternalClient.prototype.updateRole = function updateRole(role, data) {
		var _this25 = this;

		role = this.resolver.resolveRole(role);
		var server = this.resolver.resolveServer(role.server);

		var newData = {
			color: "color" in data ? data.color : role.color,
			hoist: "hoist" in data ? data.hoist : role.hoist,
			name: "name" in data ? data.name : role.name,
			position: "position" in data ? data.position : role.position,
			permissions: "permissions" in data ? data.permissions : role.permissions,
			mentionable: "mentionable" in data ? data.mentionable : role.mentionable
		};

		if (data.permissions) {
			newData.permissions = 0;
			for (var _iterator4 = data.permissions, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
				var _ref4;

				if (_isArray4) {
					if (_i4 >= _iterator4.length) break;
					_ref4 = _iterator4[_i4++];
				} else {
					_i4 = _iterator4.next();
					if (_i4.done) break;
					_ref4 = _i4.value;
				}

				var perm = _ref4;

				if (perm instanceof String || typeof perm === "string") {
					newData.permissions |= _Constants.Permissions[perm] || 0;
				} else {
					newData.permissions |= perm;
				}
			}
		}

		return this.apiRequest("patch", _Constants.Endpoints.SERVER_ROLES(server.id) + "/" + role.id, true, newData).then(function (res) {
			return server.roles.update(role, new _StructuresRole2["default"](res, server, _this25.client));
		});
	};

	// def deleteRole

	InternalClient.prototype.deleteRole = function deleteRole(role) {
		if (role.server.id === role.id) {
			return Promise.reject(new Error("Stop trying to delete the @everyone role. It is futile"));
		} else {
			return this.apiRequest("del", _Constants.Endpoints.SERVER_ROLES(role.server.id) + "/" + role.id, true);
		}
	};

	//def addMemberToRole

	InternalClient.prototype.addMemberToRole = function addMemberToRole(member, roles) {
		var _this26 = this;

		member = this.resolver.resolveUser(member);

		if (!member) {
			return Promise.reject(new Error("user not found"));
		}

		if (!Array.isArray(roles) || roles.length === 0) {
			roles = this.resolver.resolveRole(roles);
			if (roles) {
				roles = [roles];
			} else {
				return Promise.reject(new Error("invalid array of roles"));
			}
		} else {
			roles = roles.map(function (r) {
				return _this26.resolver.resolveRole(r);
			});
		}

		if (roles.some(function (role) {
			return !role.server.memberMap[member.id];
		})) {
			return Promise.reject(new Error("Role does not exist on same server as member"));
		}

		var roleIDs = roles[0].server.memberMap[member.id].roles.map(function (r) {
			return r && r.id || r;
		});

		for (var i = 0; i < roles.length; i++) {
			if (! ~roleIDs.indexOf(roles[i].id)) {
				roleIDs.push(roles[i].id);
			};
		};

		return this.apiRequest("patch", _Constants.Endpoints.SERVER_MEMBERS(roles[0].server.id) + "/" + member.id, true, {
			roles: roleIDs
		});
	};

	InternalClient.prototype.memberHasRole = function memberHasRole(member, role) {
		role = this.resolver.resolveRole(role);
		member = this.resolver.resolveUser(member);

		if (!role) {
			throw new Error("invalid role");
		}
		if (!member) {
			throw new Error("user not found");
		}

		var roledata = role.server.rolesOf(member);
		if (roledata) {
			for (var _iterator5 = roledata, _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
				var _ref5;

				if (_isArray5) {
					if (_i5 >= _iterator5.length) break;
					_ref5 = _iterator5[_i5++];
				} else {
					_i5 = _iterator5.next();
					if (_i5.done) break;
					_ref5 = _i5.value;
				}

				var r = _ref5;

				if (r.id == role.id) {
					return true;
				}
			}
		}
		return false;
	};

	//def removeMemberFromRole

	InternalClient.prototype.removeMemberFromRole = function removeMemberFromRole(member, roles) {
		var _this27 = this;

		member = this.resolver.resolveUser(member);

		if (!member) {
			return Promise.reject(new Error("user not found"));
		}

		if (!Array.isArray(roles) || roles.length === 0) {
			roles = this.resolver.resolveRole(roles);
			if (roles) {
				roles = [roles];
			} else {
				return Promise.reject(new Error("invalid array of roles"));
			}
		} else {
			roles = roles.map(function (r) {
				return _this27.resolver.resolveRole(r);
			});
		}

		var roleIDs = roles[0].server.memberMap[member.id].roles.map(function (r) {
			return r && r.id || r;
		});

		for (var _iterator6 = roles, _isArray6 = Array.isArray(_iterator6), _i6 = 0, _iterator6 = _isArray6 ? _iterator6 : _iterator6[Symbol.iterator]();;) {
			var _ref6;

			if (_isArray6) {
				if (_i6 >= _iterator6.length) break;
				_ref6 = _iterator6[_i6++];
			} else {
				_i6 = _iterator6.next();
				if (_i6.done) break;
				_ref6 = _i6.value;
			}

			var role = _ref6;

			if (!role.server.memberMap[member.id]) {
				return Promise.reject(new Error("member not in server"));
			}
			for (var item in roleIDs) {
				if (roleIDs[item] === role.id) {
					roleIDs.splice(item, 1);
					break;
				}
			}
		}

		return this.apiRequest("patch", _Constants.Endpoints.SERVER_MEMBERS(roles[0].server.id) + "/" + member.id, true, {
			roles: roleIDs
		});
	};

	// def createInvite

	InternalClient.prototype.createInvite = function createInvite(chanServ, options) {
		var _this28 = this;

		return this.resolver.resolveChannel(chanServ).then(function (channel) {
			if (!options) {
				options = {
					validate: null
				};
			} else {
				options.max_age = options.maxAge || 0;
				options.max_uses = options.maxUses || 0;
				options.temporary = options.temporary || false;
				options.xkcdpass = options.xkcd || false;
			}

			return _this28.apiRequest("post", _Constants.Endpoints.CHANNEL_INVITES(channel.id), true, options).then(function (res) {
				return new _StructuresInvite2["default"](res, _this28.channels.get("id", res.channel.id), _this28.client);
			});
		});
	};

	//def deleteInvite

	InternalClient.prototype.deleteInvite = function deleteInvite(invite) {
		invite = this.resolver.resolveInviteID(invite);
		if (!invite) {
			throw new Error("Not a valid invite");
		}
		return this.apiRequest("del", _Constants.Endpoints.INVITE(invite), true);
	};

	//def getInvite

	InternalClient.prototype.getInvite = function getInvite(invite) {
		var _this29 = this;

		invite = this.resolver.resolveInviteID(invite);
		if (!invite) {
			return Promise.reject(new Error("Not a valid invite"));
		}

		return this.apiRequest("get", _Constants.Endpoints.INVITE(invite), true).then(function (res) {
			if (!_this29.channels.has("id", res.channel.id)) {
				return new _StructuresInvite2["default"](res, null, _this29.client);
			}
			return _this29.apiRequest("post", _Constants.Endpoints.CHANNEL_INVITES(res.channel.id), true, { validate: invite }).then(function (res2) {
				return new _StructuresInvite2["default"](res2, _this29.channels.get("id", res.channel.id), _this29.client);
			});
		});
	};

	//def getInvites

	InternalClient.prototype.getInvites = function getInvites(channel) {
		var _this30 = this;

		if (!(channel instanceof _StructuresChannel2["default"])) {
			var server = this.resolver.resolveServer(channel);
			if (server) {
				return this.apiRequest("get", _Constants.Endpoints.SERVER_INVITES(server.id), true).then(function (res) {
					return res.map(function (data) {
						return new _StructuresInvite2["default"](data, _this30.channels.get("id", data.channel.id), _this30.client);
					});
				});
			}
		}
		return this.resolver.resolveChannel(channel).then(function (channel) {
			return _this30.apiRequest("get", _Constants.Endpoints.CHANNEL_INVITES(channel.id), true).then(function (res) {
				return res.map(function (data) {
					return new _StructuresInvite2["default"](data, _this30.channels.get("id", data.channel.id), _this30.client);
				});
			});
		});
	};

	//def overwritePermissions

	InternalClient.prototype.overwritePermissions = function overwritePermissions(channel, role, updated) {
		var _this31 = this;

		return this.resolver.resolveChannel(channel).then(function (channel) {
			if (!channel instanceof _StructuresServerChannel2["default"]) {
				return Promise.reject(new Error("Not a server channel"));
			}

			var data = {
				allow: 0,
				deny: 0
			};

			if (role instanceof String || typeof role === "string") {
				role = _this31.resolver.resolveUser(role) || _this31.resolver.resolveRole(role);
			}

			if (role instanceof _StructuresUser2["default"]) {
				data.id = role.id;
				data.type = "member";
			} else if (role instanceof _StructuresRole2["default"]) {
				data.id = role.id;
				data.type = "role";
			} else {
				return Promise.reject(new Error("Role could not be resolved"));
			}

			var previousOverwrite = channel.permissionOverwrites.get("id", data.id);

			if (previousOverwrite) {
				data.allow |= previousOverwrite.allow;
				data.deny |= previousOverwrite.deny;
			}

			for (var perm in updated) {
				if (updated[perm] === true) {
					data.allow |= _Constants.Permissions[perm] || 0;
					data.deny &= ~(_Constants.Permissions[perm] || 0);
				} else if (updated[perm] === false) {
					data.allow &= ~(_Constants.Permissions[perm] || 0);
					data.deny |= _Constants.Permissions[perm] || 0;
				} else {
					data.allow &= ~(_Constants.Permissions[perm] || 0);
					data.deny &= ~(_Constants.Permissions[perm] || 0);
				}
			}

			return _this31.apiRequest("put", _Constants.Endpoints.CHANNEL_PERMISSIONS(channel.id) + "/" + data.id, true, data);
		});
	};

	//def setStatus

	InternalClient.prototype.setStatus = function setStatus(idleStatus, game) {

		if (idleStatus === "online" || idleStatus === "here" || idleStatus === "available") {
			this.idleStatus = null;
		} else if (idleStatus === "idle" || idleStatus === "away") {
			this.idleStatus = Date.now();
		} else {
			this.idleStatus = this.idleStatus || null; //undefined
		}

		// convert undefined and empty string to null
		if (typeof game === "string" && !game.length) game = null;

		this.game = game === null ? null : !game ? this.game || null : typeof game === "string" ? { name: game } : game;

		var packet = {
			op: 3,
			d: {
				idle_since: this.idleStatus,
				game: this.game
			}
		};

		this.sendWS(packet);

		this.user.status = this.idleStatus ? "idle" : "online";
		this.user.game = this.game;

		return Promise.resolve();
	};

	//def sendTyping

	InternalClient.prototype.sendTyping = function sendTyping(channel) {
		var _this32 = this;

		return this.resolver.resolveChannel(channel).then(function (channel) {
			return _this32.apiRequest("post", _Constants.Endpoints.CHANNEL(channel.id) + "/typing", true);
		});
	};

	//def startTyping

	InternalClient.prototype.startTyping = function startTyping(channel) {
		var _this33 = this;

		return this.resolver.resolveChannel(channel).then(function (channel) {

			if (_this33.intervals.typing[channel.id]) {
				// typing interval already exists, leave it alone
				throw new Error("Already typing in that channel");
			}

			_this33.intervals.typing[channel.id] = setInterval(function () {
				return _this33.sendTyping(channel)["catch"](function (error) {
					return _this33.client.emit("error", error);
				});
			}, 4000);

			return _this33.sendTyping(channel);
		});
	};

	//def stopTyping

	InternalClient.prototype.stopTyping = function stopTyping(channel) {
		var _this34 = this;

		return this.resolver.resolveChannel(channel).then(function (channel) {

			if (!_this34.intervals.typing[channel.id]) {
				// typing interval doesn"t exist
				throw new Error("Not typing in that channel");
			}

			clearInterval(_this34.intervals.typing[channel.id]);
			_this34.intervals.typing[channel.id] = false;
		});
	};

	//def updateDetails

	InternalClient.prototype.updateDetails = function updateDetails(data) {
		if (!this.user.bot && !(this.email || data.email)) {
			throw new Error("Must provide email since a token was used to login");
		}

		var options = {
			avatar: this.resolver.resolveToBase64(data.avatar) || this.user.avatar,
			username: data.username || this.user.username
		};

		if (this.email || data.email) {
			options.email = data.email || this.email;
			options.new_password = data.newPassword || null;
			options.password = data.password || this.password;
		}

		return this.apiRequest("patch", _Constants.Endpoints.ME, true, options);
	};

	//def setAvatar

	InternalClient.prototype.setAvatar = function setAvatar(avatar) {
		return this.updateDetails({ avatar: avatar });
	};

	//def setUsername

	InternalClient.prototype.setUsername = function setUsername(username) {
		return this.updateDetails({ username: username });
	};

	//def setChannelTopic

	InternalClient.prototype.setChannelTopic = function setChannelTopic(channel) {
		var topic = arguments.length <= 1 || arguments[1] === undefined ? "" : arguments[1];

		topic = topic || "";

		return this.updateChannel(channel, { topic: topic });
	};

	//def setChannelName

	InternalClient.prototype.setChannelName = function setChannelName(channel, name) {
		name = name || "unnamed-channel";

		return this.updateChannel(channel, { name: name });
	};

	//def setChannelPosition

	InternalClient.prototype.setChannelPosition = function setChannelPosition(channel, position) {
		position = position || 0;

		return this.updateChannel(channel, { position: position });
	};

	//def setChannelUserLimit

	InternalClient.prototype.setChannelUserLimit = function setChannelUserLimit(channel, limit) {
		limit = limit || 0; // default 0 = no limit

		return this.updateChannel(channel, { userLimit: limit });
	};

	//def setChannelBitrate

	InternalClient.prototype.setChannelBitrate = function setChannelBitrate(channel, kbitrate) {
		kbitrate = kbitrate || 64; // default 64kbps

		return this.updateChannel(channel, { bitrate: kbitrate });
	};

	//def updateChannel

	InternalClient.prototype.updateChannel = function updateChannel(channel, data) {
		var _this35 = this;

		return this.resolver.resolveChannel(channel).then(function (channel) {
			if (!channel) {
				return Promise.reject(new Error("Failed to resolve channel"));
			}

			data = {
				name: data.name || channel.name,
				topic: data.topic || channel.topic,
				position: data.position ? data.position : channel.position,
				user_limit: data.userLimit ? data.userLimit : channel.userLimit,
				bitrate: data.bitrate ? data.bitrate : channel.bitrate ? channel.bitrate : undefined
			};

			if (data.position < 0) {
				return Promise.reject(new Error("Position cannot be less than 0"));
			}

			if (data.user_limit < 0 || data.user_limit > 99) {
				return Promise.reject(new Error("User limit must be between 0-99"));
			}

			if (data.kbitrate < 8 || data.kbitrate > 96) {
				return Promise.reject(new Error("Bitrate must be between 8-96kbps"));
			}

			if (data.bitrate) {
				data.bitrate *= 1000; // convert to bits before sending
			}

			return _this35.apiRequest("patch", _Constants.Endpoints.CHANNEL(channel.id), true, data).then(function (res) {
				channel.name = data.name;
				channel.topic = data.topic;
				channel.position = data.position;
				channel.userLimit = data.user_limit;
				channel.bitrate = Math.ceil(data.bitrate / 1000);
				channel._bitrate = data.bitrate;
			});
		});
	};

	//def addFriend

	InternalClient.prototype.addFriend = function addFriend(user) {
		if (this.user.bot) return Promise.reject(new Error("user is a bot, bot's do not have friends support"));

		var id;
		if (user instanceof String || typeof user === "string") id = user;else if (user instanceof _StructuresUser2["default"]) {
			user = this.resolver.resolveUser(user);
			id = user.id;
		} else {
			if (user.username && user.discriminator) // add by username and discriminator (pass in an object)
				return this.apiRequest("put", _Constants.Endpoints.FRIENDS, true, user);else return Promise.reject("invalid user");
		}

		return this.apiRequest("put", _Constants.Endpoints.FRIENDS + "/" + id, true, {});
	};

	//def removeFriend

	InternalClient.prototype.removeFriend = function removeFriend(user) {
		if (this.user.bot) return Promise.reject(new Error("user is a bot, bot's do not have friends support"));

		user = this.resolver.resolveUser(user);

		return this.apiRequest("delete", _Constants.Endpoints.FRIENDS + "/" + user.id, true);
	};

	InternalClient.prototype.getServerWebhooks = function getServerWebhooks(server) {
		var _this36 = this;

		server = this.resolver.resolveServer(server);

		if (!server) {
			return Promise.reject(new Error("Failed to resolve server"));
		}

		return this.apiRequest("get", _Constants.Endpoints.SERVER_WEBHOOKS(server.id), true).then(function (res) {
			return res.map(function (webhook) {
				var channel = _this36.channels.get("id", webhook.channel_id);
				return channel.webhooks.add(new _StructuresWebhook2["default"](webhook, server, channel, _this36.users.get("id", webhook.user.id)));
			});
		});
	};

	InternalClient.prototype.getChannelWebhooks = function getChannelWebhooks(channel) {
		var _this37 = this;

		return this.resolver.resolveChannel(channel).then(function (channel) {
			if (!channel) {
				return Promise.reject(new Error("Failed to resolve channel"));
			}

			return _this37.apiRequest("get", _Constants.Endpoints.CHANNEL_WEBHOOKS(channel.id), true).then(function (res) {
				return res.map(function (webhook) {
					return channel.webhooks.add(new _StructuresWebhook2["default"](webhook, _this37.servers.get("id", webhook.guild_id), channel, _this37.users.get("id", webhook.user.id)));
				});
			});
		});
	};

	InternalClient.prototype.editWebhook = function editWebhook(webhook) {
		var _this38 = this;

		var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

		return this.resolver.resolveWebhook(webhook).then(function (webhook) {
			if (!webhook) {
				return Promise.reject(new Error(" Failed to resolve webhook"));
			}

			if (options.hasOwnProperty("avatar")) {
				options.avatar = _this38.resolver.resolveToBase64(options.avatar);
			}

			return _this38.apiRequest("patch", _Constants.Endpoints.WEBHOOK(webhook.id), true, options).then(function (res) {
				webhook.name = res.name;
				webhook.avatar = res.hasOwnProperty('avatar') ? res.avatar : webhook.avatar;
			});
		});
	};

	InternalClient.prototype.createWebhook = function createWebhook(channel) {
		var _this39 = this;

		var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

		return this.resolver.resolveChannel(channel).then(function (destination) {
			if (!channel) {
				return Promise.reject(new Error(" Failed to resolve channel"));
			}

			if (options.hasOwnProperty("avatar")) {
				options.avatar = _this39.resolver.resolveToBase64(options.avatar);
			}

			return _this39.apiRequest("post", _Constants.Endpoints.CHANNEL_WEBHOOKS(destination.id), true, options).then(function (webhook) {
				return channel.webhooks.add(new _StructuresWebhook2["default"](webhook, _this39.servers.get("id", webhook.guild_id), channel, _this39.users.get("id", webhook.user.id)));
			});
		});
	};

	InternalClient.prototype.deleteWebhook = function deleteWebhook(webhook) {
		var _this40 = this;

		return this.resolver.resolveWebhook(webhook).then(function (webhook) {
			if (!webhook) {
				return Promise.reject(new Error(" Failed to resolve webhook"));
			}

			return _this40.apiRequest("delete", _Constants.Endpoints.WEBHOOK(webhook.id), true).then(function () {
				webhook.channel.webhooks.remove(webhook);
			});
		});
	};

	InternalClient.prototype.sendWebhookMessage = function sendWebhookMessage(webhook, _content) {
		var _this41 = this;

		var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

		return this.resolver.resolveWebhook(webhook).then(function (destination) {
			var content = _this41.resolver.resolveString(_content);

			if (_this41.client.options.disableEveryone || options.disableEveryone) {
				content = content.replace(/(@)(everyone|here)/g, "$1???$2");
			}

			if (!options.hasOwnProperty("username")) {
				options.username = _this41.user.username;
			}

			var slack = undefined;
			if (options.hasOwnProperty("slack")) {
				slack = options.slack;
				delete options["slack"];
			}

			options.content = _content;

			return _this41.apiRequest("post", "" + _Constants.Endpoints.WEBHOOK_MESSAGE(destination.id, destination.token) + (slack ? "/slack" : "") + "?wait=true", true, options)["catch"](console.error).then(function (res) {
				return destination.channel.messages.add(new _StructuresMessage2["default"](res, destination.channel, _this41.client));
			});
		});
	};

	//def getOAuthApplication

	InternalClient.prototype.getOAuthApplication = function getOAuthApplication(appID) {
		appID = appID || "@me";
		return this.apiRequest("get", _Constants.Endpoints.OAUTH2_APPLICATION(appID), true);
	};

	//def ack

	InternalClient.prototype.ack = function ack(msg) {
		msg = this.resolver.resolveMessage(msg);

		if (!msg) {
			Promise.reject(new Error("Message does not exist"));
		}

		return this.apiRequest("post", _Constants.Endpoints.CHANNEL_MESSAGE(msg.channel.id, msg.id) + "/ack", true);
	};

	InternalClient.prototype.sendWS = function sendWS(object) {
		if (this.websocket) {
			this.websocket.send(JSON.stringify(object));
		}
	};

	InternalClient.prototype.createWS = function createWS(url) {
		var _this42 = this;

		if (this.websocket) {
			return false;
		}
		if (!url.endsWith("/")) {
			url += "/";
		}
		url += "?encoding=json&v=" + GATEWAY_VERSION;

		this.websocket = new _ws2["default"](url);

		this.websocket.onopen = function () {};

		this.websocket.onclose = function (event) {
			_this42.websocket = null;
			_this42.state = _ConnectionState2["default"].DISCONNECTED;
			if (event && event.code) {
				_this42.client.emit("warn", "WS close: " + event.code);
				var err;
				if (event.code === 4001) {
					err = new Error("Gateway received invalid OP code");
				} else if (event.code === 4005) {
					err = new Error("Gateway received invalid message");
				} else if (event.code === 4003) {
					err = new Error("Not authenticated");
				} else if (event.code === 4004) {
					err = new Error("Authentication failed");
				} else if (event.code === 4005) {
					err = new Error("Already authenticated");
				}if (event.code === 4006 || event.code === 4009) {
					err = new Error("Invalid session");
				} else if (event.code === 4007) {
					_this42.sequence = 0;
					err = new Error("Invalid sequence number");
				} else if (event.code === 4008) {
					err = new Error("Gateway connection was ratelimited");
				} else if (event.code === 4010) {
					err = new Error("Invalid shard key");
				}
				if (err) {
					_this42.client.emit("error", err);
				}
			}
			_this42.disconnected(_this42.client.options.autoReconnect);
		};

		this.websocket.onerror = function (e) {
			_this42.client.emit("error", e);
			_this42.websocket = null;
			_this42.state = _ConnectionState2["default"].DISCONNECTED;
			_this42.disconnected(_this42.client.options.autoReconnect);
		};

		this.websocket.onmessage = function (e) {
			if (e.data instanceof Buffer) {
				if (!zlib) zlib = require("zlib");
				e.data = zlib.inflateSync(e.data).toString();
			}

			var packet;
			try {
				packet = JSON.parse(e.data);
			} catch (e) {
				_this42.client.emit("error", e);
				return;
			}

			_this42.client.emit("raw", packet);

			if (packet.s) {
				_this42.sequence = packet.s;
			}

			switch (packet.op) {
				case 0:
					_this42.processPacket(packet);
					break;
				case 1:
					_this42.heartbeat();
					break;
				case 7:
					_this42.disconnected(true);
					break;
				case 9:
					_this42.sessionID = null;
					_this42.sequence = 0;
					_this42.identify();
					break;
				case 10:
					if (_this42.sessionID) {
						_this42.resume();
					} else {
						_this42.identify();
					}
					_this42.heartbeat();
					_this42.intervals.kai = setInterval(function () {
						return _this42.heartbeat();
					}, packet.d.heartbeat_interval);
					break;
				case 11:
					_this42.heartbeatAcked = true;
					break;
				default:
					_this42.client.emit("unknown", packet);
					break;
			}
		};
	};

	InternalClient.prototype.processPacket = function processPacket(packet) {
		var _this43 = this;

		var client = this.client;
		var data = packet.d;
		switch (packet.t) {
			case _Constants.PacketType.RESUME:
			case _Constants.PacketType.READY:
				this.autoReconnectInterval = 1000;
				this.state = _ConnectionState2["default"].READY;

				if (packet.t === _Constants.PacketType.RESUME) {
					break;
				}

				this.sessionID = data.session_id;
				var startTime = Date.now();

				this.user = this.users.add(new _StructuresUser2["default"](data.user, client));

				this.forceFetchCount = {};
				this.forceFetchQueue = [];
				this.forceFetchLength = 1;

				data.guilds.forEach(function (server) {
					if (!server.unavailable) {
						server = _this43.servers.add(new _StructuresServer2["default"](server, client));
						if (client.options.bot === false) {
							_this43.unsyncedGuilds++;
							_this43.syncGuild(server.id);
						}
						if (_this43.client.options.forceFetchUsers && server.members && server.members.length < server.memberCount) {
							_this43.getGuildMembers(server.id, Math.ceil(server.memberCount / 1000));
						}
					} else {
						client.emit("debug", "server " + server.id + " was unavailable, could not create (ready)");
						_this43.unavailableServers.add(server);
					}
				});
				data.private_channels.forEach(function (pm) {
					_this43.private_channels.add(new _StructuresPMChannel2["default"](pm, client));
				});
				if (!data.user.bot) {
					// bots dont have friends
					data.relationships.forEach(function (friend) {
						if (friend.type === 1) {
							// is a friend
							_this43.friends.add(new _StructuresUser2["default"](friend.user, client));
						} else if (friend.type === 2) {
							// incoming friend requests
							_this43.blocked_users.add(new _StructuresUser2["default"](friend.user, client));
						} else if (friend.type === 3) {
							// incoming friend requests
							_this43.incoming_friend_requests.add(new _StructuresUser2["default"](friend.user, client));
						} else if (friend.type === 4) {
							// outgoing friend requests
							_this43.outgoing_friend_requests.add(new _StructuresUser2["default"](friend.user, client));
						} else {
							client.emit("warn", "unknown friend type " + friend.type);
						}
					});
				} else {
					this.friends = null;
					this.blocked_users = null;
					this.incoming_friend_requests = null;
					this.outgoing_friend_requests = null;
				}

				// add notes to users
				if (data.notes) {
					for (note in data.notes) {
						var user = this.users.get("id", note);
						if (user) {
							var newUser = user;
							newUser.note = data.notes[note];

							this.users.update(user, newUser);
						} else {
							client.emit("warn", "note in ready packet but user not cached");
						}
					}
				}

				client.emit("debug", "ready packet took " + (Date.now() - startTime) + "ms to process");
				client.emit("debug", "ready with " + this.servers.length + " servers, " + this.unavailableServers.length + " unavailable servers, " + this.channels.length + " channels and " + this.users.length + " users cached.");

				this.restartServerCreateTimeout();

				break;

			case _Constants.PacketType.MESSAGE_CREATE:
				// format: https://discordapi.readthedocs.org/en/latest/reference/channels/messages.html#message-format
				var channel = this.channels.get("id", data.channel_id) || this.private_channels.get("id", data.channel_id);
				if (channel) {
					var msg = channel.messages.add(new _StructuresMessage2["default"](data, channel, client));
					channel.lastMessageID = msg.id;

					if (this.messageAwaits[channel.id + msg.author.id]) {
						this.messageAwaits[channel.id + msg.author.id].map(function (fn) {
							return fn(msg);
						});
						this.messageAwaits[channel.id + msg.author.id] = null;
						client.emit("message", msg, true); //2nd param is isAwaitedMessage
					} else {
							client.emit("message", msg);
						}
				} else {
					client.emit("warn", "message created but channel is not cached");
				}
				break;
			case _Constants.PacketType.MESSAGE_DELETE:
				var channel = this.channels.get("id", data.channel_id) || this.private_channels.get("id", data.channel_id);
				if (channel) {
					// potentially blank
					var msg = channel.messages.get("id", data.id);
					client.emit("messageDeleted", msg, channel);
					if (msg) {
						channel.messages.remove(msg);
					} else {
						client.emit("debug", "message was deleted but message is not cached");
					}
				} else {
					client.emit("warn", "message was deleted but channel is not cached");
				}
				break;
			case _Constants.PacketType.MESSAGE_DELETE_BULK:
				var channel = this.channels.get("id", data.channel_id) || this.private_channels.get("id", data.channel_id);
				if (channel) {
					data.ids.forEach(function (id) {
						// potentially blank
						var msg = channel.messages.get("id", id);
						client.emit("messageDeleted", msg, channel);
						if (msg) {
							channel.messages.remove(msg);
						} else {
							client.emit("debug", "message was deleted but message is not cached");
						}
					});
				} else {
					client.emit("warn", "message was deleted but channel is not cached");
				}
				break;
			case _Constants.PacketType.MESSAGE_UPDATE:
				// format https://discordapi.readthedocs.org/en/latest/reference/channels/messages.html#message-format
				var channel = this.channels.get("id", data.channel_id) || this.private_channels.get("id", data.channel_id);
				if (channel) {
					// potentially blank
					var msg = channel.messages.get("id", data.id);

					if (msg) {
						// old message exists
						data.nonce = data.nonce !== undefined ? data.nonce : msg.nonce;
						data.attachments = data.attachments !== undefined ? data.attachments : msg.attachments;
						data.tts = data.tts !== undefined ? data.tts : msg.tts;
						data.embeds = data.embeds !== undefined ? data.embeds : msg.embeds;
						data.timestamp = data.timestamp !== undefined ? data.timestamp : msg.timestamp;
						data.mention_everyone = data.mention_everyone !== undefined ? data.mention_everyone : msg.everyoneMentioned;
						data.content = data.content !== undefined ? data.content : msg.content;
						data.mentions = data.mentions !== undefined ? data.mentions : msg.mentions;
						data.author = data.author !== undefined ? data.author : msg.author;
						msg = new _StructuresMessage2["default"](msg, channel, client);
					} else if (!data.author || !data.content) {
						break;
					}
					var nmsg = new _StructuresMessage2["default"](data, channel, client);
					client.emit("messageUpdated", msg, nmsg);
					if (msg) {
						channel.messages.update(msg, nmsg);
					}
				} else {
					client.emit("warn", "message was updated but channel is not cached");
				}
				break;
			case _Constants.PacketType.SERVER_CREATE:
				var server = this.servers.get("id", data.id);
				if (!server) {
					if (!data.unavailable) {
						server = this.servers.add(new _StructuresServer2["default"](data, client));
						if (client.options.bot === false) {
							this.unsyncedGuilds++;
							this.syncGuild(server.id);
						}
						if (client.readyTime) {
							client.emit("serverCreated", server);
						}
						if (this.client.options.forceFetchUsers && server.large && server.members.length < server.memberCount) {
							this.getGuildMembers(server.id, Math.ceil(server.memberCount / 1000));
						}
						var unavailable = this.unavailableServers.get("id", server.id);
						if (unavailable) {
							this.unavailableServers.remove(unavailable);
						}
						this.restartServerCreateTimeout();
					} else {
						client.emit("debug", "server was unavailable, could not create");
					}
				}
				break;
			case _Constants.PacketType.SERVER_DELETE:
				var server = this.servers.get("id", data.id);
				if (server) {
					if (!data.unavailable) {
						client.emit("serverDeleted", server);

						for (var _iterator7 = server.channels, _isArray7 = Array.isArray(_iterator7), _i7 = 0, _iterator7 = _isArray7 ? _iterator7 : _iterator7[Symbol.iterator]();;) {
							var _ref7;

							if (_isArray7) {
								if (_i7 >= _iterator7.length) break;
								_ref7 = _iterator7[_i7++];
							} else {
								_i7 = _iterator7.next();
								if (_i7.done) break;
								_ref7 = _i7.value;
							}

							var channel = _ref7;

							this.channels.remove(channel);
						}

						this.servers.remove(server);

						for (var _iterator8 = server.members, _isArray8 = Array.isArray(_iterator8), _i8 = 0, _iterator8 = _isArray8 ? _iterator8 : _iterator8[Symbol.iterator]();;) {
							var _ref8;

							if (_isArray8) {
								if (_i8 >= _iterator8.length) break;
								_ref8 = _iterator8[_i8++];
							} else {
								_i8 = _iterator8.next();
								if (_i8.done) break;
								_ref8 = _i8.value;
							}

							var user = _ref8;

							var found = false;
							for (var _iterator9 = this.servers, _isArray9 = Array.isArray(_iterator9), _i9 = 0, _iterator9 = _isArray9 ? _iterator9 : _iterator9[Symbol.iterator]();;) {
								var _ref9;

								if (_isArray9) {
									if (_i9 >= _iterator9.length) break;
									_ref9 = _iterator9[_i9++];
								} else {
									_i9 = _iterator9.next();
									if (_i9.done) break;
									_ref9 = _i9.value;
								}

								var s = _ref9;

								if (s.members.get("id", user.id)) {
									found = true;
									break;
								}
							}
							if (!found) {
								this.users.remove(user);
							}
						}
					} else {
						client.emit("debug", "server was unavailable, could not update");
					}
					this.buckets["bot:msg:guild:" + packet.d.id] = this.buckets["dmsg:" + packet.d.id] = this.buckets["bdmsg:" + packet.d.id] = this.buckets["guild_member:" + packet.d.id] = this.buckets["guild_member_nick:" + packet.d.id] = undefined;
				} else {
					client.emit("warn", "server was deleted but it was not in the cache");
				}
				break;
			case _Constants.PacketType.SERVER_UPDATE:
				var server = this.servers.get("id", data.id);
				if (server) {
					// server exists
					data.members = data.members || [];
					data.channels = data.channels || [];
					var newserver = new _StructuresServer2["default"](data, client);
					newserver.members = server.members;
					newserver.memberMap = server.memberMap;
					newserver.channels = server.channels;
					if (newserver.equalsStrict(server)) {
						// already the same don't do anything
						client.emit("debug", "received server update but server already updated");
					} else {
						client.emit("serverUpdated", new _StructuresServer2["default"](server, client), newserver);
						this.servers.update(server, newserver);
					}
				} else if (!server) {
					client.emit("warn", "server was updated but it was not in the cache");
				}
				break;
			case _Constants.PacketType.CHANNEL_CREATE:

				var channel = this.channels.get("id", data.id);

				if (!channel) {

					var server = this.servers.get("id", data.guild_id);
					if (server) {
						var chan = null;
						if (data.type === 0) {
							chan = this.channels.add(new _StructuresTextChannel2["default"](data, client, server));
						} else {
							chan = this.channels.add(new _StructuresVoiceChannel2["default"](data, client, server));
						}
						client.emit("channelCreated", server.channels.add(chan));
					} else if (data.is_private) {
						client.emit("channelCreated", this.private_channels.add(new _StructuresPMChannel2["default"](data, client)));
					} else {
						client.emit("warn", "channel created but server does not exist");
					}
				} else {
					client.emit("warn", "channel created but already in cache");
				}

				break;
			case _Constants.PacketType.CHANNEL_DELETE:
				var channel = this.channels.get("id", data.id) || this.private_channels.get("id", data.id);
				if (channel) {

					if (channel.server) {
						// accounts for PMs
						channel.server.channels.remove(channel);
						this.channels.remove(channel);
					} else {
						this.private_channels.remove(channel);
					}

					client.emit("channelDeleted", channel);
				} else {
					client.emit("warn", "channel deleted but already out of cache?");
				}
				break;
			case _Constants.PacketType.CHANNEL_UPDATE:
				var channel = this.channels.get("id", data.id) || this.private_channels.get("id", data.id);
				if (channel) {

					if (channel instanceof _StructuresPMChannel2["default"]) {
						//PM CHANNEL
						client.emit("channelUpdated", new _StructuresPMChannel2["default"](channel, client), this.private_channels.update(channel, new _StructuresPMChannel2["default"](data, client)));
					} else {
						if (channel.server) {
							if (channel.type === 0) {
								//TEXT CHANNEL
								var chan = new _StructuresTextChannel2["default"](data, client, channel.server);
								chan.messages = channel.messages;
								client.emit("channelUpdated", channel, chan);
								channel.server.channels.update(channel, chan);
								this.channels.update(channel, chan);
							} else {
								//VOICE CHANNEL
								data.members = channel.members;
								var chan = new _StructuresVoiceChannel2["default"](data, client, channel.server);
								client.emit("channelUpdated", channel, chan);
								channel.server.channels.update(channel, chan);
								this.channels.update(channel, chan);
							}
						} else {
							client.emit("warn", "channel updated but server non-existant");
						}
					}
				} else {
					client.emit("warn", "channel updated but not in cache");
				}
				break;
			case _Constants.PacketType.SERVER_ROLE_CREATE:
				var server = this.servers.get("id", data.guild_id);
				if (server) {
					client.emit("serverRoleCreated", server.roles.add(new _StructuresRole2["default"](data.role, server, client)), server);
				} else {
					client.emit("warn", "server role made but server not in cache");
				}
				break;
			case _Constants.PacketType.SERVER_ROLE_DELETE:
				var server = this.servers.get("id", data.guild_id);
				if (server) {
					var role = server.roles.get("id", data.role_id);
					if (role) {
						server.roles.remove(role);
						client.emit("serverRoleDeleted", role);
					} else {
						client.emit("warn", "server role deleted but role not in cache");
					}
				} else {
					client.emit("warn", "server role deleted but server not in cache");
				}
				break;
			case _Constants.PacketType.SERVER_ROLE_UPDATE:
				var server = this.servers.get("id", data.guild_id);
				if (server) {
					var role = server.roles.get("id", data.role.id);
					if (role) {
						var newRole = new _StructuresRole2["default"](data.role, server, client);
						client.emit("serverRoleUpdated", new _StructuresRole2["default"](role, server, client), newRole);
						server.roles.update(role, newRole);
					} else {
						client.emit("warn", "server role updated but role not in cache");
					}
				} else {
					client.emit("warn", "server role updated but server not in cache");
				}
				break;
			case _Constants.PacketType.SERVER_MEMBER_ADD:
				var server = this.servers.get("id", data.guild_id);
				if (server) {

					server.memberMap[data.user.id] = {
						roles: data.roles,
						mute: false,
						selfMute: false,
						deaf: false,
						selfDeaf: false,
						joinedAt: Date.parse(data.joined_at),
						nick: data.nick || null
					};

					server.memberCount++;

					client.emit("serverNewMember", server, server.members.add(this.users.add(new _StructuresUser2["default"](data.user, client))));
				} else {
					client.emit("warn", "server member added but server doesn't exist in cache");
				}
				break;
			case _Constants.PacketType.SERVER_MEMBER_REMOVE:
				var server = this.servers.get("id", data.guild_id);
				if (server) {
					var user = this.users.get("id", data.user.id);
					if (user) {
						client.emit("serverMemberRemoved", server, user);
						server.memberMap[data.user.id] = null;
						server.members.remove(user);
						server.memberCount--;
					} else {
						client.emit("warn", "server member removed but user doesn't exist in cache");
					}
				} else {
					client.emit("warn", "server member removed but server doesn't exist in cache");
				}
				break;
			case _Constants.PacketType.SERVER_MEMBER_UPDATE:
				var server = this.servers.get("id", data.guild_id);
				if (server) {
					var user = this.users.add(new _StructuresUser2["default"](data.user, client));
					if (user) {
						var oldMember = null;
						if (server.memberMap[data.user.id]) {
							oldMember = {
								roles: server.memberMap[data.user.id].roles,
								mute: server.memberMap[data.user.id].mute,
								selfMute: server.memberMap[data.user.id].selfMute,
								deaf: server.memberMap[data.user.id].deaf,
								selfDeaf: server.memberMap[data.user.id].selfDeaf,
								nick: server.memberMap[data.user.id].nick
							};
						} else {
							server.memberMap[data.user.id] = {};
						}
						server.memberMap[data.user.id].roles = data.roles ? data.roles : server.memberMap[data.user.id].roles;
						server.memberMap[data.user.id].mute = data.mute || server.memberMap[data.user.id].mute;
						server.memberMap[data.user.id].selfMute = data.self_mute === undefined ? server.memberMap[data.user.id].selfMute : data.self_mute;
						server.memberMap[data.user.id].deaf = data.deaf || server.memberMap[data.user.id].deaf;
						server.memberMap[data.user.id].selfDeaf = data.self_deaf === undefined ? server.memberMap[data.user.id].selfDeaf : data.self_deaf;
						server.memberMap[data.user.id].nick = data.nick === undefined ? server.memberMap[data.user.id].nick : data.nick || null;
						client.emit("serverMemberUpdated", server, user, oldMember);
					} else {
						client.emit("warn", "server member removed but user doesn't exist in cache");
					}
				} else {
					client.emit("warn", "server member updated but server doesn't exist in cache");
				}
				break;
			case _Constants.PacketType.PRESENCE_UPDATE:

				var user = this.users.add(new _StructuresUser2["default"](data.user, client));
				var server = this.servers.get("id", data.guild_id);

				if (user && server) {

					server.members.add(user);

					data.user.username = data.user.username || user.username;
					data.user.id = data.user.id || user.id;
					data.user.avatar = data.user.avatar !== undefined ? data.user.avatar : user.avatar;
					data.user.discriminator = data.user.discriminator || user.discriminator;
					data.user.status = data.status || user.status;
					data.user.game = data.game !== undefined ? data.game : user.game;
					data.user.bot = data.user.bot !== undefined ? data.user.bot : user.bot;

					var presenceUser = new _StructuresUser2["default"](data.user, client);

					if (!presenceUser.equalsStrict(user)) {
						client.emit("presence", user, presenceUser);
						this.users.update(user, presenceUser);
					}
				} else {
					client.emit("warn", "presence update but user/server not in cache");
				}

				break;
			case _Constants.PacketType.USER_UPDATE:

				var user = this.users.get("id", data.id);

				if (user) {

					data.username = data.username || user.username;
					data.id = data.id || user.id;
					data.avatar = data.avatar || user.avatar;
					data.discriminator = data.discriminator || user.discriminator;
					this.email = data.email || this.email;

					var presenceUser = new _StructuresUser2["default"](data, client);

					client.emit("presence", user, presenceUser);
					this.users.update(user, presenceUser);
				} else {
					client.emit("warn", "user update but user not in cache (this should never happen)");
				}

				break;
			case _Constants.PacketType.TYPING:

				var user = this.users.get("id", data.user_id);
				var channel = this.channels.get("id", data.channel_id) || this.private_channels.get("id", data.channel_id);

				if (user && channel) {
					if (user.typing.since) {
						user.typing.since = Date.now();
						user.typing.channel = channel;
					} else {
						user.typing.since = Date.now();
						user.typing.channel = channel;
						client.emit("userTypingStarted", user, channel);
					}
					setTimeout(function () {
						if (Date.now() - user.typing.since > 5500) {
							// they haven't typed since
							user.typing.since = null;
							user.typing.channel = null;
							client.emit("userTypingStopped", user, channel);
						}
					}, 6000);
				} else {
					client.emit("warn", "user typing but user or channel not existant in cache");
				}
				break;
			case _Constants.PacketType.SERVER_BAN_ADD:
				var user = this.users.get("id", data.user.id);
				var server = this.servers.get("id", data.guild_id);

				if (user && server) {
					client.emit("userBanned", user, server);
				} else {
					client.emit("warn", "user banned but user/server not in cache.");
				}
				break;
			case _Constants.PacketType.SERVER_BAN_REMOVE:
				var user = this.users.get("id", data.user.id);
				var server = this.servers.get("id", data.guild_id);

				if (user && server) {
					client.emit("userUnbanned", user, server);
				} else {
					client.emit("warn", "user unbanned but user/server not in cache.");
				}
				break;
			case _Constants.PacketType.USER_NOTE_UPDATE:
				if (this.user.bot) {
					return;
				}
				var user = this.users.get("id", data.id);
				var oldNote = user.note;
				var note = data.note || null;

				// user in cache
				if (user) {
					var updatedUser = user;
					updatedUser.note = note;

					client.emit("noteUpdated", user, oldNote);

					this.users.update(user, updatedUser);
				} else {
					client.emit("warn", "note updated but user not in cache");
				}
				break;
			case _Constants.PacketType.VOICE_STATE_UPDATE:
				var user = this.users.get("id", data.user_id);
				var server = this.servers.get("id", data.guild_id);
				var connection = this.voiceConnections.get("server", server);

				if (user && server) {

					if (data.channel_id) {
						// in voice channel
						var channel = this.channels.get("id", data.channel_id);
						if (channel && channel.type === 2) {
							server.eventVoiceStateUpdate(channel, user, data);
						} else {
							client.emit("warn", "voice state channel not in cache");
						}
					} else {
						// not in voice channel
						client.emit("voiceLeave", server.eventVoiceLeave(user), user);
					}
				} else {
					client.emit("warn", "voice state update but user or server not in cache");
				}

				if (user && user.id === this.user.id) {
					// only for detecting self user movements for connections.
					var connection = this.voiceConnections.get("server", server);
					// existing connection, perhaps channel moved
					if (connection && connection.voiceChannel && connection.voiceChannel.id !== data.channel_id) {
						// moved, update info
						connection.voiceChannel = this.channels.get("id", data.channel_id);
						client.emit("voiceMoved", connection.voiceChannel); // Moved to a new channel
					}
				}

				break;
			case _Constants.PacketType.SERVER_MEMBERS_CHUNK:

				var server = this.servers.get("id", data.guild_id);

				if (server) {

					var testtime = Date.now();

					for (var _iterator10 = data.members, _isArray10 = Array.isArray(_iterator10), _i10 = 0, _iterator10 = _isArray10 ? _iterator10 : _iterator10[Symbol.iterator]();;) {
						var _ref10;

						if (_isArray10) {
							if (_i10 >= _iterator10.length) break;
							_ref10 = _iterator10[_i10++];
						} else {
							_i10 = _iterator10.next();
							if (_i10.done) break;
							_ref10 = _i10.value;
						}

						var user = _ref10;

						server.memberMap[user.user.id] = {
							roles: user.roles,
							mute: user.mute,
							selfMute: false,
							deaf: user.deaf,
							selfDeaf: false,
							joinedAt: Date.parse(user.joined_at),
							nick: user.nick || null
						};
						server.members.add(this.users.add(new _StructuresUser2["default"](user.user, client)));
					}

					if (this.forceFetchCount.hasOwnProperty(server.id)) {
						if (this.forceFetchCount[server.id] <= 1) {
							delete this.forceFetchCount[server.id];
							this.restartServerCreateTimeout();
						} else {
							this.forceFetchCount[server.id]--;
						}
					}

					client.emit("debug", Date.now() - testtime + "ms for " + data.members.length + " user chunk for server with id " + server.id);
				} else {
					client.emit("warn", "chunk update received but server not in cache");
				}

				break;
			case _Constants.PacketType.FRIEND_ADD:
				if (this.user.bot) {
					return;
				}
				if (data.type === 1) {
					// accepted/got accepted a friend request
					var inUser = this.incoming_friend_requests.get("id", data.id);
					if (inUser) {
						// client accepted another user
						this.incoming_friend_requests.remove(this.friends.add(new _StructuresUser2["default"](data.user, client)));
						return;
					}

					var outUser = this.outgoing_friend_requests.get("id", data.id);
					if (outUser) {
						// another user accepted the client
						this.outgoing_friend_requests.remove(this.friends.add(new _StructuresUser2["default"](data.user, client)));
						client.emit("friendRequestAccepted", outUser);
						return;
					}
				} else if (data.type === 2) {
					// client received block
					this.blocked_users.add(new _StructuresUser2["default"](data.user, client));
				} else if (data.type === 3) {
					// client received friend request
					client.emit("friendRequestReceived", this.incoming_friend_requests.add(new _StructuresUser2["default"](data.user, client)));
				} else if (data.type === 4) {
					// client sent friend request
					this.outgoing_friend_requests.add(new _StructuresUser2["default"](data.user, client));
				}
				break;
			case _Constants.PacketType.FRIEND_REMOVE:
				if (this.user.bot) {
					return;
				}
				var user = this.friends.get("id", data.id);
				if (user) {
					this.friends.remove(user);
					client.emit("friendRemoved", user);
					return;
				}

				user = this.blocked_users.get("id", data.id);
				if (user) {
					// they rejected friend request
					this.blocked_users.remove(user);
					return;
				}

				user = this.incoming_friend_requests.get("id", data.id);
				if (user) {
					// they rejected outgoing friend request OR client user manually deleted incoming thru web client/other clients
					var rejectedUser = this.outgoing_friend_requests.get("id", user.id);
					if (rejectedUser) {
						// other person rejected outgoing
						client.emit("friendRequestRejected", this.outgoing_friend_requests.remove(rejectedUser));
						return;
					}

					// incoming deleted manually
					this.incoming_friend_requests.remove(user);
					return;
				}

				user = this.outgoing_friend_requests.get("id", data.id);
				if (user) {
					// client cancelled incoming friend request OR client user manually deleted outgoing thru web client/other clients
					var incomingCancel = this.incoming_friend_requests.get("id", user.id);
					if (incomingCancel) {
						// client cancelled incoming
						this.incoming_friend_requests.remove(user);
						return;
					}

					// outgoing deleted manually
					this.outgoing_friend_requests.remove(user);
					return;
				}
				break;
			case _Constants.PacketType.SERVER_SYNC:
				// (??????????????????? ????????? thx Discord devs
				var guild = this.servers.get(data.id);
				data.members.forEach(function (dataUser) {
					guild.memberMap[dataUser.user.id] = {
						roles: dataUser.roles,
						mute: dataUser.mute,
						selfMute: dataUser.self_mute,
						deaf: dataUser.deaf,
						selfDeaf: dataUser.self_deaf,
						joinedAt: Date.parse(dataUser.joined_at),
						nick: dataUser.nick || null
					};
					guild.members.add(client.internal.users.add(new _StructuresUser2["default"](dataUser.user, client)));
				});
				for (var _iterator11 = data.presences, _isArray11 = Array.isArray(_iterator11), _i11 = 0, _iterator11 = _isArray11 ? _iterator11 : _iterator11[Symbol.iterator]();;) {
					var _ref11;

					if (_isArray11) {
						if (_i11 >= _iterator11.length) break;
						_ref11 = _iterator11[_i11++];
					} else {
						_i11 = _iterator11.next();
						if (_i11.done) break;
						_ref11 = _i11.value;
					}

					var presence = _ref11;

					var user = client.internal.users.get("id", presence.user.id);
					if (user) {
						user.status = presence.status;
						user.game = presence.game;
					}
				}
				if (guild.pendingVoiceStates && guild.pendingVoiceStates.length > 0) {
					for (var _iterator12 = guild.pendingVoiceStates, _isArray12 = Array.isArray(_iterator12), _i12 = 0, _iterator12 = _isArray12 ? _iterator12 : _iterator12[Symbol.iterator]();;) {
						var _ref12;

						if (_isArray12) {
							if (_i12 >= _iterator12.length) break;
							_ref12 = _iterator12[_i12++];
						} else {
							_i12 = _iterator12.next();
							if (_i12.done) break;
							_ref12 = _i12.value;
						}

						var voiceState = _ref12;

						var _user = guild.members.get("id", voiceState.user_id);
						if (_user) {
							guild.memberMap[_user.id] = guild.memberMap[_user.id] || {};
							guild.memberMap[_user.id].mute = voiceState.mute || guild.memberMap[_user.id].mute;
							guild.memberMap[_user.id].selfMute = voiceState.self_mute === undefined ? guild.memberMap[_user.id].selfMute : voiceState.self_mute;
							guild.memberMap[_user.id].deaf = voiceState.deaf || guild.memberMap[_user.id].deaf;
							guild.memberMap[_user.id].selfDeaf = voiceState.self_deaf === undefined ? guild.memberMap[_user.id].selfDeaf : voiceState.self_deaf;
							var _channel2 = guild.channels.get("id", voiceState.channel_id);
							if (_channel2) {
								guild.eventVoiceJoin(_user, _channel2);
							} else {
								guild.client.emit("warn", "channel doesn't exist even though GUILD_SYNC expects them to");
							}
						} else {
							guild.client.emit("warn", "user doesn't exist even though GUILD_SYNC expects them to");
						}
					}
				}
				guild.pendingVoiceStates = null;
				this.unsyncedGuilds--;
				this.restartServerCreateTimeout();
				break;
			default:
				client.emit("unknown", packet);
				break;
		}
	};

	InternalClient.prototype.resume = function resume() {
		var data = {
			op: 6,
			d: {
				token: this.token,
				session_id: this.sessionID,
				seq: this.sequence
			}
		};

		this.sendWS(data);
	};

	InternalClient.prototype.identify = function identify() {
		var data = {
			op: 2,
			d: {
				token: this.token,
				v: GATEWAY_VERSION,
				compress: this.client.options.compress,
				large_threshold: this.client.options.largeThreshold,
				properties: {
					"$os": process.platform,
					"$browser": "discord.js",
					"$device": "discord.js",
					"$referrer": "",
					"$referring_domain": ""
				}
			}
		};

		if (this.client.options.shard) {
			data.d.shard = this.client.options.shard;
		}

		this.sendWS(data);
	};

	InternalClient.prototype.heartbeat = function heartbeat() {
		this.sendWS({ op: 1, d: Date.now() });
	};

	_createClass(InternalClient, [{
		key: "uptime",
		get: function get() {
			return this.readyTime ? Date.now() - this.readyTime : null;
		}
	}, {
		key: "userAgent",
		set: function set(info) {
			info.full = "DiscordBot (" + info.url + ", " + info.version + ")";
			this.userAgentInfo = info;
		},
		get: function get() {
			return this.userAgentInfo;
		}
	}, {
		key: "voiceConnection",
		get: function get() {
			return this.voiceConnections[0];
		}
	}]);

	return InternalClient;
})();

exports["default"] = InternalClient;
module.exports = exports["default"];
