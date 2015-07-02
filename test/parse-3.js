var expect = require('chai').expect;
var fs = require('fs');
var rl = require('../index');

describe('JSON parser - test #3', function() {
	var resErr;
	var data = {};

	before(function(next) {
		this.timeout(60 * 1000);
		rl.parse(fs.readFileSync(__dirname + '/data/endnote3.json'))
			.on('error', function(err) {
				resErr = err;
				next();
			})
			.on('ref', function(ref) {
				data[ref.isbn] = ref;
			})
			.on('end', function() {
				next();
			});
	});

	it('should not raise an error', function() {
		expect(resErr).to.be.not.ok;
	});

	it('end count should be accurate', function() {
		expect(Object.keys(data).length).to.equal(1378);
	});
});
