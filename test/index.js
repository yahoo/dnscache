/*
* Copyright (c) 2013, Yahoo! Inc. All rights reserved.
* Copyrights licensed under the New BSD License.
* See the accompanying LICENSE file for terms.
*/

var assert = require('assert'),
    vows = require('vows'),
    async = require('async'),
    mod = require('../lib/index.js')({"enable" : true, "ttl" : 300, "cachesize" : 1000});
    
var dns = require('dns');

var methods = [dns.lookup, dns.resolve, dns.resolve4, dns.resolve6, dns.resolveMx,dns.resolveTxt,
    dns.resolveSrv, dns.resolveNs, dns.resolveCname, dns.reverse];
var params = ["www.yahoo.com", "www.google.com", "www.google.com", "ipv6.google.com", "yahoo.com",
    "google.com", "www.yahoo.com", "yahoo.com", "www.yahoo.com", "173.236.27.26"];
var prefix = ['lookup_', 'resolve_', 'resolve4_', 'resolve6_', 'resolveMx_', 'resolveTxt_',
    'resolveSrv_', 'resolveNs_', 'resolveCname_', 'reverse_'];
var suffix = ['_0', '_A', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'];

var tests = [{
    'loading': {
        topic: function () {
            return mod;
        },
        'should be a function': function (topic) {
            assert.isNotNull(topic);
        }
    },
   'test_cache_entries_created' : {
        topic : function () {
            var that = this, index = 0;
            async.eachSeries(methods, function(method, cb) {
                method(params[index], function(err, result) {
                    if (err) {
                        console.log(err, index);
                    }
                    ++index;
                    cb(err, result);
                });
                }, function (err) {
                    that.callback(err,dns.internalCache);
            });
        },
        'verify internal cache is create for each call' : function (internalCache) {
            var index = 0, key;
            assert.isNotNull(internalCache);
            for (index = 0; index < methods.length; index ++) {
                key = suffix[index] !== 'none' ?
                    prefix[index] + params[index] + suffix[index] : prefix[index] + params[index];
                assert.isTrue(internalCache.data[key] !== undefined, 'entry not there for ' + key);
                assert.equal(internalCache.data[key].hit, 0, 'hit should be 0 for ' + key);
            }
        },
        'test_cache_hits' : {
            topic : function () {
                var that = this, index = 0;
                async.eachSeries(methods, function(method, cb) {
                    method(params[index], function(err, result) {
                        if (err) {
                            console.log(err, index);
                        }
                        ++index;
                        cb(err, result);
                    });
                }, function (err) {
                    that.callback(err,dns.internalCache);
                });
            },
            'verify hits are incremented' : function (internalCache) {
                var index = 0, key;
                assert.isNotNull(internalCache);
                for (index = 0; index < methods.length; index ++) {
                    key = suffix[index] !== 'none' ?
                    prefix[index] + params[index] + suffix[index] : prefix[index] + params[index];
                    assert.isTrue(internalCache.data[key] !== undefined, 'entry not there for ' + key);
                    assert.equal(internalCache.data[key].hit, 1, 'hit should be 1 for ' + key);
                }
            },
            'call_enhance_dns_again' : {
                topic : function () {
                    require('../lib/index.js')({"enable" : true, "ttl" : 300, "cachesize" : 1000});
                    return dns.internalCache;
                },
                'verify cache is same as before' : function (internalCache) {
                    var index = 0, key;
                    assert.isNotNull(internalCache);
                    for (index = 0; index < methods.length; index ++) {
                        key = suffix[index] !== 'none' ?
                        prefix[index] + params[index] + suffix[index] : prefix[index] + params[index];
                        assert.isTrue(internalCache.data[key] !== undefined, 'entry not there for ' + key);
                        assert.equal(internalCache.data[key].hit, 1, 'hit should be 1 for ' + key);
                    }
                }
            }
        }
    },
    'test_lookup_with_family' : {
        topic : function () {
            var that = this;
            dns.lookup('127.0.0.1', 4, function() {
                dns.lookup('::1', 6, function() {
                    dns.lookup('127.0.0.1', { family: 4, hints: dns.ADDRCONFIG }, function() {
                        dns.lookup('::1', { family: 6, hints: dns.ADDRCONFIG }, function(err) {
                            that.callback(err, dns.internalCache);
                        });
                    });
                });
            });
        },
        'verify family4 cache is created' : function (internalCache) {
            assert.isNotNull(internalCache);
            assert.equal(internalCache.data['lookup_127.0.0.1_4'].hit, 1, 'hit should be 1 for family4');
            assert.equal(internalCache.data['lookup_::1_6'].hit, 1, 'hit should be 1 for family6');
        },
        'test invalid family' : {
            topic : function () {
                var that = this;
                    dns.lookup('127.0.0.1', 7, function(err) {
                        that.callback(null, err);
                    });
            },
            'verify error is thrown' : function (topic) {
                assert.isNotNull(topic);
            }
        }
    },
    'test_resolve_with_type' : {
        topic : function () {
            var that = this;
            dns.resolve('www.yahoo.com', 'A', function(err, result) {
                that.callback(err,{'cache' : dns.internalCache, 'result' : result});
            });
        },
        'verify resolve cache is created' : function (topic) {
            assert.isNotNull(topic.cache);
            assert.isNotNull(topic.result);
            assert.equal(topic.cache.data['resolve_www.yahoo.com_A'].hit, 0, 'hit should be 0 for resolve');
        }
    },
        
    'test_error_calls' : {
        topic : function () {
            var that = this, index = 0;
            async.eachSeries(methods, function(method, cb) {
                method('someerrordata', function(err) {
                    ++index;
                    cb(null, err);
                });
            }, function () {
                that.callback(null,dns.internalCache);
            });
        },
        'verify no cache is created' : function (err, internalCache) {
            var index = 0, key;
            for (index = 0; index < methods.length; index ++) {
                key = suffix[index] !== 'none' ?
                    prefix[index] + 'someerrordata' + suffix[index] : prefix[index] + 'someerrordata';
                assert.isTrue(internalCache.data[key] === undefined, 'entry should not there for ' + key);
            }
        }
    }
},{
    test_cache_disabled_by_default : {
       
        topic : function() {
            //if created from other tests
            if (require('dns').internalCache) {
                delete require('dns').internalCache;
            }
            var that = this,
                testee = require('../lib/index.js')();
            testee.lookup('127.0.0.1', function(err) {
                that.callback(err,testee.internalCache);
            });
        },
        'verify no internal cache' : function (internalCache) {
            assert.isTrue(!internalCache);
            assert.isTrue(!require('dns').internalCache);
            
        }
    },
    test_cache_disabled : {
       
        topic : function() {
            //if created from other tests
            if (require('dns').internalCache) {
                delete require('dns').internalCache;
            }
            var that = this,
                testee = require('../lib/index.js')({"enable" : false});
            testee.lookup('127.0.0.1', function(err) {
                that.callback(err,testee.internalCache);
            });
        },
        'verify no internal cache' : function (internalCache) {
            assert.isTrue(!internalCache);
            assert.isTrue(!require('dns').internalCache);
            
        }
    },
    test_cache_disabled_cache_size : {
       
        topic : function() {
            //if created from other tests
            if (require('dns').internalCache) {
                delete require('dns').internalCache;
            }
            var that = this,
                testee = require('../lib/index.js')({"enable" : true, "cachesize" : 0});
            testee.lookup('127.0.0.1', function(err) {
                that.callback(err,testee.internalCache);
            });
        },
        'verify no internal cache' : function (internalCache) {
            assert.isTrue(!internalCache);
            assert.isTrue(!require('dns').internalCache);
            
        }
    }
}, {
    test_cache_is_created : {
       
        topic : function() {
            //if created from other tests
            if (require('dns').internalCache) {
                delete require('dns').internalCache;
            }
            var conf = {"enable" : true},
                that = this, testee = require('../lib/index.js')(conf);
            testee.lookup('127.0.0.1', function(err) {
                that.callback(err,{"cache" : testee.internalCache, "conf" : conf});
            });
        },
        'verify cache is created' : function (topic) {
            assert.isNotNull(topic.cache);
            assert.equal(topic.cache.data['lookup_127.0.0.1_0'].hit, 0, 'hit should be 0 for family4');
            assert.isNotNull(dns.internalCache);
            assert.equal(dns.internalCache.data['lookup_127.0.0.1_0'].hit, 0, 'hit should be 0 for family4');
        },
        'verify default values' : function (topic) {
            assert.isNotNull(topic.conf);
            assert.equal(topic.conf.ttl, 300);
            assert.equal(topic.conf.cachesize, 1000);
        }
    }
}];

var mod_dns_vows = vows.describe('mod');
for (var i=0;i<tests.length;i++)
{
    mod_dns_vows.addBatch(tests[i]);
}
mod_dns_vows['export'](module);

// vim: ts=4 sw=4 et
