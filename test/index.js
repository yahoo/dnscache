/*global describe, it*/
/*
* Copyright (c) 2013, Yahoo! Inc. All rights reserved.
* Copyrights licensed under the New BSD License.
* See the accompanying LICENSE file for terms.
*/

var assert = require('assert'),
    async = require('async'),
    mod = require('../lib/index.js')({
        enable: true,
        ttl: 300,
        cachesize: 1000
    });
    
var dns = require('dns');
var methods = [dns.lookup, dns.resolve, dns.resolve4, dns.resolve6, dns.resolveMx,dns.resolveTxt,
    dns.resolveSrv, dns.resolveNs, dns.resolveCname, dns.reverse];
var params = ["www.yahoo.com", "www.google.com", "www.google.com", "ipv6.google.com", "yahoo.com",
    "google.com", "www.yahoo.com", "yahoo.com", "www.yahoo.com", "173.236.27.26"];
var prefix = ['lookup_', 'resolve_', 'resolve4_', 'resolve6_', 'resolveMx_', 'resolveTxt_',
    'resolveSrv_', 'resolveNs_', 'resolveCname_', 'reverse_'];
var suffix = ['_0', '_A', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'];

describe('dnscache main test suite', function() {
    this.timeout(10000); //dns queries are slow..

    it('should export an Object', function () {
        assert.equal(typeof mod, 'object');
    });

    it('should verify internal cache is create for each call', function (done) {
        var index = 0;
        async.eachSeries(methods, function(method, cb) {
            method(params[index], function(err, result) {
                ++index;
                cb(err, result);
            });
        }, function () {
            assert.ok(dns.internalCache);
            methods.forEach(function(name, index) {
                var key = suffix[index] !== 'none' ? prefix[index] + params[index] + suffix[index] : prefix[index] + params[index];
                assert.ok(dns.internalCache.data[key], 'entry not there for ' + key);
                assert.equal(dns.internalCache.data[key].hit, 0, 'hit should be 0 for ' + key);
            });
            done();
        });
    });

    it('verify hits are incremented', function (done) {
        var index = 0;
        async.eachSeries(methods, function(method, cb) {
            method(params[index], function(err, result) {
                ++index;
                cb(err, result);
            });
        }, function () {
            assert.ok(dns.internalCache);
            methods.forEach(function(name, index) {
                var key = suffix[index] !== 'none' ? prefix[index] + params[index] + suffix[index] : prefix[index] + params[index];
                assert.ok(dns.internalCache.data[key], 'entry not there for ' + key);
                assert.equal(dns.internalCache.data[key].hit, 1, 'hit should be 1 for ' + key);
            });
            done();
        });
    });

    it('require again and verify cache is same as before', function (done) {
        require('../lib/index.js')({
            enable: true, 
            ttl: 300,
            cachesize: 1000
        });
        assert.ok(dns.internalCache);
        methods.forEach(function(name, index) {
            var key = suffix[index] !== 'none' ? prefix[index] + params[index] + suffix[index] : prefix[index] + params[index];
            assert.ok(dns.internalCache.data[key], 'entry not there for ' + key);
            assert.equal(dns.internalCache.data[key].hit, 1, 'hit should be 1 for ' + key);
        });
        done();
    });

    it('should verify family4/family6 cache is created for local addresses', function (done) {
        dns.lookup('127.0.0.1', 4, function() {
            dns.lookup('::1', 6, function() {
                dns.lookup('127.0.0.1', { family: 4, hints: dns.ADDRCONFIG }, function() {
                    dns.lookup('127.0.0.1', { hints: dns.ADDRCONFIG }, function() {
                        dns.lookup('::1', { family: 6, hints: dns.ADDRCONFIG }, function() {
                            assert.ok(dns.internalCache);
                            assert.equal(dns.internalCache.data['lookup_127.0.0.1_4'].hit, 1, 'hit should be 1 for family4');
                            assert.equal(dns.internalCache.data['lookup_::1_6'].hit, 1, 'hit should be 1 for family6');
                            done();
                        });
                    });
                });
            });
        });
    });

    it('should create resolve cache with type', function (done) {
        dns.resolve('www.yahoo.com', 'A', function(err, result) {
            assert.ok(dns.internalCache);
            assert.ok(result);
            assert.equal(dns.internalCache.data['resolve_www.yahoo.com_A'].hit, 0, 'hit should be 0 for resolve');
            done();
        });
    });

    it('should not cache by default', function(done) {
        //if created from other tests
        if (require('dns').internalCache) {
            delete require('dns').internalCache;
        }
        var testee = require('../lib/index.js')();
        testee.lookup('127.0.0.1', function() {
            assert.ok(!dns.internalCache);
            assert.ok(!require('dns').internalCache);
            done();
        });
    });
    
    it('should not cache if enabled: false', function(done) {
        //if created from other tests
        if (require('dns').internalCache) {
            delete require('dns').internalCache;
        }
        var testee = require('../lib/index.js')({
            enable: false
        });

        testee.lookup('127.0.0.1', function() {
            assert.ok(!testee.internalCache);
            assert.ok(!require('dns').internalCache);
            done();
        });
    });

    it('should not cache if cachsize is 0', function(done) {
        //if created from other tests
        if (require('dns').internalCache) {
            delete require('dns').internalCache;
        }
        var testee = require('../lib/index.js')({
            enable: true,
            cachesize: 0
        });
        testee.lookup('127.0.0.1', function() {
            assert.ok(!testee.internalCache);
            assert.ok(!require('dns').internalCache);
            done();
        });
    });

    it('should create a cache with default settings', function(done) {
        //if created from other tests
        if (require('dns').internalCache) {
            delete require('dns').internalCache;
        }
        var conf = {
            enable: true
        },
        testee = require('../lib/index.js')(conf);
        
        testee.lookup('127.0.0.1', function() {
            //verify cache is created
            assert.ok(testee.internalCache);
            assert.equal(testee.internalCache.data['lookup_127.0.0.1_0'].hit, 0, 'hit should be 0 for family4');
            assert.ok(dns.internalCache);
            assert.equal(dns.internalCache.data['lookup_127.0.0.1_0'].hit, 0, 'hit should be 0 for family4');
            
            //verify default values
            assert.ok(conf);
            assert.equal(conf.ttl, 300);
            assert.equal(conf.cachesize, 1000);
            done();
        });
    });

    describe('error handling', function() {
    
        ['resolve', 'lookup', 'resolveMx', 'resolveTxt', 'resolveSrv', 'resolveNs', 'resolveCname', 'resolve4', 'resolve6'].forEach(function(name) {
            it('should error on invalid call to dns.' + name, function(done) {
                dns[name]('asdfasdfa', function(err) {
                    assert.ok((err instanceof Error));
                    done();
                });
            });
        });

        it('should error on invalid reverse lookup', function(done) {
            dns.reverse('1.1.1.1', function(err) {
                assert.ok((err instanceof Error));
                done();
            });
        });

        it('should error on invalid family', function(done) {
            dns.lookup('127.0.0.1', 7, function(err) {
                assert.ok((err instanceof Error));
                done();
            });
        });

        it('should error on invalid family Object', function() {
            dns.lookup('127.0.0.1', { family: 7 }, function(err) {
                assert.ok((err instanceof Error));
            });
        });
            
    });

});
