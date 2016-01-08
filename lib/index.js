/*
* Copyright (c) 2013, Yahoo! Inc. All rights reserved.
* Copyrights licensed under the New BSD License.
* See the accompanying LICENSE file for terms.
*/

var CacheObject = require('./cache.js'),
    dns = require('dns');

/*
 * Make a deep copy of the supplied object. This function reliably copies only
 * what is valid for a JSON object, array, or other element.
 */
var deepCopy = function (o) {
    var newArr, ix, newObj, prop;

    if (!o || typeof o !== 'object') {
        return o;
    }

    if (Array.isArray(o)) {
        newArr = [];
        for (ix = 0; ix < o.length; ix += 1) {
            newArr.push(deepCopy(o[ix]));
        }
        return newArr;
    } else {
        newObj = {};
        for (prop in o) {
            if (o.hasOwnProperty(prop)) {
                newObj[prop] = deepCopy(o[prop]);
            }
        }
        return newObj;
    }
};


// original function storage
var EnhanceDns = function (conf) {
        conf = conf || {};
        conf.ttl = parseInt(conf.ttl, 10) || 300; //0 is not allowed ie it ttl is set to 0, it will take the default
        conf.cachesize = parseInt(conf.cachesize, 10); //0 is allowed but it will disable the caching

        if (isNaN(conf.cachesize)) {
            conf.cachesize = 1000; //set default cache size to 1000 records max
        }
        if (!conf.enable || conf.cachesize <= 0 || dns.internalCache) {
            //cache already exists, means this code has already execute ie method are already overwritten
            return dns;
        }
        
        // original function storage
        var backup_object = {
                lookup : dns.lookup,
                resolve : dns.resolve,
                resolve4 : dns.resolve4,
                resolve6 : dns.resolve6,
                resolveMx : dns.resolveMx,
                resolveTxt : dns.resolveTxt,
                resolveSrv : dns.resolveSrv,
                resolveNs : dns.resolveNs,
                resolveCname : dns.resolveCname,
                reverse : dns.reverse
            },
            // cache storage instance
            cache = conf.cache ? new conf.cache(conf) : new CacheObject(conf);
        
        // insert cache object to the instance
        dns.internalCache = cache;

        // override dns.lookup method
        dns.lookup = function (domain, family, callback) {
            if (arguments.length === 2) {
                callback = family;
                family = 0;
            } else if (!family) {
                family = 0;
            } else if (typeof family === 'object') {
                if (!family.family) {
                    family = 0;
                } else {
                    family = +family.family;
                    if (family !== 4 && family !== 6) {
                        callback(new Error('invalid argument: `family` must be 4 or 6'));
                        return;
                    }
                }
            } else {
                family = +family;
                if (family !== 4 && family !== 6) {
                    callback(new Error('invalid argument: `family` must be 4 or 6'));
                    return;
                }
            }

            cache.get('lookup_' + domain + '_' + family, function (error, record) {
                if (record) {
                    callback(error, record.address, record.family);
                } else {
                    try{
                        backup_object.lookup(domain, family, function (err, address, family_r) {
                            if (err) {
                                callback(err);
                            } else {
                                cache.set('lookup_' + domain + '_' + family, {
                                    'address' : address,
                                    'family' : family_r
                                }, function () {
                                    callback(err, address, family_r);
                                });
                            }
                        });
                    } catch(err) {
                        callback(err);
                    }
                }
            });
        };

        // override dns.resolve method
        dns.resolve = function (domain, type, callback) {
            var type_new, callback_new;

            if (typeof type === 'string') {
                type_new = type;
                callback_new = callback;
            } else {
                type_new = "A";
                callback_new = type;
            }

            cache.get('resolve_' + domain + '_' + type_new, function (error, record) {
                if (record) {
                    callback_new(error, deepCopy(record), true);
                } else {
                    try {
                        backup_object.resolve(domain, type_new, function (err, addresses) {
                            if (err) {
                                callback_new(err);
                            } else {
                                cache.set('resolve_' + domain + '_' + type_new, addresses, function () {
                                    callback_new(err, deepCopy(addresses), false);
                                });
                            }
                        });
                    } catch(err) {
                        callback(err);
                    }
                }
            });
        };

        // override dns.resolve4 method
        dns.resolve4 = function (domain, callback) {
            cache.get('resolve4_' + domain, function (error, record) {
                if (record) {
                    callback(error, deepCopy(record));
                } else {
                    try {
                        backup_object.resolve4(domain, function (err, addresses) {
                            if (err) {
                                callback(err);
                            } else {
                                cache.set('resolve4_' + domain, addresses, function () {
                                    callback(err, deepCopy(addresses));
                                });
                            }
                        });
                    } catch(err) {
                        callback(err);
                    }
                }
            });
        };

        // override dns.resolve6 method
        dns.resolve6 = function (domain, callback) {
            cache.get('resolve6_' + domain, function (error, record) {
                if (record) {
                    callback(error, deepCopy(record));
                } else {
                    try {
                        backup_object.resolve6(domain, function (err, addresses) {
                            if (err) {
                                callback(err);
                            } else {
                                cache.set('resolve6_' + domain, addresses, function () {
                                    callback(err, deepCopy(addresses));
                                });
                            }
                        });
                    } catch(err) {
                        callback(err);
                    }
                }
            });
        };

        // override dns.resolveMx method
        dns.resolveMx = function (domain, callback) {
            cache.get('resolveMx_' + domain, function (error, record) {
                if (record) {
                    callback(error, deepCopy(record));
                } else {
                    try {
                        backup_object.resolveMx(domain, function (err, addresses) {
                            if (err) {
                                callback(err);
                            } else {
                                cache.set('resolveMx_' + domain, addresses, function () {
                                    callback(err, deepCopy(addresses));
                                });
                            }
                        });
                    } catch(err) {
                        callback(err);
                    }
                }
            });
        };

        // override dns.resolveTxt method
        dns.resolveTxt = function (domain, callback) {
            cache.get('resolveTxt_' + domain, function (error, record) {
                if (record) {
                    callback(error, deepCopy(record));
                } else {
                    try {
                        backup_object.resolveTxt(domain, function (err, addresses) {
                            if (err) {
                                callback(err);
                            } else {
                                cache.set('resolveTxt_' + domain, addresses, function () {
                                    callback(err, deepCopy(addresses));
                                });
                            }
                        });
                    } catch(err) {
                        callback(err);
                    }
                }
            });
        };

        // override dns.resolveSrv method
        dns.resolveSrv = function (domain, callback) {
            cache.get('resolveSrv_' + domain, function (error, record) {
                if (record) {
                    callback(error, deepCopy(record));
                } else {
                    try {
                        backup_object.resolveSrv(domain, function (err, addresses) {
                            if (err) {
                                callback(err);
                            } else {
                                cache.set('resolveSrv_' + domain, addresses, function () {
                                    callback(err, deepCopy(addresses));
                                });
                            }
                        });
                    } catch(err) {
                        callback(err);
                    }
                }
            });
        };

        // override dns.resolveNs method
        dns.resolveNs = function (domain, callback) {
            cache.get('resolveNs_' + domain, function (error, record) {
                if (record) {
                    callback(error, deepCopy(record));
                } else {
                    try {
                        backup_object.resolveNs(domain, function (err, addresses) {
                            if (err) {
                                callback(err);
                            } else {
                                cache.set('resolveNs_' + domain, addresses, function () {
                                    callback(err, deepCopy(addresses));
                                });
                            }
                        });
                    } catch(err) {
                        callback(err);
                    }
                }
            });
        };

        // override dns.resolveCname method
        dns.resolveCname = function (domain, callback) {
            cache.get('resolveCname_' + domain, function (error, record) {
                if (record) {
                    callback(error, deepCopy(record));
                } else {
                    try {
                        backup_object.resolveCname(domain, function (err, addresses) {
                            if (err) {
                                callback(err);
                            } else {
                                cache.set('resolveCname_' + domain, addresses, function () {
                                    callback(err, deepCopy(addresses));
                                });
                            }
                        });
                    } catch(err) {
                        callback(err);
                    }
                }
            });
        };

        // override dns.reverse method
        dns.reverse = function (ip, callback) {
            cache.get('reverse_' + ip, function (error, record) {
                if (record) {
                    callback(error, deepCopy(record));
                } else {
                    try {
                        backup_object.reverse(ip, function (err, addresses) {
                            if (err) {
                                callback(err);
                            } else {
                                cache.set('reverse_' + ip, addresses, function () {
                                    callback(err, deepCopy(addresses));
                                });
                            }
                        });
                    } catch(err) {
                        callback(err);
                    }
                }
            });
        };
        return dns;
};

module.exports = function(conf) {
    return new EnhanceDns(conf);
};
