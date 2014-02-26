/*
* Copyright (c) 2013, Yahoo! Inc. All rights reserved.
* Copyrights licensed under the New BSD License.
* See the accompanying LICENSE file for terms.
*/

var assert = require('assert'),
    vows = require('vows'),
    mod_cache = require('../lib/cache.js');

var asyncFor = function (iterations, func, callback) {
    var i_index = 0, done = false, loop = {
        next : function () {
            if (done) {
                return;
            }

            if (i_index < iterations) {
                i_index += 1;
                func(loop);

            } else {
                done = true;
                callback();
            }
        },
        iteration : function () {
            return i_index - 1;
        },
        exit : function () {
            done = true;
            callback();
        }
    };
    loop.next();
    return loop;
};

var tests = {
    'loading': {
        topic: function () {
            return mod_cache;
        },
        'should be a function': function (topic) {
            assert.isFunction(topic);
        },
        'and should return an object': {
            topic: function () {
                return new mod_cache();
            },
            'not null': function (topic) {
                assert.isNotNull(topic);
            }
        },
        'and test defaults' : {
            topic: function () {
                var conf = {}, mod;
                mod = new mod_cache(conf);
                return conf;
            },
            'not null': function (conf) {
                assert.isNotNull(conf);
                assert.equal(conf.ttl, 300);
                assert.equal(conf.cachesize, 1000);
            }
        }
    },
    'test cache lru': {
        topic: function () {
            var CacheObject = new mod_cache({"ttl" : 300, "cachesize" : 5}),
                that = this, index = 0;
            asyncFor(6, function (loop) {
                CacheObject.set(index, index, function () {
                    index = index + 1;
                    loop.next();
                });
            }, function () {
                CacheObject.get(0, function (err0, data0) {
                    CacheObject.get(1, function (err1, data1) {
                        CacheObject.get('unknownkey', function (err2, data2) {
                            that.callback(null, {"data0" : data0, "data1" : data1, "data2" : data2,
                                        "err0" : err0, "err1" : err1, "err2" : err2});
                        });
                    });
                });
            });
        },
        'test cache entries for lru': function (topic) {
            assert.isTrue(topic.data0 === undefined && topic.data1 !== undefined && topic.data3 === undefined);
            assert.isNull(topic.err0);
            assert.isNull(topic.err1);
            assert.isNull(topic.err2);
        }
    },
    'test_cache_update_multiple': {
        topic: function () {
            var CacheObject = new mod_cache({"ttl" : 300, "cachesize" : 5}),
            that = this;
            CacheObject.set(1, 1, function () {
                CacheObject.set(2, 2, function () {
                    CacheObject.set(3, 30, function () {
                        CacheObject.set(3, 31, function () {
                            CacheObject.set(2, 4, function () {
                                CacheObject.set(2, 5, function () {
                                    CacheObject.set(1, 6, function () {
                                        that.callback(null, CacheObject);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        },
        'test head and tail': function (cacheObject) {
            assert.equal(cacheObject.count, 3);
            assert.equal(cacheObject.tail.key, 3);
            assert.equal(cacheObject.tail.val, 31);
            assert.equal(cacheObject.head.key, 1);
            assert.equal(cacheObject.head.val, 6);
        }
    },
    'test_cache_get': {
        topic: function () {
            var CacheObject = new mod_cache({"ttl" : 300, "cachesize" : 5}),
                that = this;
            CacheObject.set(1, 1, function () {
                CacheObject.set(1, 2, function () {
                    CacheObject.get(1, function (err, rec) {
                        that.callback(err, rec);
                    });
                });
            });
        },
        'test get': function (topic) {
            assert.equal(topic, 2);
        }
    },
    'test_cache_hits': {
        topic: function () {
            var CacheObject = new mod_cache({"ttl" : 300, "cachesize" : 5}),
                that = this;
            CacheObject.set(1, 1, function () {
                CacheObject.get(1, function () {
                    CacheObject.get(1, function () {
                        that.callback(null, CacheObject);
                    });
                });
            });
        },
        'test hits': function (topic) {
            assert.equal(topic.data['1'].hit, 2);
        }
    },
    'test_ttl_expire_single_item': {
        topic: function () {
            var CacheObject = new mod_cache({"ttl" : 1, "cachesize" : 5}),
                that = this;
            CacheObject.set(1, 1);
            CacheObject.get(1);
            CacheObject.get(1);
            setTimeout(function(){
                CacheObject.get(1, function () {
                    that.callback(null, CacheObject);
                });
            }, 1200);
        },
        'test undefined': function (topic) {
            assert.isUndefined(topic.data['1']);
        }
    },
    'test_ttl_never_expire': {
        topic: function () {
            var CacheObject = new mod_cache({"ttl" : 0, "cachesize" : 5}),
                that = this;
            CacheObject.set(2, 2);
            CacheObject.set(1, 1);
            setTimeout(function(){
                CacheObject.get(1, function () {
                    that.callback(null, CacheObject);
                });
            }, 1200);
        },
        'test undefined': function (topic) {
            assert.isNotNull(topic.data['1']);
            assert.equal(topic.data['1'].val, 1);
        }
    },
    'test_ttl_expire_head': {
        topic: function () {
            var CacheObject = new mod_cache({"ttl" : 1, "cachesize" : 5}),
                that = this;
            CacheObject.set(2, 2);
            CacheObject.set(1, 1);
            setTimeout(function(){
                CacheObject.get(1, function () {
                    that.callback(null, CacheObject);
                });
            }, 1200);
        },
        'test undefined': function (topic) {
            assert.isUndefined(topic.data['1']);
        }
    },
    'test_ttl_expire_tail': {
        topic: function () {
            var CacheObject = new mod_cache({"ttl" : 1, "cachesize" : 5}),
                that = this;
            CacheObject.set(1, 1);
            CacheObject.set(2, 2);
            setTimeout(function(){
                CacheObject.get(1, function () {
                    that.callback(null, CacheObject);
                });
            }, 1200);
        },
        'test undefined': function (topic) {
            assert.isUndefined(topic.data['1']);
        }
    },
    'test_ttl_expire_middle': {
        topic: function () {
            var CacheObject = new mod_cache({"ttl" : 1, "cachesize" : 5}),
                that = this;
            CacheObject.set(3, 3);
            CacheObject.set(1, 1);
            CacheObject.set(2, 2);
            setTimeout(function(){
                CacheObject.get(1, function () {
                    that.callback(null, CacheObject);
                });
            }, 1200);
        },
        'test undefined': function (topic) {
            assert.isUndefined(topic.data['1']);
        }
    }
};

vows.describe('mod_cache').addBatch(tests)['export'](module);

// vim:ts=4 sw=4 et
