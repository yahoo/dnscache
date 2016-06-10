/*
* Copyright (c) 2013, Yahoo! Inc. All rights reserved.
* Copyrights licensed under the New BSD License.
* See the accompanying LICENSE file for terms.
*/

var CacheObject = require('./cache.js'),
    deepCopy = require('lodash.clone'),
    dns = require('dns');


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
            cache = conf.cache ? /*istanbul ignore next*/ new conf.cache(conf) : new CacheObject(conf);
        
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
                    return callback(error, record.address, record.family);
                }
                backup_object.lookup(domain, family, function (err, address, family_r) {
                    if (err) {
                        return callback(err);
                    }
                    cache.set('lookup_' + domain + '_' + family, {
                        'address' : address,
                        'family' : family_r
                    }, function () {
                        callback(err, address, family_r);
                    });
                });
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
                    return callback_new(error, deepCopy(record), true);
                }
                backup_object.resolve(domain, type_new, function (err, addresses) {
                    if (err) {
                        return callback_new(err);
                    }
                    cache.set('resolve_' + domain + '_' + type_new, addresses, function () {
                        callback_new(err, deepCopy(addresses), false);
                    });
                });
            });
        };

        // override dns.resolve4 method
        dns.resolve4 = function (domain, callback) {
            cache.get('resolve4_' + domain, function (error, record) {
                if (record) {
                    return callback(error, deepCopy(record));
                }
                backup_object.resolve4(domain, function (err, addresses) {
                    if (err) {
                        return callback(err);
                    }
                    cache.set('resolve4_' + domain, addresses, function () {
                        callback(err, deepCopy(addresses));
                    });
                });
            });
        };

        // override dns.resolve6 method
        dns.resolve6 = function (domain, callback) {
            cache.get('resolve6_' + domain, function (error, record) {
                if (record) {
                    return callback(error, deepCopy(record));
                }
                backup_object.resolve6(domain, function (err, addresses) {
                    if (err) {
                        return callback(err);
                    }
                    cache.set('resolve6_' + domain, addresses, function () {
                        callback(err, deepCopy(addresses));
                    });
                });
            });
        };

        // override dns.resolveMx method
        dns.resolveMx = function (domain, callback) {
            cache.get('resolveMx_' + domain, function (error, record) {
                if (record) {
                    return callback(error, deepCopy(record));
                }
                backup_object.resolveMx(domain, function (err, addresses) {
                    if (err) {
                        return callback(err);
                    }
                    cache.set('resolveMx_' + domain, addresses, function () {
                        callback(err, deepCopy(addresses));
                    });
                });
            });
        };

        // override dns.resolveTxt method
        dns.resolveTxt = function (domain, callback) {
            cache.get('resolveTxt_' + domain, function (error, record) {
                if (record) {
                    return callback(error, deepCopy(record));
                }
                backup_object.resolveTxt(domain, function (err, addresses) {
                    if (err) {
                        return callback(err);
                    }
                    cache.set('resolveTxt_' + domain, addresses, function () {
                        callback(err, deepCopy(addresses));
                    });
                });
            });
        };

        // override dns.resolveSrv method
        dns.resolveSrv = function (domain, callback) {
            cache.get('resolveSrv_' + domain, function (error, record) {
                if (record) {
                    return callback(error, deepCopy(record));
                }
                backup_object.resolveSrv(domain, function (err, addresses) {
                    if (err) {
                        return callback(err);
                    }
                    cache.set('resolveSrv_' + domain, addresses, function () {
                        callback(err, deepCopy(addresses));
                    });
                });
            });
        };

        // override dns.resolveNs method
        dns.resolveNs = function (domain, callback) {
            cache.get('resolveNs_' + domain, function (error, record) {
                if (record) {
                    return callback(error, deepCopy(record));
                }
                backup_object.resolveNs(domain, function (err, addresses) {
                    if (err) {
                        return callback(err);
                    }
                    cache.set('resolveNs_' + domain, addresses, function () {
                        callback(err, deepCopy(addresses));
                    });
                });
            });
        };

        // override dns.resolveCname method
        dns.resolveCname = function (domain, callback) {
            cache.get('resolveCname_' + domain, function (error, record) {
                if (record) {
                    return callback(error, deepCopy(record));
                }
                backup_object.resolveCname(domain, function (err, addresses) {
                    if (err) {
                        return callback(err);
                    }
                    cache.set('resolveCname_' + domain, addresses, function () {
                        callback(err, deepCopy(addresses));
                    });
                });
            });
        };

        // override dns.reverse method
        dns.reverse = function (ip, callback) {
            cache.get('reverse_' + ip, function (error, record) {
                if (record) {
                    return callback(error, deepCopy(record));
                }
                backup_object.reverse(ip, function (err, addresses) {
                    if (err) {
                        return callback(err);
                    }
                    cache.set('reverse_' + ip, addresses, function () {
                        callback(err, deepCopy(addresses));
                    });
                });
            });
        };
        return dns;
};

module.exports = function(conf) {
    return new EnhanceDns(conf);
};
