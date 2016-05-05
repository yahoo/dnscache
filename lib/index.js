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
                try {
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
                } catch (err) {
                    /*istanbul ignore next - doesn't throw in node 0.10*/
                    callback(err);
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
                    return callback_new(error, deepCopy(record), true);
                }
                try {
                    backup_object.resolve(domain, type_new, function (err, addresses) {
                        if (err) {
                            return callback_new(err);
                        }
                        cache.set('resolve_' + domain + '_' + type_new, addresses, function () {
                            callback_new(err, deepCopy(addresses), false);
                        });
                    });
                } catch (err) {
                    /*istanbul ignore next - doesn't throw in node 0.10*/
                    callback_new(err);
                }
            });
        };

        function override(type, callback, fn) {
            cache.get(fn + '_' + type, function (error, record) {
                if (record) {
                    return callback(error, deepCopy(record));
                }
                try {
                    backup_object[fn](type, function (err, addresses) {
                        if (err) {
                            return callback(err);
                        }
                        cache.set(fn + '_' + type, addresses, function () {
                            callback(err, deepCopy(addresses));
                        });
                    });
                } catch (err) {
                    /*istanbul ignore next - doesn't throw in node 0.10*/
                    callback(err);
                }
            });
        }

        // override dns.resolve4 method
        dns.resolve4 = function (domain, callback) {
            override(domain, callback, 'resolve4');
        };

        // override dns.resolve6 method
        dns.resolve6 = function (domain, callback) {
            override(domain, callback, 'resolve6');
        };

        // override dns.resolveMx method
        dns.resolveMx = function (domain, callback) {
            override(domain, callback, 'resolveMx');
        };

        // override dns.resolveTxt method
        dns.resolveTxt = function (domain, callback) {
            override(domain, callback, 'resolveTxt');
        };

        // override dns.resolveSrv method
        dns.resolveSrv = function (domain, callback) {
            override(domain, callback, 'resolveSrv');
        };

        // override dns.resolveNs method
        dns.resolveNs = function (domain, callback) {
            override(domain, callback, 'resolveNs');
        };

        // override dns.resolveCname method
        dns.resolveCname = function (domain, callback) {
            override(domain, callback, 'resolveCname');
        };

        // override dns.reverse method
        dns.reverse = function (ip, callback) {
            override(ip, callback, 'reverse');
        };
        return dns;
};

module.exports = function(conf) {
    return new EnhanceDns(conf);
};
