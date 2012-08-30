(function() {
	var B;
	B = function(b, context) {
		var mycontext = context || {};
		var inst = new b.kind(mycontext);
		inst._id = b.id || inst._id;
		if (inst._id) {
			mycontext[inst._id] = inst;
		}
		var i, j, max, child;
		if (b.attr && inst.attr) {
			inst.attr(b.attr);
		}
		if (b.content) {
			for (i = 0, max = b.content.length; i < max; i++) {
				child = b.content[i];
				if (typeof (child) === 'string') {
					if (child.indexOf('\n') !== -1) {
						child = child.split('\n');
						for (j = 0; j < child.length; j++) {
							inst.append(B({
								kind : B.KindText(child[j])
							}, mycontext));
							if (j < child.length - 1) {
								inst.append(B({
									kind : B.KindHTML('<br />')
								}, mycontext));
							}
						}
					} else {
						inst.append(B({
							kind : B.KindText(child)
						}, mycontext));
					}
				} else if (child.kind) {
					inst.append(B(child, mycontext));
				} else if (b) {
					inst.append(child);
				} else {
					throw "Content does not exist";
				}
			}
		}
		if (inst.render) {
			inst.render();
		}
		if (inst.inithandler) {
			inst.inithandler(b.init);
		}
		return inst;
	};
	B.Kind = {
		inithandler : function(init) {
			if (init) {
				init.call(this);
			}
		}
	};
	B.KindText = function(text) {
		var F = function(context) {
			this.$el = $(document.createTextNode(text));
		};
		_.extend(F.prototype, B.Kind);
		return F;
	};
	B.KindHTML = function(html) {
		var F = function(context) {
			this.$el = $(html);
			this.context = context;
		};
		_.extend(F.prototype, B.Kind);
		return F;
	};
	B.KindJQuery = function(tag) {
		var F = function(context) {
			this.$el = $("<" + tag + "/>");
			this.context = context;
		};
		F.prototype.attr = function(attrs) {
			var attr;
			for (attr in attrs) {
				if (attrs.hasOwnProperty(attr)) {
					this.$el.attr(attr, attrs[attr]);
				}
			}
		};
		F.prototype.append = function(child) {
			if (child.$el) {
				this.$el.append(child.$el);
			}
		};
		_.extend(F.prototype, B.Kind);
		return F;
	};
	window.B = B;
}());
(function() {
	OB = window.OB || {};
	OB.DS = window.OB.DS || {};
	OB.DS.MAXSIZE = 100;
	function serviceSuccess(data, textStatus, jqXHR, callback) {
		if (data._entityname) {
			callback([ data ]);
		} else {
			var response = data.response;
			var status = response.status;
			if (status === 0) {
				callback(response.data, response.message);
			} else if (response.errors) {
				callback({
					exception : {
						message : response.errors.id
					}
				});
			} else {
				callback({
					exception : {
						message : response.error.message
					}
				});
			}
		}
	}
	function serviceError(jqXHR, textStatus, errorThrown, callback) {
		callback({
			exception : {
				message : (errorThrown ? errorThrown : OB.I18N
						.getLabel('OBPOS_MsgApplicationServerNotAvailable')),
				status : jqXHR.status
			}
		});
	}
	function servicePOST(source, dataparams, callback) {
		$.ajax({
			url : '../../org.openbravo.retail.posterminal.service.jsonrest/'
					+ source,
			contentType : 'application/json;charset=utf-8',
			dataType : 'json',
			type : 'POST',
			data : JSON.stringify(dataparams),
			success : function(data, textStatus, jqXHR) {
				serviceSuccess(data, textStatus, jqXHR, callback);
			},
			error : function(jqXHR, textStatus, errorThrown) {
				serviceError(jqXHR, textStatus, errorThrown, callback);
			}
		});
	}
	function serviceGET(source, dataparams, callback) {
		$.ajax({
			url : '../../org.openbravo.retail.posterminal.service.jsonrest/'
					+ source + '/' + encodeURI(JSON.stringify(dataparams)),
			contentType : 'application/json;charset=utf-8',
			dataType : 'json',
			type : 'GET',
			success : function(data, textStatus, jqXHR) {
				serviceSuccess(data, textStatus, jqXHR, callback);
			},
			error : function(jqXHR, textStatus, errorThrown) {
				serviceError(jqXHR, textStatus, errorThrown, callback);
			}
		});
	}
	OB.DS.Process = function(source) {
		this.source = source;
	};
	OB.DS.Process.prototype.exec = function(params, callback) {
		var attr;
		var data = {};
		for (attr in params) {
			if (params.hasOwnProperty(attr)) {
				data[attr] = params[attr];
			}
		}
		servicePOST(this.source, data, callback);
	};
	OB.DS.Request = function(source, client, org, pos) {
		this.model = source && source.prototype && source.prototype.modelName
				&& source;
		this.source = (this.model && this.model.prototype.source) || source;
		if (!this.source) {
			throw 'A Request must have a source';
		}
		this.client = client;
		this.org = org;
		this.pos = pos;
	};
	OB.DS.Request.prototype.exec = function(params, callback) {
		var p, i;
		var data = {};
		if (params) {
			p = {};
			for (i in params) {
				if (params.hasOwnProperty(i)) {
					if (typeof params[i] === 'string') {
						p[i] = {
							value : params[i],
							type : 'string'
						};
					} else if (typeof params[i] === 'number') {
						if (params[i] === Math.round(params[i])) {
							p[i] = {
								value : params[i],
								type : 'long'
							};
						} else {
							p[i] = {
								value : params[i],
								type : 'bigdecimal'
							};
						}
					} else if (typeof params[i] === 'boolean') {
						p[i] = {
							value : params[i],
							type : 'boolean'
						};
					} else {
						p[i] = params[i];
					}
				}
			}
			data.parameters = p;
		}
		if (this.client) {
			data.client = this.client;
		}
		if (this.org) {
			data.organization = this.org;
		}
		if (this.pos) {
			data.pos = this.pos;
		}
		serviceGET(this.source, data, callback);
	};
	function check(elem, filter) {
		var p;
		for (p in filter) {
			if (filter.hasOwnProperty(p)) {
				if (typeof (filter[p]) === 'object') {
					return check(elem[p], filter[p]);
				} else {
					if (filter[p].substring(0, 2) === '%i') {
						if (!new RegExp(filter[p].substring(2), 'i')
								.test(elem[p])) {
							return false;
						}
					} else if (filter[p].substring(0, 2) === '%%') {
						if (!new RegExp(filter[p].substring(2)).test(elem[p])) {
							return false;
						}
					} else if (filter[p] !== elem[p]) {
						return false;
					}
				}
			}
		}
		return true;
	}
	function findInData(data, filter) {
		var i, max;
		if ($.isEmptyObject(filter)) {
			return {
				exception : 'filter not defined'
			};
		} else {
			for (i = 0, max = data.length; i < max; i++) {
				if (check(data[i], filter)) {
					return data[i];
				}
			}
			return null;
		}
	}
	function execInData(data, filter, filterfunction) {
		var newdata, info, i, max, f, item;
		if ($.isEmptyObject(filter) && !filterfunction) {
			return {
				data : data.slice(0, OB.DS.MAXSIZE),
				info : (data.length > OB.DS.MAXSIZE ? 'OBPOS_DataMaxReached'
						: null)
			};
		} else {
			f = filterfunction || function(item) {
				return item;
			};
			newdata = [];
			info = null;
			for (i = 0, max = data.length; i < max; i++) {
				if (check(data[i], filter)) {
					item = f(data[i]);
					if (item) {
						if (newdata.length >= OB.DS.MAXSIZE) {
							info = 'OBPOS_DataMaxReached';
							break;
						}
						newdata.push(data[i]);
					}
				}
			}
			return {
				data : newdata,
				info : info
			};
		}
	}
	OB.DS.DataSource = function(request) {
		this.request = request;
		this.cache = null;
	};
	_.extend(OB.DS.DataSource.prototype, Backbone.Events);
	OB.DS.DataSource.prototype.load = function(params) {
		var me = this;
		this.cache = null;
		this.request.exec(params, function(data) {
			if (data.exception) {
				throw data.exception;
			}
			me.cache = data;
			if (me.request.model) {
				OB.Dal.initCache(me.request.model, data, function() {
					me.trigger('ready');
				}, function() {
					window.console.error(arguments);
				});
			} else {
				me.trigger('ready');
			}
		});
	};
	OB.DS.DataSource.prototype.find = function(filter, callback) {
		if (this.cache) {
			callback(findInData(this.cache, filter));
		} else {
			this.on('ready', function() {
				callback(findInData(this.cache, filter));
			}, this);
		}
	};
	OB.DS.DataSource.prototype.exec = function(filter, callback) {
		if (this.cache) {
			var result1 = execInData(this.cache, filter);
			callback(result1.data, result1.info);
		} else {
			this.on('ready', function() {
				var result2 = execInData(this.cache, filter);
				callback(result2.data, result2.info);
			}, this);
		}
	};
	OB.DS.HWServer = function(url, scaleurl) {
		this.url = url;
		this.scaleurl = scaleurl;
	};
	OB.DS.HWServer.prototype.getWeight = function(callback) {
		if (this.scaleurl) {
			var me = this;
			$
					.ajax({
						url : me.scaleurl,
						dataType : 'json',
						type : 'GET',
						success : function(data, textStatus, jqXHR) {
							callback(data);
						},
						error : function(jqXHR, textStatus, errorThrown) {
							if (callback) {
								callback({
									exception : {
										message : (OB.I18N
												.getLabel('OBPOS_MsgScaleServerNotAvailable'))
									},
									result : 1
								});
							}
						}
					});
		} else {
			callback({
				result : 1
			});
		}
	};
	OB.DS.HWServer.prototype.print = function(templatedata, params, callback) {
		if (this.url) {
			var me = this;
			$
					.ajax({
						url : me.url,
						contentType : 'application/xml;charset=utf-8',
						dataType : 'json',
						type : 'POST',
						data : params ? _.template(templatedata, params)
								: templatedata,
						success : function(data, textStatus, jqXHR) {
							if (callback) {
								callback(data);
							}
						},
						error : function(jqXHR, textStatus, errorThrown) {
							if (callback) {
								callback({
									exception : {
										message : (OB.I18N
												.getLabel('OBPOS_MsgHardwareServerNotAvailable'))
									}
								});
							}
						}
					});
		} else {
			if (callback) {
				callback({
					exception : {
						message : (OB.I18N
								.getLabel('OBPOS_MsgHardwareServerNotAvailable'))
					}
				});
			}
		}
	};
}());
(function(d) {
	var dbSize = 50 * 1024 * 1024, undef, wsql = window.openDatabase !== undef, db = d
			|| (wsql && window.openDatabase('WEBPOS', '0.1',
					'Openbravo Web POS', dbSize)), OP;
	OP = {
		EQ : '=',
		CONTAINS : 'contains',
		STARTSWITH : 'startsWith',
		ENDSWITH : 'endsWith'
	};
	function S4() {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
				.toUpperCase();
	}
	function get_uuid() {
		return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
	}
	function transform(model, obj) {
		var tmp = {}, modelProto = model.prototype, val;
		_.each(modelProto.properties, function(prop) {
			val = obj[modelProto.propertyMap[prop]];
			if (val === 'false') {
				tmp[prop] = false;
			} else if (val === 'true') {
				tmp[prop] = true;
			} else {
				tmp[prop] = val;
			}
		});
		return new model(tmp);
	}
	function dbSuccess() {
	}
	function dbError() {
		if (window.console) {
			window.console.error(arguments);
		}
	}
	function getWhereClause(criteria, propertyMap) {
		var appendWhere = true, firstParam = true, sql = '', params = [], res = {};
		if (criteria && !_.isEmpty(criteria)) {
			_
					.each(
							_.keys(criteria),
							function(k) {
								var undef, val = criteria[k], operator = (val !== null && val.operator !== undef) ? val.operator
										: '=', value = (val !== null && val.value !== undef) ? val.value
										: val;
								if (appendWhere) {
									sql = sql + ' WHERE ';
									params = [];
									appendWhere = false;
								}
								sql = sql + (firstParam ? '' : ' AND ') + ' '
										+ propertyMap[k] + ' ';
								if (value === null) {
									sql = sql + ' IS null ';
								} else {
									if (operator === OP.EQ) {
										sql = sql + ' = ? ';
									} else {
										sql = sql + ' like ? ';
									}
									if (operator === OP.CONTAINS) {
										value = '%' + value + '%';
									} else if (operator === OP.STARTSWITH) {
										value = '%' + value;
									} else if (operator === OP.ENDSWITH) {
										value = value + '%';
									}
									params.push(value);
								}
								if (firstParam) {
									firstParam = false;
								}
							});
		}
		res.sql = sql;
		res.params = params;
		return res;
	}
	function find(model, whereClause, success, error, args) {
		var tableName = model.prototype.tableName, propertyMap = model.prototype.propertyMap, sql = 'SELECT * FROM '
				+ tableName, params = null, appendWhere = true, firstParam = true, k, v;
		if (db) {
			whereClause = getWhereClause(whereClause, propertyMap);
			sql = sql + whereClause.sql;
			params = whereClause.params;
			if (model.prototype.propertyMap._idx) {
				sql = sql + ' ORDER BY _idx ';
			}
			db
					.readTransaction(function(tx) {
						tx
								.executeSql(
										sql,
										params,
										function(tr, result) {
											var i, collectionType = OB.Collection[model.prototype.modelName
													+ 'List']
													|| Backbone.Collection, collection = new collectionType(), len = result.rows.length;
											if (len === 0) {
												success(null, args);
											} else {
												for (i = 0; i < len; i++) {
													collection.add(transform(
															model, result.rows
																	.item(i)));
												}
												success(collection, args);
											}
										}, error);
					});
		} else {
			throw 'Not implemented';
		}
	}
	function save(model, success, error) {
		var modelProto = model.constructor.prototype, tableName = modelProto.tableName, sql = '', params = null, firstParam = true, uuid, propertyName;
		if (db) {
			if (!tableName) {
				throw 'Missing table name in model';
			}
			if (model.get('id')) {
				sql = 'UPDATE ' + tableName + ' SET ';
				_.each(_.keys(modelProto.properties), function(attr) {
					propertyName = modelProto.properties[attr];
					if (attr === 'id') {
						return;
					}
					if (firstParam) {
						firstParam = false;
						params = [];
					} else {
						sql = sql + ', ';
					}
					sql = sql + modelProto.propertyMap[propertyName] + ' = ? ';
					params.push(model.get(propertyName));
				});
				sql = sql + ' WHERE ' + tableName + '_id = ?';
				params.push(model.get('id'));
			} else {
				params = [];
				sql = modelProto.insertStatement;
				uuid = get_uuid();
				params.push(uuid);
				model.set('id', uuid);
				_.each(modelProto.properties, function(property) {
					if ('id' === property) {
						return;
					}
					params.push(model.get(property) === undefined ? null
							: model.get(property));
				});
			}
			db.transaction(function(tx) {
				tx.executeSql(sql, params, success, error);
			});
		} else {
			throw 'Not implemented';
		}
	}
	function remove(model, success, error) {
		var modelProto = model.constructor.prototype, tableName = modelProto.tableName, sql = '', params = [];
		if (db) {
			if (!tableName) {
				throw 'Missing table name in model';
			}
			if (model.get('id')) {
				sql = 'DELETE FROM ' + tableName + ' WHERE '
						+ modelProto.propertyMap.id + ' = ? ';
				params.push(model.get('id'));
			} else {
				throw 'An object without id cannot be deleted';
			}
			db.transaction(function(tx) {
				tx.executeSql(sql, params, success, error);
			});
		} else {
			throw 'Not implemented';
		}
	}
	function removeAll(model, criteria, success, error) {
		var tableName = model.prototype.tableName, propertyMap = model.prototype.propertyMap, sql, params, whereClause;
		if (db) {
			if (!tableName) {
				throw 'Missing table name in model';
			}
			sql = 'DELETE FROM ' + tableName;
			whereClause = getWhereClause(criteria, propertyMap);
			sql = sql + whereClause.sql;
			params = whereClause.params;
			db.transaction(function(tx) {
				tx.executeSql(sql, params, success, error);
			});
		} else {
			throw 'Not implemented';
		}
	}
	function get(model, id, success, error) {
		var tableName = model.prototype.tableName, sql = 'SELECT * FROM '
				+ tableName + ' WHERE ' + tableName + '_id = ?';
		if (db) {
			db.readTransaction(function(tx) {
				tx.executeSql(sql, [ id ], function(tr, result) {
					if (result.rows.length === 0) {
						return null;
					} else {
						success(transform(model, result.rows.item(0)));
					}
				}, error);
			});
		} else {
			throw 'Not implemented';
		}
	}
	function initCache(model, initialData, success, error) {
		if (db) {
			if (!model.prototype.createStatement
					|| !model.prototype.dropStatement) {
				throw 'Model requires a create and drop statement';
			}
			if (!initialData) {
				throw 'initialData must be passed as parameter';
			}
			if (!model.prototype.local) {
				db.transaction(function(tx) {
					tx.executeSql(model.prototype.dropStatement);
				}, error);
			}
			db.transaction(function(tx) {
				tx.executeSql(model.prototype.createStatement);
			}, error);
			if (_.isArray(initialData)) {
				db
						.transaction(
								function(tx) {
									var props = model.prototype.properties, propMap = model.prototype.propertyMap, values, _idx = 0;
									_
											.each(
													initialData,
													function(item) {
														values = [];
														_
																.each(
																		props,
																		function(
																				propName) {
																			if ('_idx' === propName) {
																				return;
																			}
																			values
																					.push(item[propName]);
																		});
														values.push(_idx);
														tx
																.executeSql(
																		model.prototype.insertStatement,
																		values,
																		null,
																		error);
														_idx++;
													});
								}, error, function() {
									if (_.isFunction(success)) {
										success();
									}
								});
			} else {
				throw 'initialData must be an Array';
			}
		} else {
			throw 'Not implemented';
		}
	}
	window.OB = window.OB || {};
	window.OB.Dal = {
		EQ : OP.EQ,
		CONTAINS : OP.CONTAINS,
		STARTSWITH : OP.STARTSWITH,
		ENDSWITH : OP.ENDSWITH,
		save : save,
		find : find,
		get : get,
		remove : remove,
		removeAll : removeAll,
		initCache : initCache
	};
}(OB && OB.DATA && OB.DATA.OfflineDB));
(function() {
	OB = window.OB || {};
	OB.UTIL = window.OB.UTIL || {};
	OB.UTIL.getParameterByName = function(name) {
		var n = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
		var regexS = '[\\?&]' + n + '=([^&#]*)';
		var regex = new RegExp(regexS);
		var results = regex.exec(window.location.search);
		return (results) ? decodeURIComponent(results[1].replace(/\+/g, ' '))
				: '';
	};
	OB.UTIL.escapeRegExp = function(text) {
		return text.replace(/[\-\[\]{}()+?.,\\\^$|#\s]/g, '\\$&');
	};
	OB.UTIL.padNumber = function(n, p) {
		var s = n.toString();
		while (s.length < p) {
			s = '0' + s;
		}
		return s;
	};
	OB.UTIL.encodeXMLComponent = function(s, title, type) {
		return s.replace('&', '&amp;').replace('<', '&lt;')
				.replace('>', '&gt;').replace('\'', '&apos;').replace('\"',
						'&quot;');
	};
	OB.UTIL.loadResource = function(res, callback, context) {
		$.ajax({
			url : res,
			dataType : 'text',
			type : 'GET',
			success : function(data, textStatus, jqXHR) {
				callback.call(context || this, data);
			},
			error : function(jqXHR, textStatus, errorThrown) {
				callback.call(context || this);
			}
		});
	};
	OB.UTIL.queueStatus = function(queue) {
		if (!_.isObject(queue)) {
			throw 'Object expected';
		}
		return _.reduce(queue, function(memo, val) {
			return memo && val;
		}, true);
	};
	function _initContentView(view, child) {
		var obj, inst, i, max;
		if (typeof (child) === 'string') {
			inst = $(document.createTextNode(child));
		} else if (child.tag) {
			inst = $('<' + child.tag + '/>');
			if (child.attributes) {
				inst.attr(child.attributes);
			}
			if (child.content) {
				if (typeof (child.content) === 'string') {
					inst.html(child.content);
				} else {
					for (i = 0, max = child.content.length; i < max; i++) {
						inst.append(_initContentView(view, child.content[i]));
					}
				}
			}
			if (child.id) {
				view[child.id] = inst;
			}
		} else if (child.view) {
			obj = new child.view({
				parent : view
			});
			inst = obj.render().$el;
			if (child.id) {
				view[child.id] = obj;
			}
		} else if (child.$el) {
			inst = child.$el;
		}
		return inst;
	}
	OB.UTIL.initContentView = function(view) {
		var i, max;
		if (view.contentView) {
			for (i = 0, max = view.contentView.length; i < max; i++) {
				view.$el.append(_initContentView(view, view.contentView[i]));
			}
		}
	};
	OB.UTIL.processOrders = function(context, orders, successCallback,
			errorCallback) {
		var ordersToJson = [];
		orders.each(function(order) {
			ordersToJson.push(order.serializeToJSON());
		});
		this.proc = new OB.DS.Process(
				'org.openbravo.retail.posterminal.ProcessOrder');
		if (OB.POS.modelterminal.get('connectedToERP')) {
			this.proc.exec({
				order : ordersToJson
			}, function(data, message) {
				if (data && data.exception) {
					orders.each(function(order) {
						order.set('isbeingprocessed', 'N');
						OB.Dal.save(order, null, function(tx, err) {
							OB.UTIL.showError(err);
						});
					});
					if (errorCallback) {
						errorCallback();
					}
				} else {
					orders.each(function(order) {
						context.modelorderlist.remove(order);
						OB.Dal.remove(order, null, function(tx, err) {
							OB.UTIL.showError(err);
						});
					});
					if (successCallback) {
						successCallback();
					}
				}
			});
		}
	};
	OB.UTIL.checkConnectivityStatus = function() {
		var ajaxParams, currentlyConnected = OB.POS.modelterminal
				.get('connectedToERP');
		if (navigator.onLine) {
			ajaxParams = {
				async : true,
				cache : false,
				context : $("#status"),
				dataType : "json",
				error : function(req, status, ex) {
					if (currentlyConnected !== false) {
						if (OB.POS.modelterminal) {
							OB.POS.modelterminal.triggerOffLine();
						}
					}
				},
				success : function(data, status, req) {
					if (currentlyConnected !== true) {
						if (OB.POS.modelterminal) {
							OB.POS.modelterminal.triggerOnLine();
						}
					}
				},
				timeout : 5000,
				type : "GET",
				url : "../../security/SessionActive?id=0"
			};
			$.ajax(ajaxParams);
		} else {
			if (currentlyConnected) {
				if (OB.POS.modelterminal) {
					OB.POS.modelterminal.triggerOffLine();
				}
			}
		}
	};
	OB.UTIL.setConnectivityLabel = function(status) {
		var label = OB.I18N.getLabel('OBPOS_' + status);
		if (label.indexOf('OBPOS_' + status) === -1) {
			$($('#online > span')[0]).css('background-image',
					'url("./img/icon' + status + '.png")');
			$($('#online > span')[1]).text(label);
			$($('#online')[0]).css('visibility', 'visible');
		} else {
			setTimeout(function() {
				OB.UTIL.setConnectivityLabel(status);
			}, 300);
		}
	};
	OB.UTIL.updateDocumentSequenceInDB = function(documentNo) {
		var docSeqModel, criteria = {
			'posSearchKey' : OB.POS.modelterminal.get('terminal').searchKey
		};
		OB.Dal
				.find(
						OB.Model.DocumentSequence,
						criteria,
						function(documentSequenceList) {
							var posDocumentNoPrefix = OB.POS.modelterminal
									.get('terminal').docNoPrefix, orderDocumentSequence = parseInt(
									documentNo
											.substr(posDocumentNoPrefix.length + 1),
									10), docSeqModel;
							if (documentSequenceList) {
								docSeqModel = documentSequenceList.at(0);
								if (orderDocumentSequence > docSeqModel
										.get('documentSequence')) {
									docSeqModel.set('documentSequence',
											orderDocumentSequence);
								}
							} else {
								docSeqModel = new OB.Model.DocumentSequence();
								docSeqModel
										.set(
												'posSearchKey',
												OB.POS.modelterminal
														.get('terminal').searchKey);
								docSeqModel.set('documentSequence',
										orderDocumentSequence);
							}
							OB.Dal.save(docSeqModel, null, null);
						});
	};
}());
(function() {
	OB = window.OB || {};
	OB.UTIL = window.OB.UTIL || {};
	function isScrolledIntoView(container, elem) {
		var docViewTop = container.scrollTop();
		var docViewBottom = docViewTop + container.height();
		var elemTop = elem.offset().top;
		var elemBottom = elemTop + elem.height();
		return ((elemBottom >= docViewTop) && (elemTop <= docViewBottom)
				&& (elemBottom <= docViewBottom) && (elemTop >= docViewTop));
	}
	OB.UTIL.makeElemVisible = function(container, elem) {
		var docViewTop = container.offset().top;
		var docViewBottom = docViewTop + container.height();
		var elemTop = elem.offset().top;
		var elemBottom = elemTop + elem.height();
		var currentScroll = container.scrollTop();
		if (elemTop < docViewTop) {
			container.scrollTop(currentScroll - docViewTop + elemTop);
		} else if (elemBottom > docViewBottom) {
			container.scrollTop(currentScroll + elemBottom - docViewBottom);
		}
	};
	OB.UTIL.Thumbnail = Backbone.View.extend({
		tagName : 'div',
		className : 'image-wrap',
		img : null,
		contentType : 'img/png',
		width : 49,
		height : 49,
		'default' : 'img/box.png',
		initialize : function() {
			this.$image = $('<div/>').css('margin', 'auto').css('height',
					'100%').css('width', '100%').css('background-size',
					'contain');
			this.$el.append(this.$image);
		},
		attr : function(attr) {
			this.img = attr.img || this.img;
			this.contentType = attr.contentType || this.contentType;
			this.width = attr.width || this.width;
			this.height = attr.height || this.height;
			this['default'] = attr['default'] || this['default'];
		},
		render : function() {
			var url = (this.img) ? 'data:' + this.contentType + ';base64,'
					+ this.img : this['default'];
			this.$el.css('height', this.height);
			this.$el.css('width', this.width);
			this.$image.css('background', '#ffffff url(' + url
					+ ') center center no-repeat');
			return this;
		}
	});
	OB.UTIL.setOrderLineInEditMode = function(value) {
		if (value) {
			$('li.selected button.btnselect-orderline').addClass(
					'btnselect-orderline-edit');
		} else {
			$('li.selected button.btnselect-orderline').removeClass(
					'btnselect-orderline-edit');
		}
	};
	OB.UTIL.showAlert = function(s, title, type) {
		var c = B({
			kind : B.KindJQuery('div'),
			attr : {
				'class' : 'alert fade in ' + type,
				style : 'position:absolute; right:35px; top: 5px'
			},
			content : [ {
				kind : B.KindJQuery('button'),
				attr : {
					'class' : 'close',
					'data-dismiss' : 'alert'
				},
				content : [ {
					kind : B.KindHTML('<span>&times;</span>')
				} ]
			}, {
				kind : B.KindJQuery('strong'),
				content : [ title ]
			}, ' ', {
				kind : B.KindJQuery('span'),
				content : [ s ]
			} ]
		});
		$("#container").append(c.$el);
		setTimeout(function() {
			$('.alert').alert('close');
		}, 5000);
	};
	OB.UTIL.showLoading = function(value) {
		if (value) {
			$('#containerLoading').css('display', '');
			$('#containerWindow').css('display', 'none');
		} else {
			$('#containerLoading').css('display', 'none');
			$('#containerWindow').css('display', '');
		}
	};
	OB.UTIL.showSuccess = function(s) {
		OB.UTIL.showAlert(s, OB.I18N.getLabel('OBPOS_LblSuccess'),
				'alert-success');
	};
	OB.UTIL.showWarning = function(s) {
		OB.UTIL.showAlert(s, OB.I18N.getLabel('OBPOS_LblWarning'), '');
	};
	OB.UTIL.showError = function(s) {
		OB.UTIL.showLoading(false);
		OB.UTIL.showAlert(s, OB.I18N.getLabel('OBPOS_LblError'), 'alert-error');
	};
	OB.UTIL.focusInModal = function(modalObj) {
		modalObj.on('shown', function(e) {
			var firstFocusableItem = $(this).find('input,select,button')
					.filter(':visible:enabled:first');
			if (firstFocusableItem) {
				firstFocusableItem.focus();
			}
			return true;
		});
	};
	OB.UTIL.adjustModalPosition = function(modalObj) {
		modalObj
				.on(
						'shown',
						function(e) {
							function getCSSPosition(element, type) {
								var position = element.css(type);
								if (position && position.indexOf('%') !== -1) {
									position = position.replace('%', '');
									position = parseInt(position, 10);
									position = position / 100;
								} else {
									position = 0.5;
								}
								return position;
							}
							var modal = $(this), leftPosition = getCSSPosition(
									modal, 'left'), topPosition = getCSSPosition(
									modal, 'top');
							modal.css('margin-top',
									(modal.outerHeight() * topPosition) * -1)
									.css(
											'margin-left',
											(modal.outerWidth() * leftPosition)
													* -1);
							return true;
						});
	};
}());
(function() {
	OB = window.OB || {};
	OB.DEC = window.OB.DEC || {};
	var scale = 2;
	var roundingmode = BigDecimal.prototype.ROUND_HALF_EVEN;
	var toBigDecimal = function(a) {
		return new BigDecimal(a.toString());
	};
	var toNumber = function(big) {
		return parseFloat(big.setScale(scale, roundingmode).toString(), 10);
	};
	OB.DEC.Zero = toNumber(BigDecimal.prototype.ZERO);
	OB.DEC.One = toNumber(BigDecimal.prototype.ONE);
	OB.DEC.scale = scale;
	OB.DEC.isNumber = function(a) {
		return typeof (a) === 'number' && !isNaN(a);
	};
	OB.DEC.add = function(a, b) {
		return toNumber(toBigDecimal(a).add(toBigDecimal(b)));
	};
	OB.DEC.sub = function(a, b) {
		return toNumber(toBigDecimal(a).subtract(toBigDecimal(b)));
	};
	OB.DEC.mul = function(a, b) {
		return toNumber(toBigDecimal(a).multiply(toBigDecimal(b)));
	};
	OB.DEC.div = function(a, b) {
		return toNumber(toBigDecimal(a).divide(toBigDecimal(b), scale,
				roundingmode));
	};
	OB.DEC.compare = function(a) {
		return toBigDecimal(a).compareTo(BigDecimal.prototype.ZERO);
	};
	OB.DEC.number = function(jsnumber) {
		return jsnumber;
	};
	OB.DEC.setContext = function(s, r) {
		scale = s;
		roundingmode = r;
	};
}());
(function() {
	OB = window.OB || {};
	OB.I18N = window.OB.I18N || {};
	OB.I18N.formatCurrency = function(number) {
		var maskNumeric = OB.Format.formats.priceRelation, decSeparator = OB.Format.defaultDecimalSymbol, groupSeparator = OB.Format.defaultGroupingSymbol, groupInterval = OB.Format.defaultGroupingSize;
		maskNumeric = maskNumeric.replace(',', 'dummy').replace('.',
				decSeparator).replace('dummy', groupSeparator);
		return OB.Utilities.Number.JSToOBMasked(number, maskNumeric,
				decSeparator, groupSeparator, groupInterval);
	};
	OB.I18N.formatCoins = function(number) {
		var val = OB.I18N.formatCurrency(number);
		var decSeparator = OB.Format.defaultDecimalSymbol;
		return val.replace(new RegExp('[' + decSeparator + '][0]+$'), '');
	};
	OB.I18N.formatRate = function(number) {
		var symbol = '%', maskNumeric = OB.Format.formats.euroEdition, decSeparator = OB.Format.defaultDecimalSymbol, groupSeparator = OB.Format.defaultGroupingSymbol, groupInterval = OB.Format.defaultGroupingSize;
		maskNumeric = maskNumeric.replace(',', 'dummy').replace('.',
				decSeparator).replace('dummy', groupSeparator);
		var formattedNumber = OB.Utilities.Number.JSToOBMasked(number,
				maskNumeric, decSeparator, groupSeparator, groupInterval);
		formattedNumber = formattedNumber + symbol;
		return formattedNumber;
	};
	OB.I18N.formatDate = function(JSDate) {
		var dateFormat = OB.Format.date;
		return OB.Utilities.Date.JSToOB(JSDate, dateFormat);
	};
	OB.I18N.formatHour = function(d) {
		var curr_date = d.getDate();
		var curr_month = d.getMonth();
		var curr_year = d.getFullYear();
		var curr_hour = d.getHours();
		var curr_min = d.getMinutes();
		var curr_sec = d.getSeconds();
		return OB.UTIL.padNumber(curr_hour, 2) + ':'
				+ OB.UTIL.padNumber(curr_min, 2);
	};
	OB.I18N.parseNumber = function(s) {
		if (OB.Format.defaultDecimalSymbol !== '.') {
			s = s.toString();
			while (s.indexOf(OB.Format.defaultDecimalSymbol) !== -1) {
				s = s.replace(OB.Format.defaultDecimalSymbol, '.');
			}
		}
		return parseFloat(s, 10);
	};
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.Clock = Backbone.View.extend({
		tagName : 'div',
		contentView : [ {
			id : 'divclock',
			tag : 'div',
			attributes : {
				'class' : 'clock-time'
			}
		}, {
			id : 'divdate',
			tag : 'div',
			attributes : {
				'class' : 'clock-date'
			}
		} ],
		initialize : function() {
			OB.UTIL.initContentView(this);
			var me = this;
			var updateclock = function() {
				var d = new Date();
				me.divclock.text(OB.I18N.formatHour(d));
				me.divdate.text(OB.I18N.formatDate(d));
			};
			updateclock();
			setInterval(updateclock, 1000);
		},
		attr : function(attributes) {
			if (attributes.className) {
				this.$el.attr('class', attributes.className);
			}
		}
	});
}());
(function() {
	var OrderLine = Backbone.Model.extend({
		defaults : {
			product : null,
			productidentifier : null,
			uOM : null,
			qty : OB.DEC.Zero,
			price : OB.DEC.Zero,
			priceList : OB.DEC.Zero,
			gross : OB.DEC.Zero
		},
		initialize : function(attributes) {
			if (attributes && attributes.product) {
				this.set('product', new OB.Model.Product(attributes.product));
				this.set('productidentifier', attributes.productidentifier);
				this.set('uOM', attributes.uOM);
				this.set('qty', attributes.qty);
				this.set('price', attributes.price);
				this.set('priceList', attributes.priceList);
				this.set('gross', attributes.gross);
				if (attributes.product && attributes.product.price) {
					this.set('grossListPrice',
							attributes.product.price.listPrice);
				}
			}
		},
		printQty : function() {
			return this.get('qty').toString();
		},
		printPrice : function() {
			return OB.I18N.formatCurrency(this.get('price'));
		},
		printDiscount : function() {
			var d = OB.DEC.sub(this.get('priceList'), this.get('price'));
			if (OB.DEC.compare(d) === 0) {
				return '';
			} else {
				return OB.I18N.formatCurrency(d);
			}
		},
		calculateGross : function() {
			this.set('gross', OB.DEC.mul(this.get('qty'), this.get('price')));
		},
		getGross : function() {
			return this.get('gross');
		},
		printGross : function() {
			return OB.I18N.formatCurrency(this.getGross());
		}
	});
	var OrderLineList = Backbone.Collection.extend({
		model : OrderLine
	});
	var PaymentLine = Backbone.Model.extend({
		defaults : {
			'amount' : OB.DEC.Zero,
			'paid' : OB.DEC.Zero
		},
		printAmount : function() {
			return OB.I18N.formatCurrency(this.get('amount'));
		}
	});
	var PaymentLineList = Backbone.Collection.extend({
		model : PaymentLine
	});
	var Order = Backbone.Model
			.extend({
				modelName : 'Order',
				tableName : 'c_order',
				entityName : 'Order',
				source : '',
				properties : [ 'id', 'json', 'hasbeenpaid', 'isbeingprocessed' ],
				propertyMap : {
					'id' : 'c_order_id',
					'json' : 'json',
					'hasbeenpaid' : 'hasbeenpaid',
					'isbeingprocessed' : 'isbeingprocessed'
				},
				defaults : {
					hasbeenpaid : 'N',
					isbeingprocessed : 'N'
				},
				createStatement : 'CREATE TABLE IF NOT EXISTS c_order (c_order_id TEXT PRIMARY KEY, json CLOB, hasbeenpaid TEXT, isbeingprocessed TEXT)',
				dropStatement : 'DROP TABLE IF EXISTS c_order',
				insertStatement : 'INSERT INTO c_order(c_order_id, json, hasbeenpaid, isbeingprocessed) VALUES (?,?,?,?)',
				local : true,
				_id : 'modelorder',
				initialize : function(attributes) {
					var orderId;
					if (attributes && attributes.id && attributes.json) {
						orderId = attributes.id;
						attributes = JSON.parse(attributes.json);
						attributes.id = orderId;
					}
					if (attributes && attributes.documentNo) {
						this.set('id', attributes.id);
						this.set('client', attributes.client);
						this.set('organization', attributes.organization);
						this.set('documentType', attributes.documentType);
						this.set('orderType', attributes.orderType);
						this.set('generateInvoice', attributes.generateInvoice);
						this.set('priceList', attributes.priceList);
						this.set('currency', attributes.currency);
						this.set('currency' + OB.Constants.FIELDSEPARATOR
								+ OB.Constants.IDENTIFIER,
								attributes['currency'
										+ OB.Constants.FIELDSEPARATOR
										+ OB.Constants.IDENTIFIER]);
						this.set('warehouse', attributes.warehouse);
						this.set('salesRepresentative',
								attributes.salesRepresentative);
						this.set('salesRepresentative'
								+ OB.Constants.FIELDSEPARATOR
								+ OB.Constants.IDENTIFIER,
								attributes['salesRepresentative'
										+ OB.Constants.FIELDSEPARATOR
										+ OB.Constants.IDENTIFIER]);
						this.set('posTerminal', attributes.posTerminal);
						this.set('posTerminal' + OB.Constants.FIELDSEPARATOR
								+ OB.Constants.IDENTIFIER,
								attributes['posTerminal'
										+ OB.Constants.FIELDSEPARATOR
										+ OB.Constants.IDENTIFIER]);
						this.set('orderDate', new Date(attributes.orderDate));
						this.set('documentNo', attributes.documentNo);
						this.set('undo', attributes.undo);
						this.set('bp', new Backbone.Model(attributes.bp));
						this.set('lines', new OrderLineList()
								.reset(attributes.lines));
						this.set('payments', new PaymentLineList()
								.reset(attributes.payments));
						this.set('payment', attributes.payment);
						this.set('change', attributes.change);
						this.set('gross', attributes.gross);
						this.set('net', attributes.net);
						this.set('taxes', attributes.taxes);
						this.set('hasbeenpaid', attributes.hasbeenpaid);
						this.set('isbeingprocessed',
								attributes.isbeingprocessed);
					} else {
						this.clearOrderAttributes();
					}
				},
				save : function() {
					var undoCopy;
					if (this.attributes.json) {
						delete this.attributes.json;
					}
					undoCopy = this.get('undo');
					this.unset('undo');
					this.set('json', JSON.stringify(this.toJSON()));
					OB.Dal.save(this, null, function() {
						window.console.error(arguments);
					});
					this.set('undo', undoCopy);
				},
				calculateTaxes : function(callback) {
					if (callback) {
						callback();
					}
					this.save();
				},
				getTotal : function() {
					return this.getGross();
				},
				printTotal : function() {
					return OB.I18N.formatCurrency(this.getTotal());
				},
				calculateGross : function() {
					var gross = this.get('lines').reduce(function(memo, e) {
						return OB.DEC.add(memo, e.getGross());
					}, OB.DEC.Zero);
					this.set('gross', gross);
				},
				getGross : function() {
					return this.get('gross');
				},
				printGross : function() {
					return OB.I18N.formatCurrency(this.getGross());
				},
				getPayment : function() {
					return this.get('payment');
				},
				getChange : function() {
					return this.get('change');
				},
				getPending : function() {
					return OB.DEC.sub(this.getTotal(), this.getPayment());
				},
				getPaymentStatus : function() {
					var total = this.getTotal();
					var pay = this.getPayment();
					return {
						'done' : (OB.DEC.compare(total) > 0 && OB.DEC
								.compare(OB.DEC.sub(pay, total)) >= 0),
						'total' : OB.I18N.formatCurrency(total),
						'pending' : OB.DEC.compare(OB.DEC.sub(pay, total)) >= 0 ? OB.I18N
								.formatCurrency(OB.DEC.Zero)
								: OB.I18N
										.formatCurrency(OB.DEC.sub(total, pay)),
						'change' : OB.DEC.compare(this.getChange()) > 0 ? OB.I18N
								.formatCurrency(this.getChange())
								: null,
						'overpayment' : OB.DEC.compare(OB.DEC.sub(pay, total)) > 0 ? OB.I18N
								.formatCurrency(OB.DEC.sub(pay, total))
								: null
					};
				},
				clear : function() {
					this.clearOrderAttributes();
					this.trigger('change');
					this.trigger('clear');
				},
				clearOrderAttributes : function() {
					this.set('id', null);
					this.set('client', null);
					this.set('organization', null);
					this.set('documentType', null);
					this.set('orderType', 0);
					this.set('generateInvoice', false);
					this.set('priceList', null);
					this.set('currency', null);
					this.set('currency' + OB.Constants.FIELDSEPARATOR
							+ OB.Constants.IDENTIFIER, null);
					this.set('warehouse', null);
					this.set('salesRepresentative', null);
					this.set('salesRepresentative'
							+ OB.Constants.FIELDSEPARATOR
							+ OB.Constants.IDENTIFIER, null);
					this.set('posTerminal', null);
					this.set('posTerminal' + OB.Constants.FIELDSEPARATOR
							+ OB.Constants.IDENTIFIER, null);
					this.set('orderDate', new Date());
					this.set('documentNo', '');
					this.set('undo', null);
					this.set('bp', null);
					this.set('lines', this.get('lines') ? this.get('lines')
							.reset() : new OrderLineList());
					this.set('payments', this.get('payments') ? this.get(
							'payments').reset() : new PaymentLineList());
					this.set('payment', OB.DEC.Zero);
					this.set('change', OB.DEC.Zero);
					this.set('gross', OB.DEC.Zero);
					this.set('hasbeenpaid', 'N');
					this.set('isbeingprocessed', 'N');
				},
				clearWith : function(_order) {
					this.set('id', _order.get('id'));
					this.set('client', _order.get('client'));
					this.set('organization', _order.get('organization'));
					this.set('documentType', _order.get('documentType'));
					this.set('orderType', _order.get('orderType'));
					this.set('generateInvoice', _order.get('generateInvoice'));
					this.set('priceList', _order.get('priceList'));
					this.set('currency', _order.get('currency'));
					this.set('currency' + OB.Constants.FIELDSEPARATOR
							+ OB.Constants.IDENTIFIER, _order.get('currency'
							+ OB.Constants.FIELDSEPARATOR
							+ OB.Constants.IDENTIFIER));
					this.set('warehouse', _order.get('warehouse'));
					this.set('salesRepresentative', _order
							.get('salesRepresentative'));
					this.set('salesRepresentative'
							+ OB.Constants.FIELDSEPARATOR
							+ OB.Constants.IDENTIFIER, _order
							.get('salesRepresentative'
									+ OB.Constants.FIELDSEPARATOR
									+ OB.Constants.IDENTIFIER));
					this.set('posTerminal', _order.get('posTerminal'));
					this.set('posTerminal' + OB.Constants.FIELDSEPARATOR
							+ OB.Constants.IDENTIFIER, _order.get('posTerminal'
							+ OB.Constants.FIELDSEPARATOR
							+ OB.Constants.IDENTIFIER));
					this.set('orderDate', _order.get('orderDate'));
					this.set('documentNo', _order.get('documentNo'));
					this.set('undo', null);
					this.set('bp', _order.get('bp'));
					this.get('lines').reset();
					_order.get('lines').forEach(function(elem) {
						this.get('lines').add(elem);
					}, this);
					this.get('payments').reset();
					_order.get('payments').forEach(function(elem) {
						this.get('payments').add(elem);
					}, this);
					this.set('taxes', _order.get('taxes'));
					this.set('payment', _order.get('payment'));
					this.set('change', _order.get('change'));
					this.set('gross', _order.get('gross'));
					this.set('hasbeenpaid', _order.get('hasbeenpaid'));
					this
							.set('isbeingprocessed', _order
									.get('isbeingprocessed'));
					this.trigger('change');
					this.trigger('clear');
				},
				removeUnit : function(line, qty) {
					if (!OB.DEC.isNumber(qty)) {
						qty = OB.DEC.One;
					}
					this.setUnit(line, OB.DEC.sub(line.get('qty'), qty),
							OB.I18N.getLabel('OBPOS_RemoveUnits', [ qty,
									line.get('product').get('_identifier') ]));
				},
				addUnit : function(line, qty) {
					if (!OB.DEC.isNumber(qty)) {
						qty = OB.DEC.One;
					}
					this.setUnit(line, OB.DEC.add(line.get('qty'), qty),
							OB.I18N.getLabel('OBPOS_AddUnits', [ qty,
									line.get('product').get('_identifier') ]));
				},
				setUnit : function(line, qty, text) {
					if (OB.DEC.isNumber(qty)) {
						var oldqty = line.get('qty');
						if (OB.DEC.compare(qty) > 0) {
							var me = this;
							line.set('qty', qty);
							line.calculateGross();
							this.calculateGross();
							this.set('undo', {
								text : text
										|| OB.I18N.getLabel('OBPOS_SetUnits', [
												line.get('qty'),
												line.get('product').get(
														'_identifier') ]),
								oldqty : oldqty,
								line : line,
								undo : function() {
									line.set('qty', oldqty);
									line.calculateGross();
									me.calculateGross();
									me.set('undo', null);
								}
							});
						} else {
							this.deleteLine(line);
						}
						this.adjustPayment();
					}
				},
				setPrice : function(line, price) {
					if (OB.DEC.isNumber(price)) {
						var oldprice = line.get('price');
						if (OB.DEC.compare(price) >= 0) {
							var me = this;
							line.set('price', price);
							line.calculateGross();
							this.calculateGross();
							this.set('undo', {
								text : OB.I18N.getLabel('OBPOS_SetPrice',
										[
												line.printPrice(),
												line.get('product').get(
														'_identifier') ]),
								oldprice : oldprice,
								line : line,
								undo : function() {
									line.set('price', oldprice);
									line.calculateGross();
									me.calculateGross();
									me.set('undo', null);
								}
							});
						}
						this.adjustPayment();
					}
					this.save();
				},
				deleteLine : function(line) {
					var me = this;
					var index = this.get('lines').indexOf(line);
					this.get('lines').remove(line);
					this.calculateGross();
					this.set('undo', {
						text : OB.I18N.getLabel('OBPOS_DeleteLine', [
								line.get('qty'),
								line.get('product').get('_identifier') ]),
						line : line,
						undo : function() {
							me.get('lines').add(line, {
								at : index
							});
							me.calculateGross();
							me.set('undo', null);
						}
					});
					this.adjustPayment();
					this.save();
				},
				addProduct : function(p) {
					var me = this;
					if (p.get('obposScale')) {
						OB.POS.hwserver.getWeight(function(data) {
							if (data.exception) {
								alert(data.exception.message);
							} else if (data.result === 0) {
								alert(OB.I18N.getLabel('OBPOS_WeightZero'));
							} else {
								me.createLine(p, data.result);
							}
						});
					} else {
						var line = this.get('lines').find(function(l) {
							return l.get('product').id === p.id;
						});
						if (line) {
							this.addUnit(line);
							line.trigger('selected', line);
						} else {
							this.createLine(p, 1);
						}
					}
					this.save();
				},
				createLine : function(p, units) {
					var me = this;
					var newline = new OrderLine({
						product : p,
						uOM : p.get('uOM'),
						qty : OB.DEC.number(units),
						price : OB.DEC.number(p.get('price').get('listPrice')),
						priceList : OB.DEC.number(p.get('price').get(
								'listPrice'))
					});
					newline.calculateGross();
					this.get('lines').add(newline);
					this.calculateGross();
					this.set('undo', {
						text : OB.I18N.getLabel('OBPOS_AddLine', [
								newline.get('qty'),
								newline.get('product').get('_identifier') ]),
						line : newline,
						undo : function() {
							me.get('lines').remove(newline);
							me.calculateGross();
							me.set('undo', null);
						}
					});
					this.adjustPayment();
				},
				setBPandBPLoc : function(businessPartner, showNotif, saveChange) {
					var me = this, undef;
					var oldbp = this.get('bp');
					this.set('bp', businessPartner);
					if (showNotif === undef || showNotif === true) {
						this.set('undo', {
							text : businessPartner ? OB.I18N.getLabel(
									'OBPOS_SetBP', [ businessPartner
											.get('_identifier') ]) : OB.I18N
									.getLabel('OBPOS_ResetBP'),
							bp : businessPartner,
							undo : function() {
								me.set('bp', oldbp);
								me.set('undo', null);
							}
						});
					}
					if (saveChange) {
						this.save();
					}
				},
				setOrderTypeReturn : function() {
					this.set('documentType', OB.POS.modelterminal
							.get('terminal').documentTypeForReturns);
					this.set('orderType', 1);
					this.save();
				},
				setOrderInvoice : function() {
					this.set('generateInvoice', true);
					this.save();
				},
				resetOrderInvoice : function() {
					this.set('generateInvoice', false);
					this.save();
				},
				adjustPayment : function() {
					var i, max, p;
					var payments = this.get('payments');
					var total = this.getTotal();
					var nocash = OB.DEC.Zero;
					var cash = OB.DEC.Zero;
					var pcash;
					for (i = 0, max = payments.length; i < max; i++) {
						p = payments.at(i);
						p.set('paid', p.get('amount'));
						if (p.get('kind') === 'OBPOS_payment.cash') {
							cash = OB.DEC.add(cash, p.get('amount'));
							pcash = p;
						} else {
							nocash = OB.DEC.add(nocash, p.get('amount'));
						}
					}
					if (pcash) {
						if (OB.DEC.compare(nocash - total) > 0) {
							pcash.set('paid', OB.DEC.Zero);
							this.set('payment', nocash);
							this.set('change', cash);
						} else if (OB.DEC.compare(OB.DEC.sub(OB.DEC.add(nocash,
								cash), total)) > 0) {
							pcash.set('paid', OB.DEC.sub(total, nocash));
							this.set('payment', total);
							this.set('change', OB.DEC.sub(OB.DEC.add(nocash,
									cash), total));
						} else {
							pcash.set('paid', cash);
							this.set('payment', OB.DEC.add(nocash, cash));
							this.set('change', OB.DEC.Zero);
						}
					} else {
						this.set('payment', nocash);
						this.set('change', OB.DEC.Zero);
					}
				},
				addPayment : function(payment) {
					var i, max, p;
					if (OB.DEC.compare(this.getTotal()) === 0) {
						alert(OB.I18N.getLabel('OBPOS_MsgPaymentAmountZero'));
						return;
					}
					if (!OB.DEC.isNumber(payment.get('amount'))) {
						alert(OB.I18N.getLabel('OBPOS_MsgPaymentAmountError'));
						return;
					}
					if (!OB.POS.modelterminal.hasPayment(payment.get('kind'))) {
						alert(OB.I18N.getLabel('OBPOS_MsgPaymentTypeError'));
						return;
					}
					var payments = this.get('payments');
					for (i = 0, max = payments.length; i < max; i++) {
						p = payments.at(i);
						if (p.get('kind') === payment.get('kind')) {
							p.set('amount', OB.DEC.add(payment.get('amount'), p
									.get('amount')));
							this.adjustPayment();
							return;
						}
					}
					payments.add(payment);
					this.adjustPayment();
				},
				removePayment : function(payment) {
					var payments = this.get('payments');
					payments.remove(payment);
					this.adjustPayment();
					this.save();
				},
				serializeToJSON : function() {
					var jsonorder = JSON.parse(JSON.stringify(this.toJSON()));
					delete jsonorder.undo;
					delete jsonorder.json;
					_.forEach(jsonorder.lines, function(item) {
						delete item.product.img;
					});
					if (jsonorder.orderType === 1) {
						jsonorder.gross = -jsonorder.gross;
						jsonorder.change = -jsonorder.change;
						jsonorder.net = -jsonorder.net;
						jsonorder.payment = -jsonorder.payment;
						_.forEach(jsonorder.lines, function(item) {
							item.gross = -item.gross;
							item.net = -item.net;
							item.qty = -item.qty;
						});
						_.forEach(jsonorder.payments, function(item) {
							item.amount = -item.amount;
							item.paid = -item.paid;
						});
						_.forEach(jsonorder.taxes, function(item) {
							item.amount = -item.amount;
							item.net = -item.net;
						});
					}
					return jsonorder;
				}
			});
	var OrderList = Backbone.Collection.extend({
		model : Order,
		constructor : function(context) {
			if (context) {
				this._id = 'modelorderlist';
				this.modelorder = context.modelorder;
			}
			Backbone.Collection.prototype.constructor.call(this);
		},
		initialize : function() {
			this.current = null;
		},
		newOrder : function() {
			var order = new Order(), me = this, documentseq, documentseqstr;
			order.set('client', OB.POS.modelterminal.get('terminal').client);
			order.set('organization',
					OB.POS.modelterminal.get('terminal').organization);
			order.set('documentType',
					OB.POS.modelterminal.get('terminal').documentType);
			order.set('orderType', 0);
			order.set('generateInvoice', false);
			order.set('priceList',
					OB.POS.modelterminal.get('terminal').priceList);
			order
					.set('currency',
							OB.POS.modelterminal.get('terminal').currency);
			order.set('currency' + OB.Constants.FIELDSEPARATOR
					+ OB.Constants.IDENTIFIER, OB.POS.modelterminal
					.get('terminal')['currency' + OB.Constants.FIELDSEPARATOR
					+ OB.Constants.IDENTIFIER]);
			order.set('warehouse',
					OB.POS.modelterminal.get('terminal').warehouse);
			order.set('salesRepresentative', OB.POS.modelterminal
					.get('context').user.id);
			order.set('salesRepresentative' + OB.Constants.FIELDSEPARATOR
					+ OB.Constants.IDENTIFIER, OB.POS.modelterminal
					.get('context').user._identifier);
			order.set('posTerminal', OB.POS.modelterminal.get('terminal').id);
			order.set('posTerminal' + OB.Constants.FIELDSEPARATOR
					+ OB.Constants.IDENTIFIER, OB.POS.modelterminal
					.get('terminal')._identifier);
			order.set('orderDate', new Date());
			documentseq = OB.POS.modelterminal.get('documentsequence') + 1;
			documentseqstr = OB.UTIL.padNumber(documentseq, 5);
			OB.POS.modelterminal.set('documentsequence', documentseq);
			order.set('documentNo',
					OB.POS.modelterminal.get('terminal').docNoPrefix + '/'
							+ documentseqstr);
			order.set('bp', OB.POS.modelterminal.get('businessPartner'));
			return order;
		},
		addNewOrder : function() {
			this.saveCurrent();
			this.current = this.newOrder();
			this.add(this.current);
			this.loadCurrent();
		},
		deleteCurrent : function() {
			if (this.current) {
				this.remove(this.current);
				if (this.length > 0) {
					this.current = this.at(this.length - 1);
				} else {
					this.current = this.newOrder();
					this.add(this.current);
				}
				this.loadCurrent();
			}
		},
		load : function(model) {
			if (model
					&& this.current
					&& model.get('documentNo') === this.current
							.get('documentNo')) {
				return;
			}
			this.saveCurrent();
			this.current = model;
			this.loadCurrent();
		},
		saveCurrent : function() {
			if (this.current) {
				this.current.clearWith(this.modelorder);
			}
		},
		loadCurrent : function() {
			if (this.current) {
				this.modelorder.clearWith(this.current);
			}
		}
	});
	window.OB = window.OB || {};
	window.OB.Model = window.OB.Model || {};
	window.OB.Collection = window.OB.Collection || {};
	window.OB.Model.OrderLine = OrderLine;
	window.OB.Collection.OrderLineList = OrderLineList;
	window.OB.Model.PaymentLine = PaymentLine;
	window.OB.Collection.PaymentLineList = PaymentLineList;
	window.OB.Model.Order = Order;
	window.OB.Collection.OrderList = OrderList;
}());
(function() {
	OB = window.OB || {};
	OB.Model = window.OB.Model || {};
	OB.Model.Collection = Backbone.Collection.extend({
		constructor : function(data) {
			this.ds = data.ds;
			Backbone.Collection.prototype.constructor.call(this);
		},
		inithandler : function(init) {
			if (init) {
				init.call(this);
			}
		},
		exec : function(filter) {
			var me = this;
			if (this.ds) {
				this.ds.exec(filter, function(data, info) {
					var i;
					me.reset();
					me.trigger('info', info);
					if (data.exception) {
						OB.UTIL.showError(data.exception.message);
					} else {
						for (i in data) {
							if (data.hasOwnProperty(i)) {
								me.add(data[i]);
							}
						}
					}
				});
			}
		}
	});
	OB.Model.Terminal = Backbone.Model
			.extend({
				defaults : {
					terminal : null,
					context : null,
					permissions : null,
					businesspartner : null,
					location : null,
					pricelist : null,
					pricelistversion : null,
					currency : null,
					connectedToERP : null
				},
				initialize : function() {
					var me = this;
					$(window).bind('online', function() {
						OB.UTIL.checkConnectivityStatus();
					});
					$(window).bind('offline', function() {
						OB.UTIL.checkConnectivityStatus();
					});
				},
				login : function(user, password, mode) {
					OB.UTIL.showLoading(true);
					var me = this;
					this.set('terminal', null);
					this.set('payments', null);
					this.set('context', null);
					this.set('permissions', null);
					this.set('businesspartner', null);
					this.set('location', null);
					this.set('pricelist', null);
					this.set('pricelistversion', null);
					this.set('currency', null);
					this.set('currencyPrecision', null);
					OB.Dal.removeAll(OB.Model.Order, {
						'hasbeenpaid' : 'N'
					}, null, null);
					$
							.ajax({
								url : '../../org.openbravo.retail.posterminal/POSLoginHandler',
								data : {
									'user' : user,
									'password' : password,
									'terminal' : OB.POS.paramTerminal,
									'Command' : 'DEFAULT',
									'IsAjaxCall' : 1
								},
								type : 'POST',
								success : function(data, textStatus, jqXHR) {
									var pos, baseUrl;
									if (data && data.showMessage) {
										me.triggerLoginFail(401, mode, data);
										return;
									}
									pos = location.pathname
											.indexOf('login.jsp');
									baseUrl = window.location.pathname
											.substring(0, pos);
									window.location = baseUrl
											+ OB.POS
													.hrefWindow(OB.POS.paramWindow);
								},
								error : function(jqXHR, textStatus, errorThrown) {
									me.triggerLoginFail(jqXHR.status, mode);
								}
							});
				},
				logout : function() {
					var me = this;
					this.set('terminal', null);
					this.set('payments', null);
					this.set('context', null);
					this.set('permissions', null);
					this.set('bplocation', null);
					this.set('location', null);
					this.set('pricelist', null);
					this.set('pricelistversion', null);
					this.set('currency', null);
					this.set('currencyPrecision', null);
					$
							.ajax({
								url : '../../org.openbravo.retail.posterminal.service.logout',
								contentType : 'application/json;charset=utf-8',
								dataType : 'json',
								type : 'GET',
								success : function(data, textStatus, jqXHR) {
									me.triggerLogout();
								},
								error : function(jqXHR, textStatus, errorThrown) {
									me.triggerLogout();
								}
							});
				},
				lock : function() {
					alert('Feature not yet implemented');
				},
				load : function() {
					$(window).off('keypress');
					this.set('terminal', null);
					this.set('payments', null);
					this.set('context', null);
					this.set('permissions', null);
					this.set('businesspartner', null);
					this.set('location', null);
					this.set('pricelist', null);
					this.set('pricelistversion', null);
					this.set('currency', null);
					this.set('currencyPrecision', null);
					var me = this;
					var params = {
						terminal : OB.POS.paramTerminal
					};
					new OB.DS.Request(
							'org.openbravo.retail.posterminal.term.Terminal')
							.exec(
									params,
									function(data) {
										if (data.exception) {
											me.logout();
										} else if (data[0]) {
											me.set('terminal', data[0]);
											me.loadPayments();
											me.loadContext();
											me.loadPermissions();
											me.loadBP();
											me.loadLocation();
											me.loadPriceList();
											me.loadPriceListVersion();
											me.loadCurrency();
											me.setDocumentSequence();
										} else {
											OB.UTIL
													.showError("Terminal does not exists: "
															+ params.terminal);
										}
									});
				},
				loadPayments : function() {
					var me = this;
					new OB.DS.Request(
							'org.openbravo.retail.posterminal.term.Payments')
							.exec(
									{
										pos : this.get('terminal').id
									},
									function(data) {
										if (data) {
											var i, max;
											me.set('payments', data);
											me.paymentnames = {};
											for (i = 0, max = data.length; i < max; i++) {
												me.paymentnames[data[i].payment.searchKey] = data[i].payment._identifier;
											}
											me.triggerReady();
										}
									});
				},
				loadContext : function() {
					var me = this;
					new OB.DS.Request(
							'org.openbravo.retail.posterminal.term.Context')
							.exec({}, function(data) {
								if (data[0]) {
									me.set('context', data[0]);
									me.triggerReady();
								}
							});
				},
				loadPermissions : function() {
					var me = this;
					new OB.DS.Request(
							'org.openbravo.retail.posterminal.term.RolePreferences')
							.exec(
									{},
									function(data) {
										var i, max, permissions = {};
										if (data) {
											for (i = 0, max = data.length; i < max; i++) {
												permissions[data[i].key] = data[i].value;
											}
											me.set('permissions', permissions);
											me.triggerReady();
										}
									});
				},
				loadBP : function() {
					this.set('businesspartner',
							this.get('terminal').businessPartner);
				},
				loadLocation : function() {
					var me = this;
					new OB.DS.Request(
							'org.openbravo.retail.posterminal.term.Location')
							.exec({
								org : this.get('terminal').organization
							}, function(data) {
								if (data[0]) {
									me.set('location', data[0]);
								}
							});
				},
				loadPriceList : function() {
					var me = this;
					new OB.DS.Request(
							'org.openbravo.retail.posterminal.term.PriceList')
							.exec({
								pricelist : this.get('terminal').priceList
							}, function(data) {
								if (data[0]) {
									me.set('pricelist', data[0]);
								}
							});
				},
				loadPriceListVersion : function() {
					var me = this;
					new OB.DS.Request(
							'org.openbravo.retail.posterminal.term.PriceListVersion')
							.exec({
								pricelist : this.get('terminal').priceList
							}, function(data) {
								if (data[0]) {
									me.set('pricelistversion', data[0]);
									me.triggerReady();
								}
							});
				},
				loadCurrency : function() {
					var me = this;
					new OB.DS.Request(
							'org.openbravo.retail.posterminal.term.Currency')
							.exec({
								currency : this.get('terminal').currency
							}, function(data) {
								if (data[0]) {
									me.set('currency', data[0]);
									OB.DEC.scale = data[0].pricePrecision;
									me.triggerReady();
								}
							});
				},
				setDocumentSequence : function() {
					var me = this;
					OB.Dal
							.find(
									OB.Model.DocumentSequence,
									{
										'posSearchKey' : OB.POS.modelterminal
												.get('terminal').searchKey
									},
									function(documentsequence) {
										var lastInternalDocumentSequence, max;
										if (documentsequence
												&& documentsequence.length > 0) {
											lastInternalDocumentSequence = documentsequence
													.at(0).get(
															'documentSequence');
											if (lastInternalDocumentSequence > OB.POS.modelterminal
													.get('terminal').lastDocumentNumber) {
												max = lastInternalDocumentSequence;
											} else {
												max = OB.POS.modelterminal
														.get('terminal').lastDocumentNumber;
											}
											me
													.compareDocSeqWithPendingOrdersAndSave(max);
										} else {
											max = OB.POS.modelterminal
													.get('terminal').lastDocumentNumber;
											me
													.compareDocSeqWithPendingOrdersAndSave(max);
										}
									},
									function() {
										var max = OB.POS.modelterminal
												.get('terminal').lastDocumentNumber;
										me
												.compareDocSeqWithPendingOrdersAndSave(max);
									});
				},
				compareDocSeqWithPendingOrdersAndSave : function(
						maxDocumentSequence) {
					var me = this;
					OB.Dal
							.find(
									OB.Model.Order,
									{},
									function(fetchedOrderList) {
										var criteria, maxDocumentSequencePendingOrders;
										if (!fetchedOrderList
												|| fetchedOrderList.length === 0) {
											me
													.saveDocumentSequenceAndGo(maxDocumentSequence);
										} else {
											maxDocumentSequencePendingOrders = me
													.getMaxDocumentSequenceFromPendingOrders(fetchedOrderList.models);
											if (maxDocumentSequencePendingOrders > maxDocumentSequence) {
												me
														.saveDocumentSequenceAndGo(maxDocumentSequencePendingOrders);
											} else {
												me
														.saveDocumentSequenceAndGo(maxDocumentSequence);
											}
										}
									},
									function() {
										me
												.saveDocumentSequenceAndGo(maxDocumentSequence);
									});
				},
				getMaxDocumentSequenceFromPendingOrders : function(
						pendingOrders) {
					var nPreviousOrders = pendingOrders.length, maxDocumentSequence = OB.POS.modelterminal
							.get('terminal').lastDocumentNumber, posDocumentNoPrefix = OB.POS.modelterminal
							.get('terminal').docNoPrefix, orderCompleteDocumentNo, orderDocumentSequence, i;
					for (i = 0; i < nPreviousOrders; i++) {
						orderCompleteDocumentNo = pendingOrders[i]
								.get('documentNo');
						orderDocumentSequence = parseInt(
								orderCompleteDocumentNo
										.substr(posDocumentNoPrefix.length + 1),
								10);
						if (orderDocumentSequence > maxDocumentSequence) {
							maxDocumentSequence = orderDocumentSequence;
						}
					}
					return maxDocumentSequence;
				},
				saveDocumentSequenceAndGo : function(documentSequence) {
					this.set('documentsequence', documentSequence);
					this.triggerReady();
				},
				saveDocumentSequenceInDB : function() {
					var me = this, modelterminal = OB.POS.modelterminal, documentSequence = modelterminal
							.get('documentsequence'), criteria = {
						'posSearchKey' : OB.POS.modelterminal.get('terminal').searchKey
					};
					OB.Dal.find(OB.Model.DocumentSequence, criteria, function(
							documentSequenceList) {
						var docSeq;
						if (documentSequenceList) {
							docSeq = documentSequenceList.models[0];
							docSeq.set('documentSequence', documentSequence);
						} else {
							docSeq = new OB.Model.DocumentSequence();
							docSeq.set('posSearchKey', OB.POS.modelterminal
									.get('terminal').searchKey);
							docSeq.set('documentSequence', documentSequence);
						}
						OB.Dal.save(docSeq, null, null);
					});
				},
				triggerReady : function() {
					var undef;
					if (this.get('payments') && this.get('pricelistversion')
							&& this.get('currency') && this.get('context')
							&& this.get('permissions')
							&& this.get('documentsequence') !== undef) {
						this.trigger('ready');
					}
				},
				triggerLogout : function() {
					this.trigger('logout');
				},
				triggerLoginSuccess : function() {
					this.trigger('loginsuccess');
				},
				triggerOnLine : function() {
					this.set('connectedToERP', true);
					this.trigger('online');
				},
				triggerOffLine : function() {
					this.set('connectedToERP', false);
					this.trigger('offline');
				},
				triggerLoginFail : function(e, mode, data) {
					OB.UTIL.showLoading(false);
					if (mode === 'userImgPress') {
						this.trigger('loginUserImgPressfail', e);
					} else {
						this.trigger('loginfail', e, data);
					}
				},
				hasPermission : function(p) {
					return !this.get('context').role.manual
							|| this.get('permissions')[p]
							|| this.get('permissions')['OBPOS_' + p];
				},
				getPaymentName : function(key) {
					return this.paymentnames[key];
				},
				hasPayment : function(key) {
					return this.paymentnames[key];
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.Button = Backbone.View
			.extend({
				tagName : 'button',
				attr : function(attributes) {
					if (attributes.label) {
						this.label = attributes.label;
					}
					if (attributes.style) {
						this.$el.attr('style', attributes.style);
					}
					if (attributes.clickEvent) {
						this.clickEvent = attributes.clickEvent;
					}
					if (attributes.icon) {
						this.icon = attributes.icon;
					}
					if (attributes.iconright) {
						this.iconright = attributes.iconright;
					}
					if (attributes.href) {
						this.href = attributes.href;
					}
					if (attributes.dataToggle) {
						this.dataToggle = attributes.dataToggle;
					}
					if (attributes.className) {
						this.$el.addClass(attributes.className);
					}
				},
				initialize : function() {
					var fb;
					this.$el.mouseover(_.bind(this._mouseOverEvent, this));
					this.$el.mouseout(_.bind(this._mouseOutEvent, this));
					this.$el.mousedown(_.bind(this._mouseDownEvent, this));
					if ((navigator.userAgent.toLowerCase()
							.indexOf('windows nt') !== -1)
							|| (this.attributes && (this.attributes['data-toggle'] || this.attributes['data-dismiss']))) {
						this.$el.click(_.bind(this._clickEvent, this));
					} else {
						fb = new MBP.fastButton(this.el, _.bind(
								this._clickEvent, this));
					}
				},
				_clickEvent : function(e) {
					this.$el.removeClass('btn-over');
					this.clickEvent(e);
				},
				_mouseOverEvent : function(e) {
					this.$el.addClass('btn-over');
					this.mouseOverEvent(e);
				},
				_mouseOutEvent : function(e) {
					this.$el.removeClass('btn-over');
					this.mouseOutEvent(e);
				},
				_mouseDownEvent : function(e) {
					var me = this;
					if (navigator.userAgent.toLowerCase().indexOf('windows nt') !== -1) {
						this.$el.addClass('btn-down');
						setTimeout(function() {
							me.$el.removeClass('btn-down');
						}, 125);
					}
					this.mouseOutEvent(e);
				},
				clickEvent : function(e) {
				},
				mouseOverEvent : function(e) {
				},
				mouseOutEvent : function(e) {
				},
				mouseDownEvent : function(e) {
				}
			});
	OB.COMP.RegularButton = OB.COMP.Button.extend({
		render : function() {
			this.$el.addClass('btnlink');
			if (this.href) {
				this.$el.attr('href', this.href);
			}
			if (this.dataToggle) {
				this.$el.attr('data-toggle', this.dataToggle);
			}
			if (this.icon) {
				this.$el.append($('<div class=\"' + this.icon + '\"></div>'));
			}
			this.$el.append($('<span>' + this.label + '</span>'));
			if (this.iconright) {
				this.$el.append($('<div class=\"' + this.iconright
						+ '\"></div>'));
			}
			return this;
		},
		icon : '',
		iconright : '',
		label : ''
	});
	OB.COMP.SmallButton = OB.COMP.RegularButton.extend({
		render : function() {
			OB.COMP.RegularButton.prototype.render.call(this);
			this.$el.addClass('btnlink-small');
			return this;
		},
		icon : '',
		iconright : '',
		label : ''
	});
	OB.COMP.ModalDialogButton = OB.COMP.RegularButton.extend({
		render : function() {
			OB.COMP.RegularButton.prototype.render.call(this);
			this.$el.addClass('btnlink-gray modal-dialog-content-button');
			return this;
		}
	});
	OB.COMP.ToolbarButton = OB.COMP.RegularButton.extend({
		render : function() {
			OB.COMP.RegularButton.prototype.render.call(this);
			this.$el.addClass('btnlink-toolbar');
			return this;
		}
	});
	OB.COMP.CheckboxButton = Backbone.View.extend({
		tagName : 'button',
		attributes : {
			'class' : 'btn-check'
		},
		initialize : function() {
			this.$el.click(_.bind(this._clickEvent, this));
		},
		attr : function(attributes) {
			if (attributes.className) {
				this.$el.addClass(attributes.className);
			}
			if (attributes.id) {
				this.$el.attr('id', attributes.id);
			}
		},
		_clickEvent : function(e) {
			this.$el.toggleClass('active');
			this.clickEvent(e);
		},
		clickEvent : function(e) {
		}
	});
	OB.COMP.RadioButton = Backbone.View.extend({
		tagName : 'button',
		className : 'btn',
		initialize : function() {
			this.$el.click(_.bind(this._clickEvent, this));
		},
		append : function(child) {
			if (child.render) {
				this.$el.append(child.render().$el);
			} else if (child.$el) {
				this.$el.append(child.$el);
			}
		},
		attr : function(attributes) {
			if (attributes.className) {
				this.$el.addClass(attributes.className);
			}
			if (attributes.id) {
				this.$el.attr('id', attributes.id);
			}
		},
		render : function() {
			this.$el.addClass('btn-radio');
			this.$el.attr('style', 'padding: 0px 0px 0px 40px; margin: 10px;');
			return this;
		},
		_clickEvent : function(e) {
			this.clickEvent(e);
		},
		clickEvent : function(e) {
		}
	});
	OB.COMP.ButtonTab = OB.COMP.Button.extend({
		className : 'btnlink btnlink-gray',
		attributes : {
			'data-toggle' : 'tab'
		},
		initialize : function() {
			OB.COMP.Button.prototype.initialize.call(this);
			this.$el.attr('href', this.tabpanel);
			this.$el.append($('<span>' + this.label + '</span>'));
		},
		tabpanel : '#',
		label : '',
		events : {
			'shown' : 'shownEvent'
		},
		shownEvent : function(e) {
		}
	});
	OB.COMP.ToolbarButtonTab = OB.COMP.ButtonTab.extend({
		render : function() {
			OB.COMP.ButtonTab.prototype.render.call(this);
			this.$el.addClass('btnlink-toolbar');
			return this;
		},
		clickEvent : function() {
			OB.COMP.ButtonTab.prototype.clickEvent.call(this);
			OB.UTIL.setOrderLineInEditMode(false);
		}
	});
	OB.COMP.ToolbarMenuButton = OB.COMP.ToolbarButton.extend({
		attributes : {
			'data-toggle' : 'dropdown'
		}
	});
	OB.COMP.ToolbarMenu = Backbone.View.extend({
		tagName : 'div',
		className : 'dropdown',
		attributes : {
			'style' : 'display: inline-block; width: 100%;'
		},
		initialize : function() {
			this.button = new OB.COMP.ToolbarMenuButton().render().$el;
			this.$el.append(this.button);
			if (this.icon) {
				this.button.append($('<div class=\"' + this.icon + '\"></i>'));
			}
			this.button.append($('<span>' + this.label + ' </span>'));
			if (this.iconright) {
				this.button.append($('<div class=\"' + this.iconright
						+ '\"></i>'));
			}
			this.menu = $('<ul class=\"dropdown-menu\"></ul>');
			this.$el.append(this.menu);
		},
		append : function(child) {
			if (child.$el) {
				this.menu.append(child.$el);
			}
		},
		icon : '',
		iconright : '',
		label : ''
	});
	OB.COMP.SelectPanel = Backbone.View.extend({
		tagName : 'div',
		className : 'btnselect',
		initialize : function() {
			this.model = this.options.model;
			OB.UTIL.initContentView(this);
		}
	});
	OB.COMP.SelectButton = OB.COMP.Button.extend({
		className : 'btnselect',
		initialize : function() {
			OB.COMP.Button.prototype.initialize.call(this);
			this.model = this.options.model;
			OB.UTIL.initContentView(this);
		},
		clickEvent : function(e) {
			this.model.trigger('selected', this.model);
			this.model.trigger('click', this.model);
			this.$el.parents('.modal').filter(':first').modal('hide');
		}
	});
	OB.COMP.RenderEmpty = Backbone.View
			.extend({
				tagName : 'div',
				attributes : {
					'style' : 'border-bottom: 1px solid #cccccc; padding: 20px; text-align: center; font-weight: bold; font-size: 30px; color: #cccccc'
				},
				render : function() {
					this.$el.text(this.label
							|| OB.I18N.getLabel('OBPOS_SearchNoResults'));
					return this;
				}
			});
	OB.COMP.MenuSeparator = Backbone.View.extend({
		tagName : 'li',
		className : 'divider'
	});
	OB.COMP.MenuItem = Backbone.View
			.extend({
				tagName : 'li',
				initialize : function() {
					var opts = this.options;
					if (this.permission
							&& !OB.POS.modelterminal
									.hasPermission(this.permission)) {
						this.$el
								.append($('<div/>')
										.attr(
												'style',
												'color: #cccccc; padding-bottom: 10px;padding-left: 15px; padding-right: 15px;padding-top: 10px;')
										.append($('<span/>').text(this.label)));
					} else {
						this.$el
								.append($('<a/>')
										.attr(
												'style',
												'padding-bottom: 10px;padding-left: 15px; padding-right: 15px;padding-top: 10px;')
										.attr('href', this.href).attr('target',
												this.target).append(
												$('<span/>').text(this.label)));
						this.$el
								.find('a')
								.first()
								.click(
										function(e) {
											var $el = $(this), href = $el
													.attr('href'), target = $el
													.attr('target');
											if (target === '_self') {
												e.preventDefault();
												if (OB.POS.modelterminal
														.get('connectedToERP')) {
													OB.UTIL.showLoading(true);
													window.location = href;
												} else {
													alert(OB.I18N
															.getLabel('OBPOS_OnlineRequiredFunctionality'));
												}
											}
										});
					}
				},
				href : '',
				target : '_self',
				label : ''
			});
	OB.COMP.MenuAction = Backbone.View.extend({
		tagName : 'li',
		initialize : function() {
			this.$anchor = $('<a/>').attr('style',
					'padding: 12px 15px 12px 15px;').attr('href', '#').append(
					$('<span/>').text(this.label));
			this.$el.click(_.bind(this._clickEvent, this));
			this.$el.append(this.$anchor);
		},
		_clickEvent : function(e) {
			e.preventDefault();
			this.clickEvent(e);
		},
		label : '',
		clickEvent : function(e) {
		}
	});
	OB.COMP.Modal = Backbone.View.extend({
		tagName : 'div',
		className : 'modal hide fade',
		attributes : {
			'style' : 'display: none;'
		},
		contentView : [ {
			tag : 'div',
			attributes : {
				'class' : 'modal-header'
			},
			content : [ {
				tag : 'a',
				attributes : {
					'class' : 'close',
					'data-dismiss' : 'modal'
				},
				content : [ {
					tag : 'span',
					attributes : {
						style : 'font-size: 150%;'
					},
					content : '&times;'
				} ]
			}, {
				id : 'divheader',
				tag : 'h3'
			} ]
		}, {
			id : 'body',
			tag : 'div',
			attributes : {
				'class' : 'modal-header'
			}
		} ],
		maxheight : null,
		initialize : function() {
			OB.UTIL.initContentView(this);
			this.divheader.text(this.header);
			if (this.maxheight) {
				this.body.css('max-height', this.maxheight);
			}
			var getcv = this.getContentView();
			if (getcv.kind) {
				this.contentview = B(getcv, this.options);
			} else {
				this.contentview = new getcv(this.options).render();
			}
			this.body.append(this.contentview.$el);
			OB.UTIL.adjustModalPosition(this.$el);
			OB.UTIL.focusInModal(this.$el);
		},
		events : {
			'show' : 'showEvent'
		},
		showEvent : function(e) {
		}
	});
	OB.COMP.ModalAction = Backbone.View
			.extend({
				tagName : 'div',
				className : 'modal hide fade modal-dialog',
				attributes : {
					'style' : 'display: none;'
				},
				width : null,
				maxheight : null,
				bodyContentClass : 'modal-dialog-content-text',
				bodyButtonsClass : 'modal-dialog-content-buttons-container',
				initialize : function() {
					if (this.width) {
						this.$el.css('width', this.width);
					}
					this.$el
							.append(B(
									{
										kind : B.KindJQuery('div'),
										attr : {
											'class' : 'modal-header modal-dialog-header'
										},
										content : [
												{
													kind : B.KindJQuery('a'),
													attr : {
														'class' : 'close',
														'data-dismiss' : 'modal'
													},
													content : [ {
														kind : B
																.KindHTML('<span style=\"font-size: 150%;\">&times;</span>')
													} ]
												},
												{
													kind : B.KindJQuery('h3'),
													attr : {
														'class' : 'modal-dialog-header-text'
													},
													content : [ this.header ]
												} ]
									}, this.options).$el);
					var body = $('<div/>').addClass('modal-body').addClass(
							'modal-dialog-body');
					if (this.maxheight) {
						body.css('max-height', this.maxheight);
					}
					var bodyContentContainer = $('<div/>').addClass(
							this.bodyContentClass);
					if (this.setBodyContent) {
						var bodyContent = this.setBodyContent();
						var theBodyContent;
						if (bodyContent.kind) {
							theBodyContent = B(bodyContent, this.options);
						} else {
							theBodyContent = new bodyContent(this.options)
									.render();
						}
						bodyContentContainer.append(theBodyContent.$el);
					}
					var bodyButtonsContainer = $('<div/>').addClass(
							this.bodyButtonsClass);
					if (this.setBodyButtons) {
						var bodyButtons = this.setBodyButtons();
						var theBodyButtons;
						if (bodyButtons.kind) {
							theBodyButtons = B(bodyButtons, this.options);
						} else {
							theBodyButtons = new bodyButtons(this.options)
									.render();
						}
						bodyButtonsContainer.append(theBodyButtons.$el);
					}
					body.append(bodyContentContainer);
					body.append(bodyButtonsContainer);
					this.$el.append(body);
					OB.UTIL.adjustModalPosition(this.$el);
					OB.UTIL.focusInModal(this.$el);
				},
				events : {
					'show' : 'showEvent'
				},
				showEvent : function(e) {
				}
			});
	OB.COMP.CustomView = Backbone.View.extend({
		initialize : function() {
			this.component = B(this.createView(), this.options);
			this.setElement(this.component.$el);
		},
		createView : function() {
			return ({
				kind : B.KindJQuery('div')
			});
		}
	});
	OB.COMP.SearchInput = Backbone.View.extend({
		tagName : 'input',
		attr : function(attributes) {
			if (attributes.clickEvent) {
				this.clickEvent = attributes.clickEvent;
			}
			if (attributes.xWebkitSpeech) {
				this.$el.attr('x-webkit-speech', attributes.xWebkitSpeech);
			}
			if (attributes.type) {
				this.$el.attr('type', attributes.type);
			}
			if (attributes.style) {
				this.$el.attr('style', attributes.style);
			}
			if (attributes.className) {
				this.$el.addClass(attributes.className);
			}
		},
		initialize : function() {
			this.$el.keypress(_.bind(this._clickEvent, this));
		},
		_clickEvent : function(e) {
			this.clickEvent(e);
		},
		clickEvent : function(e) {
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.HWResource = function(res) {
		this.resource = res;
		this.resourcedata = null;
	};
	OB.COMP.HWResource.prototype.getData = function(callback) {
		if (this.resourcedata) {
			callback(this.resourcedata);
		} else {
			OB.UTIL.loadResource(this.resource, function(data) {
				this.resourcedata = data;
				callback(this.resourcedata);
			}, this);
		}
	};
	OB.COMP.HWManager = function(context) {
		if (context.modelorder) {
			this.receipt = context.modelorder;
			this.line = null;
			this.receipt.get('lines').on('selected', function(line) {
				if (this.line) {
					this.line.off('change', this.printLine);
				}
				this.line = line;
				if (this.line) {
					this.line.on('change', this.printLine, this);
				}
				this.printLine();
			}, this);
			this.receipt.on('closed print', this.printOrder, this);
		}
		if (context.modeldaycash) {
			this.modeldaycash = context.modeldaycash;
			this.modeldaycash.on('print', this.printCashUp, this);
		}
		if (context.depsdropstosend) {
			this.depsdropstosend = context.depsdropstosend;
			context.on('print', this.printCashMgmt, this);
		}
	};
	function hwcallback(e) {
		if (e.exception) {
			OB.UTIL.showError(e.exception.message);
		}
	}
	function cashMgmthwcallback() {
		window.location = OB.POS.hrefWindow('retail.pointofsale');
	}
	OB.COMP.HWManager.prototype.printLine = function() {
		var line = this.line;
		if (line) {
			this.templateline.getData(function(data) {
				OB.POS.hwserver.print(data, {
					line : line
				}, hwcallback);
			});
		}
	};
	OB.COMP.HWManager.prototype.printOrder = function() {
		var receipt = new OB.Model.Order();
		receipt.clearWith(this.receipt);
		var template;
		if (receipt.get('generateInvoice')) {
			if (receipt.get('orderType') === 1) {
				template = this.templatereturninvoice;
			} else {
				template = this.templateinvoice;
			}
		} else {
			if (receipt.get('orderType') === 1) {
				template = this.templatereturn;
			} else {
				template = this.templatereceipt;
			}
		}
		template.getData(function(data) {
			OB.POS.hwserver.print(data, {
				order : receipt
			}, hwcallback);
		});
	};
	OB.COMP.HWManager.prototype.printCashUp = function() {
		var modeldaycash = this.modeldaycash;
		this.templatecashup.getData(function(data) {
			OB.POS.hwserver.print(data, {
				cashup : modeldaycash
			}, hwcallback);
		});
	};
	OB.COMP.HWManager.prototype.printCashMgmt = function() {
		var depsdropstosend = this.depsdropstosend;
		this.templatecashmgmt.getData(function(data) {
			OB.POS.hwserver.print(data, {
				cashmgmt : depsdropstosend
			}, cashMgmthwcallback);
		});
	};
	OB.COMP.HWManager.prototype.attr = function(attrs) {
		this.templateline = new OB.COMP.HWResource(attrs.templateline);
		this.templatereceipt = new OB.COMP.HWResource(attrs.templatereceipt);
		this.templateinvoice = new OB.COMP.HWResource(attrs.templateinvoice
				|| attrs.templatereceipt);
		this.templatereturn = new OB.COMP.HWResource(attrs.templatereturn
				|| attrs.templatereceipt);
		this.templatereturninvoice = new OB.COMP.HWResource(
				attrs.templatereturninvoice || attrs.templatereturn
						|| attrs.templatereceipt);
		this.templatecashup = new OB.COMP.HWResource(attrs.templatecashup);
		this.templatecashmgmt = new OB.COMP.HWResource(attrs.templatecashmgmt);
	};
	OB.COMP.HWManager.prototype.load = function() {
		OB.UTIL.loadResource('res/welcome.xml', function(data) {
			OB.POS.hwserver.print(data, {}, hwcallback);
		}, this);
	};
}());
(function() {
	OB = window.OB || {};
	OB.UI = window.OB.UI || {};
	OB.UI.ListView = function(tag) {
		return Backbone.View.extend({
			tagName : tag,
			registerCollection : function(collection) {
				this.collection = collection;
				if (this.collection) {
					this.collection.on('change', function(model, prop) {
						var index = this.collection.indexOf(model);
						this.$el.children().eq(index + this.header)
								.replaceWith((new this.renderLine({
									parent : this,
									model : model
								})).render().$el);
					}, this);
					this.collection.on('add', function(model, prop, options) {
						this._addModelToCollection(model, options.index);
					}, this);
					this.collection.on('remove',
							function(model, prop, options) {
								var index = options.index;
								this.$el.children().eq(index + this.header)
										.remove();
							}, this);
					this.collection.on('reset',
							function() {
								this.$el.empty();
								if (this.renderHeader) {
									this.$el.append((new this.renderHeader())
											.render().$el);
								}
								this.collection.each(function(model) {
									this._addModelToCollection(model);
								}, this);
							}, this);
				}
				if (this.renderHeader) {
					this.$el.append((new this.renderHeader()).render().$el);
				}
			},
			_addModelToCollection : function(model, index) {
				var me = this, tr = (new this.renderLine({
					parent : this,
					model : model
				})).render().$el;
				if (_.isNumber(index) && index < this.collection.length - 1) {
					this.$el.children().eq(index + this.header).before(tr);
				} else {
					this.$el.append(tr);
				}
			},
			attr : function(attr) {
				this.htmlId = attr.htmlId;
				this.className = attr.className;
				this.style = attr.style;
				this.renderLine = attr.renderLine;
				this.renderHeader = attr.renderHeader;
				this.header = this.renderHeader ? 1 : 0;
				this.$el.empty();
				if (this.htmlId) {
					this.$el.attr('id', this.htmlId);
				}
				if (this.className) {
					this.$el.addClass(this.className);
				}
				if (this.style) {
					this.$el.attr('style', this.style);
				}
				this.registerCollection(attr.collection);
			}
		});
	};
	OB.UI.TableView = Backbone.View
			.extend({
				tagName : 'div',
				initialize : function() {
					this.theader = $('<div/>');
					this.tbody = $('<ul/>').addClass('unstyled').css('display',
							'none');
					this.tempty = $('<div/>');
					this.tinfo = $('<div/>').css('display', 'none').css(
							'border-bottom', '1px solid #cccccc').css(
							'padding', '15px').css('font-weight', 'bold').css(
							'color', '#cccccc');
					this.$el.empty().append(this.theader).append(this.tbody)
							.append(this.tinfo).append(this.tempty);
				},
				registerCollection : function(collection) {
					this.collection = collection;
					this.selected = null;
					if (this.renderHeader) {
						this.theader
								.append((new this.renderHeader()).render().$el);
					}
					if (this.renderEmpty) {
						this.tempty
								.append((new this.renderEmpty()).render().$el);
					}
					this.collection.on('selected', function(model) {
						if (!model && this.style) {
							if (this.selected) {
								this.selected.removeClass('selected');
							}
							this.selected = null;
						}
					}, this);
					this.collection.on('add', function(model, prop, options) {
						this.tempty.hide();
						this.tbody.show();
						this._addModelToCollection(model, options.index);
						if (this.style === 'list') {
							if (!this.selected) {
								model.trigger('selected', model);
							}
						} else if (this.style === 'edit') {
							model.trigger('selected', model);
						}
					}, this);
					this.collection
							.on(
									'remove',
									function(model, prop, options) {
										var index = options.index;
										this.tbody.children().eq(index)
												.remove();
										if (index >= this.collection.length) {
											if (this.collection.length === 0) {
												this.collection
														.trigger('selected');
											} else {
												this.collection
														.at(
																this.collection.length - 1)
														.trigger(
																'selected',
																this.collection
																		.at(this.collection.length - 1));
											}
										} else {
											this.collection.at(index).trigger(
													'selected',
													this.collection.at(index));
										}
										if (this.collection.length === 0) {
											this.tbody.hide();
											this.tempty.show();
										}
									}, this);
					this.collection
							.on(
									'reset',
									function(a, b, c) {
										var lastmodel;
										this.tbody.hide();
										this.tempty.show();
										this.tbody.empty();
										if (this.collection.size() === 0) {
											this.tbody.hide();
											this.tempty.show();
											this.collection.trigger('selected');
										} else {
											this.tempty.hide();
											this.tbody.show();
											this.collection
													.each(
															function(model) {
																this
																		._addModelToCollection(model);
															}, this);
											if (this.style === 'list'
													|| this.style === 'edit') {
												lastmodel = this.collection
														.at(this.collection
																.size() - 1);
												lastmodel.trigger('selected',
														lastmodel);
											}
										}
									}, this);
					this.collection.on('info', function(info) {
						if (info) {
							this.tinfo.text(OB.I18N.getLabel(info));
							this.tinfo.show();
						} else {
							this.tinfo.hide();
						}
					}, this);
				},
				_addModelToCollection : function(model, index) {
					var me = this, tr = $('<li/>');
					tr.append((new this.renderLine({
						parent : me,
						model : model
					})).render().$el);
					model.on('change', function() {
						tr.empty().append((new this.renderLine({
							parent : me,
							model : model
						})).render().$el);
					}, this);
					model.on('selected', function() {
						if (this.style) {
							if (this.selected) {
								this.selected.removeClass('selected');
							}
							this.selected = tr;
							this.selected.addClass('selected');
							OB.UTIL.makeElemVisible(this.$el, this.selected);
						}
					}, this);
					if (_.isNumber(index) && index < this.collection.length - 1) {
						this.tbody.children().eq(index).before(tr);
					} else {
						this.tbody.append(tr);
					}
				},
				attr : function(attr) {
					this.style = attr.style;
					this.renderHeader = attr.renderHeader;
					this.renderEmpty = attr.renderEmpty;
					this.renderLine = attr.renderLine;
					this.registerCollection(attr.collection);
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.Terminal = function(yourterminal, yourcompany,
			yourcompanyproperties, loggeduser, loggeduserproperties) {
		this.yourterminal = yourterminal;
		this.yourcompany = yourcompany;
		this.yourcompanyproperties = yourcompanyproperties;
		this.loggeduser = loggeduser;
		this.loggeduserproperties = loggeduserproperties;
	};
	OB.COMP.Terminal.prototype.setModel = function(terminal) {
		this.terminal = terminal;
		this.terminal
				.on(
						'change:context',
						function() {
							var ctx = this.terminal.get('context');
							if (ctx) {
								this.loggeduser.text(ctx.user._identifier);
								this.loggeduserproperties.empty();
								this.loggeduserproperties
										.append(B({
											kind : B.KindJQuery('div'),
											attr : {
												style : 'height: 60px; background-color: #FFF899;'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															style : 'float: left; width: 55px; margin: 6px 0px 0px 6px;'
														},
														content : [ {
															kind : OB.UTIL.Thumbnail,
															attr : {
																img : ctx.img,
																'default' : 'img/anonymous-icon.png'
															}
														} ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															style : 'float: left; margin: 6px 0px 0px 0px; line-height: 150%;'
														},
														content : [
																{
																	kind : B
																			.KindJQuery('div'),
																	content : [ {
																		kind : B
																				.KindJQuery('span'),
																		attr : {
																			'style' : 'font-weight: 600; margin: 0px 0px 0px 5px;'
																		},
																		content : [ ctx.user._identifier ]
																	} ]
																},
																{
																	kind : B
																			.KindJQuery('div'),
																	content : [ {
																		kind : B
																				.KindJQuery('span'),
																		attr : {
																			'style' : 'font-weight: 600; margin: 0px 0px 0px 5px;'
																		},
																		content : [ ctx.role._identifier ]
																	} ]
																} ]
													} ]
										}).$el);
								this.loggeduserproperties
										.append(B({
											kind : B.KindJQuery('div'),
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															style : 'height: 5px;'
														}
													},
													{
														kind : OB.COMP.MenuAction
																.extend({
																	clickEvent : function() {
																		$(
																				'#profileDialog')
																				.modal(
																						'show');
																	},
																	label : OB.I18N
																			.getLabel('OBPOS_LblProfile')
																})
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															style : 'height: 5px;'
														}
													},
													{
														kind : OB.COMP.MenuAction
																.extend({
																	clickEvent : function() {
																		$(
																				'#logoutDialog')
																				.modal(
																						'show');
																	},
																	label : OB.I18N
																			.getLabel('OBPOS_LogoutDialogLogout')
																})
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															style : 'height: 5px;'
														}
													} ]
										}).$el);
							} else {
								this.loggeduser.text('');
								this.loggeduserproperties.empty();
							}
						}, this);
		this.terminal
				.on(
						'change:terminal change:bplocation change:location change:pricelist change:pricelistversion',
						function() {
							var name = '';
							var clientname = '';
							var orgname = '';
							var pricelistname = '';
							var currencyname = '';
							var locationname = '';
							if (this.terminal.get('terminal')) {
								name = this.terminal.get('terminal')._identifier;
								clientname = this.terminal.get('terminal')['client'
										+ OB.Constants.FIELDSEPARATOR
										+ '_identifier'];
								orgname = this.terminal.get('terminal')['organization'
										+ OB.Constants.FIELDSEPARATOR
										+ '_identifier'];
							}
							if (this.terminal.get('pricelist')) {
								pricelistname = this.terminal.get('pricelist')._identifier;
								currencyname = this.terminal.get('pricelist')['currency'
										+ OB.Constants.FIELDSEPARATOR
										+ '_identifier'];
							}
							if (this.terminal.get('location')) {
								locationname = this.terminal.get('location')._identifier;
							}
							this.yourterminal.text(name);
							this.yourcompany.text(orgname);
							this.yourcompanyproperties
									.empty()
									.append(
											B({
												kind : B.KindJQuery('div'),
												content : [
														{
															kind : B
																	.KindJQuery('div'),
															content : [
																	{
																		kind : B
																				.KindJQuery('span'),
																		content : [ OB.I18N
																				.getLabel('OBPOS_CompanyClient') ]
																	},
																	{
																		kind : B
																				.KindJQuery('span'),
																		attr : {
																			'style' : 'font-weight: bold; margin: 0px 0px 0px 5px;'
																		},
																		content : [ clientname ]
																	} ]
														},
														{
															kind : B
																	.KindJQuery('div'),
															content : [
																	{
																		kind : B
																				.KindJQuery('span'),
																		content : [ OB.I18N
																				.getLabel('OBPOS_CompanyOrg') ]
																	},
																	{
																		kind : B
																				.KindJQuery('span'),
																		attr : {
																			'style' : 'font-weight: bold; margin: 0px 0px 0px 5px;'
																		},
																		content : [ orgname ]
																	} ]
														},
														{
															kind : B
																	.KindJQuery('div'),
															content : [
																	{
																		kind : B
																				.KindJQuery('span'),
																		content : [ OB.I18N
																				.getLabel('OBPOS_CompanyPriceList') ]
																	},
																	{
																		kind : B
																				.KindJQuery('span'),
																		attr : {
																			'style' : 'font-weight: bold; margin: 0px 0px 0px 5px;'
																		},
																		content : [ pricelistname ]
																	} ]
														},
														{
															kind : B
																	.KindJQuery('div'),
															content : [
																	{
																		kind : B
																				.KindJQuery('span'),
																		content : [ OB.I18N
																				.getLabel('OBPOS_CompanyCurrency') ]
																	},
																	{
																		kind : B
																				.KindJQuery('span'),
																		attr : {
																			'style' : 'font-weight: bold; margin: 0px 0px 0px 5px;'
																		},
																		content : [ currencyname ]
																	} ]
														},
														{
															kind : B
																	.KindJQuery('div'),
															content : [
																	{
																		kind : B
																				.KindJQuery('span'),
																		content : [ OB.I18N
																				.getLabel('OBPOS_CompanyLocation') ]
																	},
																	{
																		kind : B
																				.KindJQuery('span'),
																		attr : {
																			'style' : 'font-weight: bold; margin: 0px 0px 0px 5px;'
																		},
																		content : [ locationname ]
																	} ]
														} ]
											}).$el);
						}, this);
	};
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ModalProfile = function(dialogsContainer) {
		this.dialogsContainer = dialogsContainer;
	};
	OB.COMP.ModalProfile.prototype.setModel = function(terminal) {
		this.terminal = terminal;
		this.terminal
				.on(
						'change:context',
						function() {
							var ctx = this.terminal.get('context');
							if (!ctx) {
								return;
							}
							var terminalName = OB.POS.paramTerminal;
							var roleId = ctx.role.id;
							var languageId = OB.Application.language;
							var userId = ctx.user.id;
							var RoleModel = Backbone.Model.extend({});
							var RoleCollection = Backbone.Collection
									.extend({
										model : RoleModel,
										url : '../../org.openbravo.retail.posterminal.service.profileutils?command=availableRoles&terminalName='
												+ terminalName
												+ '&userId='
												+ userId,
										parse : function(response, error) {
											if (response
													&& response.response[0]
													&& response.response[0].data) {
												return response.response[0].data;
											} else {
												return null;
											}
										}
									});
							var myRoleCollection = new RoleCollection();
							myRoleCollection.fetch();
							var LanguageModel = Backbone.Model.extend({});
							var LanguageCollection = Backbone.Collection
									.extend({
										model : LanguageModel,
										url : '../../org.openbravo.retail.posterminal.service.profileutils?command=availableLanguages',
										parse : function(response, error) {
											if (response
													&& response.response[0]
													&& response.response[0].data) {
												return response.response[0].data;
											} else {
												return null;
											}
										}
									});
							var myLanguageCollection = new LanguageCollection();
							myLanguageCollection.fetch();
							OB.COMP.ModalProfile = OB.COMP.ModalAction
									.extend({
										id : 'profileDialog',
										header : OB.I18N
												.getLabel('OBPOS_ProfileDialogTitle'),
										width : '500px',
										bodyContentClass : 'modal-dialog-content-profile',
										setBodyContent : function() {
											return ({
												kind : B.KindJQuery('div'),
												attr : {
													'style' : 'height: 127px; background-color: #ffffff;'
												},
												content : [
														{
															kind : B
																	.KindJQuery('div'),
															content : [
																	{
																		kind : B
																				.KindJQuery('div'),
																		attr : {
																			'style' : 'border: 1px solid #F0F0F0; background-color: #E2E2E2; color: black; width: 150px; height: 40px; float: left; text-align: right;'
																		},
																		content : [ {
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'padding: 5px 8px 0px 0px; font-size: 15px;'
																			},
																			content : [ OB.I18N
																					.getLabel('OBPOS_Role') ]
																		} ]
																	},
																	{
																		kind : B
																				.KindJQuery('div'),
																		attr : {
																			'style' : 'border: 1px solid #F0F0F0; float: left;'
																		},
																		content : [ {
																			kind : OB.UI
																					.ListView('select'),
																			attr : {
																				collection : myRoleCollection,
																				htmlId : 'profileRoleId',
																				className : 'modal-dialog-profile-combo',
																				renderLine : Backbone.View
																						.extend({
																							tagName : 'option',
																							initialize : function() {
																								this.model = this.options.model;
																							},
																							render : function() {
																								this.$el
																										.attr(
																												'value',
																												this.model
																														.get('id'))
																										.text(
																												this.model
																														.get('_identifier'));
																								if (roleId === this.model
																										.get('id')) {
																									this.$el
																											.attr(
																													'selected',
																													'selected');
																								}
																								return this;
																							}
																						})
																			}
																		} ]
																	} ]
														},
														{
															kind : B
																	.KindJQuery('div'),
															attr : {
																style : 'clear: both'
															}
														},
														{
															kind : B
																	.KindJQuery('div'),
															content : [
																	{
																		kind : B
																				.KindJQuery('div'),
																		attr : {
																			'style' : 'border: 1px solid #F0F0F0; background-color: #E2E2E2; color: black; width: 150px; height: 40px; float: left; text-align: right;'
																		},
																		content : [ {
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'padding: 5px 8px 0px 0px; font-size: 15px;'
																			},
																			content : [ OB.I18N
																					.getLabel('OBPOS_Language') ]
																		} ]
																	},
																	{
																		kind : B
																				.KindJQuery('div'),
																		attr : {
																			'style' : 'border: 1px solid #F0F0F0; float: left;'
																		},
																		content : [ {
																			kind : OB.UI
																					.ListView('select'),
																			attr : {
																				collection : myLanguageCollection,
																				className : 'modal-dialog-profile-combo',
																				htmlId : 'profileLanguageId',
																				renderLine : Backbone.View
																						.extend({
																							tagName : 'option',
																							initialize : function() {
																								this.model = this.options.model;
																							},
																							render : function() {
																								this.$el
																										.attr(
																												'value',
																												this.model
																														.get('id'))
																										.text(
																												this.model
																														.get('_identifier'));
																								if (languageId === this.model
																										.get('id')) {
																									this.$el
																											.attr(
																													'selected',
																													'selected');
																								}
																								return this;
																							}
																						})
																			}
																		} ]
																	} ]
														},
														{
															kind : B
																	.KindJQuery('div'),
															attr : {
																style : 'clear: both'
															}
														},
														{
															kind : B
																	.KindJQuery('div'),
															content : [
																	{
																		kind : B
																				.KindJQuery('div'),
																		attr : {
																			'style' : 'border: 1px solid #F0F0F0; background-color: #E2E2E2; color: black; width: 150px; height: 40px; float: left; text-align: right;'
																		},
																		content : [ {
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'padding: 5px 8px 0px 0px; font-size: 15px;'
																			},
																			content : [ OB.I18N
																					.getLabel('OBPOS_SetAsDefault') ]
																		} ]
																	},
																	{
																		kind : B
																				.KindJQuery('div'),
																		attr : {
																			'style' : 'border: 1px solid #F0F0F0; float: left;'
																		},
																		content : [ {
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'class' : 'modal-dialog-profile-combo'
																			},
																			content : [ {
																				kind : OB.COMP.CheckboxButton,
																				attr : {
																					'className' : 'modal-dialog-btn-check',
																					'id' : 'profileDefault'
																				}
																			} ]
																		} ]
																	} ]
														} ]
											});
										},
										setBodyButtons : function() {
											return ({
												kind : B.KindJQuery('div'),
												content : [
														{
															kind : OB.COMP.ProfileDialogApply
														},
														{
															kind : OB.COMP.ProfileDialogCancel
														} ]
											});
										}
									});
							OB.COMP.ProfileDialogApply = OB.COMP.Button
									.extend({
										isActive : true,
										className : 'btnlink btnlink-gray modal-dialog-content-button',
										render : function() {
											this.$el
													.html(OB.I18N
															.getLabel('OBPOS_LblApply'));
											return this;
										},
										clickEvent : function(e) {
											if (OB.COMP.ProfileDialogApply.prototype.isActive) {
												OB.COMP.ProfileDialogApply.prototype.isActive = false;
												var newLanguageId = $(
														'#profileLanguageId')
														.val(), newRoleId = $(
														'#profileRoleId').val(), isDefault = $(
														'#profileDefault')
														.hasClass('active'), actionURL = '../../org.openbravo.client.kernel?command=save&_action=org.openbravo.client.application.navigationbarcomponents.UserInfoWidgetActionHandler', postData = {
													'language' : newLanguageId,
													'role' : newRoleId,
													'default' : isDefault,
													'defaultRoleProperty' : 'oBPOSDefaultPOSRole'
												};
												$
														.ajax({
															url : actionURL,
															type : 'POST',
															contentType : 'application/json;charset=utf-8',
															dataType : 'json',
															data : JSON
																	.stringify(postData),
															success : function(
																	data,
																	textStatus,
																	jqXHR) {
																if (data.result === 'success') {
																	window.location
																			.reload();
																} else {
																	OB.UTIL
																			.showError(data.result);
																}
																OB.COMP.ProfileDialogApply.prototype.isActive = true;
															},
															error : function(
																	jqXHR,
																	textStatus,
																	errorThrown) {
																OB.UTIL
																		.showError(errorThrown);
																OB.COMP.ProfileDialogApply.prototype.isActive = true;
															}
														});
											}
										}
									});
							OB.COMP.ProfileDialogCancel = OB.COMP.Button
									.extend({
										attributes : {
											'data-dismiss' : 'modal'
										},
										className : 'btnlink btnlink-gray modal-dialog-content-button',
										render : function() {
											this.$el
													.html(OB.I18N
															.getLabel('OBPOS_LblCancel'));
											return this;
										},
										clickEvent : function(e) {
										}
									});
							this.dialogsContainer.append(B({
								kind : OB.COMP.ModalProfile
							}).$el);
						}, this);
	};
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ModalLogout = OB.COMP.ModalAction.extend({
		id : 'logoutDialog',
		header : OB.I18N.getLabel('OBPOS_LogoutDialogLogout'),
		setBodyContent : function() {
			return ({
				kind : B.KindJQuery('div'),
				content : [ OB.I18N.getLabel('OBPOS_LogoutDialogText') ]
			});
		},
		setBodyButtons : function() {
			return ({
				kind : B.KindJQuery('div'),
				content : [ {
					kind : OB.COMP.LogoutDialogLogout
				}, {
					kind : OB.COMP.LogoutDialogCancel
				} ]
			});
		}
	});
	OB.COMP.LogoutDialogLogout = OB.COMP.Button.extend({
		className : 'btnlink btnlink-gray modal-dialog-content-button',
		render : function() {
			this.$el.html(OB.I18N.getLabel('OBPOS_LogoutDialogLogout'));
			return this;
		},
		clickEvent : function(e) {
			OB.POS.logout();
		}
	});
	OB.COMP.LogoutDialogLock = OB.COMP.Button.extend({
		className : 'btnlink btnlink-gray modal-dialog-content-button',
		render : function() {
			this.$el.html(OB.I18N.getLabel('OBPOS_LogoutDialogLock'));
			return this;
		},
		clickEvent : function(e) {
			OB.POS.lock();
		}
	});
	OB.COMP.LogoutDialogCancel = OB.COMP.Button.extend({
		attributes : {
			'data-dismiss' : 'modal'
		},
		className : 'btnlink btnlink-gray modal-dialog-content-button',
		render : function() {
			this.$el.html(OB.I18N.getLabel('OBPOS_LblCancel'));
			return this;
		},
		clickEvent : function(e) {
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ModalCancel = OB.COMP.ModalAction.extend({
		id : 'modalCancel',
		header : OB.I18N.getLabel('OBPOS_LblCancel'),
		setBodyContent : function() {
			return ({
				kind : B.KindJQuery('div'),
				content : [ OB.I18N.getLabel('OBPOS_ProcessCancelDialog') ]
			});
		},
		setBodyButtons : function() {
			return ({
				kind : B.KindJQuery('div'),
				content : [ {
					kind : OB.COMP.CancelDialogOk
				}, {
					kind : OB.COMP.CancelDialogCancel
				} ]
			});
		}
	});
	OB.COMP.CancelDialogOk = OB.COMP.Button.extend({
		className : 'btnlink btnlink-gray modal-dialog-content-button',
		render : function() {
			this.$el.html(OB.I18N.getLabel('OBPOS_LblOk'));
			return this;
		},
		clickEvent : function(e) {
			window.location = OB.POS.hrefWindow('retail.pointofsale');
		}
	});
	OB.COMP.CancelDialogCancel = OB.COMP.Button.extend({
		attributes : {
			'data-dismiss' : 'modal'
		},
		className : 'btnlink btnlink-gray modal-dialog-content-button',
		render : function() {
			this.$el.html(OB.I18N.getLabel('OBPOS_LblCancel'));
			return this;
		},
		clickEvent : function(e) {
		}
	});
}());
(function() {
	var modelterminal = new OB.Model.Terminal();
	var terminal = new OB.COMP.Terminal($("#terminal"), $('#yourcompany'),
			$('#yourcompanyproperties'), $('#loggeduser'),
			$('#loggeduserproperties'));
	terminal.setModel(modelterminal);
	var modalProfile = new OB.COMP.ModalProfile($('#dialogsContainer'));
	modalProfile.setModel(modelterminal);
	window.onerror = function(e) {
		if (typeof (e) === 'string') {
			OB.UTIL.showError(e);
		}
	};
	OB.POS = {
		modelterminal : modelterminal,
		paramWindow : OB.UTIL.getParameterByName("window")
				|| "retail.pointofsale",
		paramTerminal : OB.UTIL.getParameterByName("terminal") || "POS-1",
		hrefWindow : function(windowname) {
			return '?terminal='
					+ window.encodeURIComponent(OB.POS.paramTerminal)
					+ '&window=' + window.encodeURIComponent(windowname);
		},
		logout : function(callback) {
			modelterminal.logout();
		},
		lock : function(callback) {
			modelterminal.lock();
		},
		paymentProviders : {},
		windows : {}
	};
	modelterminal
			.on(
					'ready',
					function() {
						var webwindow, w, c = _.extend({}, Backbone.Events), terminal = OB.POS.modelterminal
								.get('terminal'), queue = {}, emptyQueue = false;
						$(window).off('keypress');
						$('#logoutlink').css('visibility', 'visible');
						function createWindow() {
							w = new webwindow(c);
							if (w.render) {
								w = w.render();
							}
							$("#containerWindow").empty().append(w.$el);
							c.trigger('domready');
							OB.UTIL.showLoading(false);
						}
						function searchCurrentBP() {
							function errorCallback(tx, error) {
								OB.UTIL.showError("OBDAL error: " + error);
							}
							function successCallbackBPs(dataBps) {
								if (dataBps) {
									OB.POS.modelterminal.set('businessPartner',
											dataBps);
									createWindow();
								}
							}
							OB.Dal
									.get(OB.Model.BusinessPartner,
											OB.POS.modelterminal
													.get('businesspartner'),
											successCallbackBPs, errorCallback);
						}
						OB.POS.hwserver = new OB.DS.HWServer(
								terminal.hardwareurl, terminal.scaleurl);
						OB.DEC
								.setContext(OB.POS.modelterminal
										.get('currency').pricePrecision,
										BigDecimal.prototype.ROUND_HALF_EVEN);
						webwindow = OB.POS.windows[OB.POS.paramWindow];
						if (webwindow) {
							if (OB.POS.modelterminal
									.hasPermission(OB.POS.paramWindow)) {
								if (OB.DATA[OB.POS.paramWindow]) {
									_
											.each(
													OB.DATA[OB.POS.paramWindow],
													function(model) {
														var ds;
														if (model.prototype.local) {
															OB.Dal
																	.initCache(
																			model,
																			[],
																			function() {
																				window.console
																						.log('init success: '
																								+ model.prototype.modelName);
																			},
																			function() {
																				window.console
																						.error(
																								'init error',
																								arguments);
																			});
														} else {
															ds = new OB.DS.DataSource(
																	new OB.DS.Request(
																			model,
																			terminal.client,
																			terminal.organization,
																			terminal.id));
															ds
																	.on(
																			'ready',
																			function() {
																				queue[model.prototype.source] = true;
																				emptyQueue = OB.UTIL
																						.queueStatus(queue);
																				if (emptyQueue) {
																					searchCurrentBP();
																				}
																			});
															ds.load();
															queue[model.prototype.source] = false;
														}
													});
								} else {
									createWindow();
								}
							} else {
								OB.UTIL.showLoading(false);
								alert(OB.I18N.getLabel(
										'OBPOS_WindowNotPermissions',
										[ OB.POS.paramWindow ]));
							}
						} else {
							OB.UTIL.showLoading(false);
							alert(OB.I18N.getLabel('OBPOS_WindowNotFound',
									[ OB.POS.paramWindow ]));
						}
					});
	modelterminal.on('loginsuccess', function() {
		modelterminal.load();
	});
	modelterminal.on('logout', function() {
		modelterminal.off('loginfail');
		$(window).off('keypress');
		$('#logoutlink').css('visibility', 'hidden');
		localStorage.setItem('target-window', window.location.href);
		window.location = window.location.pathname + 'login.jsp' + '?terminal='
				+ window.encodeURIComponent(OB.POS.paramTerminal);
	});
	$(document).ready(function() {
		$('#dialogsContainer').append(B({
			kind : OB.COMP.ModalLogout
		}).$el);
		modelterminal.load();
		modelterminal.on('online', function() {
			OB.UTIL.setConnectivityLabel('Online');
		});
		modelterminal.on('offline', function() {
			OB.UTIL.setConnectivityLabel('Offline');
		});
		OB.UTIL.checkConnectivityStatus();
		setInterval(OB.UTIL.checkConnectivityStatus, 5000);
		beforeUnloadCallback = function() {
			if (!OB.POS.modelterminal.get('connectedToERP')) {
				return OB.I18N.getLabel('OBPOS_ShouldNotCloseWindow');
			}
		};
		$(window).on('beforeunload', function() {
			if (!OB.POS.modelterminal.get('connectedToERP')) {
				return OB.I18N.getLabel('OBPOS_ShouldNotCloseWindow');
			}
		});
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	var ButtonDummy = Backbone.View.extend({
		tagName : 'button',
		initialize : function() {
			this.$el.attr('class', this.options.className);
		}
	});
	OB.COMP.KeyboardComponent = Backbone.View.extend({
		initialize : function() {
			this.receipt = this.options.parent.receipt;
			this.commands = this.options.parent.commands;
			this.addCommand = _.bind(this.options.parent.addCommand,
					this.options.parent);
			this.addButton = _.bind(this.options.parent.addButton,
					this.options.parent);
			this.keyPressed = _.bind(this.options.parent.keyPressed,
					this.options.parent);
			OB.UTIL.initContentView(this);
		}
	});
	OB.COMP.ButtonKey = Backbone.View
			.extend({
				classButton : '',
				command : false,
				permission : null,
				label : null,
				classButtonActive : 'btnactive',
				tagName : 'div',
				attributes : {
					'style' : 'margin: 5px;'
				},
				initialize : function(attr) {
					this.kb = this.options.parent;
					var me = this;
					if (this.command) {
						if (this.definition) {
							this.kb.addCommand(this.command, this.definition);
						}
						if (this.command === '---') {
							this.command = false;
						} else if (!this.command.match(/^([0-9]|\.|,|[a-z])$/)
								&& this.command !== 'OK'
								&& this.command !== 'del'
								&& this.command !== String.fromCharCode(13)
								&& !this.kb.commands[this.command]) {
							this.command = false;
						} else if (this.permission
								&& !OB.POS.modelterminal
										.hasPermission(this.permission)) {
							this.command = false;
						}
					}
					if (this.command) {
						this.button = new OB.COMP.Button();
						this.button.$el.attr('class', 'btnkeyboard '
								+ this.classButton);
						this.button.clickEvent = function(e) {
							me.kb.keyPressed(me.command);
						};
						this.kb.addButton(this.command, this.button);
					} else {
						this.button = new ButtonDummy({
							className : 'btnkeyboard '
									+ 'btnkeyboard-inactive '
									+ this.classButton
						});
					}
					this.button.contentView = this.contentViewButton;
					this.button.classButtonActive = this.classButtonActive;
					OB.UTIL.initContentView(this.button);
					this.$el.append(this.button.$el);
				},
				append : function(child) {
					if (child.$el) {
						this.button.$el.append(child.$el);
					}
				}
			});
	OB.COMP.PaymentButton = Backbone.View.extend({
		contentView : [ {
			tag : 'div',
			attributes : {
				'style' : 'margin: 5px;'
			},
			content : [ {
				view : OB.COMP.Button.extend({
					className : 'btnkeyboard'
				}),
				id : 'button'
			} ]
		} ],
		background : '#6cb33f',
		initialize : function() {
			OB.UTIL.initContentView(this);
			var me = this;
			this.button.$el.css({
				'background-color' : this.background,
				'border' : '10px solid' + (this.bordercolor || this.background)
			});
			this.button.$el
					.text(this.label || OB.I18N.formatCoins(this.amount));
			this.button.clickEvent = function(e) {
				me.options.parent.receipt.addPayment(new OB.Model.PaymentLine({
					'kind' : me.paymenttype,
					'name' : OB.POS.modelterminal
							.getPaymentName(me.paymenttype),
					'amount' : OB.DEC.number(me.amount)
				}));
			};
		}
	});
	OB.COMP.KeypadBasic = OB.COMP.KeyboardComponent.extend({
		tag : 'div',
		name : 'index',
		label : OB.I18N.getLabel('OBPOS_KeypadBasic'),
		attributes : {
			'style' : 'display:none'
		},
		contentView : [ {
			tag : 'div',
			attributes : {
				'class' : 'row-fluid'
			},
			content : [ {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						command : '/',
						classButton : 'btnkeyboard-num',
						contentViewButton : [ '/' ]
					})
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						command : '*',
						classButton : 'btnkeyboard-num',
						contentViewButton : [ '*' ]
					})
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						command : '%',
						classButton : 'btnkeyboard-num',
						contentViewButton : [ '%' ]
					})
				} ]
			} ]
		}, {
			tag : 'div',
			attributes : {
				'class' : 'row-fluid'
			},
			content : [ {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						command : '7',
						classButton : 'btnkeyboard-num',
						contentViewButton : [ '7' ]
					}),
					content : [ '7' ]
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						command : '8',
						classButton : 'btnkeyboard-num',
						contentViewButton : [ '8' ]
					}),
					content : [ '8' ]
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						command : '9',
						classButton : 'btnkeyboard-num',
						contentViewButton : [ '9' ]
					}),
					content : [ '9' ]
				} ]
			} ]
		}, {
			tag : 'div',
			attributes : {
				'class' : 'row-fluid'
			},
			content : [ {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						command : '4',
						classButton : 'btnkeyboard-num',
						contentViewButton : [ '4' ]
					}),
					content : [ '4' ]
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						kb : this,
						command : '5',
						classButton : 'btnkeyboard-num',
						contentViewButton : [ '5' ]
					}),
					content : [ '5' ]
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						kb : this,
						command : '6',
						classButton : 'btnkeyboard-num',
						contentViewButton : [ '6' ]
					}),
					content : [ '6' ]
				} ]
			} ]
		}, {
			tag : 'div',
			attributes : {
				'class' : 'row-fluid'
			},
			content : [ {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						command : '1',
						classButton : 'btnkeyboard-num',
						contentViewButton : [ '1' ]
					}),
					content : [ '1' ]
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						command : '2',
						classButton : 'btnkeyboard-num',
						contentViewButton : [ '2' ]
					}),
					content : [ '2' ]
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						command : '3',
						classButton : 'btnkeyboard-num',
						contentViewButton : [ '3' ]
					}),
					content : [ '3' ]
				} ]
			} ]
		}, {
			tag : 'div',
			attributes : {
				'class' : 'row-fluid'
			},
			content : [ {
				tag : 'div',
				attributes : {
					'class' : 'span8'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						command : '0',
						classButton : 'btnkeyboard-num',
						contentViewButton : [ '0' ]
					}),
					content : [ '0' ]
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						command : OB.Format.defaultDecimalSymbol,
						classButton : 'btnkeyboard-num',
						contentViewButton : [ OB.Format.defaultDecimalSymbol ]
					})
				} ]
			} ]
		} ]
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	var BtnSide = Backbone.View.extend({
		tagName : 'div',
		attributes : {
			'style' : 'display:table; width:100%'
		},
		initialize : function() {
			var inst = new this.options.btn({
				parent : this.options.parent
			});
			inst.render();
			this.$el.append(inst.$el);
		}
	});
	OB.COMP.Keyboard = Backbone.View
			.extend({
				optionsid : 'keyboard',
				status : '',
				commands : {},
				buttons : {},
				contentView : [ {
					tag : 'div',
					attributes : {
						'class' : 'row-fluid'
					},
					content : [
							{
								id : 'toolbarcontainer',
								tag : 'div',
								attributes : {
									'class' : 'span3'
								}
							},
							{
								tag : 'div',
								attributes : {
									'class' : 'span9'
								},
								content : [
										{
											tag : 'div',
											attributes : {
												'class' : 'row-fluid'
											},
											content : [
													{
														tag : 'div',
														attributes : {
															'class' : 'span8'
														},
														content : [ {
															tag : 'div',
															attributes : {
																'style' : 'margin:5px'
															},
															content : [ {
																tag : 'div',
																attributes : {
																	'style' : 'text-align: right; width: 100%; height: 40px;'
																},
																content : [ {
																	tag : 'pre',
																	attributes : {
																		'style' : 'font-size: 35px; height: 33px; padding: 22px 5px 0px 0px;'
																	},
																	content : [
																			' ',
																			{
																				id : 'editbox',
																				tag : 'span',
																				attributes : {
																					'style' : 'margin-left: -10px;'
																				}
																			} ]
																} ]
															} ]
														} ]
													},
													{
														tag : 'div',
														attributes : {
															'class' : 'span4'
														},
														content : [ {
															view : OB.COMP.ButtonKey
																	.extend({
																		command : 'del',
																		contentViewButton : [ {
																			tag : 'div',
																			attributes : {
																				'class' : 'btn-icon btn-icon-backspace'
																			}
																		} ]
																	})
														} ]
													} ]
										},
										{
											tag : 'div',
											attributes : {
												'class' : 'row-fluid'
											},
											content : [
													{
														id : 'keypadcontainer',
														tag : 'div',
														attributes : {
															'class' : 'span8'
														}
													},
													{
														tag : 'div',
														attributes : {
															'class' : 'span4'
														},
														content : [
																{
																	id : 'sideenabled',
																	attributes : {
																		'style' : 'display:none'
																	},
																	tag : 'div',
																	content : [
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'row-fluid'
																				},
																				content : [
																						{
																							tag : 'div',
																							attributes : {
																								'class' : 'span6'
																							},
																							content : [ {
																								view : OB.COMP.ButtonKey
																										.extend({
																											command : '-',
																											classButton : 'btnkeyboard-num btnkeyboard-minus',
																											contentViewButton : [ '-' ]
																										})
																							} ]
																						},
																						{
																							tag : 'div',
																							attributes : {
																								'class' : 'span6'
																							},
																							content : [ {
																								view : OB.COMP.ButtonKey
																										.extend({
																											command : '+',
																											classButton : 'btnkeyboard-num btnkeyboard-plus',
																											contentViewButton : [ '+' ]
																										})
																							} ]
																						} ]
																			},
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'row-fluid'
																				},
																				content : [ {
																					tag : 'div',
																					attributes : {
																						'class' : 'span12'
																					},
																					content : [ {
																						view : OB.COMP.ButtonKey
																								.extend({
																									command : 'line:qty',
																									contentViewButton : [ OB.I18N
																											.getLabel('OBPOS_KbQuantity') ]
																								})
																					} ]
																				} ]
																			},
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'row-fluid'
																				},
																				content : [ {
																					tag : 'div',
																					attributes : {
																						'class' : 'span12'
																					},
																					content : [ {
																						view : OB.COMP.ButtonKey
																								.extend({
																									command : 'line:price',
																									permission : 'OBPOS_order.changePrice',
																									contentViewButton : [ OB.I18N
																											.getLabel('OBPOS_KbPrice') ]
																								})
																					} ]
																				} ]
																			},
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'row-fluid'
																				},
																				content : [ {
																					tag : 'div',
																					attributes : {
																						'class' : 'span12'
																					},
																					content : [ {
																						view : OB.COMP.ButtonKey
																								.extend({
																									command : 'line:dto',
																									permission : 'OBPOS_order.discount',
																									contentViewButton : [ OB.I18N
																											.getLabel('OBPOS_KbDiscount') ]
																								})
																					} ]
																				} ]
																			} ]
																},
																{
																	id : 'sidedisabled',
																	attributes : {
																		'style' : 'display:none'
																	},
																	tag : 'div',
																	content : [
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'row-fluid'
																				},
																				content : [
																						{
																							tag : 'div',
																							attributes : {
																								'class' : 'span6'
																							},
																							content : [ {
																								view : OB.COMP.ButtonKey
																							} ]
																						},
																						{
																							tag : 'div',
																							attributes : {
																								'class' : 'span6'
																							},
																							content : [ {
																								view : OB.COMP.ButtonKey
																							} ]
																						} ]
																			},
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'row-fluid'
																				},
																				content : [ {
																					tag : 'div',
																					attributes : {
																						'class' : 'span12'
																					},
																					content : [ {
																						view : OB.COMP.ButtonKey
																					} ]
																				} ]
																			},
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'row-fluid'
																				},
																				content : [ {
																					tag : 'div',
																					attributes : {
																						'class' : 'span12'
																					},
																					content : [ {
																						view : OB.COMP.ButtonKey
																					} ]
																				} ]
																			},
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'row-fluid'
																				},
																				content : [ {
																					tag : 'div',
																					attributes : {
																						'class' : 'span12'
																					},
																					content : [ {
																						view : OB.COMP.ButtonKey
																					} ]
																				} ]
																			} ]
																},
																{
																	tag : 'div',
																	attributes : {
																		'class' : 'row-fluid'
																	},
																	content : [ {
																		tag : 'div',
																		attributes : {
																			'class' : 'span12'
																		},
																		content : [ {
																			view : OB.COMP.ButtonKey
																					.extend({
																						command : 'OK',
																						contentViewButton : [ {
																							tag : 'div',
																							attributes : {
																								'class' : 'btn-icon btn-icon-enter'
																							}
																						} ]
																					})
																		} ]
																	} ]
																} ]
													} ]
										} ]
							} ]
				} ],
				initialize : function() {
					this.options[this.optionsid] = this;
					OB.UTIL.initContentView(this);
					var me = this;
					this.toolbars = {};
					this.keypads = {};
					this.keypad = '';
					this.addKeypad(OB.COMP.KeypadBasic);
					this.showKeypad();
					this.showSidepad('sidedisabled');
					this
							.on(
									'command',
									function(cmd) {
										var txt;
										var me = this;
										if (this.editbox.text()
												&& cmd === String
														.fromCharCode(13)) {
											txt = this.getString();
											if (this.defaultcommand) {
												this
														.execCommand(
																this.commands[this.defaultcommand],
																txt);
											} else {
												OB.UTIL
														.showWarning(OB.I18N
																.getLabel('OBPOS_NoDefaultActionDefined'));
											}
										} else if (cmd === 'OK') {
											txt = this.getString();
											if (txt && this.status === '') {
												if (this.defaultcommand) {
													this
															.execCommand(
																	this.commands[this.defaultcommand],
																	txt);
												} else {
													OB.UTIL
															.showWarning(OB.I18N
																	.getLabel('OBPOS_NoDefaultActionDefined'));
												}
											} else if (txt
													&& this.status !== '') {
												this
														.execCommand(
																this.commands[this.status],
																txt);
												this.setStatus('');
											}
										} else if (this.commands[cmd]) {
											txt = this.getString();
											if (this.commands[cmd].stateless) {
												this.execStatelessCommand(cmd,
														txt);
											} else {
												if (txt && this.status === '') {
													this.execCommand(
															this.commands[cmd],
															txt);
												} else if (this.status === cmd) {
													this.setStatus('');
												} else {
													this.setStatus(cmd);
												}
											}
										} else {
											OB.UTIL
													.showWarning(OB.I18N
															.getLabel('OBPOS_NoActionDefined'));
										}
									}, this);
					$(window)
							.keydown(
									function(e) {
										if (window.fixFocus()) {
											if (OB.Format.defaultDecimalSymbol !== '.') {
												if (e.keyCode === 110) {
													me
															.keyPressed(OB.Format.defaultDecimalSymbol);
												} else if (e.keyCode === 190) {
													me.keyPressed('.');
												}
											}
											if (e.keyCode === 8) {
												me.keyPressed('del');
											}
										}
										return true;
									});
					$(window)
							.keypress(
									function(e) {
										if (window.fixFocus()) {
											if (e.which !== 46
													|| OB.Format.defaultDecimalSymbol === '.') {
												me.keyPressed(String
														.fromCharCode(e.which));
											}
										}
									});
				},
				setStatus : function(newstatus) {
					var btn = this.buttons[this.status];
					if (btn) {
						btn.$el.removeClass(btn.classButtonActive);
					}
					this.status = newstatus;
					this.trigger('status', this.status);
					btn = this.buttons[this.status];
					if (btn) {
						btn.$el.addClass(btn.classButtonActive);
					}
				},
				execCommand : function(cmddefinition, txt) {
					if (!cmddefinition.permissions
							|| OB.POS.modelterminal
									.hasPermission(cmddefinition.permissions)) {
						cmddefinition.action.call(this, txt);
					}
				},
				execStatelessCommand : function(cmd, txt) {
					this.commands[cmd].action.call(this, txt);
				},
				addCommand : function(cmd, definition) {
					this.commands[cmd] = definition;
				},
				addButton : function(cmd, btn) {
					if (this.buttons[cmd]) {
						this.buttons[cmd] = this.buttons[cmd].add(btn);
					} else {
						this.buttons[cmd] = btn;
					}
				},
				clear : function() {
					this.editbox.empty();
					this.setStatus('');
				},
				show : function(toolbar) {
					var t;
					var mytoolbar;
					this.clear();
					if (toolbar) {
						for (t in this.toolbars) {
							if (this.toolbars.hasOwnProperty(t)) {
								this.toolbars[t].$el.hide();
							}
						}
						mytoolbar = this.toolbars[toolbar];
						mytoolbar.$el.show();
						if (mytoolbar.shown) {
							mytoolbar.shown();
						}
					}
					this.$el.show();
				},
				hide : function() {
					this.$el.hide();
				},
				getNumber : function() {
					var i = OB.I18N.parseNumber(this.editbox.text());
					this.editbox.empty();
					return i;
				},
				getString : function() {
					var s = this.editbox.text();
					this.editbox.empty();
					return s;
				},
				keyPressed : function(key) {
					var t;
					if (key.match(/^([0-9]|\.|,|[a-z])$/)) {
						t = this.editbox.text();
						this.editbox.text(t + key);
					} else if (key === 'del') {
						t = this.editbox.text();
						if (t.length > 0) {
							this.editbox.text(t.substring(0, t.length - 1));
						}
					} else {
						this.trigger('command', key);
					}
				},
				addToolbar : function(name, value) {
					var i, max;
					var Toolbar = Backbone.View.extend({
						tag : 'div',
						attributes : {
							'style' : 'display:none'
						}
					});
					this.toolbars[name] = new Toolbar();
					for (i = 0, max = value.length; i < max; i++) {
						if (value[i].definition) {
							this.addCommand(value[i].command,
									value[i].definition);
						}
						this.toolbars[name].$el
								.append(new BtnSide(
										{
											parent : this,
											btn : OB.COMP.ButtonKey
													.extend({
														command : value[i].command,
														classButtonActive : value[i].classButtonActive
																|| 'btnactive-green',
														permission : (value[i].definition ? value[i].definition.permission
																: null),
														contentViewButton : [ value[i].label ]
													})
										}).render().$el);
					}
					while (i < 6) {
						this.toolbars[name].$el.append(new BtnSide({
							parent : this,
							btn : OB.COMP.ButtonKey
						}).render().$el);
						i++;
					}
					this.toolbarcontainer.append(this.toolbars[name].$el);
				},
				addToolbarView : function(name, component) {
					this.toolbars[name] = new component({
						parent : this
					}).render();
					this.toolbarcontainer.append(this.toolbars[name].$el);
				},
				addKeypad : function(component) {
					var inst = new component({
						parent : this
					}).render();
					this.keypads[inst.name] = inst;
					this.keypadcontainer.append(inst.$el);
				},
				showKeypad : function(padname) {
					var t;
					for (t in this.keypads) {
						if (this.keypads.hasOwnProperty(t)) {
							this.keypads[t].$el.hide();
						}
					}
					this.keypad = this.keypads[padname || 'index'];
					this.keypad.$el.show();
					this.trigger('keypad', this.keypad.name);
				},
				showSidepad : function(sidepadname) {
					this.sideenabled.hide();
					this.sidedisabled.hide();
					this[sidepadname].show();
				},
				attr : function(attrs) {
					var attr;
					for (attr in attrs) {
						if (attrs.hasOwnProperty(attr)) {
							this.addToolbar(attr, attrs[attr]);
						}
					}
				}
			});
	OB.COMP.KeyboardCash = OB.COMP.Keyboard.extend({
		initialize : function() {
			OB.COMP.Keyboard.prototype.initialize.call(this);
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.UI = window.OB.UI || {};
	function payment(amount, modalpayment, receipt, key, name, provider) {
		if (OB.DEC.compare(amount) > 0) {
			var providerview = OB.POS.paymentProviders[provider];
			if (providerview) {
				modalpayment.show(receipt, key, name, providerview, amount);
			} else {
				receipt.addPayment(new OB.Model.PaymentLine({
					'kind' : key,
					'name' : name,
					'amount' : amount
				}));
			}
		}
	}
	function getPayment(modalpayment, receipt, key, name, provider) {
		return ({
			'permission' : key,
			'stateless' : false,
			'action' : function(txt) {
				var amount = OB.DEC.number(OB.I18N.parseNumber(txt));
				amount = _.isNaN(amount) ? receipt.getPending() : amount;
				payment(amount, modalpayment, receipt, key, name, provider);
			}
		});
	}
	OB.UI.ButtonSwitch = OB.COMP.Button.extend({
		className : 'btnkeyboard',
		initialize : function() {
			OB.COMP.Button.prototype.initialize.call(this);
			this.options.parent.on('keypad', this.render, this);
		},
		clickEvent : function(e) {
			if (this.options.parent.keypad.name === 'coins') {
				this.options.parent.showKeypad('index');
			} else {
				this.options.parent.showKeypad('coins');
			}
			this.render();
		},
		render : function() {
			if (this.options.parent.keypad.name === 'coins') {
				this.$el.text(this.options.parent.keypads.index.label);
			} else {
				this.$el.text(this.options.parent.keypads.coins.label);
			}
			return this;
		}
	});
	OB.UI.ToolbarPayment = Backbone.View
			.extend({
				tagName : 'div',
				attributes : {
					'style' : 'display:none'
				},
				initialize : function() {
					var i, max, payments, Btn, inst, cont, receipt, defaultpayment, allpayments = {};
					var modalpayment = new OB.UI.ModalPayment({
						parent : this.options.parent
					}).render();
					$('body').append(modalpayment.$el);
					payments = OB.POS.modelterminal.get('payments');
					receipt = this.options.parent.receipt;
					for (i = 0, max = payments.length; i < max; i++) {
						if (payments[i].payment.searchKey === 'OBPOS_payment.cash') {
							defaultpayment = payments[i];
						}
						allpayments[payments[i].payment.searchKey] = payments[i];
						Btn = OB.COMP.ButtonKey
								.extend({
									command : payments[i].payment.searchKey,
									definition : getPayment(modalpayment,
											receipt,
											payments[i].payment.searchKey,
											payments[i].payment._identifier,
											payments[i].provider),
									classButtonActive : 'btnactive-green',
									permission : payments[i].payment.searchKey,
									contentViewButton : [ payments[i].payment._identifier ]
								});
						inst = new Btn({
							parent : this.options.parent
						}).render();
						this.$el.append($('<div/>').attr({
							'style' : 'display:table; width:100%'
						}).append(inst.$el));
					}
					this.options.parent.addCommand('cashexact', {
						'action' : function(txt) {
							var exactpayment = allpayments[this.status]
									|| defaultpayment;
							var amount = receipt.getPending();
							if (amount > 0 && exactpayment) {
								payment(amount, modalpayment, receipt,
										exactpayment.payment.searchKey,
										exactpayment.payment._identifier,
										exactpayment.provider);
							}
						}
					});
					while (i < 5) {
						inst = new OB.COMP.ButtonKey({
							parent : this.options.parent
						}).render();
						this.$el.append($('<div/>').attr({
							'style' : 'display:table; width:100%'
						}).append(inst.$el));
						i++;
					}
					inst = new OB.UI.ButtonSwitch({
						parent : this.options.parent
					}).render();
					cont = $('<div/>').attr({
						'style' : 'display:table; width:100%;'
					}).append($('<div/>').attr({
						'style' : 'margin: 5px;'
					}).append(inst.$el));
					this.$el.append(cont);
				},
				shown : function() {
					this.options.parent.showKeypad('coins');
					this.options.parent.showSidepad('sidedisabled');
					this.options.parent.defaultcommand = 'OBPOS_payment.cash';
					this.options.parent.setStatus('OBPOS_payment.cash');
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ToolbarScan = OB.COMP.KeyboardComponent.extend({
		tagName : 'div',
		attributes : {
			'style' : 'display:none'
		},
		contentView : [ {
			tag : 'div',
			attributes : {
				'style' : 'display:table; width:100%'
			},
			content : [ {
				view : OB.COMP.ButtonKey.extend({
					command : 'code',
					classButtonActive : 'btnactive-blue',
					contentViewButton : [ OB.I18N.getLabel('OBPOS_KbCode') ]
				})
			} ]
		}, {
			tag : 'div',
			attributes : {
				'style' : 'display:table; width:100%'
			},
			content : [ {
				view : OB.COMP.ButtonKey
			} ]
		}, {
			tag : 'div',
			attributes : {
				'style' : 'display:table; width:100%'
			},
			content : [ {
				view : OB.COMP.ButtonKey
			} ]
		}, {
			tag : 'div',
			attributes : {
				'style' : 'display:table; width:100%'
			},
			content : [ {
				view : OB.COMP.ButtonKey
			} ]
		}, {
			tag : 'div',
			attributes : {
				'style' : 'display:table; width:100%'
			},
			content : [ {
				view : OB.COMP.ButtonKey
			} ]
		}, {
			tag : 'div',
			attributes : {
				'style' : 'display:table; width:100%'
			},
			content : [ {
				view : OB.COMP.ButtonKey
			} ]
		} ],
		shown : function() {
			this.options.parent.showKeypad('index');
			this.options.parent.showSidepad('sideenabled');
			this.options.parent.defaultcommand = 'code';
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.KeypadCoins = OB.COMP.KeypadBasic.extend({
		name : 'coins',
		label : OB.I18N.getLabel('OBPOS_KeypadCoins'),
		contentView : [ {
			tag : 'div',
			attributes : {
				'class' : 'row-fluid'
			},
			content : [ {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						command : '/',
						classButton : 'btnkeyboard-num',
						contentViewButton : [ '/' ]
					})
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						command : '*',
						classButton : 'btnkeyboard-num',
						contentViewButton : [ '*' ]
					})
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.ButtonKey.extend({
						command : '%',
						classButton : 'btnkeyboard-num',
						contentViewButton : [ '%' ]
					})
				} ]
			} ]
		}, {
			tag : 'div',
			attributes : {
				'class' : 'row-fluid'
			},
			content : [ {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.PaymentButton.extend({
						paymenttype : 'OBPOS_payment.cash',
						amount : 10,
						background : '#e9b7c3'
					})
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.PaymentButton.extend({
						paymenttype : 'OBPOS_payment.cash',
						amount : 20,
						background : '#bac3de'
					})
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.PaymentButton.extend({
						paymenttype : 'OBPOS_payment.cash',
						amount : 50,
						background : '#f9bb92'
					})
				} ]
			} ]
		}, {
			tag : 'div',
			attributes : {
				'class' : 'row-fluid'
			},
			content : [ {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.PaymentButton.extend({
						paymenttype : 'OBPOS_payment.cash',
						amount : 1,
						background : '#e4e0e3',
						bordercolor : '#f9e487'
					})
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.PaymentButton.extend({
						paymenttype : 'OBPOS_payment.cash',
						amount : 2,
						background : '#f9e487',
						bordercolor : '#e4e0e3'
					})
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.PaymentButton.extend({
						paymenttype : 'OBPOS_payment.cash',
						amount : 5,
						background : '#bccdc5'
					})
				} ]
			} ]
		}, {
			tag : 'div',
			attributes : {
				'class' : 'row-fluid'
			},
			content : [ {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.PaymentButton.extend({
						paymenttype : 'OBPOS_payment.cash',
						amount : 0.10,
						background : '#f9e487'
					})
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.PaymentButton.extend({
						paymenttype : 'OBPOS_payment.cash',
						amount : 0.20,
						background : '#f9e487'
					})
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.PaymentButton.extend({
						paymenttype : 'OBPOS_payment.cash',
						amount : 0.50,
						background : '#f9e487'
					})
				} ]
			} ]
		}, {
			tag : 'div',
			attributes : {
				'class' : 'row-fluid'
			},
			content : [ {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.PaymentButton.extend({
						paymenttype : 'OBPOS_payment.cash',
						amount : 0.01,
						background : '#f3bc9e'
					})
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.PaymentButton.extend({
						paymenttype : 'OBPOS_payment.cash',
						amount : 0.02,
						background : '#f3bc9e'
					})
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'span4'
				},
				content : [ {
					view : OB.COMP.PaymentButton.extend({
						paymenttype : 'OBPOS_payment.cash',
						amount : 0.05,
						background : '#f3bc9e'
					})
				} ]
			} ]
		} ],
		initialize : function() {
			OB.COMP.KeypadCoins.__super__.initialize.call(this);
			this.options.parent.on('status', function(status) {
				if (status === 'OBPOS_payment.cash') {
					this.options.parent.showKeypad('coins');
				} else {
					this.options.parent.showKeypad('index');
				}
			}, this);
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.KeyboardOrder = OB.COMP.Keyboard
			.extend({
				initialize : function() {
					this.addCommand('line:qty', {
						'action' : function(txt) {
							if (this.line) {
								this.receipt.setUnit(this.line, OB.I18N
										.parseNumber(txt));
								this.receipt.trigger('scan');
							}
						}
					});
					this.addCommand('line:price', {
						'permission' : 'OBPOS_order.changePrice',
						'action' : function(txt) {
							if (this.line) {
								this.receipt.setPrice(this.line, OB.I18N
										.parseNumber(txt));
								this.receipt.trigger('scan');
							}
						}
					});
					this.addCommand('line:dto', {
						'permission' : 'OBPOS_order.discount',
						'action' : function(txt) {
							if (this.line) {
								this.receipt.trigger('discount', this.line,
										OB.I18N.parseNumber(txt));
							}
						}
					});
					this
							.addCommand(
									'code',
									{
										'action' : function(txt) {
											var criteria, me = this;
											function successCallbackPrices(
													dataPrices, dataProducts) {
												if (dataPrices) {
													_
															.each(
																	dataPrices.models,
																	function(
																			currentPrice) {
																		if (dataProducts
																				.get(currentPrice
																						.get('product'))) {
																			dataProducts
																					.get(
																							currentPrice
																									.get('product'))
																					.set(
																							'price',
																							currentPrice);
																		}
																	});
													_
															.each(
																	dataProducts.models,
																	function(
																			currentProd) {
																		if (currentProd
																				.get('price') === undefined) {
																			var price = new OB.Model.ProductPrice(
																					{
																						'listPrice' : 0
																					});
																			dataProducts
																					.get(
																							currentProd
																									.get('id'))
																					.set(
																							'price',
																							price);
																			OB.UTIL
																					.showWarning("No price found for product "
																							+ currentProd
																									.get('_identifier'));
																		}
																	});
												} else {
													OB.UTIL
															.showWarning("OBDAL No prices found for products");
													_
															.each(
																	dataProducts.models,
																	function(
																			currentProd) {
																		var price = new OB.Model.ProductPrice(
																				{
																					'listPrice' : 0
																				});
																		currentProd
																				.set(
																						'price',
																						price);
																	});
												}
												me.receipt
														.addProduct(new Backbone.Model(
																dataProducts
																		.at(0)));
												me.receipt.trigger('scan');
											}
											function errorCallback(tx, error) {
												OB.UTIL
														.showError("OBDAL error: "
																+ error);
											}
											function successCallbackProducts(
													dataProducts) {
												if (dataProducts
														&& dataProducts.length > 0) {
													criteria = {
														'priceListVersion' : OB.POS.modelterminal
																.get('pricelistversion').id
													};
													OB.Dal
															.find(
																	OB.Model.ProductPrice,
																	criteria,
																	successCallbackPrices,
																	errorCallback,
																	dataProducts);
												} else {
													OB.UTIL
															.showWarning(OB.I18N
																	.getLabel(
																			'OBPOS_KbUPCEANCodeNotFound',
																			[ txt ]));
												}
											}
											criteria = {
												'uPCEAN' : txt
											};
											OB.Dal.find(OB.Model.Product,
													criteria,
													successCallbackProducts,
													errorCallback);
										}
									});
					this.addCommand('+', {
						'stateless' : true,
						'action' : function(txt) {
							if (this.line) {
								this.receipt.addUnit(this.line, OB.I18N
										.parseNumber(txt));
								this.receipt.trigger('scan');
							}
						}
					});
					this.addCommand('-', {
						'stateless' : true,
						'action' : function(txt) {
							if (this.line) {
								this.receipt.removeUnit(this.line, OB.I18N
										.parseNumber(txt));
								this.receipt.trigger('scan');
							}
						}
					});
					this.products = this.options.DataProductPrice;
					this.receipt = this.options.modelorder;
					this.line = null;
					this.receipt.get('lines').on('selected', function(line) {
						this.line = line;
						this.clear();
					}, this);
					OB.COMP.Keyboard.prototype.initialize.call(this);
					this.addKeypad(OB.COMP.KeypadCoins);
					this.addToolbarView('toolbarpayment', OB.UI.ToolbarPayment);
					this.addToolbarView('toolbarscan', OB.COMP.ToolbarScan);
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.UTIL = window.OB.UTIL || {};
	OB.UTIL.loginButtonAction = function() {
		var u = $('#username').val();
		var p = $('#password').val();
		if (!u || !p) {
			alert('Please enter your username and password');
		} else {
			OB.POS.modelterminal.login(u, p);
		}
	};
	OB.COMP.LoginUserButton = Backbone.View.extend({
		tagName : 'div',
		className : 'login-user-button',
		initialize : function() {
			this.component = B({
				kind : B.KindJQuery('div'),
				attr : {
					'class' : 'login-user-button-bottom'
				},
				content : [ {
					kind : B.KindJQuery('div'),
					id : 'bottomIcon',
					attr : {
						'class' : 'login-user-button-bottom-icon'
					},
					content : [ '.' ]
				}, {
					kind : B.KindJQuery('div'),
					id : 'bottomText',
					attr : {
						'class' : 'login-user-button-bottom-text'
					}
				} ]
			});
			this.$el.append(this.component.$el);
			this.$bottomIcon = this.component.context.bottomIcon.$el;
			this.$bottomText = this.component.context.bottomText.$el;
			this.$defaultPassword = 'openbravo';
			var me = this;
			this.$el.click(function(e) {
				e.preventDefault();
				var u = me.$user, p = me.$defaultPassword;
				$('#username').val(u);
				$('#password').val('');
				$('#password').focus();
			});
		},
		append : function(child) {
			if (child.$el) {
				this.$bottomText.append(child.$el);
			}
		},
		attr : function(attributes) {
			if (attributes.userImage && attributes.userImage !== 'none') {
				this.$el.attr('style', 'background-image: url("'
						+ attributes.userImage + '")');
			}
			if (attributes.userConnected === 'true') {
				this.$bottomIcon.attr('style',
						'background-image: url("img/iconOnlineUser.png");');
			}
			if (attributes.user) {
				this.$user = attributes.user;
			}
		}
	});
	OB.COMP.Login = OB.COMP.CustomView
			.extend({
				createView : function() {
					return ({
						kind : B.KindJQuery('section'),
						content : [
								{
									kind : B.KindJQuery('div'),
									attr : {
										'class' : 'row login-header-row'
									},
									content : [ {
										kind : B.KindJQuery('div'),
										attr : {
											'class' : 'span12'
										},
										content : [
												{
													kind : B.KindJQuery('div'),
													id : 'loginHeaderCompany',
													attr : {
														'class' : 'login-header-company'
													}
												},
												{
													kind : B.KindJQuery('div'),
													attr : {
														'class' : 'login-header-ob'
													}
												} ]
									} ]
								},
								{
									kind : B.KindJQuery('div'),
									attr : {
										'class' : 'row'
									},
									content : [
											{
												kind : B.KindJQuery('div'),
												attr : {
													'class' : 'span6'
												},
												content : [ {
													kind : B.KindJQuery('div'),
													id : 'loginUserContainer',
													attr : {
														'class' : 'row login-user-container'
													},
													content : [ '.' ]
												} ]
											},
											{
												kind : B.KindJQuery('div'),
												attr : {
													'class' : 'span6'
												},
												content : [ {
													kind : B.KindJQuery('div'),
													attr : {
														'class' : 'row-fluid login-inputs-container'
													},
													content : [
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'id' : 'login-inputs'
																},
																content : [
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'class' : 'row'
																			},
																			content : [ {
																				kind : B
																						.KindJQuery('div'),
																				attr : {
																					'class' : 'span6 login-inputs-screenlocked'
																				},
																				content : [ OB.I18N
																						.getLabel('OBPOS_LoginScreenLocked') ]
																			} ]
																		},
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'class' : 'row'
																			},
																			content : [ {
																				kind : B
																						.KindJQuery('div'),
																				attr : {
																					'class' : 'span6 login-inputs-userpassword'
																				},
																				content : [ {
																					kind : B
																							.KindJQuery('input'),
																					id : 'username',
																					attr : {
																						'id' : 'username',
																						'class' : 'login-inputs-username',
																						'type' : 'text',
																						'placeholder' : OB.I18N
																								.getLabel('OBPOS_LoginUserInput'),
																						'onkeydown' : 'if(event && event.keyCode == 13) { OB.UTIL.loginButtonAction(); }; return true;'
																					}
																				} ]
																			} ]
																		},
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'class' : 'row'
																			},
																			content : [ {
																				kind : B
																						.KindJQuery('div'),
																				attr : {
																					'class' : 'span6 login-inputs-userpassword'
																				},
																				content : [ {
																					kind : B
																							.KindJQuery('input'),
																					id : 'password',
																					attr : {
																						'id' : 'password',
																						'class' : 'login-inputs-password',
																						'type' : 'password',
																						'placeholder' : OB.I18N
																								.getLabel('OBPOS_LoginPasswordInput'),
																						'onkeydown' : 'if(event && event.keyCode == 13) { OB.UTIL.loginButtonAction(); }; return true;'
																					}
																				} ]
																			} ]
																		},
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'class' : 'row'
																			},
																			content : [
																					{
																						kind : B
																								.KindJQuery('div'),
																						attr : {
																							'class' : 'span1',
																							'style' : 'color: transparent;'
																						},
																						content : [ '.' ]
																					},
																					{
																						kind : B
																								.KindJQuery('div'),
																						attr : {
																							'class' : 'span1',
																							'style' : 'color: transparent;'
																						},
																						content : [ '.' ]
																					},
																					{
																						kind : B
																								.KindJQuery('div'),
																						attr : {
																							'class' : 'span2',
																							'style' : 'margin: 20px 0px 0px 0px; text-align: center;'
																						},
																						content : [ {
																							kind : OB.COMP.ModalDialogButton,
																							'id' : 'loginaction',
																							attr : {
																								'id' : 'loginaction',
																								'label' : OB.I18N
																										.getLabel('OBPOS_LoginButton'),
																								'clickEvent' : function() {
																									OB.UTIL
																											.loginButtonAction();
																								}
																							}
																						} ]
																					},
																					{
																						kind : B
																								.KindJQuery('div'),
																						attr : {
																							'class' : 'span2'
																						},
																						content : [ {
																							kind : OB.COMP.Clock,
																							attr : {
																								'className' : 'login-clock'
																							}
																						} ]
																					} ]
																		} ]
															},
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'id' : 'login-browsernotsupported',
																	'style' : 'display: none;'
																},
																content : [
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'class' : 'row'
																			},
																			content : [ {
																				kind : B
																						.KindJQuery('div'),
																				attr : {
																					'class' : 'span6 login-browsernotsupported-title'
																				},
																				content : [ OB.I18N
																						.getLabel('OBPOS_LoginBrowserNotSupported') ]
																			} ]
																		},
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'class' : 'row'
																			},
																			content : [
																					{
																						kind : B
																								.KindJQuery('div'),
																						attr : {
																							'class' : 'span4'
																						},
																						content : [
																								{
																									kind : B
																											.KindJQuery('div'),
																									attr : {
																										'class' : 'login-browsernotsupported-content'
																									},
																									content : [ OB.I18N
																											.getLabel('OBPOS_LoginBrowserNotSupported_P1') ]
																								},
																								{
																									kind : B
																											.KindJQuery('div'),
																									attr : {
																										'class' : 'login-browsernotsupported-content'
																									},
																									content : [ OB.I18N
																											.getLabel(
																													'OBPOS_LoginBrowserNotSupported_P2',
																													[
																															'Chrome, Safari, Safari (iOS)',
																															'Android' ]) ]
																								},
																								{
																									kind : B
																											.KindJQuery('div'),
																									attr : {
																										'class' : 'login-browsernotsupported-content'
																									},
																									content : [ OB.I18N
																											.getLabel('OBPOS_LoginBrowserNotSupported_P3') ]
																								} ]
																					},
																					{
																						kind : B
																								.KindJQuery('div'),
																						attr : {
																							'class' : 'span2'
																						},
																						content : [ {
																							kind : OB.COMP.Clock,
																							attr : {
																								'className' : 'login-browsernotsupported-clock'
																							}
																						} ]
																					} ]
																		} ]
															} ]
												} ]
											} ]
								} ],
						init : function() {
							OB.POS.modelterminal
									.on(
											'loginfail',
											function(status, data) {
												var msg;
												if (data && data.messageTitle) {
													msg = data.messageTitle;
												}
												if (data && data.messageText) {
													msg += (msg ? '\n' : '')
															+ data.messageText;
												}
												msg = msg
														|| 'Invalid user name or password.\nPlease try again.';
												alert(msg);
												$('#password').val('');
												$('#username').focus();
											});
							OB.POS.modelterminal.on('loginUserImgPressfail',
									function(status) {
										$('#password').val('');
										$('#password').focus();
									});
							this.context
									.on(
											'domready',
											function() {
												var me = this;
												function setUserImages(
														jsonImgData) {
													var name = [], userName = [], image = [], connected = [];
													jsonImgData = jsonImgData.response[0].data;
													$
															.each(
																	jsonImgData,
																	function(k,
																			v) {
																		name
																				.push(v.name);
																		userName
																				.push(v.userName);
																		image
																				.push(v.image);
																		connected
																				.push(v.connected);
																	});
													var content = {}, i, target = me.context.loginUserContainer.$el, isFirstTime = true;
													for (i = 0; i < name.length; i++) {
														if (isFirstTime) {
															target.html('');
															isFirstTime = false;
														}
														content = B({
															kind : OB.COMP.LoginUserButton,
															attr : {
																'user' : userName[i],
																'userImage' : image[i],
																'userConnected' : connected[i]
															},
															content : [ name[i] ]
														}).$el;
														target.append(content);
													}
													OB.UTIL.showLoading(false);
													return true;
												}
												function setCompanyLogo(
														jsonCompanyLogo) {
													var logoUrl = [];
													jsonCompanyLogo = jsonCompanyLogo.response[0].data;
													$
															.each(
																	jsonCompanyLogo,
																	function(k,
																			v) {
																		logoUrl
																				.push(v.logoUrl);
																	});
													me.context.loginHeaderCompany.$el
															.css(
																	'background-image',
																	'url("'
																			+ logoUrl[0]
																			+ '")');
													return true;
												}
												$
														.ajax({
															url : '../../org.openbravo.retail.posterminal.service.loginutils',
															contentType : 'application/json;charset=utf-8',
															dataType : 'json',
															data : {
																command : 'companyLogo',
																terminalName : OB.POS.paramTerminal
															},
															success : function(
																	data,
																	textStatus,
																	jqXHR) {
																setCompanyLogo(data);
															}
														});
												if (!$.browser.webkit
														|| !window.openDatabase) {
													$('#login-inputs').css(
															'display', 'none');
													$(
															'#login-browsernotsupported')
															.css('display',
																	'block');
													OB.UTIL.showLoading(false);
													return true;
												}
												$
														.ajax({
															url : '../../org.openbravo.retail.posterminal.service.loginutils',
															contentType : 'application/json;charset=utf-8',
															dataType : 'json',
															data : {
																command : 'userImages',
																terminalName : OB.POS.paramTerminal
															},
															success : function(
																	data,
																	textStatus,
																	jqXHR) {
																setUserImages(data);
															}
														});
												this.context.username.$el
														.focus();
											}, this);
						}
					});
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ButtonNew = OB.COMP.ToolbarButton.extend({
		icon : 'btn-icon btn-icon-new',
		clickEvent : function(e) {
			this.options.modelorderlist.addNewOrder();
		}
	});
	OB.COMP.ButtonDelete = OB.COMP.ToolbarButton.extend({
		icon : 'btn-icon btn-icon-delete',
		clickEvent : function(e) {
			$('#modalDeleteReceipt').modal('show');
		}
	});
	OB.COMP.ButtonPrint = OB.COMP.ToolbarButton.extend({
		icon : 'btn-icon btn-icon-print',
		clickEvent : function(e) {
			var receipt = this.options.modelorder;
			receipt.calculateTaxes(function() {
				receipt.trigger('print');
			});
		}
	});
	OB.COMP.MenuReturn = OB.COMP.MenuAction.extend({
		label : OB.I18N.getLabel('OBPOS_LblReturn'),
		clickEvent : function(e) {
			this.options.modelorder.setOrderTypeReturn();
		}
	});
	OB.COMP.MenuInvoice = OB.COMP.MenuAction.extend({
		label : OB.I18N.getLabel('OBPOS_LblInvoice'),
		clickEvent : function(e) {
			this.options.modelorder.setOrderInvoice();
		}
	});
}());
(function() {
	var db, dbSize, dbSuccess, dbError, fetchData;
	OB = window.OB || {};
	OB.DATA = window.OB.DATA || {};
	OB.DATA.Container = function(context) {
		this.context = context;
		this.datachildren = [];
	};
	OB.DATA.Container.prototype.append = function(child) {
		this.datachildren.push(child);
	};
	OB.DATA.Container.prototype.inithandler = function() {
		var i, max;
		for (i = 0, max = this.datachildren.length; i < max; i++) {
			this.datachildren[i].load();
		}
	};
	OB.DATA.Base = {
		load : function() {
			this.ds.load(this.loadparams);
		}
	};
	OB.DATA.BPs = function(context) {
		this._id = 'DataBPs';
		this.context = context;
		this.ds = new OB.DS.DataSource(new OB.DS.Request(
				'org.openbravo.retail.posterminal.master.BusinessPartner',
				OB.POS.modelterminal.get('terminal').client,
				OB.POS.modelterminal.get('terminal').organization));
		this.loadparams = {};
	};
	_.extend(OB.DATA.BPs.prototype, OB.DATA.Base);
	OB.DATA.Category = function(context, id) {
		this._id = 'DataCategory';
		this.context = context;
		this.ds = new OB.DS.DataSource(new OB.DS.Request(
				'org.openbravo.retail.posterminal.master.Category'));
		this.loadparams = {};
	};
	_.extend(OB.DATA.Category.prototype, OB.DATA.Base);
}());
(function() {
	OB = window.OB || {};
	OB.DATA = window.OB.DATA || {};
	OB.DATA.OrderSave = function(context) {
		this._id = 'logicOrderSave';
		this.context = context;
		this.receipt = context.modelorder;
		this.receipt
				.on(
						'closed',
						function() {
							var me = this, docno = this.receipt
									.get('documentNo'), json = this.receipt
									.serializeToJSON(), receiptId = this.receipt
									.get('id');
							this.receipt.set('hasbeenpaid', 'Y');
							OB.UTIL.updateDocumentSequenceInDB(docno);
							delete this.receipt.attributes.json;
							this.receipt.set('json', JSON
									.stringify(this.receipt.toJSON()));
							if (OB.POS.modelterminal.get('connectedToERP')) {
								this.receipt.set('isbeingprocessed', 'Y');
							}
							OB.Dal
									.save(
											this.receipt,
											function() {
												if (OB.POS.modelterminal
														.get('connectedToERP')) {
													OB.Dal
															.get(
																	OB.Model.Order,
																	receiptId,
																	function(
																			receipt) {
																		var successCallback, errorCallback, orderList;
																		successCallback = function() {
																			OB.UTIL
																					.showSuccess(OB.I18N
																							.getLabel(
																									'OBPOS_MsgReceiptSaved',
																									[ docno ]));
																		};
																		errorCallback = function() {
																			OB.UTIL
																					.showError(OB.I18N
																							.getLabel(
																									'OBPOS_MsgReceiptNotSaved',
																									[ docno ]));
																		};
																		orderList = new OB.Collection.OrderList();
																		orderList
																				.add(receipt);
																		OB.UTIL
																				.processOrders(
																						context,
																						orderList,
																						successCallback,
																						errorCallback);
																	}, null);
												}
											},
											function() {
												OB.UTIL
														.showError(OB.I18N
																.getLabel(
																		'OBPOS_MsgReceiptNotSaved',
																		[ docno ]));
											});
						}, this);
	};
}());
(function() {
	OB = window.OB || {};
	OB.DATA = window.OB.DATA || {};
	OB.DATA.OrderTaxes = function(context) {
		this._id = 'logicOrderTaxes';
		this.receipt = context.modelorder;
		this.receipt.calculateTaxes = function(callback) {
			var me = this, bpTaxCategory = this.get('bp').get('taxCategory'), lines = this
					.get('lines'), len = lines.length, taxes = {}, totalnet = OB.DEC.Zero, queue = {}, triggerNext = false, gross = OB.DEC.Zero;
			_.each(lines.models, function(element, index, list) {
				var product = element.get('product');
				OB.Dal.find(OB.Model.TaxRate, {
					taxCategory : product.get('taxCategory'),
					businessPartnerTaxCategory : bpTaxCategory
				}, function(coll) {
					var taxRate, rate, taxAmt, net, pricenet, amount, taxId;
					if (coll.length === 0) {
						throw 'No tax rate found';
					}
					taxRate = coll.at(0);
					taxId = taxRate.get('id');
					rate = new BigDecimal(String(taxRate.get('rate')));
					rate = rate.divide(new BigDecimal('100'), 20,
							BigDecimal.prototype.ROUND_UNNECESSARY);
					pricenet = OB.DEC.div(element.get('price'), rate
							.add(new BigDecimal('1')));
					net = OB.DEC.mul(pricenet, element.get('qty'));
					amount = OB.DEC.sub(element.get('gross'), net);
					gross = element.get('gross');
					element.set('tax', taxId);
					element.set('taxAmount', amount);
					element.set('net', net);
					element.set('pricenet', pricenet);
					totalnet = OB.DEC.add(totalnet, net);
					if (taxes[taxId]) {
						taxes[taxId].net = OB.DEC.add(taxes[taxId].net, net);
						taxes[taxId].amount = OB.DEC.add(taxes[taxId].amount,
								amount);
						taxes[taxId].gross = OB.DEC.add(taxes[taxId].gross,
								gross);
					} else {
						taxes[taxId] = {};
						taxes[taxId].name = taxRate.get('name');
						taxes[taxId].rate = taxRate.get('rate');
						taxes[taxId].net = net;
						taxes[taxId].amount = amount;
						taxes[taxId].gross = gross;
					}
					queue[element.cid] = true;
					triggerNext = OB.UTIL.queueStatus(queue);
					if (triggerNext) {
						me.set('taxes', taxes);
						me.set('net', totalnet);
						if (callback) {
							callback();
						}
					}
				}, function() {
					window.console.error(arguments);
				});
				queue[element.cid] = false;
			});
		};
	};
}());
(function() {
	OB = window.OB || {};
	OB.DATA = window.OB.DATA || {};
	OB.DATA.OrderDiscount = function(context) {
		this._id = 'logicOrderDiscounts';
		this.receipt = context.modelorder;
		this.receipt.on('discount', function(line, percentage) {
			if (line) {
				if (OB.DEC.compare(percentage) > 0
						&& OB.DEC.compare(OB.DEC.sub(percentage, OB.DEC
								.number(100))) <= 0) {
					this.receipt.setPrice(line, OB.DEC.div(OB.DEC.mul(line
							.get('priceList'), OB.DEC.sub(OB.DEC.number(100),
							percentage)), OB.DEC.number(100)));
				} else if (OB.DEC.compare(percentage) === 0) {
					this.receipt.setPrice(line, line.get('priceList'));
				}
			}
		}, this);
	};
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.RenderOrder = OB.COMP.SelectButton
			.extend({
				contentView : [ {
					tag : 'div',
					attributes : {
						'style' : 'line-height: 23px;'
					},
					content : [
							{
								tag : 'div',
								content : [ {
									id : 'divdate',
									tag : 'div',
									attributes : {
										style : 'float: left; width: 15%'
									}
								}, {
									id : 'divdocumentno',
									tag : 'div',
									attributes : {
										style : 'float: left; width: 25%;'
									}
								}, {
									id : 'divbp',
									tag : 'div',
									attributes : {
										style : 'float: left; width: 60%;'
									}
								}, {
									tag : 'div',
									attributes : {
										style : 'clear: both;'
									}
								} ]
							},
							{
								tag : 'div',
								content : [
										{
											id : 'divreturn',
											tag : 'div',
											attributes : {
												style : 'float: left; width: 25%; color: #f8941d; font-weight:bold;'
											}
										},
										{
											id : 'divinvoice',
											tag : 'div',
											attributes : {
												style : 'float: left; width: 25%; font-weight:bold;'
											}
										},
										{
											id : 'divgross',
											tag : 'div',
											attributes : {
												style : 'float: right; width: 25%; text-align: right; font-weight:bold;'
											}
										}, {
											tag : 'div',
											attributes : {
												style : 'clear: both;'
											}
										} ]
							} ]
				} ],
				render : function() {
					this.divdate.text(OB.I18N.formatHour(this.model
							.get('orderDate')));
					this.divdocumentno.text(this.model.get('documentNo'));
					this.divbp.text(this.model.get('bp').get('_identifier'));
					this.divreturn
							.text(this.model.get('orderType') === 1 ? OB.I18N
									.getLabel('OBPOS_ToReturn') : '');
					this.divinvoice
							.text(this.model.get('generateInvoice') ? OB.I18N
									.getLabel('OBPOS_ToInvoice') : '');
					this.divgross.text(this.model.printGross());
					return this;
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ListReceipts = Backbone.View.extend({
		optionsid : 'ListReceipts',
		tag : 'div',
		className : 'row-fluid',
		contentView : [ {
			tag : 'div',
			attributes : {
				'class' : 'span12'
			},
			content : [ {
				tag : 'div',
				attributes : {
					'style' : 'border-bottom: 1px solid #cccccc;'
				}
			}, {
				tag : 'div',
				content : [ {
					id : 'tableview',
					view : OB.UI.TableView.extend({
						renderLine : OB.COMP.RenderOrder
					})
				} ]
			} ]
		} ],
		initialize : function() {
			this.options[this.optionsid] = this;
			OB.UTIL.initContentView(this);
			var me = this;
			this.receipt = this.options.modelorder;
			this.receiptlist = this.options.modelorderlist;
			this.tableview.registerCollection(this.receiptlist);
			this.receiptlist.on('click', function(model, index) {
				this.receiptlist.load(model);
			}, this);
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.UI = window.OB.UI || {};
	OB.UI.ModalReceipts = OB.COMP.Modal.extend({
		id : 'modalreceipts',
		header : OB.I18N.getLabel('OBPOS_LblAssignReceipt'),
		getContentView : function() {
			return OB.COMP.ListReceipts;
		},
		showEvent : function(e) {
			this.options.modelorderlist.saveCurrent();
		}
	});
	OB.COMP.ModalDeleteReceipt = OB.COMP.ModalAction.extend({
		id : 'modalDeleteReceipt',
		header : OB.I18N.getLabel('OBPOS_ConfirmDeletion'),
		setBodyContent : function() {
			return ({
				kind : B.KindJQuery('div'),
				content : [ OB.I18N.getLabel('OBPOS_MsgConfirmDelete'), {
					kind : B.KindJQuery('br')
				}, OB.I18N.getLabel('OBPOS_cannotBeUndone') ]
			});
		},
		setBodyButtons : function() {
			return ({
				kind : B.KindJQuery('div'),
				content : [ {
					kind : OB.COMP.DeleteReceiptDialogApply
				}, {
					kind : OB.COMP.DeleteReceiptDialogCancel
				} ]
			});
		}
	});
	OB.COMP.DeleteReceiptDialogApply = OB.COMP.Button.extend({
		isActive : true,
		className : 'btnlink btnlink-gray modal-dialog-content-button',
		render : function() {
			this.$el.html(OB.I18N.getLabel('OBPOS_LblYesDelete'));
			return this;
		},
		clickEvent : function(e) {
			if (this.options.modelorder.get('id')) {
				this.options.modelorderlist.saveCurrent();
				OB.Dal.remove(this.options.modelorderlist.current, null, null);
			}
			this.options.modelorderlist.deleteCurrent();
			$('#modalDeleteReceipt').modal('hide');
		}
	});
	OB.COMP.DeleteReceiptDialogCancel = OB.COMP.Button.extend({
		attributes : {
			'data-dismiss' : 'modal'
		},
		className : 'btnlink btnlink-gray modal-dialog-content-button',
		render : function() {
			this.$el.html(OB.I18N.getLabel('OBPOS_LblCancel'));
			return this;
		},
		clickEvent : function(e) {
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.RenderBusinessPartner = OB.COMP.SelectButton.extend({
		contentView : [ {
			tag : 'div',
			attributes : {
				'style' : 'line-height: 23px;'
			},
			content : [ {
				id : 'dividentifier',
				tag : 'div'
			}, {
				id : 'divlocation',
				tag : 'div',
				attributes : {
					style : 'color: #888888;'
				}
			}, {
				tag : 'div',
				attributes : {
					style : 'clear: both;'
				}
			} ]
		} ],
		render : function() {
			this.dividentifier.text(this.model.get('_identifier'));
			this.divlocation.text(this.model.get('locName'));
			return this;
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.SearchBP = function(context) {
		var me = this;
		this.searchAction = function() {
			function errorCallback(tx, error) {
				OB.UTIL.showError("OBDAL error: " + error);
			}
			function successCallbackBPs(dataBps) {
				if (dataBps && dataBps.length > 0) {
					me.bps.reset(dataBps.models);
				} else {
					me.bps.reset();
				}
			}
			var criteria = {};
			if (me.bpname.val() && me.bpname.val() !== '') {
				criteria._identifier = {
					operator : OB.Dal.CONTAINS,
					value : me.bpname.val()
				};
			}
			OB.Dal.find(OB.Model.BusinessPartner, criteria, successCallbackBPs,
					errorCallback);
		};
		this._id = 'SearchBPs';
		this.receipt = context.modelorder;
		this.bps = new OB.Collection.BusinessPartnerList();
		this.bps.on('click', function(model) {
			var saveInDB = true;
			this.receipt.setBPandBPLoc(model, false, saveInDB);
		}, this);
		this.receipt.on('clear', function() {
			me.bpname.val('');
			me.searchAction(null);
		}, this);
		this.component = B({
			kind : B.KindJQuery('div'),
			attr : {
				'class' : 'row-fluid'
			},
			content : [ {
				kind : B.KindJQuery('div'),
				attr : {
					'class' : 'span12'
				},
				content : [
						{
							kind : B.KindJQuery('div'),
							attr : {
								'class' : 'row-fluid',
								'style' : 'border-bottom: 1px solid #cccccc;'
							},
							content : [ {
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'span12'
								},
								content : [ {
									kind : B.KindJQuery('div'),
									attr : {
										'style' : 'padding: 10px'
									},
									content : [ {
										kind : B.KindJQuery('div'),
										attr : {
											'style' : 'display: table;'
										},
										content : [
												{
													kind : B.KindJQuery('div'),
													attr : {
														'style' : 'display: table-cell; width: 100%;'
													},
													content : [ {
														kind : OB.COMP.SearchInput,
														id : 'bpname',
														attr : {
															'type' : 'text',
															'xWebkitSpeech' : 'x-webkit-speech',
															'className' : 'input',
															'style' : 'width: 100%;',
															'clickEvent' : function(
																	e) {
																if (e
																		&& e.keyCode === 13) {
																	me
																			.searchAction();
																	return false;
																} else {
																	return true;
																}
															}
														}
													} ]
												},
												{
													kind : B.KindJQuery('div'),
													attr : {
														'style' : 'display: table-cell;'
													},
													content : [ {
														kind : OB.COMP.SmallButton,
														attr : {
															'className' : 'btnlink-gray',
															'icon' : 'btn-icon-small btn-icon-clear',
															'style' : 'width: 100px; margin: 0px 5px 8px 19px;',
															'clickEvent' : function() {
																this.$el
																		.parent()
																		.prev()
																		.children()
																		.val('');
																me
																		.searchAction();
															}
														}
													} ]
												},
												{
													kind : B.KindJQuery('div'),
													attr : {
														'style' : 'display: table-cell;'
													},
													content : [ {
														kind : OB.COMP.SmallButton,
														attr : {
															'className' : 'btnlink-yellow',
															'icon' : 'btn-icon-small btn-icon-search',
															'style' : 'width: 100px; margin: 0px 0px 8px 5px;',
															'clickEvent' : function() {
																me
																		.searchAction();
															}
														}
													} ]
												} ]
									} ]
								} ]
							} ]
						},
						{
							kind : B.KindJQuery('div'),
							attr : {
								'class' : 'row-fluid',
								'style' : 'max-height: 475px; overflow: auto;'
							},
							content : [ {
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'span12'
								},
								content : [ {
									kind : B.KindJQuery('div'),
									content : [ {
										kind : OB.UI.TableView,
										id : 'tableview',
										attr : {
											collection : this.bps,
											renderEmpty : OB.COMP.RenderEmpty,
											renderLine : OB.COMP.RenderBusinessPartner
										}
									} ]
								} ]
							} ]
						} ]
			} ]
		});
		this.$el = this.component.$el;
		this.bpname = this.component.context.bpname.$el;
		this.tableview = this.component.context.tableview;
	};
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ModalBPs = OB.COMP.Modal.extend({
		id : 'modalcustomer',
		header : OB.I18N.getLabel('OBPOS_LblAssignCustomer'),
		getContentView : function() {
			return ({
				kind : OB.COMP.SearchBP
			});
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.Scan = function(context) {
		var me = this;
		var undoclick;
		this.component = B({
			kind : B.KindJQuery('div'),
			content : [ {
				kind : B.KindJQuery('div'),
				attr : {
					'style' : 'position:relative; background-color: #7da7d9; background-size: cover; color: white; height: 200px; margin: 5px; padding: 5px'
				},
				content : [
						{
							kind : OB.COMP.Clock,
							attr : {
								'className' : 'pos-clock'
							}
						},
						{
							kind : B.KindJQuery('div'),
							content : [
									{
										kind : B.KindJQuery('div'),
										id : 'msgwelcome',
										attr : {
											'style' : 'padding: 10px; display: none;'
										},
										content : [ {
											kind : B.KindJQuery('div'),
											attr : {
												'style' : 'float:right;'
											},
											content : [ OB.I18N
													.getLabel('OBPOS_WelcomeMessage') ]
										} ]
									},
									{
										kind : B.KindJQuery('div'),
										id : 'msgaction',
										attr : {
											'style' : 'display: none;'
										},
										content : [
												{
													kind : B.KindJQuery('div'),
													id : 'txtaction',
													attr : {
														'style' : 'padding: 10px; float: left; width: 320px; line-height: 23px;'
													}
												},
												{
													kind : B.KindJQuery('div'),
													attr : {
														'style' : 'float: right;'
													},
													content : [ {
														kind : OB.COMP.SmallButton,
														attr : {
															'label' : OB.I18N
																	.getLabel('OBPOS_LblUndo'),
															'className' : 'btnlink-white btnlink-fontblue',
															'clickEvent' : function() {
																if (undoclick) {
																	undoclick();
																}
															}
														}
													} ]
												} ]
									} ]
						} ]
			} ]
		});
		this.$el = this.component.$el;
		var msgwelcome = this.component.context.msgwelcome.$el;
		var txtaction = this.component.context.txtaction.$el;
		var msgaction = this.component.context.msgaction.$el;
		this.receipt = context.modelorder;
		this.receipt.on('clear change:undo', function() {
			var undoaction = this.receipt.get('undo');
			if (undoaction) {
				msgwelcome.hide();
				msgaction.show();
				txtaction.text(undoaction.text);
				undoclick = undoaction.undo;
			} else {
				msgaction.hide();
				msgwelcome.show();
			}
		}, this);
	};
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ButtonTabScan = OB.COMP.ToolbarButtonTab.extend({
		tabpanel : '#scan',
		label : OB.I18N.getLabel('OBPOS_LblScan'),
		render : function() {
			OB.COMP.ToolbarButtonTab.prototype.render.call(this);
			this.options.modelorder.on('clear scan', function() {
				this.$el.tab('show');
				this.$el.parent().parent().addClass('active');
				OB.UTIL.setOrderLineInEditMode(false);
			}, this);
			this.options.SearchBPs.bps.on('click', function(model, index) {
				this.$el.tab('show');
				this.$el.parent().parent().addClass('active');
				OB.UTIL.setOrderLineInEditMode(false);
			}, this);
			return this;
		},
		shownEvent : function(e) {
			this.options.keyboard.show('toolbarscan');
		}
	});
	OB.COMP.TabScan = Backbone.View.extend({
		tagName : 'div',
		attributes : {
			'id' : 'scan',
			'class' : 'tab-pane'
		},
		initialize : function() {
			var scan = new OB.COMP.Scan(this.options);
			this.$el.append(scan.$el);
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.RenderCategory = OB.COMP.SelectButton.extend({
		contentView : [ {
			tag : 'div',
			attributes : {
				style : 'float: left; width: 25%'
			},
			content : [ {
				id : 'modelthumbnail',
				view : OB.UTIL.Thumbnail
			} ]
		}, {
			tag : 'div',
			attributes : {
				style : 'float: left; width: 75%;'
			},
			content : [ {
				id : 'modelidentifier',
				tag : 'div',
				attributes : {
					style : 'padding-left: 5px;'
				}
			}, {
				tag : 'div',
				attributes : {
					style : 'clear: both;'
				}
			} ]
		} ],
		render : function() {
			this.$el.addClass('btnselect-browse');
			this.modelthumbnail.img = this.model.get('img');
			this.modelthumbnail.render();
			this.modelidentifier.text(this.model.get('_identifier'));
			return this;
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ListCategories = Backbone.View.extend({
		optionsid : 'ListCategories',
		tag : 'div',
		contentView : [ {
			tag : 'div',
			attributes : {
				'style' : 'padding: 10px; border-bottom: 1px solid #cccccc;'
			},
			content : [ {
				tag : 'h3',
				content : [ OB.I18N.getLabel('OBPOS_LblCategories') ]
			} ]
		}, {
			id : 'tableview',
			view : OB.UI.TableView.extend({
				style : 'list',
				renderEmpty : OB.COMP.RenderEmpty,
				renderLine : OB.COMP.RenderCategory
			})
		} ],
		initialize : function() {
			this.options[this.optionsid] = this;
			OB.UTIL.initContentView(this);
			this.receipt = this.options.modelorder;
			this.categories = new OB.Collection.ProductCategoryList();
			this.tableview.registerCollection(this.categories);
			this.receipt.on('clear', function() {
				if (this.categories.length > 0) {
					this.categories.at(0).trigger('selected',
							this.categories.at(0));
				}
			}, this);
			function errorCallback(tx, error) {
				OB.UTIL.showError("OBDAL error: " + error);
			}
			function successCallbackCategories(dataCategories, me) {
				if (dataCategories && dataCategories.length > 0) {
					me.categories.reset(dataCategories.models);
				} else {
					me.categories.reset();
				}
			}
			OB.Dal.find(OB.Model.ProductCategory, null,
					successCallbackCategories, errorCallback, this);
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.RenderProduct = OB.COMP.SelectButton
			.extend({
				contentView : [
						{
							tag : 'div',
							attributes : {
								style : 'float: left; width: 25%'
							},
							content : [ {
								id : 'viewthumbnail',
								view : OB.UTIL.Thumbnail
							} ]
						},
						{
							tag : 'div',
							attributes : {
								style : 'float: left; width: 55%;'
							},
							content : [ {
								id : 'dividentifier',
								tag : 'div',
								attributes : {
									style : 'padding-left: 5px;'
								}
							} ]
						},
						{
							id : 'divprice',
							tag : 'div',
							attributes : {
								style : 'float: left; width: 20%; text-align: right; font-weight:bold;'
							}
						}, {
							tag : 'div',
							attributes : {
								style : 'clear: both;'
							}
						} ],
				render : function() {
					this.viewthumbnail.img = this.model.get('img');
					this.viewthumbnail.render();
					this.dividentifier.text(this.model.get('_identifier'));
					this.divprice.text(OB.I18N.formatCurrency(this.model.get(
							'price').get('listPrice')));
					return this;
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ListProducts = Backbone.View
			.extend({
				optionsid : 'ListProducts',
				tag : 'div',
				contentView : [
						{
							tag : 'div',
							attributes : {
								'style' : 'padding: 10px; border-bottom: 1px solid #cccccc;'
							},
							content : [ {
								id : 'title',
								tag : 'h3'
							} ]
						}, {
							id : 'tableview',
							view : OB.UI.TableView.extend({
								renderEmpty : OB.COMP.RenderEmpty,
								renderLine : OB.COMP.RenderProduct
							})
						} ],
				initialize : function() {
					this.options[this.optionsid] = this;
					OB.UTIL.initContentView(this);
					var me = this;
					this.receipt = this.options.modelorder;
					this.products = new OB.Collection.ProductList();
					this.tableview.registerCollection(this.products);
					this.products.on('click', function(model) {
						this.receipt.addProduct(model);
					}, this);
				},
				loadCategory : function(category) {
					var criteria, me = this;
					function successCallbackPrices(dataPrices, dataProducts) {
						if (dataPrices && dataPrices.length > 0) {
							_.each(dataPrices.models, function(currentPrice) {
								if (dataProducts.get(currentPrice
										.get('product'))) {
									dataProducts.get(
											currentPrice.get('product')).set(
											'price', currentPrice);
								}
							});
							_
									.each(
											dataProducts.models,
											function(currentProd) {
												if (currentProd.get('price') === undefined) {
													var price = new OB.Model.ProductPrice(
															{
																'listPrice' : 0
															});
													dataProducts
															.get(
																	currentProd
																			.get('id'))
															.set('price', price);
													OB.UTIL
															.showWarning("No price found for product "
																	+ currentProd
																			.get('_identifier'));
												}
											});
						} else {
							OB.UTIL
									.showWarning("OBDAL No prices found for products");
							_.each(dataProducts.models, function(currentProd) {
								var price = new OB.Model.ProductPrice({
									'listPrice' : 0
								});
								currentProd.set('price', price);
							});
						}
						me.products.reset(dataProducts.models);
					}
					function errorCallback(tx, error) {
						OB.UTIL.showError("OBDAL error: " + error);
					}
					function successCallbackProducts(dataProducts) {
						if (dataProducts && dataProducts.length > 0) {
							criteria = {
								'priceListVersion' : OB.POS.modelterminal
										.get('pricelistversion').id
							};
							OB.Dal.find(OB.Model.ProductPrice, criteria,
									successCallbackPrices, errorCallback,
									dataProducts);
						} else {
							me.products.reset();
						}
						me.title.text(category.get('_identifier'));
					}
					if (category) {
						criteria = {
							'productCategory' : category.get('id')
						};
						OB.Dal.find(OB.Model.Product, criteria,
								successCallbackProducts, errorCallback);
					} else {
						this.products.reset();
						this.title
								.text(OB.I18N.getLabel('OBPOS_LblNoCategory'));
					}
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.UI = window.OB.UI || {};
	OB.UI.ButtonTabBrowse = OB.COMP.ToolbarButtonTab.extend({
		tabpanel : '#catalog',
		label : OB.I18N.getLabel('OBPOS_LblBrowse'),
		shownEvent : function(e) {
			this.options.keyboard.hide();
		}
	});
	OB.UI.BrowseCategories = Backbone.View.extend({
		tagName : 'div',
		attributes : {
			'style' : 'overflow:auto; height: 612px; margin: 5px;'
		},
		initialize : function() {
			var $child = $('<div/>');
			$child.css({
				'background-color' : '#ffffff',
				'color' : 'black',
				'padding' : '5px'
			});
			this.listCategories = new OB.COMP.ListCategories(this.options);
			$child.append(this.listCategories.$el);
			this.$el.append($child);
		}
	});
	OB.UI.BrowseProducts = Backbone.View.extend({
		tagName : 'div',
		attributes : {
			'style' : 'overflow:auto; height: 612px; margin: 5px;'
		},
		initialize : function() {
			var $child = $('<div/>');
			$child.css({
				'background-color' : '#ffffff',
				'color' : 'black',
				'padding' : '5px'
			});
			this.listProducts = new OB.COMP.ListProducts(this.options);
			$child.append(this.listProducts.$el);
			this.$el.append($child);
		}
	});
	OB.UI.TabBrowse = Backbone.View
			.extend({
				tagName : 'div',
				attributes : {
					'id' : 'catalog',
					'class' : 'tab-pane'
				},
				initialize : function() {
					var $container, $productListContainer, browseProd, $categoriesListContainer, browseCateg;
					$container = $('<div/>');
					$container.addClass('row-fluid');
					$productListContainer = $('<div/>');
					$productListContainer.addClass('span6');
					browseProd = new OB.UI.BrowseProducts(this.options);
					$productListContainer.append(browseProd.$el);
					$categoriesListContainer = $('<div/>');
					$categoriesListContainer.addClass('span6');
					browseCateg = new OB.UI.BrowseCategories(this.options);
					$categoriesListContainer.append(browseCateg.$el);
					$container.append($productListContainer);
					$container.append($categoriesListContainer);
					this.$el.append($container);
					browseCateg.listCategories.categories.on('selected',
							function(category) {
								browseProd.listProducts.loadCategory(category);
							}, this);
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.SearchProduct = Backbone.View
			.extend({
				initialize : function() {
					var me = this;
					this.receipt = this.options.modelorder;
					this.categories = new OB.Collection.ProductCategoryList();
					this.products = new OB.Collection.ProductList();
					this.products.on('click', function(model) {
						this.receipt.addProduct(model);
					}, this);
					this.receipt.on('clear', function() {
						this.productname.val('');
						this.productcategory.val('');
					}, this);
					this.component = B({
						kind : B.KindJQuery('div'),
						attr : {
							'class' : 'row-fluid'
						},
						content : [ {
							kind : B.KindJQuery('div'),
							attr : {
								'class' : 'span12'
							},
							content : [
									{
										kind : B.KindJQuery('div'),
										attr : {
											'class' : 'row-fluid',
											'style' : 'border-bottom: 1px solid #cccccc;'
										},
										content : [ {
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12'
											},
											content : [ {
												kind : B.KindJQuery('div'),
												attr : {
													'style' : 'padding: 10px 10px 5px 10px'
												},
												content : [
														{
															kind : B
																	.KindJQuery('div'),
															attr : {
																'style' : 'display: table;'
															},
															content : [
																	{
																		kind : B
																				.KindJQuery('div'),
																		attr : {
																			'style' : 'display: table-cell; width: 100%;'
																		},
																		content : [ {
																			kind : OB.COMP.SearchInput,
																			id : 'productname',
																			attr : {
																				'type' : 'text',
																				'xWebkitSpeech' : 'x-webkit-speech',
																				'className' : 'input',
																				'style' : 'width: 100%;',
																				'clickEvent' : function(
																						e) {
																					if (e
																							&& e.keyCode === 13) {
																						me
																								.searchAction();
																						return false;
																					} else {
																						return true;
																					}
																				}
																			}
																		} ]
																	},
																	{
																		kind : B
																				.KindJQuery('div'),
																		attr : {
																			'style' : 'display: table-cell;'
																		},
																		content : [ {
																			kind : OB.COMP.SmallButton,
																			attr : {
																				'className' : 'btnlink-gray',
																				'icon' : 'btn-icon-small btn-icon-clear',
																				'style' : 'width: 100px; margin: 0px 5px 8px 19px;',
																				'clickEvent' : function() {
																					this.$el
																							.parent()
																							.prev()
																							.children()
																							.val(
																									'');
																					me
																							.searchAction();
																				}
																			}
																		} ]
																	},
																	{
																		kind : B
																				.KindJQuery('div'),
																		attr : {
																			'style' : 'display: table-cell;'
																		},
																		content : [ {
																			kind : OB.COMP.SmallButton,
																			attr : {
																				'className' : 'btnlink-yellow',
																				'icon' : 'btn-icon-small btn-icon-search',
																				'style' : 'width: 100px; margin: 0px 0px 8px 5px;',
																				'clickEvent' : function() {
																					me
																							.searchAction();
																				}
																			}
																		} ]
																	} ]
														},
														{
															kind : B
																	.KindJQuery('div'),
															attr : {
																'style' : 'margin: 5px 0px 0px 0px;'
															},
															content : [ {
																kind : OB.UI
																		.ListView('select'),
																id : 'productcategory',
																attr : {
																	collection : this.categories,
																	className : 'combo',
																	style : 'width: 100%',
																	renderHeader : Backbone.View
																			.extend({
																				tagName : 'option',
																				initialize : function() {
																					this.$el
																							.attr(
																									'value',
																									'')
																							.text(
																									OB.I18N
																											.getLabel('OBPOS_SearchAllCategories'));
																				}
																			}),
																	renderLine : Backbone.View
																			.extend({
																				tagName : 'option',
																				initialize : function() {
																					this.model = this.options.model;
																				},
																				render : function() {
																					this.$el
																							.attr(
																									'value',
																									this.model
																											.get('id'))
																							.text(
																									this.model
																											.get('_identifier'));
																					return this;
																				}
																			})
																}
															} ]
														} ]
											} ]
										} ]
									},
									{
										kind : B.KindJQuery('div'),
										attr : {
											'class' : 'row-fluid',
											'style' : 'height: 483px; overflow: auto;'
										},
										content : [ {
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12'
											},
											content : [ {
												kind : B.KindJQuery('div'),
												content : [ {
													kind : OB.UI.TableView,
													id : 'tableview',
													attr : {
														collection : this.products,
														renderEmpty : OB.COMP.RenderEmpty,
														renderLine : OB.COMP.RenderProduct
													}
												} ]
											} ]
										} ]
									} ]
						} ]
					});
					this.$el = this.component.$el;
					this.productname = this.component.context.productname.$el;
					this.searchAction = function() {
						var criteria = {};
						function successCallbackPrices(dataPrices, dataProducts) {
							if (dataPrices) {
								_
										.each(
												dataPrices.models,
												function(currentPrice) {
													if (dataProducts
															.get(currentPrice
																	.get('product'))) {
														dataProducts
																.get(
																		currentPrice
																				.get('product'))
																.set('price',
																		currentPrice);
													}
												});
								_
										.each(
												dataProducts.models,
												function(currentProd) {
													if (currentProd
															.get('price') === undefined) {
														var price = new OB.Model.ProductPrice(
																{
																	'listPrice' : 0
																});
														dataProducts
																.get(
																		currentProd
																				.get('id'))
																.set('price',
																		price);
														OB.UTIL
																.showWarning("No price found for product "
																		+ currentProd
																				.get('_identifier'));
													}
												});
							} else {
								OB.UTIL
										.showWarning("OBDAL No prices found for products");
								_.each(dataProducts.models, function(
										currentProd) {
									var price = new OB.Model.ProductPrice({
										'listPrice' : 0
									});
									currentProd.set('price', price);
								});
							}
							me.products.reset(dataProducts.models);
						}
						function errorCallback(tx, error) {
							OB.UTIL.showError("OBDAL error: " + error);
						}
						function successCallbackProducts(dataProducts) {
							if (dataProducts && dataProducts.length > 0) {
								criteria = {
									'priceListVersion' : OB.POS.modelterminal
											.get('pricelistversion').id
								};
								OB.Dal.find(OB.Model.ProductPrice, criteria,
										successCallbackPrices, errorCallback,
										dataProducts);
							} else {
								OB.UTIL.showWarning("No products found");
								me.products.reset();
							}
						}
						if (me.productname.val() && me.productname.val() !== '') {
							criteria._identifier = {
								operator : OB.Dal.CONTAINS,
								value : me.productname.val()
							};
						}
						if (me.productcategory.val()
								&& me.productcategory.val() !== '') {
							criteria.productCategory = me.productcategory.val();
						}
						OB.Dal.find(OB.Model.Product, criteria,
								successCallbackProducts, errorCallback);
					};
					this.productcategory = this.component.context.productcategory.$el;
					this.tableview = this.component.context.tableview;
					function errorCallback(tx, error) {
						OB.UTIL.showError("OBDAL error: " + error);
					}
					function successCallbackCategories(dataCategories, me) {
						if (dataCategories && dataCategories.length > 0) {
							me.categories.reset(dataCategories.models);
						} else {
							me.categories.reset();
						}
					}
					OB.Dal.find(OB.Model.ProductCategory, null,
							successCallbackCategories, errorCallback, this);
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.UI = window.OB.UI || {};
	OB.UI.ButtonTabSearch = OB.COMP.ToolbarButtonTab.extend({
		tabpanel : '#search',
		label : OB.I18N.getLabel('OBPOS_LblSearch'),
		shownEvent : function(e) {
			this.options.keyboard.hide();
		}
	});
	OB.UI.TabSearch = Backbone.View.extend({
		tagName : 'div',
		attributes : {
			'id' : 'search',
			'class' : 'tab-pane'
		},
		initialize : function() {
			var $container, $subContainer, searchProd;
			$container = $('<div/>');
			$container.css({
				'overflow' : "auto",
				'margin' : '5px'
			});
			$subContainer = $('<div/>');
			$subContainer.css({
				'background-color' : "#ffffff",
				'color' : 'black',
				'padding' : '5px'
			});
			searchProd = new OB.COMP.SearchProduct(this.options);
			$subContainer.append(searchProd.$el);
			$container.append($subContainer);
			this.$el.append($container);
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.EditLine = Backbone.View
			.extend({
				tag : 'div',
				contentView : [ {
					tag : 'div',
					attributes : {
						'style' : 'background-color: #ffffff; color: black; height: 200px; margin: 5px; padding: 5px'
					},
					content : [
							{
								tag : 'div',
								id : 'msgedit',
								attributes : {
									'class' : 'row-fluid',
									'style' : 'display: none;'
								},
								content : [
										{
											tag : 'div',
											attributes : {
												'class' : 'span7'
											},
											content : [
													{
														tag : 'div',
														attributes : {
															style : 'padding: 5px; width:100%'
														},
														content : [ {
															tag : 'div',
															attributes : {
																'class' : 'row-fluid'
															},
															content : [ {
																tag : 'div',
																attributes : {
																	'class' : 'span12'
																},
																content : [ {
																	view : OB.COMP.SmallButton
																			.extend({
																				'label' : OB.I18N
																						.getLabel('OBPOS_ButtonDelete'),
																				'className' : 'btnlink-orange',
																				'clickEvent' : function() {
																					var parent = this.options.parent;
																					if (parent.line) {
																						parent.receipt
																								.deleteLine(parent.line);
																						parent.receipt
																								.trigger('scan');
																					}
																				}
																			})
																} ]
															} ]
														} ]
													},
													{
														tag : 'div',
														attributes : {
															style : 'padding: 0px 0px 0px 25px; width:100%; line-height: 140%;'
														},
														content : [
																{
																	tag : 'div',
																	attributes : {
																		'class' : 'row-fluid'
																	},
																	content : [
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'span4'
																				},
																				content : [ OB.I18N
																						.getLabel('OBPOS_LineDescription') ]
																			},
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'span8'
																				},
																				content : [ {
																					tag : 'span',
																					id : 'editlinename'
																				} ]
																			} ]
																},
																{
																	tag : 'div',
																	attributes : {
																		'class' : 'row-fluid'
																	},
																	content : [
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'span4'
																				},
																				content : [ OB.I18N
																						.getLabel('OBPOS_LineQuantity') ]
																			},
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'span8'
																				},
																				content : [ {
																					tag : 'span',
																					id : 'editlineqty'
																				} ]
																			} ]
																},
																{
																	tag : 'div',
																	attributes : {
																		'class' : 'row-fluid'
																	},
																	content : [
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'span4'
																				},
																				content : [ OB.I18N
																						.getLabel('OBPOS_LinePrice') ]
																			},
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'span8'
																				},
																				content : [ {
																					tag : 'span',
																					id : 'editlineprice'
																				} ]
																			} ]
																},
																{
																	tag : 'div',
																	attributes : {
																		'class' : 'row-fluid'
																	},
																	content : [
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'span4'
																				},
																				content : [ OB.I18N
																						.getLabel('OBPOS_LineDiscount') ]
																			},
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'span8'
																				},
																				content : [ {
																					tag : 'span',
																					id : 'editlinediscount'
																				} ]
																			} ]
																},
																{
																	tag : 'div',
																	attributes : {
																		'class' : 'row-fluid'
																	},
																	content : [
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'span4'
																				},
																				content : [ OB.I18N
																						.getLabel('OBPOS_LineTotal') ]
																			},
																			{
																				tag : 'div',
																				attributes : {
																					'class' : 'span8'
																				},
																				content : [ {
																					tag : 'span',
																					id : 'editlinegross'
																				} ]
																			} ]
																} ]
													} ]
										},
										{
											tag : 'div',
											attributes : {
												'class' : 'span5',
												'style' : 'text-align: right'
											},
											content : [ {
												tag : 'div',
												attributes : {
													'style' : 'padding: 60px 10px 20px 10px;'
												},
												content : [ {
													id : 'editlineimage',
													view : OB.UTIL.Thumbnail
															.extend({
																className : 'image-wrap image-editline',
																width : 128,
																height : 128
															})
												} ]
											} ]
										} ]
							}, {
								tag : 'div',
								id : 'msgaction',
								attributes : {
									'style' : 'padding: 10px; display: none;'
								},
								content : [ {
									tag : 'div',
									id : 'txtaction',
									attributes : {
										'style' : 'float:left;'
									}
								} ]
							} ]
				} ],
				initialize : function() {
					var me = this;
					OB.UTIL.initContentView(this);
					this.products = this.options.DataProductPrice;
					this.receipt = this.options.modelorder;
					this.line = null;
					this.receipt.get('lines').on('selected', function(line) {
						if (this.line) {
							this.line.off('change', this.render);
						}
						this.line = line;
						if (this.line) {
							this.line.on('change', this.render, this);
						}
						this.render();
					}, this);
				},
				render : function() {
					if (this.line) {
						this.msgaction.hide();
						this.msgedit.show();
						this.editlineimage.img = this.line.get('product').get(
								'img');
						this.editlineimage.render();
						this.editlinename.text(this.line.get('product').get(
								'_identifier'));
						this.editlineqty.text(this.line.printQty());
						this.editlinediscount.text(this.line.printDiscount());
						this.editlineprice.text(this.line.printPrice());
						this.editlinegross.text(this.line.printGross());
					} else {
						this.txtaction.text(OB.I18N
								.getLabel('OBPOS_NoLineSelected'));
						this.msgedit.hide();
						this.msgaction.show();
						this.editlineimage.img = null;
						this.editlineimage.render();
						this.editlinename.empty();
						this.editlineqty.empty();
						this.editlinediscount.empty();
						this.editlineprice.empty();
						this.editlinegross.empty();
					}
					return this;
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ButtonTabEditLine = OB.COMP.ToolbarButtonTab.extend({
		tabpanel : '#edition',
		label : OB.I18N.getLabel('OBPOS_LblEdit'),
		render : function() {
			OB.COMP.ToolbarButtonTab.prototype.render.call(this);
			this.options.modelorder.get('lines').on('click', function() {
				OB.UTIL.setOrderLineInEditMode(true);
				this.$el.tab('show');
				this.$el.parent().parent().addClass('active');
			}, this);
			return this;
		},
		clickEvent : function() {
			OB.COMP.ToolbarButtonTab.prototype.clickEvent.call(this);
			OB.UTIL.setOrderLineInEditMode(true);
		},
		shownEvent : function(e) {
			this.options.keyboard.show('toolbarscan');
		}
	});
	OB.COMP.TabEditLine = Backbone.View.extend({
		tagName : 'div',
		attributes : {
			'id' : 'edition',
			'class' : 'tab-pane'
		},
		initialize : function() {
			var editLine = new OB.COMP.EditLine(this.options);
			this.$el.append(editLine.$el);
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.Total = Backbone.View.extend({
		tagName : 'span',
		initialize : function() {
			this.totalgross = $('<strong/>');
			this.$el.append(this.totalgross);
			this.receipt = this.options.modelorder;
			this.receipt.on('change:gross', function() {
				this.totalgross.text(this.receipt.printTotal());
			}, this);
			this.totalgross.text(this.receipt.printTotal());
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.UI = window.OB.UI || {};
	OB.UI.ModalPayment = OB.COMP.Modal.extend({
		header : OB.I18N.getLabel('OBPOS_LblModalPayment'),
		maxheight : '600px',
		getContentView : function() {
			return Backbone.View.extend({
				tagName : 'div'
			});
		},
		show : function(receipt, key, name, providerview, amount) {
			this.paymentcomponent = new providerview().render();
			this.contentview.$el.empty().append(this.paymentcomponent.$el);
			this.paymentcomponent.show(receipt, key, name, amount);
			this.$el.modal();
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	var DoneButton = OB.COMP.RegularButton.extend({
		'label' : OB.I18N.getLabel('OBPOS_LblDone'),
		'clickEvent' : function() {
			var parent = this.options.parent;
			parent.receipt.calculateTaxes(function() {
				parent.receipt.trigger('closed');
				parent.modelorderlist.deleteCurrent();
			});
		}
	});
	var ExactButton = OB.COMP.RegularButton.extend({
		icon : 'btn-icon-small btn-icon-check',
		className : 'btnlink-green',
		attributes : {
			style : 'width: 69px'
		},
		'clickEvent' : function() {
			this.options.parent.options.keyboard
					.execStatelessCommand('cashexact');
		}
	});
	var RemovePayment = OB.COMP.SmallButton.extend({
		className : 'btnlink-darkgray btnlink-payment-clear',
		icon : 'btn-icon-small btn-icon-clearPayment',
		initialize : function() {
			OB.UTIL.initContentView(this);
			var parent = this.options.parent;
			this.$el.click(function(e) {
				e.preventDefault();
				parent.options.parent.options.parent.receipt
						.removePayment(parent.options.model);
			});
		}
	});
	var RenderPaymentLine = OB.COMP.SelectPanel
			.extend({
				contentView : [ {
					tag : 'div',
					attributes : {
						'style' : 'color:white;'
					},
					content : [
							{
								tag : 'div',
								id : 'divname',
								attributes : {
									style : 'float: left; width: 40%; padding: 5px 0px 0px 0px;'
								}
							},
							{
								tag : 'div',
								id : 'divamount',
								attributes : {
									style : 'float: left; width: 35%; padding: 5px 0px 0px 0px; text-align: right;'
								}
							},
							{
								tag : 'div',
								attributes : {
									style : 'float: left; width: 25%; text-align: right;'
								},
								content : [ {
									view : RemovePayment
								} ]
							}, {
								tag : 'div',
								attributes : {
									style : 'clear: both;'
								}
							} ]
				} ],
				render : function() {
					this.divname.text(OB.POS.modelterminal
							.getPaymentName(this.model.get('kind')));
					this.divamount.text(this.model.printAmount());
					return this;
				}
			});
	OB.COMP.Payment = Backbone.View
			.extend({
				tag : 'div',
				contentView : [ {
					tag : 'div',
					attributes : {
						'style' : 'background-color: #363636; color: white; height: 200px; margin: 5px; padding: 5px'
					},
					content : [
							{
								tag : 'div',
								attributes : {
									'class' : 'row-fluid'
								},
								content : [ {
									tag : 'div',
									attributes : {
										'class' : 'span12'
									},
									content : []
								} ]
							},
							{
								tag : 'div',
								attributes : {
									'class' : 'row-fluid'
								},
								content : [
										{
											tag : 'div',
											attributes : {
												'class' : 'span7'
											},
											content : [
													{
														tag : 'div',
														attributes : {
															'style' : 'padding: 10px 0px 0px 10px;'
														},
														content : [
																{
																	tag : 'span',
																	id : 'totalpending',
																	attributes : {
																		style : 'font-size: 24px; font-weight: bold;'
																	}
																},
																{
																	tag : 'span',
																	id : 'totalpendinglbl',
																	content : [ OB.I18N
																			.getLabel('OBPOS_PaymentsRemaining') ]
																},
																{
																	tag : 'span',
																	id : 'change',
																	attributes : {
																		style : 'font-size: 24px; font-weight: bold;'
																	}
																},
																{
																	tag : 'span',
																	id : 'changelbl',
																	content : [ OB.I18N
																			.getLabel('OBPOS_PaymentsChange') ]
																},
																{
																	tag : 'span',
																	id : 'overpayment',
																	attributes : {
																		style : 'font-size: 24px; font-weight: bold;'
																	}
																},
																{
																	tag : 'span',
																	id : 'overpaymentlbl',
																	content : [ OB.I18N
																			.getLabel('OBPOS_PaymentsOverpayment') ]
																},
																{
																	tag : 'span',
																	id : 'exactlbl',
																	content : [ OB.I18N
																			.getLabel('OBPOS_PaymentsExact') ]
																} ]
													},
													{
														tag : 'div',
														attributes : {
															style : 'overflow:auto; width: 100%;'
														},
														content : [ {
															tag : 'div',
															attributes : {
																'style' : 'padding: 5px'
															},
															content : [
																	{
																		tag : 'div',
																		attributes : {
																			'style' : 'margin: 2px 0px 0px 0px; border-bottom: 1px solid #cccccc;'
																		},
																		content : []
																	},
																	{
																		id : 'tableview',
																		view : OB.UI.TableView
																				.extend({
																					renderEmpty : Backbone.View
																							.extend({
																								tagName : 'div',
																								attributes : {
																									'style' : 'height: 36px'
																								}
																							}),
																					renderLine : RenderPaymentLine
																				})
																	} ]
														} ]
													} ]
										}, {
											tag : 'div',
											attributes : {
												'class' : 'span5'
											},
											content : [ {
												tag : 'div',
												attributes : {
													'style' : 'float: right;'
												},
												id : 'doneaction',
												content : [ {
													view : DoneButton
												} ]
											}, {
												tag : 'div',
												attributes : {
													'style' : 'float: right;'
												},
												id : 'exactaction',
												content : [ {
													view : ExactButton
												} ]
											} ]
										} ]
							} ]
				} ],
				initialize : function() {
					OB.UTIL.initContentView(this);
					var i, max;
					var me = this;
					this.modelorderlist = this.options.modelorderlist;
					this.receipt = this.options.modelorder;
					var payments = this.receipt.get('payments');
					var lines = this.receipt.get('lines');
					this.tableview.registerCollection(payments);
					this.receipt.on(
							'change:payment change:change change:gross',
							function() {
								this.updatePending();
							}, this);
					this.updatePending();
				},
				updatePending : function() {
					var paymentstatus = this.receipt.getPaymentStatus();
					if (paymentstatus.change) {
						this.change.text(paymentstatus.change);
						this.change.show();
						this.changelbl.show();
					} else {
						this.change.hide();
						this.changelbl.hide();
					}
					if (paymentstatus.overpayment) {
						this.overpayment.text(paymentstatus.overpayment);
						this.overpayment.show();
						this.overpaymentlbl.show();
					} else {
						this.overpayment.hide();
						this.overpaymentlbl.hide();
					}
					if (paymentstatus.done) {
						this.totalpending.hide();
						this.totalpendinglbl.hide();
						this.doneaction.show();
					} else {
						this.totalpending.text(paymentstatus.pending);
						this.totalpending.show();
						this.totalpendinglbl.show();
						this.doneaction.hide();
					}
					if (paymentstatus.done || this.receipt.getGross() === 0) {
						this.exactaction.hide();
					} else {
						this.exactaction.show();
					}
					if (paymentstatus.done && !paymentstatus.change
							&& !paymentstatus.overpayment) {
						this.exactlbl.show();
					} else {
						this.exactlbl.hide();
					}
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ButtonTabPayment = OB.COMP.ToolbarButtonTab.extend({
		tabpanel : '#payment',
		initialize : function() {
			OB.COMP.ToolbarButtonTab.prototype.initialize.call(this);
			this.$el.append(B({
				kind : B.KindJQuery('div'),
				attr : {
					'style' : 'text-align: center; font-size: 30px;'
				},
				content : [ {
					kind : B.KindJQuery('span'),
					attr : {
						'style' : 'font-weight: bold; margin: 0px 5px 0px 0px;'
					},
					content : [ {
						kind : OB.COMP.Total
					} ]
				}, {
					kind : B.KindJQuery('span'),
					content : []
				} ]
			}, this.options).$el);
		},
		render : function() {
			OB.COMP.ToolbarButtonTab.prototype.render.call(this);
			this.$el.removeClass('btnlink-gray');
			return this;
		},
		shownEvent : function(e) {
			this.options.keyboard.show('toolbarpayment');
		}
	});
	OB.COMP.TabPayment = Backbone.View.extend({
		tagName : 'div',
		attributes : {
			'id' : 'payment',
			'class' : 'tab-pane'
		},
		initialize : function() {
			var paymentCoins = new OB.COMP.Payment(this.options);
			this.$el.append(paymentCoins.$el);
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.RenderOrderLine = OB.COMP.SelectButton.extend({
		contentView : [ {
			id : 'divproduct',
			tag : 'div',
			attributes : {
				style : 'float: left; width: 40%'
			}
		}, {
			id : 'divquantity',
			tag : 'div',
			attributes : {
				style : 'float: left; width: 20%; text-align: right'
			}
		}, {
			id : 'divprice',
			tag : 'div',
			attributes : {
				style : 'float: left; width: 20%; text-align: right'
			}
		}, {
			id : 'divgross',
			tag : 'div',
			attributes : {
				style : 'float: left; width: 20%; text-align: right'
			}
		}, {
			tag : 'div',
			attributes : {
				style : 'clear: both;'
			}
		} ],
		render : function() {
			this.$el.addClass('btnselect-orderline');
			this.divproduct.text(this.model.get('product').get('_identifier'));
			this.divquantity.text(this.model.printQty());
			this.divprice.text(this.model.printPrice());
			this.divgross.text(this.model.printGross());
			return this;
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	var InvoiceButton = OB.COMP.SmallButton.extend({
		className : 'btnlink-white btnlink-payment-clear',
		icon : 'btn-icon-small btn-icon-check',
		label : 'Invoice',
		attributes : {
			style : 'width: 50px;'
		},
		clickEvent : function(e) {
			this.options.parent.receipt.resetOrderInvoice();
		}
	});
	OB.COMP.OrderView = Backbone.View
			.extend({
				tag : 'div',
				contentView : [
						{
							id : 'tableview',
							view : OB.UI.TableView.extend({
								style : 'edit',
								renderEmpty : OB.COMP.RenderEmpty.extend({
									label : OB.I18N
											.getLabel('OBPOS_ReceiptNew')
								}),
								renderLine : OB.COMP.RenderOrderLine
							})
						},
						{
							tag : 'ul',
							attributes : {
								'class' : 'unstyled'
							},
							content : [
									{
										tag : 'li',
										content : [ {
											tag : 'div',
											attributes : {
												style : 'position: relative; padding: 10px;'
											},
											content : [
													{
														tag : 'div',
														attributes : {
															style : 'float: left; width: 80%'
														},
														content : [ OB.I18N
																.getLabel('OBPOS_ReceiptTotal') ]
													},
													{
														id : 'totalgross',
														tag : 'div',
														attributes : {
															style : 'float: left; width: 20%; text-align:right; font-weight:bold;'
														}
													},
													{
														tag : 'div',
														attributes : {
															style : 'clear: both;'
														}
													} ]
										} ]
									},
									{
										tag : 'li',
										content : [ {
											tag : 'div',
											attributes : {
												style : 'padding: 10px; border-top: 1px solid #cccccc; height: 40px;'
											},
											content : [
													{
														tag : 'div',
														attributes : {
															style : 'float: left; width: 50%;'
														},
														content : [
																{
																	id : 'btninvoice',
																	view : InvoiceButton
																},
																{
																	tag : 'span',
																	content : '&nbsp;'
																},
																{
																	id : 'divinvoice',
																	tag : 'span',
																	attributes : {
																		style : 'font-weight:bold; '
																	}
																} ]
													},
													{
														id : 'divreturn',
														tag : 'div',
														attributes : {
															style : 'float: right; width: 50%; text-align: right; font-weight:bold; font-size: 30px; color: #f8941d;'
														}
													},
													{
														tag : 'div',
														attributes : {
															style : 'clear: both;'
														}
													} ]
										} ]
									} ]
						} ],
				initialize : function() {
					OB.UTIL.initContentView(this);
					this.receipt = this.options.modelorder;
					var lines = this.receipt.get('lines');
					this.tableview.registerCollection(lines);
					this.receipt.on('change:gross', this.renderTotal, this);
					this.receipt
							.on('change:orderType', this.renderFooter, this);
					this.receipt.on('change:generateInvoice',
							this.renderFooter, this);
					this.renderFooter();
					this.renderTotal();
				},
				renderFooter : function() {
					if (this.receipt.get('generateInvoice')) {
						this.btninvoice.$el.show();
						this.divinvoice.text(OB.I18N
								.getLabel('OBPOS_ToInvoice'));
					} else {
						this.btninvoice.$el.hide();
						this.divinvoice.text('');
					}
					this.divreturn
							.text(this.receipt.get('orderType') === 1 ? OB.I18N
									.getLabel('OBPOS_ToBeReturned') : '');
				},
				renderTotal : function() {
					this.totalgross.text(this.receipt.printTotal());
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.UI = window.OB.UI || {};
	OB.UI.OrderDetails = Backbone.View
			.extend({
				tagName : 'div',
				attributes : {
					'style' : 'float:left; padding: 15px 15px 5px 10px; font-weight: bold; color: #6CB33F;'
				},
				initialize : function() {
					this.receipt = this.options.modelorder;
					this.receipt.on('clear change:orderDate change:documentNo',
							function() {
								this.$el.text(OB.I18N.formatHour(this.receipt
										.get('orderDate'))
										+ ' - '
										+ this.receipt.get('documentNo'));
							}, this);
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.BusinessPartner = OB.COMP.SmallButton.extend({
		className : 'btnlink btnlink-small btnlink-gray',
		attributes : {
			'href' : '#modalcustomer',
			'data-toggle' : 'modal'
		},
		initialize : function() {
			OB.COMP.SmallButton.prototype.initialize.call(this);
			this.receipt = this.options.modelorder;
			this.receipt.on('clear change:bp change:bploc', function() {
				this.$el.text(this.receipt.get('bp') ? this.receipt.get('bp')
						.get('_identifier') : '');
			}, this);
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ReceiptsCounter = Backbone.View
			.extend({
				tagName : 'div',
				attributes : {
					'style' : 'position: absolute; top:0px; right: 0px;'
				},
				contentView : [ {
					tag : 'button',
					attributes : {
						'class' : 'btnlink btnlink-gray',
						'style' : 'position: relative; overflow: hidden; margin:0px; padding:0px; height:50px; width: 50px;',
						'href' : '#modalreceipts',
						'data-toggle' : 'modal'
					},
					content : [
							{
								tag : 'div',
								attributes : {
									'style' : 'position: absolute; top: -35px; right:-35px; background: #404040; height:70px; width: 70px; -webkit-transform: rotate(45deg); -moz-transform: rotate(45deg); -ms-transform: rotate(45deg); -transform: rotate(45deg);'
								}
							},
							{
								id : 'counter',
								tag : 'div',
								attributes : {
									'style' : 'position: absolute; top: 0px; right:0px; padding-top: 5px; padding-right: 10px; font-weight: bold; color: white;'
								}
							} ]
				} ],
				initialize : function() {
					OB.UTIL.initContentView(this);
					this.receiptlist = this.options.modelorderlist;
					this.receiptlist.on('reset add remove', function() {
						if (this.receiptlist.length > 1) {
							this.$el.show();
							this.counter.text((this.receiptlist.length - 1));
						} else {
							this.$el.hide();
							this.counter.html('&nbsp;');
						}
					}, this);
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.PointOfSale = OB.COMP.CustomView
			.extend({
				createView : function() {
					return ({
						kind : B.KindJQuery('section'),
						content : [
								{
									kind : OB.Model.Order
								},
								{
									kind : OB.Collection.OrderList
								},
								{
									kind : OB.DATA.Container,
									content : [ {
										kind : OB.COMP.HWManager,
										attr : {
											'templateline' : 'res/printline.xml',
											'templatereceipt' : 'res/printreceipt.xml',
											'templateinvoice' : 'res/printinvoice.xml',
											'templatereturn' : 'res/printreturn.xml',
											'templatereturninvoice' : 'res/printreturninvoice.xml'
										}
									} ]
								},
								{
									kind : OB.DATA.OrderDiscount
								},
								{
									kind : OB.DATA.OrderTaxes
								},
								{
									kind : OB.DATA.OrderSave
								},
								{
									kind : OB.COMP.ModalBPs
								},
								{
									kind : OB.COMP.ModalProcessReceipts
								},
								{
									kind : OB.UI.ModalReceipts
								},
								{
									kind : B.KindJQuery('div'),
									attr : {
										'class' : 'row',
										'style' : 'margin-bottom: 5px'
									},
									content : [
											{
												kind : B.KindJQuery('div'),
												attr : {
													'class' : 'span4'
												},
												content : [ {
													kind : B.KindJQuery('ul'),
													attr : {
														'class' : 'unstyled nav-pos row-fluid'
													},
													content : [
															{
																kind : B
																		.KindJQuery('li'),
																attr : {
																	'class' : 'span3'
																},
																content : [ {
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'margin: 0px 5px 0px 5px;'
																	},
																	content : [ {
																		kind : OB.COMP.ButtonNew
																	} ]
																} ]
															},
															{
																kind : B
																		.KindJQuery('li'),
																attr : {
																	'class' : 'span3'
																},
																content : [ {
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'margin: 0px 5px 0px 5px;'
																	},
																	content : [
																			{
																				kind : OB.COMP.ModalDeleteReceipt
																			},
																			{
																				kind : OB.COMP.ButtonDelete
																			} ]
																} ]
															},
															{
																kind : B
																		.KindJQuery('li'),
																attr : {
																	'class' : 'span3'
																},
																content : [ {
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'margin: 0px 5px 0px 5px;'
																	},
																	content : [ {
																		kind : OB.COMP.ButtonPrint
																	} ]
																} ]
															},
															{
																kind : B
																		.KindJQuery('li'),
																attr : {
																	'class' : 'span3'
																},
																content : [ {
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'margin: 0px 5px 0px 5px;'
																	},
																	content : [ {
																		kind : OB.COMP.ToolbarMenu
																				.extend({
																					icon : 'btn-icon btn-icon-menu'
																				}),
																		content : [
																				{
																					kind : OB.COMP.MenuReturn
																				},
																				{
																					kind : OB.COMP.MenuInvoice
																				},
																				{
																					kind : OB.COMP.MenuSeparator
																				},
																				{
																					kind : OB.COMP.MenuItem
																							.extend({
																								href : '../..',
																								target : '_blank',
																								onclick : 'return true;',
																								label : OB.I18N
																										.getLabel('OBPOS_LblOpenbravoWorkspace')
																							})
																				},
																				{
																					kind : OB.COMP.MenuItem
																							.extend({
																								permission : 'retail.cashmanagement',
																								href : OB.POS
																										.hrefWindow('retail.cashmanagement'),
																								label : OB.I18N
																										.getLabel('OBPOS_LblCashManagement')
																							})
																				},
																				{
																					kind : OB.COMP.MenuItem
																							.extend({
																								permission : 'retail.cashup',
																								href : OB.POS
																										.hrefWindow('retail.cashup'),
																								label : OB.I18N
																										.getLabel('OBPOS_LblCloseCash')
																							})
																				} ]
																	} ]
																} ]
															} ]
												} ]
											},
											{
												kind : B.KindJQuery('div'),
												attr : {
													'class' : 'span8'
												},
												content : [ {
													kind : B.KindJQuery('ul'),
													attr : {
														'class' : 'unstyled nav-pos row-fluid'
													},
													content : [
															{
																kind : B
																		.KindJQuery('li'),
																attr : {
																	'class' : 'span3'
																},
																content : [ {
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'data-toggle' : 'tab',
																		'style' : 'margin: 0px 5px 0px 5px;'
																	},
																	content : [ {
																		kind : OB.COMP.ButtonTabPayment
																	} ]
																} ]
															},
															{
																kind : B
																		.KindJQuery('li'),
																attr : {
																	'class' : 'span3'
																},
																content : [ {
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'data-toggle' : 'tab',
																		'style' : 'margin: 0px 5px 0px 5px;'
																	},
																	content : [ {
																		kind : OB.COMP.ButtonTabScan
																	} ]
																} ]
															},
															{
																kind : B
																		.KindJQuery('li'),
																attr : {
																	'class' : 'span2'
																},
																content : [ {
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'data-toggle' : 'tab',
																		'style' : 'margin: 0px 5px 0px 5px;'
																	},
																	content : [ {
																		kind : OB.UI.ButtonTabBrowse
																	} ]
																} ]
															},
															{
																kind : B
																		.KindJQuery('li'),
																attr : {
																	'class' : 'span2'
																},
																content : [ {
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'data-toggle' : 'tab',
																		'style' : 'margin: 0px 5px 0px 5px;'
																	},
																	content : [ {
																		kind : OB.UI.ButtonTabSearch
																	} ]
																} ]
															},
															{
																kind : B
																		.KindJQuery('li'),
																attr : {
																	'class' : 'span2'
																},
																content : [ {
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'data-toggle' : 'tab',
																		'style' : 'margin: 0px 5px 0px 5px;'
																	},
																	content : [ {
																		kind : OB.COMP.ButtonTabEditLine
																	} ]
																} ]
															} ]
												} ]
											} ]
								},
								{
									kind : B.KindJQuery('div'),
									attr : {
										'class' : 'row'
									},
									content : [
											{
												kind : B.KindJQuery('div'),
												attr : {
													'class' : 'span6'
												},
												content : [ {
													kind : B.KindJQuery('div'),
													attr : {
														'style' : 'overflow:auto; margin: 5px'
													},
													content : [ {
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'position: relative;background-color: #ffffff; color: black;'
														},
														content : [
																{
																	kind : OB.COMP.ReceiptsCounter
																},
																{
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'padding: 5px;'
																	},
																	content : [
																			{
																				kind : B
																						.KindJQuery('div'),
																				attr : {
																					'class' : 'row-fluid'
																				},
																				content : [ {
																					kind : B
																							.KindJQuery('div'),
																					attr : {
																						'class' : 'span12'
																					},
																					content : [ {
																						kind : B
																								.KindJQuery('div'),
																						attr : {
																							'style' : 'padding: 5px 0px 10px 0px; border-bottom: 1px solid #cccccc;'
																						},
																						content : [
																								{
																									kind : OB.UI.OrderDetails
																								},
																								{
																									kind : OB.COMP.BusinessPartner
																								},
																								{
																									kind : B
																											.KindJQuery('div'),
																									attr : {
																										'style' : 'clear:both;'
																									}
																								} ]
																					} ]
																				} ]
																			},
																			{
																				kind : B
																						.KindJQuery('div'),
																				attr : {
																					'class' : 'row-fluid',
																					'style' : 'max-height: 536px; overflow: auto;'
																				},
																				content : [ {
																					kind : B
																							.KindJQuery('div'),
																					attr : {
																						'class' : 'span12'
																					},
																					content : [ {
																						kind : OB.COMP.OrderView
																					} ]
																				} ]
																			} ]
																} ]
													} ]
												} ]
											},
											{
												kind : B.KindJQuery('div'),
												attr : {
													'class' : 'span6'
												},
												content : [
														{
															kind : B
																	.KindJQuery('div'),
															attr : {
																'class' : 'tab-content'
															},
															content : [
																	{
																		kind : OB.COMP.TabScan
																	},
																	{
																		kind : OB.UI.TabBrowse
																	},
																	{
																		kind : OB.UI.TabSearch
																	},
																	{
																		kind : OB.COMP.TabEditLine
																	},
																	{
																		kind : OB.COMP.TabPayment
																	} ]
														},
														{
															kind : OB.COMP.KeyboardOrder
														} ]
											} ]
								} ],
						init : function() {
							var ctx = this.context, modelterminal = OB.POS.modelterminal, me = this, processPaidOrders;
							processPaidOrders = function() {
								var orderlist = me.context.modelorderlist, criteria = {
									hasbeenpaid : 'Y'
								};
								if (OB.POS.modelterminal.get('connectedToERP')) {
									OB.Dal
											.find(
													OB.Model.Order,
													criteria,
													function(
															ordersPaidNotProcessed) {
														var successCallback, errorCallback;
														if (!ordersPaidNotProcessed) {
															return;
														}
														successCallback = function() {
															$(
																	'.alert:contains("'
																			+ OB.I18N
																					.getLabel('OBPOS_ProcessPendingOrders')
																			+ '")')
																	.alert(
																			'close');
															OB.UTIL
																	.showSuccess(OB.I18N
																			.getLabel('OBPOS_MsgSuccessProcessOrder'));
														};
														errorCallback = function() {
															$(
																	'.alert:contains("'
																			+ OB.I18N
																					.getLabel('OBPOS_ProcessPendingOrders')
																			+ '")')
																	.alert(
																			'close');
															OB.UTIL
																	.showError(OB.I18N
																			.getLabel('OBPOS_MsgErrorProcessOrder'));
														};
														OB.UTIL
																.showAlert(
																		OB.I18N
																				.getLabel('OBPOS_ProcessPendingOrders'),
																		OB.I18N
																				.getLabel('OBUIAPP_Info'));
														OB.UTIL
																.processOrders(
																		me.context,
																		ordersPaidNotProcessed,
																		successCallback,
																		errorCallback);
													});
								}
							};
							this.context
									.on(
											'domready',
											function() {
												var loadUnpaidOrders;
												modelterminal
														.saveDocumentSequenceInDB();
												processPaidOrders();
												loadUnpaidOrders = function() {
													var orderlist = me.context.modelorderlist, criteria = {
														'hasbeenpaid' : 'N'
													};
													OB.Dal
															.find(
																	OB.Model.Order,
																	criteria,
																	function(
																			ordersNotPaid) {
																		var currentOrder = {}, loadOrderStr;
																		if (!ordersNotPaid
																				|| ordersNotPaid.length === 0) {
																			orderlist
																					.addNewOrder();
																		} else {
																			orderlist
																					.reset(ordersNotPaid.models);
																			currentOrder = ordersNotPaid.models[0];
																			orderlist
																					.load(currentOrder);
																			loadOrderStr = OB.I18N
																					.getLabel('OBPOS_Order')
																					+ currentOrder
																							.get('documentNo')
																					+ OB.I18N
																							.getLabel('OBPOS_Loaded');
																			OB.UTIL
																					.showAlert(
																							loadOrderStr,
																							OB.I18N
																									.getLabel('OBUIAPP_Info'));
																		}
																	},
																	function() {
																		orderlist
																				.addNewOrder();
																	});
												};
												loadUnpaidOrders();
											}, this);
							modelterminal.on('online', function() {
								processPaidOrders();
							});
							modelterminal.on('offline', function() {
								OB.UTIL.showWarning(OB.I18N
										.getLabel('OBPOS_OfflineModeWarning'));
							});
						}
					});
				}
			});
	OB.POS.windows['retail.pointofsale'] = OB.COMP.PointOfSale;
	OB.DATA['retail.pointofsale'] = [ OB.Model.TaxRate, OB.Model.Product,
			OB.Model.ProductPrice, OB.Model.ProductCategory,
			OB.Model.BusinessPartner, OB.Model.Order, OB.Model.DocumentSequence ];
}());
(function() {
	OB = window.OB || {};
	OB.DATA = window.OB.DATA || {};
	OB.DATA.DropDepSave = function(context) {
		var i;
		var me = this;
		this._id = 'dropdepsave';
		this.context = context;
		me.context.depsdropstosend = [];
		this.context.ListDepositsDrops.listdepositsdrops.on('depositdrop',
				function(model, index) {
					if (me.context.depsdropstosend.length === 0) {
						window.location = OB.POS
								.hrefWindow('retail.pointofsale');
						return true;
					}
					OB.UTIL.showLoading(true);
					this.proc.exec({
						depsdropstosend : me.context.depsdropstosend
					}, function(data, message) {
						if (data && data.exception) {
							OB.UTIL.showLoading(false);
							OB.UTIL.showError(OB.I18N
									.getLabel('OBPOS_MsgErrorDropDep'));
						} else {
							me.context.depsdropstosend = [];
							me.context.trigger('print');
						}
					});
				}, this);
		this.proc = new OB.DS.Process(
				'org.openbravo.retail.posterminal.ProcessCashMgmt');
		this.context.SearchDropEvents.destinations
				.on(
						'click',
						function(model, index) {
							for (i = 0; i < this.context.ListDepositsDrops.listdepositsdrops.models.length; i++) {
								if (this.context.ListDepositsDrops.listdepositsdrops.models[i]
										.get('paySearchKey') === me.context.destinationKey) {
									if ((OB.DEC
											.sub(
													this.context.ListDepositsDrops.listdepositsdrops.models[i]
															.get('total'),
													me.context.amountToDrop) < 0)) {
										OB.UTIL
												.showError(OB.I18N
														.getLabel('OBPOS_MsgMoreThanAvailable'));
										return true;
									}
									me.context.ListDepositsDrops.listdepositsdrops.models[i]
											.get('listdepositsdrops')
											.push(
													{
														deposit : 0,
														drop : me.context.amountToDrop,
														description : me.context.identifier
																+ ' - '
																+ model
																		.get('name'),
														name : me.context.destinationKey,
														user : OB.POS.modelterminal
																.get('context').user._identifier,
														time : new Date()
													});
									me.context.depsdropstosend
											.push({
												amount : me.context.amountToDrop,
												description : me.context.identifier
														+ ' - '
														+ model.get('name'),
												paymentMethodId : me.context.id,
												type : me.context.type,
												reasonId : model.get('id'),
												user : OB.POS.modelterminal
														.get('context').user._identifier,
												time : new Date().toString()
														.substring(16, 21)
											});
									me.context.ListDepositsDrops.listdepositsdrops
											.trigger('reset');
								}
							}
						}, this);
		this.context.SearchDepositEvents.destinations
				.on(
						'click',
						function(model, index) {
							for (i = 0; i < this.context.ListDepositsDrops.listdepositsdrops.models.length; i++) {
								if (this.context.ListDepositsDrops.listdepositsdrops.models[i]
										.get('paySearchKey') === me.context.destinationKey) {
									if ((OB.DEC
											.add(
													this.context.ListDepositsDrops.listdepositsdrops.models[i]
															.get('total'),
													me.context.amountToDrop) < 0)) {
										OB.UTIL
												.showError(OB.I18N
														.getLabel('OBPOS_MsgMoreThanAvailable'));
										return true;
									}
									me.context.ListDepositsDrops.listdepositsdrops.models[i]
											.get('listdepositsdrops')
											.push(
													{
														deposit : me.context.amountToDrop,
														drop : 0,
														description : me.context.identifier
																+ ' - '
																+ model
																		.get('name'),
														name : me.context.destinationKey,
														user : OB.POS.modelterminal
																.get('context').user._identifier,
														time : new Date()
													});
									me.context.depsdropstosend
											.push({
												amount : me.context.amountToDrop,
												description : me.context.identifier
														+ ' - '
														+ model.get('name'),
												paymentMethodId : me.context.id,
												type : me.context.type,
												reasonId : model.get('id'),
												user : OB.POS.modelterminal
														.get('context').user._identifier,
												time : new Date().toString()
														.substring(16, 21)
											});
									me.context.ListDepositsDrops.listdepositsdrops
											.trigger('reset');
								}
							}
						}, this);
	};
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.Done = OB.COMP.RegularButton.extend({
		_id : 'donebutton',
		label : OB.I18N.getLabel('OBPOS_LblDone'),
		attributes : {
			'style' : 'min-width: 115px;'
		},
		render : function() {
			OB.COMP.RegularButton.prototype.render.call(this);
			this.$el.addClass('btnlink-white').addClass('btnlink-fontgray');
			this.$el.addClass('hidden');
			return this;
		},
		clickEvent : function(e) {
			this.destinations.trigger('depositdrop');
		}
	});
	OB.COMP.ButtonNextCashMgmt = OB.COMP.RegularButton.extend({
		_id : 'cashmgmtnextbutton',
		label : OB.I18N.getLabel('OBPOS_LblDone'),
		attributes : {
			'style' : 'min-width: 115px;'
		},
		render : function() {
			OB.COMP.RegularButton.prototype.render.call(this);
			this.$el.addClass('btnlink-white').addClass('btnlink-fontgray');
			return this;
		},
		clickEvent : function(e) {
			this.options.ListDepositsDrops.listdepositsdrops
					.trigger('depositdrop');
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.CashMgmtKeyboard = OB.COMP.Keyboard.extend({
		_id : 'cashmgmtkeyboard',
		initialize : function() {
			OB.COMP.Keyboard.prototype.initialize.call(this);
			this.addToolbar('toolbarcashmgmt', new OB.UI.ToolbarCashMgmt(
					this.options).toolbar);
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.RenderDropDepDestinations = OB.COMP.SelectButton.extend({
		attributes : {
			'style' : 'background-color:#dddddd;  border: 1px solid #ffffff;'
		},
		render : function() {
			this.$el.append(B({
				kind : B.KindJQuery('div'),
				content : [ {
					kind : B.KindJQuery('div'),
					attr : {
						style : 'padding: 1px 0px 1px 5px;'
					},
					content : [ this.model.get('name') ]
				} ]
			}).$el);
			return this;
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.SearchDepositEvents = function(context) {
		var ctx = context;
		this._id = 'SearchDepositEvents';
		var me = this;
		this.destinations = new OB.Model.Collection(context.DataDepositEvents);
		context.DataDepositEvents.ds.on('ready', function() {
			me.destinations.reset(this.cache);
		});
		this.destinations.exec();
		this.component = B({
			kind : B.KindJQuery('div'),
			attr : {
				'class' : 'row-fluid'
			},
			content : [ {
				kind : B.KindJQuery('div'),
				attr : {
					'class' : 'span12'
				},
				content : [ {
					kind : B.KindJQuery('div'),
					content : [ {
						kind : OB.UI.TableView,
						id : 'tableview',
						attr : {
							collection : this.destinations,
							renderLine : OB.COMP.RenderDropDepDestinations,
							renderEmpty : OB.COMP.RenderEmpty
						}
					} ]
				} ]
			} ]
		});
		this.$el = this.component.$el;
		this.tableview = this.component.context.tableview;
	};
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.SearchDropEvents = function(context) {
		var ctx = context;
		this._id = 'SearchDropEvents';
		var me = this;
		this.destinations = new OB.Model.Collection(context.DataDropEvents);
		context.DataDropEvents.ds.on('ready', function() {
			me.destinations.reset(this.cache);
		});
		this.destinations.exec();
		this.component = B({
			kind : B.KindJQuery('div'),
			attr : {
				'class' : 'row-fluid'
			},
			content : [ {
				kind : B.KindJQuery('div'),
				attr : {
					'class' : 'span12'
				},
				content : [ {
					kind : B.KindJQuery('div'),
					content : [ {
						kind : OB.UI.TableView,
						id : 'tableview',
						attr : {
							collection : this.destinations,
							renderLine : OB.COMP.RenderDropDepDestinations,
							renderEmpty : OB.COMP.RenderEmpty
						}
					} ]
				} ]
			} ]
		});
		this.$el = this.component.$el;
		this.tableview = this.component.context.tableview;
	};
}());
(function() {
	OB = window.OB || {};
	OB.UI = window.OB.UI || {};
	OB.UI.ModalDepositEvents = OB.COMP.Modal.extend({
		id : 'modaldepositevents',
		header : OB.I18N.getLabel('OBPOS_SelectDepositDestinations'),
		initialize : function() {
			var theModal, theHeader, theBody, theHeaderText;
			OB.COMP.Modal.prototype.initialize.call(this);
			theModal = this.$el;
			theHeader = theModal.children(':first');
			theBody = theModal.children(':nth-child(2)');
			theHeaderText = theHeader.children(':nth-child(2)');
			theModal.addClass('modal-dialog');
			theBody.addClass('modal-dialog-body');
			theHeaderText.attr('text-align', 'left');
			theHeaderText.attr('font-weight', '150%');
			theHeaderText.attr('padding-top', '10px');
			theHeaderText.attr('color', 'black');
		},
		getContentView : function() {
			return ({
				kind : OB.COMP.SearchDepositEvents
			});
		},
		showEvent : function(e) {
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.UI = window.OB.UI || {};
	OB.UI.ModalDropEvents = OB.COMP.Modal.extend({
		id : 'modaldropevents',
		header : OB.I18N.getLabel('OBPOS_SelectDropDestinations'),
		initialize : function() {
			var theModal, theHeader, theBody, theHeaderText;
			OB.COMP.Modal.prototype.initialize.call(this);
			theModal = this.$el;
			theHeader = theModal.children(':first');
			theBody = theModal.children(':nth-child(2)');
			theHeaderText = theHeader.children(':nth-child(2)');
			theModal.addClass('modal-dialog');
			theBody.addClass('modal-dialog-body');
			theHeaderText.attr('text-align', 'left');
			theHeaderText.attr('font-weight', '150%');
			theHeaderText.attr('padding-top', '10px');
			theHeaderText.attr('color', 'black');
		},
		getContentView : function() {
			return ({
				kind : OB.COMP.SearchDropEvents
			});
		},
		showEvent : function(e) {
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.UI = window.OB.UI || {};
	var getPayment = function(receipt, id, key, name, identifier, type) {
		return {
			'permission' : key,
			'action' : function(txt) {
				this.options.id = id;
				this.options.amountToDrop = txt;
				this.options.destinationKey = key;
				this.options.identifier = identifier;
				this.options.type = type;
				if (type === 'drop') {
					$('#modaldropevents').modal('show');
				} else {
					$('#modaldepositevents').modal('show');
				}
			}
		};
	};
	OB.UI.ToolbarCashMgmt = function(context) {
		var i, max, payments, ctx = context, me = this;
		this.toolbar = [];
		this.receipt = context.modelorder;
		this.payments = new OB.Model.Collection(
				context.DataCashMgmtPaymentMethod);
		context.DataCashMgmtPaymentMethod.ds
				.on(
						'ready',
						function() {
							me.payments.reset(this.cache);
							for (i = 0, max = me.payments.length; i < max; i++) {
								if (me.payments.at(i).get('allowdeposits')) {
									me.toolbar
											.push({
												command : me.payments.at(i)
														.get('payment').searchKey
														+ '_'
														+ OB.I18N
																.getLabel('OBPOS_LblDeposit'),
												definition : getPayment(
														this.receipt,
														me.payments.at(i).get(
																'payment').id,
														me.payments.at(i).get(
																'payment').searchKey,
														me.payments.at(i).get(
																'payment')._identifier,
														me.payments.at(i).get(
																'payment')._identifier,
														'deposit'),
												label : me.payments.at(i).get(
														'payment')._identifier
														+ ' '
														+ OB.I18N
																.getLabel('OBPOS_LblDeposit')
											});
								}
								if (me.payments.at(i).get('allowdrops')) {
									me.toolbar
											.push({
												command : me.payments.at(i)
														.get('payment').searchKey
														+ '_'
														+ OB.I18N
																.getLabel('OBPOS_LblWithdrawal'),
												definition : getPayment(
														this.receipt,
														me.payments.at(i).get(
																'payment').id,
														me.payments.at(i).get(
																'payment').searchKey,
														me.payments.at(i).get(
																'payment')._identifier,
														me.payments.at(i).get(
																'payment')._identifier,
														'drop'),
												label : me.payments.at(i).get(
														'payment')._identifier
														+ ' '
														+ OB.I18N
																.getLabel('OBPOS_LblWithdrawal')
											});
								}
							}
							ctx.cashmgmtkeyboard.addToolbar('toolbarcashmgmt',
									me.toolbar);
							ctx.cashmgmtkeyboard.show('toolbarcashmgmt');
						});
		this.payments.exec();
	};
}());
(function() {
	var db, dbSize, dbSuccess, dbError, fetchTaxes;
	OB = window.OB || {};
	OB.DATA = window.OB.DATA || {};
	OB.DATA.DepositsDrops = function(context, id) {
		this._id = 'DataDepositsDrops';
		this.context = context;
		this.ds = new OB.DS.DataSource(new OB.DS.Request(
				'org.openbravo.retail.posterminal.term.CashMgmtDepositsDrops',
				OB.POS.modelterminal.get('terminal').client,
				OB.POS.modelterminal.get('terminal').organization));
		this.loadparams = {
			pos : OB.POS.modelterminal.get('terminal').id
		};
	};
	_.extend(OB.DATA.DepositsDrops.prototype, OB.DATA.Base);
	OB.DATA.CashMgmtPaymentMethod = function(context, id) {
		this._id = 'DataCashMgmtPaymentMethod';
		this.context = context;
		this.ds = new OB.DS.DataSource(new OB.DS.Request(
				'org.openbravo.retail.posterminal.term.CashMgmtPayments',
				OB.POS.modelterminal.get('terminal').client,
				OB.POS.modelterminal.get('terminal').organization));
		this.loadparams = {
			pos : OB.POS.modelterminal.get('terminal').id
		};
	};
	_.extend(OB.DATA.CashMgmtPaymentMethod.prototype, OB.DATA.Base);
	OB.DATA.DropEvents = function(context, id) {
		this._id = 'DataDropEvents';
		this.context = context;
		this.ds = new OB.DS.DataSource(new OB.DS.Request(
				'org.openbravo.retail.posterminal.term.CashMgmtDropEvents',
				OB.POS.modelterminal.get('terminal').client,
				OB.POS.modelterminal.get('terminal').organization));
		this.loadparams = {};
	};
	_.extend(OB.DATA.DropEvents.prototype, OB.DATA.Base);
	OB.DATA.DepositEvents = function(context, id) {
		this._id = 'DataDepositEvents';
		this.context = context;
		this.ds = new OB.DS.DataSource(new OB.DS.Request(
				'org.openbravo.retail.posterminal.term.CashMgmtDepositEvents',
				OB.POS.modelterminal.get('terminal').client,
				OB.POS.modelterminal.get('terminal').organization));
		this.loadparams = {};
	};
	_.extend(OB.DATA.DepositEvents.prototype, OB.DATA.Base);
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.CashMgmtInfo = function(context) {
		var me = this;
		this.component = B(
				{
					kind : B.KindJQuery('div'),
					content : [ {
						kind : B.KindJQuery('div'),
						attr : {
							'style' : 'position: relative; background: #363636; color: white; height: 200px; margin: 5px; padding: 5px'
						},
						content : [
								{
									kind : OB.COMP.Clock,
									attr : {
										'className' : 'pos-clock'
									}
								},
								{
									kind : B.KindJQuery('div'),
									content : [
											{
												kind : B.KindJQuery('div'),
												id : 'msginfo',
												attr : {
													'style' : 'padding: 10px; float: left; width: 320px; line-height: 23px;'
												},
												content : [ OB.I18N
														.getLabel('OBPOS_LblDepositsWithdrawalsMsg') ]
											},
											{
												kind : B.KindJQuery('div'),
												id : 'msgaction',
												attr : {
													'style' : 'padding: 5px; float: right;'
												},
												content : [ {
													kind : OB.COMP.SmallButton
															.extend({
																attributes : {
																	'href' : '#modalCancel',
																	'data-toggle' : 'modal'
																},
																className : 'btnlink-white btnlink-fontgrey'
															}),
													attr : {
														'label' : OB.I18N
																.getLabel('OBPOS_LblCancel')
													}
												} ]
											} ]
								}, {
									kind : B.KindJQuery('div'),
									attr : {
										'align' : 'center',
										'style' : 'width: 100%; float: left;'
									},
									content : [ {
										kind : OB.COMP.ButtonNextCashMgmt
									} ]
								} ]
					} ]
				}, context);
		this.$el = this.component.$el;
	};
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ListDepositsDrops = OB.COMP.CustomView
			.extend({
				_id : 'listdepositsdrops',
				initialize : function() {
					var me = this;
					this._id = 'ListDepositsDrops';
					this.listdepositsdrops = new OB.Model.Collection(
							this.options.DataDepositsDrops);
					this.component = B({
						kind : B.KindJQuery('div'),
						attr : {
							'style' : 'overflow:auto; height: 500px; margin: 5px'
						},
						content : [ {
							kind : B.KindJQuery('div'),
							attr : {
								'style' : 'background-color: #ffffff; color: black; padding: 5px;'
							},
							content : [ {
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [ {
									kind : B.KindJQuery('div'),
									attr : {
										'class' : 'span12',
										'style' : 'border-bottom: 1px solid #cccccc;'
									},
									content : [
											{
												kind : B.KindJQuery('div'),
												attr : {
													'style' : 'padding: 6px; border-bottom: 1px solid #cccccc;text-align:center; font-weight:bold;'
												},
												content : [ OB.I18N
														.getLabel('OBPOS_LblCashManagement') ]
											},
											{
												kind : B.KindJQuery('div'),
												attr : {
													'style' : 'padding: 6px; border-bottom: 1px solid #cccccc; text-align:center;'
												},
												content : [ OB.I18N
														.getLabel('OBPOS_LblUser')
														+ ': '
														+ OB.POS.modelterminal
																.get('context').user._identifier ]
											},
											{
												kind : B.KindJQuery('div'),
												attr : {
													'style' : 'padding: 6px; border-bottom: 1px solid #cccccc; text-align:center;'
												},
												content : [ OB.I18N
														.getLabel('OBPOS_LblTime')
														+ ': '
														+ new Date().toString()
																.substring(3,
																		24) ]
											},
											{
												kind : B.KindJQuery('div'),
												attr : {
													'style' : 'padding: 6px; border-bottom: 1px solid #cccccc; text-align:center;'
												},
												content : [ OB.I18N
														.getLabel('OBPOS_LblStore')
														+ ': '
														+ OB.POS.modelterminal
																.get('terminal').organization$_identifier ]
											},
											{
												kind : B.KindJQuery('div'),
												attr : {
													'style' : 'padding: 6px; border-bottom: 1px solid #cccccc; text-align:center;'
												},
												content : [ OB.I18N
														.getLabel('OBPOS_LblTerminal')
														+ ': '
														+ OB.POS.modelterminal
																.get('terminal')._identifier ]
											},
											{
												kind : OB.UI.TableView,
												id : 'tableview',
												attr : {
													style : 'list',
													collection : this.listdepositsdrops,
													renderEmpty : OB.COMP.RenderEmpty,
													renderLine : OB.COMP.RenderDepositsDrops
												}
											} ]
								} ]
							} ]
						} ]
					});
					this.$el = this.component.$el;
					this.tableview = this.component.context.tableview;
					this.listdepositsdrops.exec();
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.RenderDepositsDrops = OB.COMP.CustomView
			.extend({
				render : function() {
					var i;
					var me = this;
					this.total = OB.DEC.add(this.model.get('startingCash'),
							this.model.get('totalTendered'));
					if (!this.model.get('total')) {
						this.model.set('total', this.total);
					}
					this.dropsdeps = this.model.get('listdepositsdrops');
					if (this.dropsdeps.length !== 0) {
						this.model.set('total', this.total);
					}
					this.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [ {
									kind : B.KindJQuery('div'),
									attr : {
										'class' : 'span12',
										'style' : 'border-bottom: 1px solid #cccccc;'
									},
									content : [ {
										kind : B.KindJQuery('div'),
										attr : {
											'style' : 'padding: 10px 20px 10px 10px;  float: left;'
										},
										content : [ {
											kind : B.KindJQuery('div'),
											attr : {
												style : 'clear: both'
											}
										} ]
									} ]
								} ]
							}).$el);
					this.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [ {
									kind : B.KindJQuery('div'),
									attr : {
										'class' : 'span12',
										'style' : 'border-bottom: 1px solid #cccccc;'
									},
									content : [
											{
												kind : B.KindJQuery('div'),
												attr : {
													'style' : 'padding: 6px 20px 6px 10px;  float: left; width: 70%'
												},
												content : [ OB.I18N
														.getLabel('OBPOS_LblStarting')
														+ ' '
														+ this.model
																.get('payName') ]
											},
											{
												kind : B.KindJQuery('div'),
												attr : {
													'style' : 'text-align:right; padding: 6px 20px 6px 10px; float: right;'
												},
												content : [ OB.I18N
														.formatCurrency(OB.DEC
																.add(
																		0,
																		this.model
																				.get('startingCash'))) ]
											} ]
								} ]
							}).$el);
					this.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [ {
									kind : B.KindJQuery('div'),
									attr : {
										'class' : 'span12',
										'style' : 'border-bottom: 1px solid #cccccc;'
									},
									content : [
											{
												kind : B.KindJQuery('div'),
												attr : {
													'style' : 'padding: 6px 20px 6px 10px;  float: left; width: 70%'
												},
												content : [ OB.I18N
														.getLabel('OBPOS_LblTotalTendered')
														+ ' '
														+ this.model
																.get('payName') ]
											},
											{
												kind : B.KindJQuery('div'),
												attr : {
													'style' : 'text-align:right; padding: 6px 20px 6px 10px; float: right;'
												},
												content : [ OB.I18N
														.formatCurrency(OB.DEC
																.add(
																		0,
																		this.model
																				.get('totalTendered'))) ]
											} ]
								} ]
							}).$el);
					for (i = 0; i < this.dropsdeps.length; i++) {
						var time = new Date(this.dropsdeps[i].time);
						if (this.dropsdeps[i].timeOffset) {
							time.setMinutes(time.getMinutes()
									+ this.dropsdeps[i].timeOffset
									+ time.getTimezoneOffset());
						}
						if (this.dropsdeps[i].drop !== 0) {
							this.$el
									.append(B({
										kind : B.KindJQuery('div'),
										attr : {
											'class' : 'row-fluid'
										},
										content : [ {
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12',
												'style' : 'border-bottom: 1px solid #cccccc;'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 6px 20px 6px 10px;  float: left; width: 40%'
														},
														content : [ OB.I18N
																.getLabel('OBPOS_LblWithdrawal')
																+ ': '
																+ this.dropsdeps[i].description ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'text-align:right; padding: 6px 20px 6px 10px; float: left;  width: 15%'
														},
														content : [ this.dropsdeps[i].user ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'text-align:right; padding: 6px 20px 6px 10px; float: left;  width: 10%'
														},
														content : [ time
																.toString()
																.substring(16,
																		21) ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'text-align:right; padding: 6px 20px 6px 10px; float: right;'
														},
														content : [ OB.I18N
																.formatCurrency(OB.DEC
																		.sub(
																				0,
																				this.dropsdeps[i].drop)) ]
													} ]
										} ]
									}).$el);
							this.total = OB.DEC.sub(this.total,
									this.dropsdeps[i].drop);
							this.model.set('total', this.total);
						} else {
							this.$el
									.append(B({
										kind : B.KindJQuery('div'),
										attr : {
											'class' : 'row-fluid'
										},
										content : [ {
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12',
												'style' : 'border-bottom: 1px solid #cccccc;'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 6px 20px 6px 10px; float: left; width: 40%'
														},
														content : [ OB.I18N
																.getLabel('OBPOS_LblDeposit')
																+ ': '
																+ this.dropsdeps[i].description ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'text-align:right; padding: 6px 20px 6px 10px; float: left;  width: 15%'
														},
														content : [ this.dropsdeps[i].user ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'text-align:right; padding: 6px 20px 6px 10px; float: left;  width: 10%'
														},
														content : [ time
																.toString()
																.substring(16,
																		21) ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'text-align:right; padding: 6px 20px 6px 10px; float: right;'
														},
														content : [ OB.I18N
																.formatCurrency(OB.DEC
																		.add(
																				0,
																				this.dropsdeps[i].deposit)) ]
													} ]
										} ]
									}).$el);
							this.total = OB.DEC.add(this.total,
									this.dropsdeps[i].deposit);
							this.model.set('total', this.total);
						}
						me.trigger('change:total');
					}
					this.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [ {
									kind : B.KindJQuery('div'),
									attr : {
										'class' : 'span12',
										'style' : 'border-bottom: 1px solid #cccccc;'
									},
									content : [
											{
												kind : B.KindJQuery('div'),
												attr : {
													'style' : 'padding: 10px 20px 10px 10px; float: left; width: 70%; font-weight:bold;'
												},
												content : [ OB.I18N
														.getLabel('OBPOS_LblNewAvailableIn')
														+ ' '
														+ this.model
																.get('payName') ]
											},
											{
												kind : B.KindJQuery('div'),
												id : 'total',
												attr : {
													'style' : 'padding: 10px 20px 10px 0px;  float: right; '
												},
												content : [ {
													kind : Backbone.View
															.extend({
																tagName : 'span',
																attributes : {
																	'style' : 'float:right;'
																},
																initialize : function() {
																	this.total = $('<strong/>');
																	this.$el
																			.append(this.total);
																	this.total
																			.text(OB.I18N
																					.formatCurrency(me.total));
																	me
																			.on(
																					'change:total',
																					function() {
																						this.total
																								.text(OB.I18N
																										.formatCurrency(me.total));
																						if (OB.DEC
																								.compare(me.total) < 0) {
																							this.$el
																									.css(
																											"color",
																											"red");
																						} else {
																							this.$el
																									.css(
																											"color",
																											"black");
																						}
																					},
																					this);
																	this.total
																			.text(OB.I18N
																					.formatCurrency(me.total));
																	if (OB.DEC
																			.compare(me.total) < 0) {
																		this.$el
																				.css(
																						"color",
																						"red");
																	} else {
																		this.$el
																				.css(
																						"color",
																						"black");
																	}
																}
															})
												} ]
											} ]
								} ]
							}).$el);
					return this;
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ButtonTest = OB.COMP.RegularButton.extend({
		icon : 'icon-leaf icon-white',
		label : ' **Leaf**',
		clickEvent : function(e) {
			alert('pressed');
		}
	});
	OB.COMP.CashManagement = OB.COMP.CustomView.extend({
		createView : function() {
			return ({
				kind : B.KindJQuery('section'),
				content : [ {
					kind : OB.MODEL.DayCash
				}, {
					kind : OB.Model.Order
				}, {
					kind : OB.Collection.OrderList
				}, {
					kind : OB.COMP.ModalCancel
				}, {
					kind : OB.DATA.Container,
					content : [ {
						kind : OB.DATA.DepositEvents
					}, {
						kind : OB.DATA.DropEvents
					}, {
						kind : OB.DATA.DepositsDrops
					}, {
						kind : OB.DATA.CashMgmtPaymentMethod
					} ]
				}, {
					kind : B.KindJQuery('div'),
					attr : {
						'class' : 'row'
					},
					content : [ {
						kind : B.KindJQuery('div'),
						attr : {
							'class' : 'span6'
						},
						content : [ {
							kind : OB.COMP.ListDepositsDrops
						}, {
							kind : OB.COMP.DepositsDropsTicket
						} ]
					}, {
						kind : B.KindJQuery('div'),
						attr : {
							'class' : 'span6'
						},
						content : [ {
							kind : B.KindJQuery('div'),
							content : [ {
								kind : OB.COMP.CashMgmtInfo
							} ]
						}, {
							kind : OB.COMP.CashMgmtKeyboard
						} ]
					} ]
				}, {
					kind : OB.UI.ModalDropEvents
				}, {
					kind : OB.UI.ModalDepositEvents
				}, {
					kind : OB.DATA.DropDepSave
				}, {
					kind : OB.DATA.Container,
					content : [ {
						kind : OB.COMP.HWManager,
						attr : {
							'templatecashmgmt' : 'res/printcashmgmt.xml'
						}
					} ]
				} ]
			});
		}
	});
	OB.POS.windows['retail.cashmanagement'] = OB.COMP.CashManagement;
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ButtonPrev = OB.COMP.SmallButton
			.extend({
				_id : 'closeprevbutton',
				disabled : 'disabled',
				label : OB.I18N.getLabel('OBPOS_LblPrevStep'),
				attributes : {
					'style' : 'min-width: 115px; margin: 5px;'
				},
				render : function() {
					OB.COMP.SmallButton.prototype.render.call(this);
					this.$el.addClass('btnlink-fontgray');
					return this;
				},
				clickEvent : function(e) {
					var found = false;
					if (this.options.modeldaycash.defaults.step === 3
							|| this.options.modeldaycash.defaults.step === 2) {
						if (this.options.modeldaycash.defaults.step === 2) {
							this.options.modeldaycash.set('allowedStep',
									this.options.modeldaycash
											.get('allowedStep') - 1);
						} else {
							this.options.modeldaycash.defaults.step = 2;
						}
						found = false;
						this.options.closenextbutton.$el.attr('disabled',
								'disabled');
						$(".active").removeClass("active");
						if ($(".active").length === 0) {
							this.options.cashtokeep.$el.show();
							this.options.postprintclose.$el.hide();
							this.options.closenextbutton.$el.text(OB.I18N
									.getLabel('OBPOS_LblNextStep'));
						}
						while (this.options.modeldaycash.get('allowedStep') >= 0) {
							if (this.options.modeldaycash.paymentmethods.at(
									this.options.modeldaycash
											.get('allowedStep')).get(
									'paymentMethod').automatemovementtoother) {
								found = true;
								$('#cashtokeepheader')
										.text(
												OB.I18N
														.getLabel(
																'OBPOS_LblStep3of4',
																[ this.options.modeldaycash.paymentmethods
																		.at(
																				this.options.modeldaycash
																						.get('allowedStep'))
																		.get(
																				'name') ]));
								if (this.options.modeldaycash.paymentmethods
										.at(
												this.options.modeldaycash
														.get('allowedStep'))
										.get('paymentMethod').keepfixedamount) {
									if (this.options.modeldaycash.paymentmethods
											.at(
													this.options.modeldaycash
															.get('allowedStep'))
											.get('paymentMethod').amount > this.options.modeldaycash.paymentmethods
											.at(
													this.options.modeldaycash
															.get('allowedStep'))
											.get('counted')) {
										$('#keepfixedamountlbl')
												.text(
														OB.I18N
																.formatCurrency(this.options.modeldaycash.paymentmethods
																		.at(
																				this.options.modeldaycash
																						.get('allowedStep'))
																		.get(
																				'counted')));
										$('#keepfixedamount')
												.val(
														this.options.modeldaycash.paymentmethods
																.at(
																		this.options.modeldaycash
																				.get('allowedStep'))
																.get('counted'));
									} else {
										$('#keepfixedamountlbl')
												.text(
														OB.I18N
																.formatCurrency(this.options.modeldaycash.paymentmethods
																		.at(
																				this.options.modeldaycash
																						.get('allowedStep'))
																		.get(
																				'paymentMethod').amount));
										$('#keepfixedamount')
												.val(
														this.options.modeldaycash.paymentmethods
																.at(
																		this.options.modeldaycash
																				.get('allowedStep'))
																.get(
																		'paymentMethod').amount);
									}
									$('#keepfixedamount').show();
									$('#keepfixedamountlbl').show();
								} else {
									$('#keepfixedamount').hide();
									$('#keepfixedamountlbl').hide();
								}
								if (this.options.modeldaycash.paymentmethods
										.at(
												this.options.modeldaycash
														.get('allowedStep'))
										.get('paymentMethod').allowmoveeverything) {
									$('#allowmoveeverything').val(OB.DEC.Zero);
									$('#allowmoveeverythinglbl')
											.text(
													OB.I18N
															.getLabel('OBPOS_LblNothing'));
									$('#allowmoveeverything').show();
									$('#allowmoveeverythinglbl').show();
								} else {
									$('#allowmoveeverything').hide();
									$('#allowmoveeverythinglbl').hide();
								}
								if (this.options.modeldaycash.paymentmethods
										.at(
												this.options.modeldaycash
														.get('allowedStep'))
										.get('paymentMethod').allowdontmove) {
									$('#allowdontmove')
											.val(
													this.options.modeldaycash.paymentmethods
															.at(
																	this.options.modeldaycash
																			.get('allowedStep'))
															.get('counted'));
									$('#allowdontmovelbl')
											.text(
													OB.I18N
															.getLabel('OBPOS_LblTotalAmount')
															+ ' '
															+ OB.I18N
																	.formatCurrency(this.options.modeldaycash.paymentmethods
																			.at(
																					this.options.modeldaycash
																							.get('allowedStep'))
																			.get(
																					'counted')));
									$('#allowdontmove').show();
									$('#allowdontmovelbl').show();
								} else {
									$('#allowdontmove').hide();
									$('#allowdontmovelbl').hide();
								}
								if (this.options.modeldaycash.paymentmethods
										.at(
												this.options.modeldaycash
														.get('allowedStep'))
										.get('paymentMethod').allowvariableamount) {
									$('#allowvariableamountlbl').text(
											OB.I18N.getLabel('OBPOS_LblOther'));
									$('#allowvariableamount').show();
									$('#allowvariableamountlbl').show();
									$('#variableamount').show();
									$('#variableamount').val('');
								} else {
									$('#allowvariableamount').hide();
									$('#allowvariableamountlbl').hide();
									$('#variableamount').hide();
								}
								break;
							}
							this.options.modeldaycash.set('allowedStep',
									this.options.modeldaycash
											.get('allowedStep') - 1);
						}
						if (found === false) {
							this.options.countcash.$el.show();
							this.options.cashtokeep.$el.hide();
							this.options.closekeyboard.show('toolbarcountcash');
							this.options.modeldaycash.defaults.step = 1;
							this.options.modeldaycash.set('allowedStep', 0);
							this.options.closenextbutton.$el
									.removeAttr('disabled');
						}
					} else if (this.options.modeldaycash.defaults.step === 1) {
						this.options.pendingreceipts.$el.show();
						this.options.countcash.$el.hide();
						this.options.closekeyboard.show('toolbarempty');
						this.options.modeldaycash.defaults.step = 0;
						this.$el.attr('disabled', 'disabled');
						this.options.closenextbutton.$el.removeAttr('disabled');
					}
				}
			});
	OB.COMP.ButtonNext = OB.COMP.SmallButton
			.extend({
				_id : 'closenextbutton',
				label : OB.I18N.getLabel('OBPOS_LblNextStep'),
				attributes : {
					'style' : 'min-width: 115px; margin: 5px;'
				},
				render : function() {
					OB.COMP.SmallButton.prototype.render.call(this);
					this.$el.addClass('btnlink-fontgray');
					return this;
				},
				clickEvent : function(e) {
					var found = false;
					if (this.options.modeldaycash.defaults.step === 0) {
						this.options.countcash.$el.show();
						this.options.pendingreceipts.$el.hide();
						this.options.closekeyboard.show('toolbarcountcash');
						this.options.modeldaycash.defaults.step = 1;
						this.options.closeprevbutton.$el.removeAttr('disabled');
						if ($('button[button="okbutton"][style!="display: none; "]').length !== 0) {
							this.$el.attr('disabled', 'disabled');
						}
					} else if (this.options.modeldaycash.defaults.step === 1
							|| this.options.modeldaycash.defaults.step === 2) {
						found = false;
						if (this.options.modeldaycash.defaults.step === 2) {
							this.options.modeldaycash.set('allowedStep',
									this.options.modeldaycash
											.get('allowedStep') + 1);
						}
						this.$el.attr('disabled', 'disabled');
						this.options.modeldaycash.defaults.step = 2;
						if ($(".active").length > 0
								&& this.options.modeldaycash.get('allowedStep') !== 0) {
							if ($('.active').val() === "") {
								if ($('#variableamount').val() === '') {
									this.options.modeldaycash.paymentmethods
											.at(
													this.options.modeldaycash
															.get('allowedStep') - 1)
											.get('paymentMethod').amountToKeep = 0;
								} else {
									if (OB.I18N
											.parseNumber($('#variableamount')
													.val()) <= this.options.modeldaycash.paymentmethods
											.at(
													this.options.modeldaycash
															.get('allowedStep') - 1)
											.get('counted')) {
										this.options.modeldaycash.paymentmethods
												.at(
														this.options.modeldaycash
																.get('allowedStep') - 1)
												.get('paymentMethod').amountToKeep = OB.I18N
												.parseNumber($(
														'#variableamount')
														.val());
									} else {
										OB.UTIL
												.showError(OB.I18N
														.getLabel('OBPOS_MsgMoreThanCounted'));
										this.options.modeldaycash
												.set(
														'allowedStep',
														this.options.modeldaycash
																.get('allowedStep') - 1);
										this.$el.removeAttr('disabled');
										return true;
									}
								}
							} else {
								this.options.modeldaycash.paymentmethods.at(
										this.options.modeldaycash
												.get('allowedStep') - 1).get(
										'paymentMethod').amountToKeep = OB.I18N
										.parseNumber($('.active').val());
							}
							$(".active").removeClass("active");
						}
						while (this.options.modeldaycash.get('allowedStep') < this.options.modeldaycash.paymentmethods.length) {
							if (this.options.modeldaycash.paymentmethods.at(
									this.options.modeldaycash
											.get('allowedStep')).get(
									'paymentMethod').automatemovementtoother) {
								found = true;
								$('#cashtokeepheader')
										.text(
												OB.I18N
														.getLabel(
																'OBPOS_LblStep3of4',
																[ this.options.modeldaycash.paymentmethods
																		.at(
																				this.options.modeldaycash
																						.get('allowedStep'))
																		.get(
																				'name') ]));
								if (this.options.modeldaycash.paymentmethods
										.at(
												this.options.modeldaycash
														.get('allowedStep'))
										.get('paymentMethod').keepfixedamount) {
									if (!this.options.modeldaycash.paymentmethods
											.at(
													this.options.modeldaycash
															.get('allowedStep'))
											.get('paymentMethod').amount) {
										this.options.modeldaycash.paymentmethods
												.at(
														this.options.modeldaycash
																.get('allowedStep'))
												.get('paymentMethod').amount = 0;
									}
									if (this.options.modeldaycash.paymentmethods
											.at(
													this.options.modeldaycash
															.get('allowedStep'))
											.get('paymentMethod').amount > this.options.modeldaycash.paymentmethods
											.at(
													this.options.modeldaycash
															.get('allowedStep'))
											.get('counted')) {
										$('#keepfixedamountlbl')
												.text(
														OB.I18N
																.formatCurrency(this.options.modeldaycash.paymentmethods
																		.at(
																				this.options.modeldaycash
																						.get('allowedStep'))
																		.get(
																				'counted')));
										$('#keepfixedamount')
												.val(
														this.options.modeldaycash.paymentmethods
																.at(
																		this.options.modeldaycash
																				.get('allowedStep'))
																.get('counted'));
									} else {
										$('#keepfixedamountlbl')
												.text(
														OB.I18N
																.formatCurrency(this.options.modeldaycash.paymentmethods
																		.at(
																				this.options.modeldaycash
																						.get('allowedStep'))
																		.get(
																				'paymentMethod').amount));
										$('#keepfixedamount')
												.val(
														this.options.modeldaycash.paymentmethods
																.at(
																		this.options.modeldaycash
																				.get('allowedStep'))
																.get(
																		'paymentMethod').amount);
									}
									$('#keepfixedamount').show();
									$('#keepfixedamountlbl').show();
								} else {
									$('#keepfixedamount').hide();
									$('#keepfixedamountlbl').hide();
								}
								if (this.options.modeldaycash.paymentmethods
										.at(
												this.options.modeldaycash
														.get('allowedStep'))
										.get('paymentMethod').allowmoveeverything) {
									$('#allowmoveeverything').val(0);
									$('#allowmoveeverythinglbl')
											.text(
													OB.I18N
															.getLabel('OBPOS_LblNothing'));
									$('#allowmoveeverything').show();
									$('#allowmoveeverythinglbl').show();
								} else {
									$('#allowmoveeverything').hide();
									$('#allowmoveeverythinglbl').hide();
								}
								if (this.options.modeldaycash.paymentmethods
										.at(
												this.options.modeldaycash
														.get('allowedStep'))
										.get('paymentMethod').allowdontmove) {
									$('#allowdontmove')
											.val(
													this.options.modeldaycash.paymentmethods
															.at(
																	this.options.modeldaycash
																			.get('allowedStep'))
															.get('counted'));
									$('#allowdontmovelbl')
											.text(
													OB.I18N
															.getLabel('OBPOS_LblTotalAmount')
															+ ' '
															+ OB.I18N
																	.formatCurrency(OB.DEC
																			.add(
																					0,
																					this.options.modeldaycash.paymentmethods
																							.at(
																									this.options.modeldaycash
																											.get('allowedStep'))
																							.get(
																									'counted'))));
									$('#allowdontmove').show();
									$('#allowdontmovelbl').show();
								} else {
									$('#allowdontmove').hide();
									$('#allowdontmovelbl').hide();
								}
								if (this.options.modeldaycash.paymentmethods
										.at(
												this.options.modeldaycash
														.get('allowedStep'))
										.get('paymentMethod').allowvariableamount) {
									$('#allowvariableamountlbl').text(
											OB.I18N.getLabel('OBPOS_LblOther'));
									$('#allowvariableamount').show();
									$('#allowvariableamountlbl').show();
									$('#variableamount').show();
									$('#variableamount').val('');
								} else {
									$('#allowvariableamount').hide();
									$('#allowvariableamountlbl').hide();
									$('#variableamount').hide();
								}
								break;
							}
							this.options.modeldaycash.set('allowedStep',
									this.options.modeldaycash
											.get('allowedStep') + 1);
						}
						if (found === false) {
							this.options.postprintclose.$el.show();
							this.options.cashtokeep.$el.hide();
							this.options.countcash.$el.hide();
							this.options.renderpaymentlines.$el.empty();
							this.options.renderpaymentlines.render();
							this.$el.text(OB.I18N
									.getLabel('OBPOS_LblPostPrintClose'));
							this.$el.removeAttr('disabled');
							this.options.modeldaycash.set('allowedStep',
									this.options.modeldaycash
											.get('allowedStep') - 1);
							this.options.modeldaycash.defaults.step = 3;
							this.options.modeldaycash.time = new Date()
									.toString().substring(3, 24);
							$('#reportTime').text(
									OB.I18N.getLabel('OBPOS_LblTime')
											+ ': '
											+ new Date().toString().substring(
													3, 24));
						} else {
							this.options.countcash.$el.hide();
							this.options.cashtokeep.$el.show();
							this.options.closekeyboard.show('toolbarempty');
						}
					} else if (this.options.modeldaycash.defaults.step === 3) {
						this.options.modeldaycash.paymentmethods
								.trigger('closed');
					}
				}
			});
	OB.COMP.ButtonOk = OB.COMP.SmallButton
			.extend({
				_id : 'okbutton',
				icon : 'btn-icon-small btn-icon-check',
				className : 'btnlink-green btnlink-cashup-ok',
				label : '',
				clickEvent : function(e) {
					this.$el.hide();
					$('button[button*="allokbutton"]').css('visibility',
							'hidden');
					var elem = this.me.options.modeldaycash.paymentmethods
							.get(this.options[this._id].rowid);
					this.options['counted_' + this.options[this._id].rowid].$el
							.text(OB.I18N.formatCurrency(elem.get('expected')));
					elem.set('counted', OB.DEC.add(0, elem.get('expected')));
					this.me.options.modeldaycash.set('totalCounted', OB.DEC
							.add(this.me.options.modeldaycash
									.get('totalCounted'), elem.get('counted')));
					this.options['counted_' + this.rowid].$el.show();
					if ($('button[button="okbutton"][style!="display: none; "]').length === 0) {
						this.me.options.closenextbutton.$el
								.removeAttr('disabled');
					}
				}
			});
	OB.COMP.ButtonEdit = OB.COMP.SmallButton.extend({
		_id : 'editbutton',
		icon : 'btn-icon-small btn-icon-edit',
		className : 'btnlink-orange btnlink-cashup-edit',
		label : '',
		clickEvent : function(e) {
			this.me.options.closekeyboard.trigger('command', this.searchKey);
		}
	});
	OB.COMP.ButtonVoid = OB.COMP.SmallButton.extend({
		_id : 'closevoidbutton',
		label : OB.I18N.getLabel('OBUIAPP_Delete'),
		order : null,
		me : null,
		ctx : null,
		className : 'btnlink-gray',
		attributes : {
			'style' : 'min-width: 70px; margin: 2px 5px 2px 5px;'
		},
		clickEvent : function(e) {
			this.me.receiptlist.remove(this.order);
			if (this.me.receiptlist.length === 0) {
				this.ctx.closenextbutton.$el.removeAttr('disabled');
			}
			OB.Dal.remove(this.order, function() {
				return true;
			}, function() {
				OB.UTIL.showError('Error removing');
			});
		}
	});
	OB.COMP.CashToKeepRadioButton = OB.COMP.RadioButton.extend({
		_id : 'radiobutton',
		label : '',
		me : null,
		clickEvent : function(e) {
			if (this.$el.attr('id') === 'allowvariableamount') {
				$('#variableamount').focus();
			}
			this.options.closenextbutton.$el.removeAttr('disabled');
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.CloseKeyboard = OB.COMP.Keyboard.extend({
		_id : 'closekeyboard',
		initialize : function() {
			OB.COMP.Keyboard.prototype.initialize.call(this);
			this.addToolbar('toolbarempty', {
				toolbarempty : [ {
					command : '---',
					label : {
						kind : B.KindHTML('<span>&nbsp;</span>')
					}
				}, {
					command : '---',
					label : {
						kind : B.KindHTML('<span>&nbsp;</span>')
					}
				}, {
					command : '---',
					label : {
						kind : B.KindHTML('<span>&nbsp;</span>')
					}
				}, {
					command : '---',
					label : {
						kind : B.KindHTML('<span>&nbsp;</span>')
					}
				}, {
					command : '---',
					label : {
						kind : B.KindHTML('<span>&nbsp;</span>')
					}
				}, {
					command : '---',
					label : {
						kind : B.KindHTML('<span>&nbsp;</span>')
					}
				} ]
			});
			this.addToolbar('toolbarcountcash', new OB.COMP.ToolbarCountCash(
					this.options).toolbar);
			this.show('toolbarempty');
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ListPaymentMethods = Backbone.View
			.extend({
				tagName : 'div',
				attributes : {
					'style' : 'position: absolute; top:0px; right: 0px;'
				},
				initialize : function() {
					var me = this;
					this._id = 'ListPaymentMethods';
					this.paymentmethods = new OB.Model.Collection(
							this.options.DataCloseCashPaymentMethod);
					this.component = B({
						kind : B.KindJQuery('div'),
						content : [
								{
									kind : B.KindJQuery('div'),
									attr : {
										'class' : 'row-fluid'
									},
									content : [ {
										kind : B.KindJQuery('div'),
										attr : {
											'class' : 'span12',
											'style' : 'border-bottom: 1px solid #cccccc;'
										},
										content : [
												{
													kind : B.KindJQuery('div'),
													attr : {
														'style' : 'padding: 10px 20px 10px 10px; float: left; width: 20%'
													},
													content : [ OB.I18N
															.getLabel('OBPOS_LblPaymentMethod') ]
												},
												{
													kind : B.KindJQuery('div'),
													attr : {
														'style' : 'padding: 10px 20px 10px 10px; float: left; width: 20%'
													},
													content : [ OB.I18N
															.getLabel('OBPOS_LblExpected') ]
												},
												{
													kind : B.KindJQuery('div'),
													attr : {
														'style' : 'padding: 10px 0px 10px 0px;  float: left;'
													},
													content : [ OB.I18N
															.getLabel('OBPOS_LblCounted') ]
												} ]
									} ]
								},
								{
									kind : OB.UI.TableView,
									id : 'tableview',
									attr : {
										style : 'list',
										collection : this.paymentmethods,
										me : me,
										renderEmpty : OB.COMP.RenderEmpty,
										renderLine : OB.COMP.RenderPayments
												.extend({
													me : me
												})
									}
								},
								{
									kind : B.KindJQuery('div'),
									content : [
											{
												kind : B.KindJQuery('div'),
												attr : {
													'class' : 'row-fluid'
												},
												content : [ {
													kind : B.KindJQuery('div'),
													attr : {
														'class' : 'span12',
														'style' : 'border-bottom: 1px solid #cccccc;'
													},
													content : [
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'padding: 10px 20px 10px 10px; float: left; width: 20%'
																},
																content : []
															},
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'padding: 10px 20px 10px 10px; float: left; width: 20%'
																},
																content : []
															},
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'padding: 10px 20px 10px 10px; float: left; width: 30px'
																},
																content : []
															},
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'float: left;'
																},
																content : [ {
																	kind : OB.COMP.ButtonOk
																			.extend({
																				me : me,
																				attributes : {
																					'button' : 'allokbutton'
																				},
																				clickEvent : function(
																						e) {
																					var that = this;
																					$(
																							'button[button="okbutton"]')
																							.hide();
																					this.$el
																							.css(
																									'visibility',
																									'hidden');
																					this.me.options.modeldaycash.paymentmethods
																							.each(function(
																									elem) {
																								$(
																										'div[searchKey*="'
																												+ elem
																														.get("_id")
																												+ '"]')
																										.text(
																												OB.I18N
																														.formatCurrency(elem
																																.get('expected')));
																								elem
																										.set(
																												'counted',
																												OB.DEC
																														.add(
																																0,
																																elem
																																		.get('expected')));
																								that.me.options.modeldaycash
																										.set(
																												'totalCounted',
																												OB.DEC
																														.add(
																																that.me.options.modeldaycash
																																		.get('totalCounted'),
																																elem
																																		.get('counted')));
																							});
																					$(
																							'div[button*="countedbutton"]')
																							.show();
																					if ($('button[button="okbutton"][style!="display: none; "]').length === 0) {
																						this.me.options.closenextbutton.$el
																								.removeAttr('disabled');
																					}
																				}
																			})
																} ]
															} ]
												} ]
											}, {
												kind : B.KindJQuery('div'),
												attr : {
													style : 'clear: both;'
												}
											} ]
								},
								{
									kind : B.KindJQuery('div'),
									attr : {
										'class' : 'row-fluid'
									},
									content : [ {
										kind : B.KindJQuery('div'),
										attr : {
											'class' : 'span12',
											'style' : 'border-bottom: 1px solid #cccccc; '
										},
										content : [
												{
													kind : B.KindJQuery('div'),
													attr : {
														'style' : 'padding: 10px 20px 10px 10px; float: left; width: 20%'
													},
													content : [ OB.I18N
															.getLabel('OBPOS_ReceiptTotal') ]
												},
												{
													kind : B.KindJQuery('div'),
													attr : {
														'style' : 'padding: 10px 20px 10px 10px; float: left; width: 20%'
													},
													content : [ {
														kind : Backbone.View
																.extend({
																	tagName : 'span',
																	initialize : function() {
																		this.total = $('<strong/>');
																		this.$el
																				.append(this.total);
																		me.options.modeldaycash
																				.on(
																						'change:totalExpected',
																						function() {
																							this.total
																									.text(OB.I18N
																											.formatCurrency(me.options.modeldaycash
																													.get('totalExpected')));
																						},
																						this);
																		this.total
																				.text(OB.I18N
																						.formatCurrency(me.options.modeldaycash
																								.get('totalExpected')));
																	}
																})
													} ]
												},
												{
													kind : B.KindJQuery('div'),
													attr : {
														'style' : 'padding: 17px 10px 17px 10px; float: left; width: 44px'
													},
													content : []
												},
												{
													kind : B.KindJQuery('div'),
													id : 'total',
													attr : {
														'style' : 'padding: 10px 5px 10px 0px; float: left;'
													},
													content : [ {
														kind : Backbone.View
																.extend({
																	tagName : 'span',
																	initialize : function() {
																		this.total = $('<strong/>');
																		this.$el
																				.append(this.total);
																		me.options.modeldaycash
																				.on(
																						'change:totalCounted',
																						function() {
																							this.total
																									.text(OB.I18N
																											.formatCurrency(OB.DEC
																													.sub(
																															me.options.modeldaycash
																																	.get('totalCounted'),
																															me.options.modeldaycash
																																	.get('totalExpected'))));
																							if (OB.DEC
																									.compare(OB.DEC
																											.add(
																													0,
																													OB.DEC
																															.sub(
																																	me.options.modeldaycash
																																			.get('totalCounted'),
																																	me.options.modeldaycash
																																			.get('totalExpected')))) < 0) {
																								this.$el
																										.css(
																												"color",
																												"red");
																							} else {
																								this.$el
																										.css(
																												"color",
																												"black");
																							}
																						},
																						this);
																		this.total
																				.text(OB.I18N
																						.formatCurrency(OB.DEC
																								.sub(
																										me.options.modeldaycash
																												.get('totalCounted'),
																										me.options.modeldaycash
																												.get('totalExpected'))));
																		if (OB.DEC
																				.compare(OB.DEC
																						.add(
																								0,
																								OB.DEC
																										.sub(
																												me.options.modeldaycash
																														.get('totalCounted'),
																												me.options.modeldaycash
																														.get('totalExpected')))) < 0) {
																			this.$el
																					.css(
																							"color",
																							"red");
																		} else {
																			this.$el
																					.css(
																							"color",
																							"black");
																		}
																	}
																})
													} ]
												} ]
									} ]
								} ]
					});
					this.$el = this.component.$el;
					this.tableview = this.component.context.tableview;
					this.paymentmethods.exec();
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.RenderPayments = OB.COMP.CustomView
			.extend({
				render : function() {
					this.$el
							.append(B({
								kind : B.KindJQuery('div'),
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'row-fluid'
											},
											content : [ {
												kind : B.KindJQuery('div'),
												attr : {
													'class' : 'span12',
													'style' : 'border-bottom: 1px solid #cccccc;'
												},
												content : [
														{
															kind : B
																	.KindJQuery('div'),
															attr : {
																'style' : 'padding: 10px 20px 10px 10px; float: left; width: 20%'
															},
															content : [ this.model
																	.get('name') ]
														},
														{
															kind : B
																	.KindJQuery('div'),
															attr : {
																'style' : 'padding: 10px 20px 10px 10px; float: left; width: 20%'
															},
															content : [ OB.I18N
																	.formatCurrency(OB.DEC
																			.add(
																					0,
																					this.model
																							.get('expected'))) ]
														},
														{
															kind : B
																	.KindJQuery('div'),
															attr : {
																'style' : 'float: left;'
															},
															content : [ {
																kind : OB.COMP.ButtonEdit
																		.extend({
																			rowid : this.model
																					.get('id'),
																			searchKey : this.model
																					.get('_id'),
																			commercialName : this.model
																					.get('name'),
																			_id : 'edit_'
																					+ this.model
																							.get('id'),
																			me : this.me,
																			attributes : {
																				'button' : 'editbutton'
																			}
																		})
															} ]
														},
														{
															kind : B
																	.KindJQuery('div'),
															attr : {
																'style' : 'float: left;'
															},
															content : [ {
																kind : OB.COMP.ButtonOk
																		.extend({
																			rowid : this.model
																					.get('id'),
																			searchKey : this.model
																					.get('_id'),
																			_id : 'ok_'
																					+ this.model
																							.get('id'),
																			me : this.me,
																			attributes : {
																				'button' : 'okbutton',
																				'key' : this.model
																						.get('_id')
																			}
																		})
															} ]
														},
														{
															kind : B
																	.KindJQuery('div'),
															attr : {
																'style' : 'float: left; padding: 10px 0px 10px 10px;'
															},
															content : [ {
																kind : B
																		.KindJQuery('div'),
																rowid : this.model
																		.get('id'),
																id : 'counted_'
																		+ this.model
																				.get('id'),
																attr : {
																	'searchKey' : this.model
																			.get('_id'),
																	'button' : 'countedbutton',
																	'hidden' : 'hidden'
																},
																content : [ OB.I18N
																		.formatCurrency(0) ]
															} ]
														} ]
											} ]
										}, {
											kind : B.KindJQuery('div'),
											attr : {
												style : 'clear: both;'
											}
										} ]
							}).$el);
					var pay = new OB.MODEL.PaymentMethod();
					pay.set('id', this.model.get('id'));
					pay.set('_id', this.model.get('_id'));
					pay.set('name', this.model.get('name'));
					pay.set('expected', OB.DEC.add(0, this.model
							.get('expected')));
					pay.set('paymentMethod', this.model.get('paymentMethod'));
					this.me.options.modeldaycash.paymentmethods.add(pay);
					this.me.options.modeldaycash.set('totalExpected', OB.DEC
							.add(this.me.options.modeldaycash
									.get('totalExpected'), this.model
									.get('expected')));
					this.me.options.modeldaycash.trigger('change:totalCounted');
					return this;
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.RenderPaymentLines = OB.COMP.CustomView
			.extend({
				_id : 'renderpaymentlines',
				render : function() {
					var me = this;
					if (!this.options.modeldaycash.paymentmethods) {
						this.options.modeldaycash.paymentmethods = new OB.MODEL.PaymentMethodCol();
					}
					this.options.modeldaycash.paymentmethods
							.each(function(payment) {
								me.$el
										.append(B({
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'row-fluid'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'class' : 'span12'
														},
														content : [
																{
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'width: 10%; float: left'
																	},
																	content : [ {
																		kind : B
																				.KindHTML('<span>&nbsp;</span>')
																	} ]
																},
																{
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'padding: 5px 0px 0px 5px;  border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%'
																	},
																	content : [ payment
																			.get('name')
																			+ ' '
																			+ OB.I18N
																					.getLabel('OBPOS_LblExpected') ]
																},
																{
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'padding: 5px 0px 0px 5px;  border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right;'
																	},
																	content : [ OB.I18N
																			.formatCurrency(payment
																					.get('expected')) ]
																},
																{
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'width: 10%; float: left'
																	},
																	content : [ {
																		kind : B
																				.KindHTML('<span>&nbsp;</span>')
																	} ]
																} ]
													},
													{
														kind : B
																.KindJQuery('div')
													} ]
										}).$el);
							});
					me.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; border-bottom: 1px solid #cccccc; border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%; font-weight:bold;'
														},
														content : [ OB.I18N
																.getLabel('OBPOS_LblTotalExpected') ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; border-bottom: 1px solid #cccccc; border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right; font-weight:bold;'
														},
														content : [ OB.I18N
																.formatCurrency(me.options.modeldaycash
																		.get('totalExpected')) ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													} ]
										}, {
											kind : B.KindJQuery('div')
										} ]
							}).$el);
					me.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; float: left; width: 60%; font-weight:bold;'
														},
														content : [ {
															kind : B
																	.KindJQuery('div'),
															attr : {
																style : 'clear: both'
															}
														} ]
													} ]
										}, {
											kind : B.KindJQuery('div')
										} ]
							}).$el);
					this.options.modeldaycash.paymentmethods
							.each(function(payment) {
								me.$el
										.append(B({
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'row-fluid'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'class' : 'span12'
														},
														content : [
																{
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'width: 10%; float: left'
																	},
																	content : [ {
																		kind : B
																				.KindHTML('<span>&nbsp;</span>')
																	} ]
																},
																{
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'padding: 5px 0px 0px 5px; border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%'
																	},
																	content : [ payment
																			.get('name')
																			+ ' '
																			+ OB.I18N
																					.getLabel('OBPOS_LblCounted') ]
																},
																{
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'padding: 5px 0px 0px 5px; border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right;'
																	},
																	content : [ OB.I18N
																			.formatCurrency(payment
																					.get('counted')) ]
																},
																{
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'width: 10%; float: left'
																	},
																	content : [ {
																		kind : B
																				.KindHTML('<span>&nbsp;</span>')
																	} ]
																} ]
													},
													{
														kind : B
																.KindJQuery('div')
													} ]
										}).$el);
							});
					me.$el
							.append(B(
									{
										kind : B.KindJQuery('div'),
										attr : {
											'class' : 'row-fluid'
										},
										content : [
												{
													kind : B.KindJQuery('div'),
													attr : {
														'class' : 'span12'
													},
													content : [
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'width: 10%; float: left'
																},
																content : [ {
																	kind : B
																			.KindHTML('<span>&nbsp;</span>')
																} ]
															},
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'padding: 5px 0px 0px 5px; border-bottom: 1px solid #cccccc; border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%; font-weight:bold;'
																},
																content : [ OB.I18N
																		.getLabel('OBPOS_LblTotalCounted') ]
															},
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'padding: 5px 0px 0px 5px; border-bottom: 1px solid #cccccc; border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right; font-weight:bold;'
																},
																content : [ OB.I18N
																		.formatCurrency(me.options.modeldaycash
																				.get('totalCounted')) ]
															},
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'width: 10%; float: left'
																},
																content : [ {
																	kind : B
																			.KindHTML('<span>&nbsp;</span>')
																} ]
															} ]
												}, {
													kind : B.KindJQuery('div')
												} ]
									},
									{
										kind : B.KindJQuery('div'),
										attr : {
											'class' : 'row-fluid'
										},
										content : [
												{
													kind : B.KindJQuery('div'),
													attr : {
														'class' : 'span12'
													},
													content : [
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'width: 10%; float: left'
																},
																content : [ {
																	kind : B
																			.KindHTML('<span>&nbsp;</span>')
																} ]
															},
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'padding: 5px 0px 0px 5px; float: left; width: 60%; font-weight:bold;'
																},
																content : [ {
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		style : 'clear: both'
																	}
																} ]
															} ]
												}, {
													kind : B.KindJQuery('div')
												} ]
									}).$el);
					me.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; float: left; width: 60%; font-weight:bold;'
														},
														content : [ {
															kind : B
																	.KindJQuery('div'),
															attr : {
																style : 'clear: both'
															}
														} ]
													} ]
										}, {
											kind : B.KindJQuery('div')
										} ]
							}).$el);
					this.options.modeldaycash.paymentmethods
							.each(function(payment) {
								me.$el
										.append(B({
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'row-fluid'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'class' : 'span12'
														},
														content : [
																{
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'width: 10%; float: left'
																	},
																	content : [ {
																		kind : B
																				.KindHTML('<span>&nbsp;</span>')
																	} ]
																},
																{
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'padding: 5px 0px 0px 5px; border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%'
																	},
																	content : [ payment
																			.get('name')
																			+ ' '
																			+ OB.I18N
																					.getLabel('OBPOS_LblDifference') ]
																},
																{
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'padding: 5px 0px 0px 5px; border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right;'
																	},
																	content : [ OB.I18N
																			.formatCurrency(OB.DEC
																					.sub(
																							payment
																									.get('counted'),
																							payment
																									.get('expected'))) ]
																},
																{
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		'style' : 'width: 10%; float: left'
																	},
																	content : [ {
																		kind : B
																				.KindHTML('<span>&nbsp;</span>')
																	} ]
																} ]
													},
													{
														kind : B
																.KindJQuery('div')
													} ]
										}).$el);
							});
					me.$el
							.append(B(
									{
										kind : B.KindJQuery('div'),
										attr : {
											'class' : 'row-fluid'
										},
										content : [
												{
													kind : B.KindJQuery('div'),
													attr : {
														'class' : 'span12'
													},
													content : [
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'width: 10%; float: left'
																},
																content : [ {
																	kind : B
																			.KindHTML('<span>&nbsp;</span>')
																} ]
															},
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'padding: 5px 0px 0px 5px; border-bottom: 1px solid #cccccc; border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%; font-weight:bold;'
																},
																content : [ OB.I18N
																		.getLabel('OBPOS_LblTotalDifference') ]
															},
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'padding: 5px 0px 0px 5px; border-bottom: 1px solid #cccccc; border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right; font-weight:bold;'
																},
																content : [ OB.I18N
																		.formatCurrency(me.options.modeldaycash
																				.get('totalDifference')) ]
															},
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'width: 10%; float: left'
																},
																content : [ {
																	kind : B
																			.KindHTML('<span>&nbsp;</span>')
																} ]
															} ]
												}, {
													kind : B.KindJQuery('div')
												} ]
									},
									{
										kind : B.KindJQuery('div'),
										attr : {
											'class' : 'row-fluid'
										},
										content : [
												{
													kind : B.KindJQuery('div'),
													attr : {
														'class' : 'span12'
													},
													content : [
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'width: 10%; float: left'
																},
																content : [ {
																	kind : B
																			.KindHTML('<span>&nbsp;</span>')
																} ]
															},
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'padding: 5px 0px 0px 5px; float: left; width: 60%; font-weight:bold;'
																},
																content : [ {
																	kind : B
																			.KindJQuery('div'),
																	attr : {
																		style : 'clear: both'
																	}
																} ]
															} ]
												}, {
													kind : B.KindJQuery('div')
												} ]
									}).$el);
					return this;
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.RenderRetailTransactions = OB.COMP.CustomView
			.extend({
				_id : 'renderretailtransactions',
				render : function() {
					this.me.options.modeldaycash.transactions = this.me.transactions;
					var me = this, dropsAmount = OB.DEC.Zero, depositsAmount = OB.DEC.Zero;
					me.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px;  border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%'
														},
														content : [ OB.I18N
																.getLabel('OBPOS_LblNetSales') ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px;  border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right;'
														},
														content : [ OB.I18N
																.formatCurrency(this.model
																		.get('netSales')) ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													} ]
										}, {
											kind : B.KindJQuery('div')
										} ]
							}).$el);
					this.model
							.get('salesTaxes')
							.forEach(
									function(tax) {
										me.$el
												.append(B({
													kind : B.KindJQuery('div'),
													attr : {
														'class' : 'row-fluid'
													},
													content : [
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'class' : 'span12'
																},
																content : [
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'width: 10%; float: left'
																			},
																			content : [ {
																				kind : B
																						.KindHTML('<span>&nbsp;</span>')
																			} ]
																		},
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'padding: 5px 0px 0px 5px;  border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%'
																			},
																			content : [ tax.taxName
																					+ ' * '
																					+ OB.I18N
																							.formatCurrency(me.model
																									.get('netSales')) ]
																		},
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'padding: 5px 0px 0px 5px;  border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right;'
																			},
																			content : [ OB.I18N
																					.formatCurrency(tax.taxAmount) ]
																		},
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'width: 10%; float: left'
																			},
																			content : [ {
																				kind : B
																						.KindHTML('<span>&nbsp;</span>')
																			} ]
																		} ]
															},
															{
																kind : B
																		.KindJQuery('div')
															} ]
												}).$el);
									});
					me.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; border-bottom: 1px solid #cccccc; border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%; font-weight:bold;'
														},
														content : [ OB.I18N
																.getLabel('OBPOS_LblGrossSales') ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; border-bottom: 1px solid #cccccc; border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right; font-weight:bold;'
														},
														content : [ OB.I18N
																.formatCurrency(this.model
																		.get('grossSales')) ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													} ]
										}, {
											kind : B.KindJQuery('div')
										} ]
							}).$el);
					me.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; float: left; width: 60%; font-weight:bold;'
														},
														content : [ {
															kind : B
																	.KindJQuery('div'),
															attr : {
																style : 'clear: both'
															}
														} ]
													} ]
										}, {
											kind : B.KindJQuery('div')
										} ]
							}).$el);
					me.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%'
														},
														content : [ OB.I18N
																.getLabel('OBPOS_LblNetReturns') ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right;'
														},
														content : [ OB.I18N
																.formatCurrency(this.model
																		.get('netReturns')) ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													} ]
										}, {
											kind : B.KindJQuery('div')
										} ]
							}).$el);
					this.model
							.get('returnsTaxes')
							.forEach(
									function(tax) {
										me.$el
												.append(B({
													kind : B.KindJQuery('div'),
													attr : {
														'class' : 'row-fluid'
													},
													content : [
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'class' : 'span12'
																},
																content : [
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'width: 10%; float: left'
																			},
																			content : [ {
																				kind : B
																						.KindHTML('<span>&nbsp;</span>')
																			} ]
																		},
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'padding: 5px 0px 0px 5px; border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%'
																			},
																			content : [ tax.taxName
																					+ ' * '
																					+ OB.I18N
																							.formatCurrency(me.model
																									.get('netReturns')) ]
																		},
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'padding: 5px 0px 0px 5px;  border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right;'
																			},
																			content : [ OB.I18N
																					.formatCurrency(tax.taxAmount) ]
																		},
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'width: 10%; float: left'
																			},
																			content : [ {
																				kind : B
																						.KindHTML('<span>&nbsp;</span>')
																			} ]
																		} ]
															},
															{
																kind : B
																		.KindJQuery('div')
															} ]
												}).$el);
									});
					me.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; border-bottom: 1px solid #cccccc; border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%; font-weight:bold;'
														},
														content : [ OB.I18N
																.getLabel('OBPOS_LblGrossReturns') ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; border-bottom: 1px solid #cccccc; border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right; font-weight:bold;'
														},
														content : [ OB.I18N
																.formatCurrency(this.model
																		.get('grossReturns')) ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													} ]
										}, {
											kind : B.KindJQuery('div')
										} ]
							}).$el);
					me.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; float: left; width: 60%; font-weight:bold;'
														},
														content : [ {
															kind : B
																	.KindJQuery('div'),
															attr : {
																style : 'clear: both'
															}
														} ]
													} ]
										}, {
											kind : B.KindJQuery('div')
										} ]
							}).$el);
					me.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [ {
									kind : B.KindJQuery('div'),
									attr : {
										'class' : 'span12'
									},
									content : [
											{
												kind : B.KindJQuery('div'),
												attr : {
													'style' : 'width: 10%; float: left'
												},
												content : [ {
													kind : B
															.KindHTML('<span>&nbsp;</span>')
												} ]
											},
											{
												kind : B.KindJQuery('div'),
												attr : {
													'style' : 'padding: 5px 0px 0px 5px; border-bottom: 1px solid #cccccc; border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%; font-weight:bold;'
												},
												content : [ OB.I18N
														.getLabel('OBPOS_LblTotalRetailTrans') ]
											},
											{
												kind : B.KindJQuery('div'),
												attr : {
													'style' : 'padding: 5px 0px 0px 5px; border-bottom: 1px solid #cccccc; border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right; font-weight:bold;'
												},
												content : [ OB.I18N
														.formatCurrency(this.model
																.get('totalRetailTransactions')) ]
											},
											{
												kind : B.KindJQuery('div'),
												attr : {
													'style' : 'width: 10%; float: left'
												},
												content : [ {
													kind : B
															.KindHTML('<span>&nbsp;</span>')
												} ]
											} ]
								} ]
							}).$el);
					me.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; float: left; width: 60%; font-weight:bold;'
														},
														content : [ {
															kind : B
																	.KindJQuery('div'),
															attr : {
																style : 'clear: both'
															}
														} ]
													} ]
										}, {
											kind : B.KindJQuery('div')
										} ]
							}).$el);
					this.model
							.get('drops')
							.forEach(
									function(drop) {
										dropsAmount = OB.DEC.add(dropsAmount,
												drop.amount);
										me.$el
												.append(B({
													kind : B.KindJQuery('div'),
													attr : {
														'class' : 'row-fluid'
													},
													content : [
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'class' : 'span12'
																},
																content : [
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'width: 10%; float: left'
																			},
																			content : [ {
																				kind : B
																						.KindHTML('<span>&nbsp;</span>')
																			} ]
																		},
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'padding: 5px 0px 0px 5px; border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%'
																			},
																			content : [ drop.description ]
																		},
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'padding: 5px 0px 0px 5px; border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right;'
																			},
																			content : [ OB.I18N
																					.formatCurrency(drop.amount) ]
																		},
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'width: 10%; float: left'
																			},
																			content : [ {
																				kind : B
																						.KindHTML('<span>&nbsp;</span>')
																			} ]
																		} ]
															},
															{
																kind : B
																		.KindJQuery('div')
															} ]
												}).$el);
									});
					me.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; border-bottom: 1px solid #cccccc; border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%; font-weight:bold;'
														},
														content : [ OB.I18N
																.getLabel('OBPOS_LblTotalWithdrawals') ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; border-bottom: 1px solid #cccccc; border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right; font-weight:bold;'
														},
														content : [ OB.I18N
																.formatCurrency(dropsAmount) ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													} ]
										}, {
											kind : B.KindJQuery('div')
										} ]
							}).$el);
					me.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; float: left; width: 60%; font-weight:bold;'
														},
														content : [ {
															kind : B
																	.KindJQuery('div'),
															attr : {
																style : 'clear: both'
															}
														} ]
													} ]
										}, {
											kind : B.KindJQuery('div')
										} ]
							}).$el);
					this.model
							.get('deposits')
							.forEach(
									function(deposit) {
										depositsAmount = OB.DEC.add(
												depositsAmount, deposit.amount);
										me.$el
												.append(B({
													kind : B.KindJQuery('div'),
													attr : {
														'class' : 'row-fluid'
													},
													content : [
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'class' : 'span12'
																},
																content : [
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'width: 10%; float: left'
																			},
																			content : [ {
																				kind : B
																						.KindHTML('<span>&nbsp;</span>')
																			} ]
																		},
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'padding: 5px 0px 0px 5px; border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%'
																			},
																			content : [ deposit.description ]
																		},
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'padding: 5px 0px 0px 5px; border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right;'
																			},
																			content : [ OB.I18N
																					.formatCurrency(deposit.amount) ]
																		},
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'style' : 'width: 10%; float: left'
																			},
																			content : [ {
																				kind : B
																						.KindHTML('<span>&nbsp;</span>')
																			} ]
																		} ]
															},
															{
																kind : B
																		.KindJQuery('div')
															} ]
												}).$el);
									});
					me.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; border-bottom: 1px solid #cccccc; border-top: 1px solid #cccccc; border-right: 1px solid #cccccc; float: left; width: 60%; font-weight:bold;'
														},
														content : [ OB.I18N
																.getLabel('OBPOS_LblTotalDeposits') ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; border-bottom: 1px solid #cccccc; border-top: 1px solid #cccccc; float: left; width: 15%; text-align:right; font-weight:bold;'
														},
														content : [ OB.I18N
																.formatCurrency(depositsAmount) ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													} ]
										}, {
											kind : B.KindJQuery('div')
										} ]
							}).$el);
					me.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'class' : 'row-fluid'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'span12'
											},
											content : [
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'width: 10%; float: left'
														},
														content : [ {
															kind : B
																	.KindHTML('<span>&nbsp;</span>')
														} ]
													},
													{
														kind : B
																.KindJQuery('div'),
														attr : {
															'style' : 'padding: 5px 0px 0px 5px; float: left; width: 60%; font-weight:bold;'
														},
														content : [ {
															kind : B
																	.KindJQuery('div'),
															attr : {
																style : 'clear: both'
															}
														} ]
													} ]
										}, {
											kind : B.KindJQuery('div')
										} ]
							}).$el);
					return this;
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.RenderPendingReceipt = OB.COMP.CustomView
			.extend({
				me : null,
				ctx : null,
				render : function() {
					this.$el
							.append(B({
								kind : B.KindJQuery('div'),
								attr : {
									'style' : 'display: table-row; height: 42px;'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												style : 'display: table-cell; vertical-align: middle; padding: 2px 5px 2px 5px; border-bottom: 1px solid #cccccc; width: 10%;'
											},
											content : [ OB.I18N
													.formatHour(this.model
															.get('orderDate')) ]
										},
										{
											kind : B.KindJQuery('div'),
											attr : {
												style : 'display: table-cell; vertical-align: middle; padding: 2px 5px 2px 5px; border-bottom: 1px solid #cccccc; width: 20%;'
											},
											content : [ this.model
													.get('documentNo') ]
										},
										{
											kind : B.KindJQuery('div'),
											attr : {
												style : 'display: table-cell; vertical-align: middle; padding: 2px 5px 2px 5px; border-bottom: 1px solid #cccccc; width: 39%;'
											},
											content : [ this.model.get('bp')
													.get('_identifier') ]
										},
										{
											kind : B.KindJQuery('div'),
											attr : {
												style : 'display: table-cell; vertical-align: middle; padding: 2px 5px 2px 5px; border-bottom: 1px solid #cccccc; width: 15%; text-align:right;'
											},
											content : [ {
												kind : B.KindJQuery('strong'),
												content : [ this.model
														.printGross() ]
											} ]
										},
										{
											kind : B.KindJQuery('div'),
											attr : {
												style : 'display: table-cell; vertical-align: middle; padding: 2px 5px 2px 5px; border-bottom: 1px solid #cccccc; width: 15%;'
											},
											content : [ {
												kind : OB.COMP.ButtonVoid
														.extend({
															order : this.model,
															me : this.me,
															ctx : this.ctx
														})
											} ]
										}, {
											kind : B.KindJQuery('div'),
											attr : {
												style : 'clear: both;'
											}
										} ]
							}).$el);
					return this;
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ListPendingReceipts = function(context) {
		var me = this;
		this._id = 'ListPendingReceipts';
		this.receiptlist = context.modelorderlist;
		this.component = B({
			kind : B.KindJQuery('div'),
			attr : {
				'class' : 'row-fluid'
			},
			content : [ {
				kind : B.KindJQuery('div'),
				attr : {
					'class' : 'span12'
				},
				content : [ {
					kind : B.KindJQuery('div'),
					attr : {
						'style' : 'border-bottom: 1px solid #cccccc;'
					}
				}, {
					kind : B.KindJQuery('div'),
					content : [ {
						kind : OB.UI.TableView,
						id : 'tableview',
						attr : {
							collection : this.receiptlist,
							renderLine : OB.COMP.RenderPendingReceipt.extend({
								me : me,
								ctx : context
							}),
							renderEmpty : OB.COMP.RenderEmpty
						}
					} ]
				} ]
			} ]
		});
		this.$el = this.component.$el;
		this.tableview = this.component.context.tableview;
	};
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.SearchRetailTransactions = Backbone.View.extend({
		tagName : 'div',
		attributes : {
			'style' : 'position: absolute; top:0px; right: 0px;'
		},
		initialize : function() {
			var me = this;
			this._id = 'searchretailtransactions';
			this.transactions = new OB.Model.Collection(
					this.options.DataCashCloseReport);
			this.options.DataCashCloseReport.ds.on('ready', function() {
				me.transactions.reset(this.cache);
			});
			this.component = B({
				kind : B.KindJQuery('div'),
				content : [ {
					kind : OB.UI.TableView,
					id : 'tableview',
					attr : {
						style : 'list',
						collection : this.transactions,
						me : me,
						renderLine : OB.COMP.RenderRetailTransactions.extend({
							me : me
						})
					}
				} ]
			});
			this.$el = this.component.$el;
			this.tableview = this.component.context.tableview;
			this.transactions.exec();
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	var getPayment = function(modalpayment, receipt, key, name, provider) {
		return ({
			'permission' : key,
			'action' : function(txt) {
				var providerview = OB.POS.paymentProviders[provider];
				if (providerview) {
					modalpayment.show(receipt, key, name, providerview, OB.DEC
							.number(OB.I18N.parseNumber(txt)));
				} else {
					var totalCounted = 0;
					var counted = 0;
					this.options.modeldaycash.paymentmethods.each(function(
							payment) {
						if (payment.get('name') === name) {
							payment.set('counted', OB.DEC.add(0, txt));
							counted = OB.DEC.add(0, txt);
						}
						totalCounted = OB.DEC.add(totalCounted, payment
								.get('counted'));
					});
					this.options.modeldaycash.set('totalCounted', totalCounted);
					this.options.modeldaycash.set('totalDifference', OB.DEC
							.sub(totalCounted, this.options.modeldaycash
									.get('totalExpected')));
					$('button[button*="allokbutton"]').css('visibility',
							'hidden');
					$('button[button="okbutton"][key*="' + key + '"]').hide();
					$('div[searchKey*="' + key + '"]').text(
							OB.I18N.formatCurrency(counted));
					$('div[searchKey*="' + key + '"]').show();
					if ($('button[button="okbutton"][style!="display: none; "]').length === 0) {
						this.options.closenextbutton.$el.removeAttr('disabled');
					}
				}
			}
		});
	};
	OB.COMP.ToolbarCountCash = function(options) {
		var i, max, payments;
		this.toolbar = [];
		this.receipt = options.modelorder;
		this.modalpayment = new OB.UI.ModalPayment(options).render();
		$('body').append(this.modalpayment.$el);
		payments = OB.POS.modelterminal.get('payments');
		for (i = 0, max = payments.length; i < max; i++) {
			this.toolbar.push({
				command : payments[i].payment.searchKey,
				definition : getPayment(this.modalpayment, this.receipt,
						payments[i].payment.searchKey,
						payments[i].payment._identifier,
						payments[i].payment.provider),
				label : payments[i].payment._identifier
			});
		}
	};
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ModalFinishClose = OB.COMP.ModalAction.extend({
		id : 'modalFinishClose',
		header : OB.I18N.getLabel('OBPOS_LblGoodjob'),
		setBodyContent : function() {
			return ({
				kind : B.KindJQuery('div'),
				content : [ OB.I18N.getLabel('OBPOS_FinishCloseDialog') ]
			});
		},
		setBodyButtons : function() {
			return ({
				kind : B.KindJQuery('div'),
				content : [ {
					kind : OB.COMP.CloseDialogOk
				} ]
			});
		}
	});
	OB.COMP.CloseDialogOk = OB.COMP.Button
			.extend({
				render : function() {
					this.$el
							.addClass('btnlink btnlink-gray modal-dialog-content-button');
					this.$el.html(OB.I18N.getLabel('OBPOS_LblOk'));
					return this;
				},
				clickEvent : function(e) {
					OB.UTIL.showLoading(true);
					window.location = OB.POS.hrefWindow('retail.pointofsale');
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ModalProcessReceipts = OB.COMP.ModalAction.extend({
		id : 'modalprocessreceipts',
		header : OB.I18N.getLabel('OBPOS_LblReceiptsToProcess'),
		setBodyContent : function() {
			return ({
				kind : B.KindJQuery('div'),
				content : [ OB.I18N.getLabel('OBPOS_MsgReceiptsProcess') ]
			});
		},
		setBodyButtons : function() {
			return ({
				kind : B.KindJQuery('div'),
				content : [ {
					kind : OB.COMP.DialogOk
				}, {
					kind : OB.COMP.DialogCancel
				} ]
			});
		}
	});
	OB.COMP.DialogOk = OB.COMP.Button
			.extend({
				render : function() {
					this.$el
							.addClass('btnlink btnlink-gray modal-dialog-content-button');
					this.$el.html(OB.I18N.getLabel('OBPOS_LblOk'));
					this.$el.attr('data-dismiss', 'modal');
					return this;
				},
				clickEvent : function(e) {
					var orderarraytoprocess = [], me = this;
					OB.UTIL.showLoading(true);
					this.options.orderlisttoprocess
							.each(function(order) {
								orderarraytoprocess.push(JSON.parse(order
										.get('json')));
							});
					this.proc = new OB.DS.Process(
							'org.openbravo.retail.posterminal.ProcessOrder');
					this.proc.exec({
						order : orderarraytoprocess
					}, function(data, message) {
						if (data && data.exception) {
							OB.UTIL.showLoading(false);
							OB.UTIL.showError(OB.I18N
									.getLabel('OBPOS_MsgErrorProcessOrder'));
						} else {
							me.options.orderlisttoprocess.each(function(order) {
								me.options.modelorderlist.remove(order);
								OB.Dal.remove(order, function() {
								}, function() {
								});
							});
							OB.UTIL.showLoading(false);
							OB.UTIL.showSuccess(OB.I18N
									.getLabel('OBPOS_MsgSuccessProcessOrder'));
						}
					});
					return true;
				}
			});
	OB.COMP.DialogCancel = OB.COMP.Button.extend({
		attributes : {
			'data-dismiss' : 'modal'
		},
		className : 'btnlink btnlink-gray modal-dialog-content-button',
		render : function() {
			this.$el.html(OB.I18N.getLabel('OBPOS_LblCancel'));
			return this;
		},
		clickEvent : function(e) {
			if (window.location.search !== OB.POS
					.hrefWindow('retail.pointofsale')) {
				window.location = OB.POS.hrefWindow('retail.pointofsale');
			}
		}
	});
}());
(function() {
	OB.DATA.CloseCashPaymentMethod = function(context, id) {
		this._id = 'DataCloseCashPaymentMethod';
		this.context = context;
		this.ds = new OB.DS.DataSource(new OB.DS.Request(
				'org.openbravo.retail.posterminal.term.CloseCashPayments',
				OB.POS.modelterminal.get('terminal').client,
				OB.POS.modelterminal.get('terminal').organization));
		this.loadparams = {
			pos : OB.POS.modelterminal.get('terminal').id
		};
	};
	_.extend(OB.DATA.CloseCashPaymentMethod.prototype, OB.DATA.Base);
	OB.DATA.CashCloseReport = function(context, id) {
		this._id = 'DataCashCloseReport';
		this.context = context;
		this.ds = new OB.DS.DataSource(new OB.DS.Request(
				'org.openbravo.retail.posterminal.term.CashCloseReport',
				OB.POS.modelterminal.get('terminal').client,
				OB.POS.modelterminal.get('terminal').organization));
		this.loadparams = {
			pos : OB.POS.modelterminal.get('terminal').id
		};
	};
	_.extend(OB.DATA.CashCloseReport.prototype, OB.DATA.Base);
}());
(function() {
	OB = window.OB || {};
	OB.MODEL = window.OB.MODEL || {};
	OB.MODEL.PaymentMethod = Backbone.Model.extend({
		_id : 'paymentmethod',
		defaults : {
			id : null,
			name : null,
			expected : OB.DEC.Zero,
			counted : OB.DEC.Zero
		}
	});
	OB.MODEL.PaymentMethodCol = Backbone.Collection.extend({
		model : OB.MODEL.PaymentMethod,
		serializeToJSON : function() {
			var jsonpayment = JSON.parse(JSON.stringify(this.toJSON()));
			delete jsonpayment.undo;
			_.forEach(jsonpayment, function(item) {
				item.difference = item.counted - item.expected;
				item.paymentTypeId = item.id;
				delete item.id;
				delete item.name;
				delete item.counted;
				delete item._id;
			});
			return jsonpayment;
		}
	});
	OB.MODEL.DayCash = Backbone.Model.extend({
		_id : 'modeldaycash',
		defaults : {
			paymentmethods : new OB.MODEL.PaymentMethodCol(),
			totalExpected : OB.DEC.Zero,
			totalCounted : OB.DEC.Zero,
			totalDifference : OB.DEC.Zero,
			step : 0,
			allowedStep : 0
		}
	});
}());
(function() {
	OB = window.OB || {};
	OB.DATA = window.OB.DATA || {};
	OB.DATA.PaymentCloseCash = function(context) {
		this._id = 'paymentCloseCash';
		var me = context;
		context.modeldaycash.paymentmethods = new OB.MODEL.PaymentMethodCol();
		context.modeldaycash.paymentmethods.on('closed', function() {
			me.modeldaycash.trigger('print');
			this.proc.exec({
				terminalId : OB.POS.modelterminal.get('terminal').id,
				cashCloseInfo : me.modeldaycash.paymentmethods
						.serializeToJSON()
			}, function(data, message) {
				if (data && data.exception) {
					OB.UTIL.showError(OB.I18N
							.getLabel('OBPOS_MsgFinishCloseError'));
				} else {
					$('#modalFinishClose').modal('show');
				}
			});
		}, this);
		this.proc = new OB.DS.Process(
				'org.openbravo.retail.posterminal.ProcessCashClose');
	};
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.CloseInfo = function(context) {
		var me = this;
		this.component = B(
				{
					kind : B.KindJQuery('div'),
					content : [ {
						kind : B.KindJQuery('div'),
						attr : {
							'style' : 'position: relative; background: #363636; color: white; height: 200px; margin: 5px; padding: 5px'
						},
						content : [
								{
									kind : OB.COMP.Clock,
									attr : {
										'className' : 'pos-clock'
									}
								},
								{
									kind : B.KindJQuery('div'),
									content : [ {
										kind : B.KindJQuery('div'),
										id : 'msgaction',
										attr : {
											'style' : 'padding: 5px 10px 10px 10px; line-height: 23px;'
										},
										content : [
												{
													kind : B.KindJQuery('div'),
													id : 'msgaction',
													attr : {
														'style' : 'float: right; padding: 0px;'
													},
													content : [ {
														kind : OB.COMP.SmallButton
																.extend({
																	attributes : {
																		'href' : '#modalCancel',
																		'data-toggle' : 'modal'
																	},
																	className : 'btnlink-white btnlink-fontgrey'
																}),
														attr : {
															'label' : OB.I18N
																	.getLabel('OBPOS_LblCancel')
														}
													} ]
												},
												{
													kind : B.KindJQuery('div'),
													content : [ OB.I18N
															.getLabel('OBPOS_LblCashUpProcess') ]
												},
												{
													kind : B.KindJQuery('div'),
													attr : {
														'style' : 'padding: 5px;'
													},
													content : [
															{
																kind : OB.COMP.ButtonPrev
															},
															{
																kind : OB.COMP.ButtonNext
															} ]
												},
												{
													kind : B.KindJQuery('div'),
													content : [ OB.I18N
															.getLabel('OBPOS_LblStep1') ]
												},
												{
													kind : B.KindJQuery('div'),
													content : [ OB.I18N
															.getLabel('OBPOS_LblStep2') ]
												},
												{
													kind : B.KindJQuery('div'),
													content : [ OB.I18N
															.getLabel('OBPOS_LblStep3') ]
												},
												{
													kind : B.KindJQuery('div'),
													content : [ OB.I18N
															.getLabel('OBPOS_LblStep4') ]
												} ]
									} ]
								} ]
					} ]
				}, context);
		this.$el = this.component.$el;
		context.closeprevbutton.$el.attr('disabled', 'disabled');
		context.countcash.$el.hide();
		context.cashtokeep.$el.hide();
		context.postprintclose.$el.hide();
	};
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.CountCash = OB.COMP.CustomView
			.extend({
				_id : 'countcash',
				createView : function() {
					return ({
						kind : B.KindJQuery('div'),
						attr : {
							'id' : 'countcash',
							'class' : 'tab-pane'
						},
						content : [ {
							kind : B.KindJQuery('div'),
							attr : {
								'style' : 'overflow:auto; height: 500px; margin: 5px'
							},
							content : [ {
								kind : B.KindJQuery('div'),
								attr : {
									'style' : 'background-color: #ffffff; color: black; padding: 5px;'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'row-fluid'
											},
											content : [ {
												kind : B.KindJQuery('div'),
												attr : {
													'class' : 'span12'
												},
												content : [ {
													kind : B.KindJQuery('div'),
													attr : {
														'style' : 'padding: 10px; border-bottom: 1px solid #cccccc;text-align:center;'
													},
													content : [ OB.I18N
															.getLabel('OBPOS_LblStep2of4') ]
												} ]
											} ]
										},
										{
											kind : B.KindJQuery('div'),
											attr : {
												'style' : 'background-color: #ffffff; color: black;'
											},
											content : [ {
												kind : OB.COMP.ListPaymentMethods
											} ]
										} ]
							} ]
						} ]
					});
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.CashToKeep = OB.COMP.CustomView
			.extend({
				_id : 'cashtokeep',
				createView : function() {
					return ({
						kind : B.KindJQuery('div'),
						attr : {
							'id' : 'countcash',
							'class' : 'tab-pane'
						},
						content : [ {
							kind : B.KindJQuery('div'),
							attr : {
								'style' : 'overflow:auto; height: 500px; margin: 5px'
							},
							content : [ {
								kind : B.KindJQuery('div'),
								attr : {
									'style' : 'background-color: #ffffff; color: black; padding: 5px;'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'row-fluid'
											},
											content : [ {
												kind : B.KindJQuery('div'),
												attr : {
													'class' : 'span12'
												},
												content : [ {
													kind : B.KindJQuery('div'),
													attr : {
														'id' : 'cashtokeepheader',
														'style' : 'padding: 10px; border-bottom: 1px solid #cccccc;text-align:center;'
													},
													content : []
												} ]
											} ]
										},
										{
											kind : B.KindJQuery('div'),
											attr : {
												'style' : 'background-color: #ffffff; color: black;'
											},
											content : [ {
												kind : B.KindJQuery('div'),
												attr : {
													'class' : 'btn-group',
													'data-toggle' : 'buttons-radio'
												},
												content : [
														{
															kind : OB.COMP.CashToKeepRadioButton,
															attr : {
																'id' : 'keepfixedamount'
															},
															content : [ {
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'id' : 'keepfixedamountlbl'
																},
																content : []
															} ]
														},
														{
															kind : B
																	.KindJQuery('div'),
															attr : {
																style : 'clear: both;'
															}
														},
														{
															kind : OB.COMP.CashToKeepRadioButton,
															attr : {
																'id' : 'allowmoveeverything'
															},
															content : [ {
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'id' : 'allowmoveeverythinglbl'
																},
																content : []
															} ]
														},
														{
															kind : B
																	.KindJQuery('div'),
															attr : {
																style : 'clear: both;'
															}
														},
														{
															kind : OB.COMP.CashToKeepRadioButton,
															attr : {
																'id' : 'allowdontmove'
															},
															content : [ {
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'id' : 'allowdontmovelbl'
																},
																content : []
															} ]
														},
														{
															kind : B
																	.KindJQuery('div'),
															attr : {
																style : 'clear: both;'
															}
														},
														{
															kind : OB.COMP.CashToKeepRadioButton,
															attr : {
																'id' : 'allowvariableamount'
															},
															content : [ {
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'display: table-row;'
																},
																content : [
																		{
																			kind : B
																					.KindJQuery('div'),
																			attr : {
																				'id' : 'allowvariableamountlbl',
																				'style' : 'display: table-cell; vertical-align: middle;'
																			},
																			content : []
																		},
																		{
																			kind : B
																					.KindJQuery('input'),
																			attr : {
																				'type' : 'text',
																				'class' : 'span1',
																				'id' : 'variableamount',
																				'style' : 'display: table-cell; vertical-align: middle; margin: 0px 0px 0px 10px;'
																			},
																			content : []
																		} ]
															} ]
														} ]
											} ]
										} ]
							} ]
						} ]
					});
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	var me = this;
	OB.COMP.PendingReceipts = OB.COMP.CustomView
			.extend({
				_id : 'pendingreceipts',
				createView : function() {
					return ({
						kind : B.KindJQuery('div'),
						attr : {
							'id' : 'pendingreceipts',
							'class' : 'tab-pane'
						},
						content : [ {
							kind : B.KindJQuery('div'),
							attr : {
								'style' : 'overflow:auto; height: 500px; margin: 5px'
							},
							content : [ {
								kind : B.KindJQuery('div'),
								attr : {
									'style' : 'background-color: #ffffff; color: black; padding: 5px;'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'row-fluid'
											},
											content : [ {
												kind : B.KindJQuery('div'),
												attr : {
													'class' : 'span12'
												},
												content : [ {
													kind : B.KindJQuery('div'),
													attr : {
														'style' : 'padding: 10px; border-bottom: 1px solid #cccccc; text-align:center;'
													},
													content : [ OB.I18N
															.getLabel('OBPOS_LblStep1of4') ]
												} ]
											} ]
										}, {
											kind : B.KindJQuery('div')
										}, {
											kind : OB.COMP.ListPendingReceipts
										} ]
							} ]
						} ]
					});
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.PostPrintClose = OB.COMP.CustomView
			.extend({
				_id : 'postprintclose',
				createView : function() {
					return ({
						kind : B.KindJQuery('div'),
						attr : {
							'id' : 'postprintclose',
							'class' : 'tab-pane'
						},
						content : [ {
							kind : B.KindJQuery('div'),
							attr : {
								'style' : 'overflow:auto; height: 500px; margin: 5px'
							},
							content : [ {
								kind : B.KindJQuery('div'),
								attr : {
									'style' : 'background-color: #ffffff; color: black; padding: 5px;'
								},
								content : [
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'row-fluid'
											},
											content : [ {
												kind : B.KindJQuery('div'),
												attr : {
													'class' : 'span12'
												},
												content : [ {
													kind : B.KindJQuery('div'),
													attr : {
														'style' : 'padding: 10px; border-bottom: 1px solid #cccccc; text-align:center;'
													},
													content : [ OB.I18N
															.getLabel('OBPOS_LblStep4of4') ]
												} ]
											} ]
										},
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'row-fluid'
											},
											content : [ {
												kind : B.KindJQuery('div'),
												attr : {
													'class' : 'span12'
												},
												content : [ {
													kind : B.KindJQuery('div'),
													attr : {
														'style' : 'padding: 10px; text-align:center;'
													},
													content : [
															{
																kind : B
																		.KindJQuery('img'),
																attr : {
																	'style' : 'padding: 20px 20px 20px 10px;',
																	'src' : '../../utility/ShowImageLogo?logo=yourcompanymenu'
																},
																content : []
															},
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'padding: 5px; text-align:center;'
																},
																content : [ OB.I18N
																		.getLabel('OBPOS_LblUser')
																		+ ': '
																		+ OB.POS.modelterminal
																				.get('context').user._identifier ]
															},
															{
																kind : B
																		.KindJQuery('div'),
																attr : {
																	'style' : 'padding: 5px 5px 15px 5px; text-align:center;',
																	'id' : 'reportTime'
																},
																content : [ OB.I18N
																		.getLabel('OBPOS_LblTime')
																		+ ': '
																		+ new Date()
																				.toString()
																				.substring(
																						3,
																						24) ]
															} ]
												} ]
											} ]
										},
										{
											kind : OB.COMP.SearchRetailTransactions
										},
										{
											kind : OB.COMP.RenderPaymentLines
										},
										{
											kind : B.KindJQuery('div'),
											attr : {
												'class' : 'row-fluid'
											},
											content : [ {
												kind : B.KindJQuery('div'),
												attr : {
													'class' : 'span12'
												},
												content : [
														{
															kind : B
																	.KindJQuery('div'),
															attr : {
																'style' : 'width: 10%; float: left'
															},
															content : [ {
																kind : B
																		.KindHTML('<span>&nbsp;</span>')
															} ]
														},
														{
															kind : B
																	.KindJQuery('div'),
															attr : {
																'style' : 'padding: 5px 0px 0px 5px; float: left; width: 60%; font-weight:bold;'
															},
															content : [ {
																kind : B
																		.KindJQuery('div')
															} ]
														},
														{
															kind : B
																	.KindJQuery('div'),
															attr : {
																style : 'clear: both'
															}
														} ]
											} ]
										} ]
							} ]
						} ]
					});
				}
			});
}());
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	OB.COMP.ButtonTest = OB.COMP.RegularButton.extend({
		icon : 'icon-leaf icon-white',
		label : ' **Leaf**',
		clickEvent : function(e) {
			alert('pressed');
		}
	});
	OB.COMP.CloseCash = OB.COMP.CustomView.extend({
		createView : function() {
			return ({
				kind : B.KindJQuery('section'),
				content : [ {
					kind : OB.MODEL.DayCash
				}, {
					kind : OB.Model.Order
				}, {
					kind : OB.Collection.OrderList
				}, {
					kind : OB.DATA.CloseCashPaymentMethod
				}, {
					kind : OB.DATA.PaymentCloseCash
				}, {
					kind : OB.COMP.ModalCancel
				}, {
					kind : OB.COMP.ModalFinishClose
				}, {
					kind : OB.COMP.ModalProcessReceipts
				}, {
					kind : OB.DATA.Container,
					content : [ {
						kind : OB.DATA.CloseCashPaymentMethod
					}, {
						kind : OB.DATA.CashCloseReport
					}, {
						kind : OB.COMP.HWManager,
						attr : {
							'templatecashup' : 'res/printcashup.xml'
						}
					} ]
				}, {
					kind : B.KindJQuery('div'),
					attr : {
						'class' : 'row'
					},
					content : [ {
						kind : B.KindJQuery('div'),
						attr : {
							'class' : 'span6'
						},
						content : [ {
							kind : OB.COMP.PendingReceipts
						}, {
							kind : OB.COMP.CountCash
						}, {
							kind : OB.COMP.CashToKeep
						}, {
							kind : OB.COMP.PostPrintClose
						} ]
					}, {
						kind : B.KindJQuery('div'),
						attr : {
							'class' : 'span6'
						},
						content : [ {
							kind : B.KindJQuery('div'),
							content : [ {
								kind : OB.COMP.CloseInfo
							} ]
						}, {
							kind : OB.COMP.CloseKeyboard
						} ]
					} ]
				} ],
				init : function() {
					var ctx = this.context;
					OB.UTIL.showLoading(true);
					ctx.on('domready', function() {
						var orderlist = this.context.modelorderlist;
						OB.Dal.find(OB.Model.Order, {
							hasbeenpaid : 'Y'
						}, function(fetchedOrderList) {
							var currentOrder = {};
							if (fetchedOrderList
									&& fetchedOrderList.length !== 0) {
								ctx.orderlisttoprocess = fetchedOrderList;
								OB.UTIL.showLoading(false);
								$('#modalprocessreceipts').modal('show');
							} else {
								OB.UTIL.showLoading(false);
							}
						}, function() {
						});
						OB.Dal.find(OB.Model.Order, {
							hasbeenpaid : 'N'
						}, function(fetchedOrderList) {
							var currentOrder = {};
							if (fetchedOrderList
									&& fetchedOrderList.length !== 0) {
								ctx.closenextbutton.$el.attr('disabled',
										'disabled');
								orderlist.reset(fetchedOrderList.models);
							}
						}, function() {
						});
					}, this);
				}
			});
		}
	});
	OB.POS.windows['retail.cashup'] = OB.COMP.CloseCash;
}());
OB = window.OB || {};
OB.Utilities = window.OB.Utilities || {};
OB.Utilities.Number = {};
OB.Utilities.Number.roundJSNumber = function(num, dec) {
	var result = Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
	return result;
};
OB.Utilities.Number.OBMaskedToOBPlain = function(number, decSeparator,
		groupSeparator) {
	number = number.toString();
	var plainNumber = number;
	if (groupSeparator) {
		var groupRegExp = new RegExp('\\' + groupSeparator, 'g');
		plainNumber = plainNumber.replace(groupRegExp, '');
	}
	var numberSign = '';
	if (plainNumber.substring(0, 1) === '+') {
		numberSign = '';
		plainNumber = plainNumber.substring(1, number.length);
	} else if (plainNumber.substring(0, 1) === '-') {
		numberSign = '-';
		plainNumber = plainNumber.substring(1, number.length);
	}
	if (plainNumber.indexOf(decSeparator) !== -1) {
		while (plainNumber
				.substring(plainNumber.length - 1, plainNumber.length) === '0') {
			plainNumber = plainNumber.substring(0, plainNumber.length - 1);
		}
	}
	while (plainNumber.substring(0, 1) === '0'
			&& plainNumber.substring(1, 2) !== decSeparator
			&& plainNumber.length > 1) {
		plainNumber = plainNumber.substring(1, plainNumber.length);
	}
	if (plainNumber.substring(plainNumber.length - 1, plainNumber.length) === decSeparator) {
		plainNumber = plainNumber.substring(0, plainNumber.length - 1);
	}
	if (plainNumber !== '0') {
		plainNumber = numberSign + plainNumber;
	}
	return plainNumber;
};
OB.Utilities.Number.OBPlainToOBMasked = function(number, maskNumeric,
		decSeparator, groupSeparator, groupInterval) {
	if (number === '' || number === null || number === undefined) {
		return number;
	}
	if (maskNumeric.indexOf('+') === 0 || maskNumeric.indexOf('-') === 0) {
		maskNumeric = maskNumeric.substring(1, maskNumeric.length);
	}
	if (groupSeparator
			&& maskNumeric.indexOf(groupSeparator) !== -1
			&& maskNumeric.indexOf(decSeparator) !== -1
			&& maskNumeric.indexOf(groupSeparator) > maskNumeric
					.indexOf(decSeparator)) {
		var fixRegExp = new RegExp('\\' + groupSeparator, 'g');
		maskNumeric = maskNumeric.replace(fixRegExp, '');
	}
	var maskLength = maskNumeric.length;
	var decMaskPosition = maskNumeric.indexOf(decSeparator);
	if (decMaskPosition === -1) {
		decMaskPosition = maskLength;
	}
	var intMask = maskNumeric.substring(0, decMaskPosition);
	var decMask = maskNumeric.substring(decMaskPosition + 1, maskLength);
	if ((groupSeparator && decMask.indexOf(groupSeparator) !== -1)
			|| decMask.indexOf(decSeparator) !== -1) {
		if (groupSeparator) {
			var fixRegExp_1 = new RegExp('\\' + groupSeparator, 'g');
			decMask = decMask.replace(fixRegExp_1, '');
		}
		var fixRegExp_2 = new RegExp('\\' + decSeparator, 'g');
		decMask = decMask.replace(fixRegExp_2, '');
	}
	number = number.toString();
	number = OB.Utilities.Number.OBMaskedToOBPlain(number, decSeparator,
			groupSeparator);
	var numberSign = '';
	if (number.substring(0, 1) === '+') {
		numberSign = '';
		number = number.substring(1, number.length);
	} else if (number.substring(0, 1) === '-') {
		numberSign = '-';
		number = number.substring(1, number.length);
	}
	var formattedNumber = '';
	var numberLength = number.length;
	var decPosition = number.indexOf(decSeparator);
	if (decPosition === -1) {
		decPosition = numberLength;
	}
	var intNumber = number.substring(0, decPosition);
	var decNumber = number.substring(decPosition + 1, numberLength);
	if (decNumber.length > decMask.length) {
		decNumber = '0.' + decNumber;
		decNumber = OB.Utilities.Number
				.roundJSNumber(decNumber, decMask.length);
		decNumber = decNumber.toString();
		if (decNumber.substring(0, 1) === '1') {
			intNumber = parseFloat(intNumber);
			intNumber = intNumber + 1;
			intNumber = intNumber.toString();
		}
		decNumber = decNumber.substring(2, decNumber.length);
	}
	if (decNumber.length < decMask.length) {
		var decNumber_temp = '', decMaskLength = decMask.length, i;
		for (i = 0; i < decMaskLength; i++) {
			if (decMask.substring(i, i + 1) === '#') {
				if (decNumber.substring(i, i + 1) !== '') {
					decNumber_temp = decNumber_temp
							+ decNumber.substring(i, i + 1);
				}
			} else if (decMask.substring(i, i + 1) === '0') {
				if (decNumber.substring(i, i + 1) !== '') {
					decNumber_temp = decNumber_temp
							+ decNumber.substring(i, i + 1);
				} else {
					decNumber_temp = decNumber_temp + '0';
				}
			}
		}
		decNumber = decNumber_temp;
	}
	var isGroup = false;
	if (groupSeparator) {
		if (intMask.indexOf(groupSeparator) !== -1) {
			isGroup = true;
		}
		var groupRegExp = new RegExp('\\' + groupSeparator, 'g');
		intMask = intMask.replace(groupRegExp, '');
	}
	var intNumber_temp;
	if (intNumber.length < intMask.length) {
		intNumber_temp = '';
		var diff = intMask.length - intNumber.length, j;
		for (j = intMask.length; j > 0; j--) {
			if (intMask.substring(j - 1, j) === '#') {
				if (intNumber.substring(j - 1 - diff, j - diff) !== '') {
					intNumber_temp = intNumber
							.substring(j - 1 - diff, j - diff)
							+ intNumber_temp;
				}
			} else if (intMask.substring(j - 1, j) === '0') {
				if (intNumber.substring(j - 1 - diff, j - diff) !== '') {
					intNumber_temp = intNumber
							.substring(j - 1 - diff, j - diff)
							+ intNumber_temp;
				} else {
					intNumber_temp = '0' + intNumber_temp;
				}
			}
		}
		intNumber = intNumber_temp;
	}
	if (isGroup === true) {
		intNumber_temp = '';
		var groupCounter = 0, k;
		for (k = intNumber.length; k > 0; k--) {
			intNumber_temp = intNumber.substring(k - 1, k) + intNumber_temp;
			groupCounter++;
			if (groupCounter.toString() === groupInterval.toString() && k !== 1) {
				groupCounter = 0;
				intNumber_temp = groupSeparator + intNumber_temp;
			}
		}
		intNumber = intNumber_temp;
	}
	if (intNumber === '' && decNumber !== '') {
		intNumber = '0';
	}
	formattedNumber = numberSign + intNumber;
	if (decNumber !== '') {
		formattedNumber += decSeparator + decNumber;
	}
	return formattedNumber;
};
OB.Utilities.Number.OBMaskedToJS = function(numberStr, decSeparator,
		groupSeparator) {
	if (!numberStr || numberStr.trim() === '') {
		return null;
	}
	var calcNumber = OB.Utilities.Number.OBMaskedToOBPlain(numberStr,
			decSeparator, groupSeparator);
	calcNumber = calcNumber.replace(decSeparator, '.');
	var numberResult = parseFloat(calcNumber);
	if (isNaN(numberResult)) {
		return numberStr;
	}
	return numberResult;
};
OB.Utilities.Number.JSToOBMasked = function(number, maskNumeric, decSeparator,
		groupSeparator, groupInterval) {
	var isANumber = Object.prototype.toString.call(number) === '[object Number]';
	if (!isANumber) {
		return number;
	}
	var formattedNumber = number;
	formattedNumber = formattedNumber.toString();
	formattedNumber = formattedNumber.replace('.', decSeparator);
	formattedNumber = OB.Utilities.Number.OBPlainToOBMasked(formattedNumber,
			maskNumeric, decSeparator, groupSeparator, groupInterval);
	return formattedNumber;
};
OB.Utilities.Number.IsValidValueString = function(type, numberStr) {
	var maskNumeric = type.maskNumeric;
	if (!numberStr) {
		return true;
	}
	var bolNegative = true;
	if (maskNumeric.indexOf('+') === 0) {
		bolNegative = false;
		maskNumeric = maskNumeric.substring(1, maskNumeric.length);
	}
	var bolDecimal = true;
	if (maskNumeric.indexOf(type.decSeparator) === -1) {
		bolDecimal = false;
	}
	var checkPattern = '';
	checkPattern += '^';
	if (bolNegative) {
		checkPattern += '([+]|[-])?';
	}
	checkPattern += '(\\d+)?((\\' + type.groupSeparator + '\\d{'
			+ OB.Format.defaultGroupingSize + '})?)+';
	if (bolDecimal) {
		checkPattern += '(\\' + type.decSeparator + '\\d+)?';
	}
	checkPattern += '$';
	var checkRegExp = new RegExp(checkPattern);
	if (numberStr.match(checkRegExp)
			&& numberStr.substring(0, 1) !== type.groupSeparator) {
		return true;
	}
	return false;
};
OB = window.OB || {};
OB.Utilities = window.OB.Utilities || {};
OB.Utilities.Date = {};
OB.Utilities.Date.centuryReference = 50;
OB.Utilities.Date.normalizeDisplayFormat = function(displayFormat) {
	var newFormat = '';
	displayFormat = displayFormat.replace('mm', 'MM').replace('dd', 'DD')
			.replace('yyyy', 'YYYY').replace('yy', 'YY');
	displayFormat = displayFormat.replace('%D', '%d').replace('%M', '%m');
	if (displayFormat !== null && displayFormat !== '') {
		newFormat = displayFormat;
		newFormat = newFormat.replace('YYYY', '%Y');
		newFormat = newFormat.replace('YY', '%y');
		newFormat = newFormat.replace('MM', '%m');
		newFormat = newFormat.replace('DD', '%d');
		newFormat = newFormat.substring(0, 8);
	}
	displayFormat = displayFormat.replace('hh', 'HH').replace('HH24', 'HH')
			.replace('mi', 'MI').replace('ss', 'SS');
	displayFormat = displayFormat.replace('%H', 'HH').replace('HH:%m', 'HH:MI')
			.replace('HH.%m', 'HH.MI').replace('%S', 'SS');
	displayFormat = displayFormat.replace('HH:mm', 'HH:MI').replace('HH.mm',
			'HH.MI');
	displayFormat = displayFormat.replace('HH:MM', 'HH:MI').replace('HH.MM',
			'HH.MI');
	if (displayFormat.indexOf(' HH:MI:SS') !== -1) {
		newFormat += ' %H:%M:%S';
	} else if (displayFormat.indexOf(' HH:MI') !== -1) {
		newFormat += ' %H:%M';
	} else if (displayFormat.indexOf(' HH.MI.SS') !== -1) {
		newFormat += ' %H.%M.%S';
	} else if (displayFormat.indexOf(' HH.MI') !== -1) {
		newFormat += ' %H.%M';
	}
	return newFormat;
};
OB.Utilities.Date.OBToJS = function(OBDate, dateFormat) {
	if (!OBDate) {
		return null;
	}
	var isADate = Object.prototype.toString.call(OBDate) === '[object Date]';
	if (isADate) {
		return OBDate;
	}
	dateFormat = OB.Utilities.Date.normalizeDisplayFormat(dateFormat);
	var dateSeparator = dateFormat.substring(2, 3);
	var timeSeparator = dateFormat.substring(11, 12);
	var isFullYear = (dateFormat.indexOf('%Y') !== -1);
	if ((isFullYear ? OBDate.length - 2 : OBDate.length) !== dateFormat.length) {
		return null;
	}
	if (isFullYear) {
		dateFormat = dateFormat.replace('%Y', '%YYY');
	}
	if (dateFormat.indexOf('-') !== -1 && OBDate.indexOf('-') === -1) {
		return null;
	} else if (dateFormat.indexOf('/') !== -1 && OBDate.indexOf('/') === -1) {
		return null;
	} else if (dateFormat.indexOf(':') !== -1 && OBDate.indexOf(':') === -1) {
		return null;
	} else if (dateFormat.indexOf('.') !== -1 && OBDate.indexOf('.') === -1) {
		return null;
	}
	var year = dateFormat.indexOf('%y') !== -1 ? OBDate.substring(dateFormat
			.indexOf('%y'), dateFormat.indexOf('%y') + 2) : 0;
	var fullYear = dateFormat.indexOf('%Y') !== -1 ? OBDate.substring(
			dateFormat.indexOf('%Y'), dateFormat.indexOf('%Y') + 4) : 0;
	var month = dateFormat.indexOf('%m') !== -1 ? OBDate.substring(dateFormat
			.indexOf('%m'), dateFormat.indexOf('%m') + 2) : 0;
	var day = dateFormat.indexOf('%d') !== -1 ? OBDate.substring(dateFormat
			.indexOf('%d'), dateFormat.indexOf('%d') + 2) : 0;
	var hours = dateFormat.indexOf('%H') !== -1 ? OBDate.substring(dateFormat
			.indexOf('%H'), dateFormat.indexOf('%H') + 2) : 0;
	var minutes = dateFormat.indexOf('%M') !== -1 ? OBDate.substring(dateFormat
			.indexOf('%M'), dateFormat.indexOf('%M') + 2) : 0;
	var seconds = dateFormat.indexOf('%S') !== -1 ? OBDate.substring(dateFormat
			.indexOf('%S'), dateFormat.indexOf('%S') + 2) : 0;
	month = parseInt(month, 10);
	day = parseInt(day, 10);
	hours = parseInt(hours, 10);
	minutes = parseInt(minutes, 10);
	seconds = parseInt(seconds, 10);
	if (day < 1 || day > 31 || month < 1 || month > 12 || year > 99
			|| fullYear > 9999) {
		return null;
	}
	if (hours > 23 || minutes > 59 || seconds > 59) {
		return null;
	}
	var JSDate = new Date();
	var centuryReference = OB.Utilities.Date.centuryReference;
	if (!isFullYear) {
		if (parseInt(year, 10) < centuryReference) {
			fullYear = '20' + year;
		} else {
			fullYear = '19' + year;
		}
	}
	fullYear = parseInt(fullYear, 10);
	JSDate.setFullYear(fullYear, month - 1, day);
	JSDate.setHours(hours);
	JSDate.setMinutes(minutes);
	JSDate.setSeconds(seconds);
	JSDate.setMilliseconds(0);
	if (JSDate.toString() === 'Invalid Date' || JSDate.toString() === 'NaN') {
		return null;
	} else {
		return JSDate;
	}
};
OB.Utilities.Date.JSToOB = function(JSDate, dateFormat) {
	dateFormat = OB.Utilities.Date.normalizeDisplayFormat(dateFormat);
	var isADate = Object.prototype.toString.call(JSDate) === '[object Date]';
	if (!isADate) {
		return null;
	}
	var year = JSDate.getYear().toString();
	var fullYear = JSDate.getFullYear().toString();
	var month = (JSDate.getMonth() + 1).toString();
	var day = JSDate.getDate().toString();
	var hours = JSDate.getHours().toString();
	var minutes = JSDate.getMinutes().toString();
	var seconds = JSDate.getSeconds().toString();
	var centuryReference = OB.Utilities.Date.centuryReference;
	if (dateFormat.indexOf('%y') !== -1) {
		if (parseInt(fullYear, 10) >= 1900 + centuryReference
				&& parseInt(fullYear, 10) < 2100 - centuryReference) {
			if (parseInt(year, 10) >= 100) {
				year = parseInt(year, 10) - 100;
				year = year.toString();
			}
		} else {
			return null;
		}
	}
	while (year.length < 2) {
		year = '0' + year;
	}
	while (fullYear.length < 4) {
		fullYear = '0' + fullYear;
	}
	while (month.length < 2) {
		month = '0' + month;
	}
	while (day.length < 2) {
		day = '0' + day;
	}
	while (hours.length < 2) {
		hours = '0' + hours;
	}
	while (minutes.length < 2) {
		minutes = '0' + minutes;
	}
	while (seconds.length < 2) {
		seconds = '0' + seconds;
	}
	var OBDate = dateFormat;
	OBDate = OBDate.replace('%y', year);
	OBDate = OBDate.replace('%Y', fullYear);
	OBDate = OBDate.replace('%m', month);
	OBDate = OBDate.replace('%d', day);
	OBDate = OBDate.replace('%H', hours);
	OBDate = OBDate.replace('%M', minutes);
	OBDate = OBDate.replace('%S', seconds);
	return OBDate;
};
OB.Utilities.Date.getTimeFields = function(allFields) {
	var i, field, timeFields = [], length = allFields.length;
	for (i = 0; i < length; i++) {
		field = allFields[i];
		if (field.type === '_id_24') {
			timeFields.push(field.name);
		}
	}
	return timeFields;
};
OB.Utilities.Date.convertUTCTimeToLocalTime = function(newData, allFields) {
	var textField, fieldToDate, i, j, newDataLength = newData.length, UTCHourOffset = isc.Time
			.getUTCHoursDisplayOffset(new Date()), UTCMinuteOffset = isc.Time
			.getUTCMinutesDisplayOffset(new Date()), timeFields = OB.Utilities.Date
			.getTimeFields(allFields), timeFieldsLength = timeFields.length;
	for (i = 0; i < timeFieldsLength; i++) {
		for (j = 0; j < newDataLength; j++) {
			textField = newData[j][timeFields[i]];
			if (textField && textField.length > 0) {
				fieldToDate = isc.Time.parseInput(textField);
				fieldToDate.setTime(fieldToDate.getTime()
						+ (UTCHourOffset * 60 * 60 * 1000)
						+ (UTCMinuteOffset * 60 * 1000));
				newData[j][timeFields[i]] = fieldToDate.getHours() + ':'
						+ fieldToDate.getMinutes() + ':'
						+ fieldToDate.getSeconds();
			}
		}
	}
};
(function() {
	OB = window.OB || {};
	OB.COMP = window.OB.COMP || {};
	var OKButton = OB.COMP.Button.extend({
		render : function() {
			this.$el.addClass('btnlink');
			this.$el.css('float', 'right');
			this.$el.text('OK');
			return this;
		},
		clickEvent : function(e) {
			var parent = this.options.parent;
			parent.receipt.addPayment(new OB.Model.PaymentLine({
				'kind' : parent.key,
				'name' : parent.name,
				'amount' : parent.amount
			}));
			parent.$el.parents('.modal').filter(':first').modal('hide');
		}
	});
	OB.COMP.MockPayment = Backbone.View.extend({
		tagName : 'div',
		contentView : [ {
			tag : 'div',
			content : [ {
				tag : 'div',
				attributes : {
					'class' : 'row-fluid'
				},
				content : [ {
					tag : 'div',
					attributes : {
						'class' : 'span6'
					},
					content : [ OB.I18N.getLabel('OBPOS_LblModalType') ]
				}, {
					tag : 'div',
					id : 'paymenttype',
					attributes : {
						'class' : 'span6',
						style : 'font-weight: bold;'
					}
				} ]
			}, {
				tag : 'div',
				attributes : {
					'class' : 'row-fluid'
				},
				content : [ {
					tag : 'div',
					attributes : {
						'class' : 'span6'
					},
					content : [ OB.I18N.getLabel('OBPOS_LblModalAmount') ]
				}, {
					tag : 'div',
					id : 'paymentamount',
					attributes : {
						'class' : 'span6',
						style : 'font-weight: bold;'
					}
				} ]
			} ]
		}, {
			view : OKButton
		} ],
		initialize : function() {
			OB.UTIL.initContentView(this);
		},
		show : function(receipt, key, name, amount) {
			this.paymenttype.text(name);
			this.paymentamount.text(OB.I18N.formatCurrency(amount));
			this.receipt = receipt;
			this.key = key;
			this.name = name;
			this.amount = amount;
		}
	});
	OB.POS.paymentProviders.MockPayment = OB.COMP.MockPayment;
}());
if (window.onerror && window.onerror.name === 'indexErrorHandler') {
	window.onerror = null;
}
if (typeof OBStartApplication !== 'undefined'
		&& Object.prototype.toString.call(OBStartApplication) === '[object Function]') {
	OBStartApplication();
}