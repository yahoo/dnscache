/* jshint ignore:start */
// /*global describe, it*/

var globalOptions = {
    enable: true,
    ttl: 300,
    cachesize: 1000
};
var assert = require("assert");
var dns = require('../lib/index.js')(globalOptions);

function prepare(options) {
    if (!options) {
        options = globalOptions;
    }
    //if created from other tests
    if (dns.internalCache) {
        delete dns.internalCache;
    }
    dns = require("../lib/index.js")(options);
    return dns;
}

describe('dnscache additional tests for full coverage', function() {
    this.timeout(10000); //dns queries are slow..

    it("should convert family string to number", function(done) {
        prepare();
        dns.lookup("127.0.0.1", "4", function() {
            dns.lookup("127.0.0.1", "6", function() {
                done();
            });
        });
    });

    it("coverage: options is undefined", function(done) {
        prepare();
        dns.lookup("127.0.0.1", undefined, function() {
            done();
        });
    });

    it("coverage: custom cache object", function(done) {
        var cacheClass = require("../lib/cache.js");
        prepare({enable: true, cache: cacheClass});
        done();
    });

    it("coverage: simultaneous requests", function(done) {
        prepare();
        var methods = [
            ["lookup", "127.0.0.1"],
            ["resolve", "localhost"],
            ["resolve4", "localhost"],
            ["resolve6", "localhost"],
            ["resolveMx", "yahoo.com"],
            ["resolveTxt", "yahoo.com"],
            ["resolveNs", "yahoo.com"],
            ["resolveCname", "www.yahoo.com"],
            ["reverse", "1.1.1.1"]
        ];
        var concurrent = 0;
        function callback() {
            concurrent--;
            if (concurrent === 0) {
                done();
            }
        }
        for (var m = 0; m < methods.length; m++) {
            (function(method) {
                var results = [];
                for (var i = 0; i < 2; i++) {
                    concurrent++;
                    dns[method[0]](method[1], function(err, result) {
                        assert.ok(!err);
                        results.push(result);
                        if (results.length == 2) {
                            assert.deepStrictEqual(results[0], results[1], "expected same result from cached query");
                        }
                        callback();
                    });
                }
            })(methods[m]);
        }
    });
});
/* jshint ignore:end */