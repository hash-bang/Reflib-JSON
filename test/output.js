var _  = require('lodash');
var expect = require('chai').expect;
var rl = require('../index');
var stream = require('stream');

describe('JSON output - array input', function() {
	var refs = [
		{id: 'ref01', title: 'Hello World', authors: ['Joe Random', 'John Random'], volume: 1},
		{id: 'ref02', title: 'Goodbye World', authors: ['Josh Random', 'Janet Random'], volume: 2},
	];

	var output, rlOutput, rlErr;

	before(function(finish) {
		this.timeout(60 * 1000);

		// Setup fake stream {{{
		var fakeStream = stream.Writable();
		fakeStream._write = function(chunk, enc, next) {
			output += chunk;
			next();
		};
		// }}}

		output = '';
		fakeStream
			.on('data', function(data) {
				output += data;
			})
			.on('finish', function() {
				// Feed result back into RL {{{
				rlOutput = [];
				rlErr = null;
				rl.parse(output)
					.on('error', function(err) {
						console.log('ERR', err);
						rlErr = err;
						finish();
					})
					.on('ref', function(ref) {
						rlOutput.push(ref);
					})
					.on('end', function() {
						finish();
					});
				// }}}
			});

		rl.output({
			stream: fakeStream,
			content: refs,
		});


	});

	it('should return content', function() {
		expect(output).to.be.ok;
	});

	it('should translate back into a collection', function() {
		expect(rlErr).to.be.not.ok;
		expect(rlOutput).to.have.length(2);

		expect(_.find(rlOutput, {title: 'Hello World'})).to.deep.equal({
			title: 'Hello World',
			authors: ['Joe Random', 'John Random'],
			type: 'report',
			volume: 1,
		});

		expect(_.find(rlOutput, {title: 'Goodbye World'})).to.deep.equal({
			title: 'Goodbye World',
			authors: ['Josh Random', 'Janet Random'],
			type: 'report',
			volume: 2,
		});
	});
});


describe('JSON output - objects via callback', function() {
	var refs = [
		{id: 'ref01', title: 'Hello World', authors: ['Joe Random', 'John Random'], volume: 1},
		{id: 'ref02', title: 'Goodbye World', authors: ['Josh Random', 'Janet Random'], volume: 2},
	];

	var output, rlOutput, rlErr;

	before(function(finish) {
		this.timeout(60 * 1000);

		// Setup fake stream {{{
		var fakeStream = stream.Writable();
		fakeStream._write = function(chunk, enc, next) {
			output += chunk;
			next();
		};
		// }}}

		output = '';
		fakeStream
			.on('data', function(data) {
				output += data;
			})
			.on('finish', function() {
				// Feed result back into RL {{{
				rlOutput = [];
				rlErr = null;
				rl.parse(output)
					.on('error', function(err) {
						console.log('ERR', err);
						rlErr = err;
						finish();
					})
					.on('ref', function(ref) {
						rlOutput.push(ref);
					})
					.on('end', function() {
						finish();
					});
				// }}}
			});

		rl.output({
			stream: fakeStream,
			content: function(next, batch) { // Spoon feed each record based on the batch offset
				next(null, refs[batch], batch == refs.length - 1);
			},
		});


	});

	it('should return content', function() {
		expect(output).to.be.ok;
	});

	it('should translate back into a collection', function() {
		expect(rlErr).to.be.not.ok;
		expect(rlOutput).to.have.length(2);

		expect(_.find(rlOutput, {title: 'Hello World'})).to.deep.equal({
			title: 'Hello World',
			authors: ['Joe Random', 'John Random'],
			type: 'report',
			volume: 1,
		});

		expect(_.find(rlOutput, {title: 'Goodbye World'})).to.deep.equal({
			title: 'Goodbye World',
			authors: ['Josh Random', 'Janet Random'],
			type: 'report',
			volume: 2,
		});
	});
});


describe('JSON output - array via callback', function() {
	var refs = [
		{id: 'ref01', title: 'Hello World', authors: ['Joe Random', 'John Random'], volume: 1},
		{id: 'ref02', title: 'Goodbye World', authors: ['Josh Random', 'Janet Random'], volume: 2},
	];

	var output, rlOutput, rlErr;

	before(function(finish) {
		this.timeout(60 * 1000);

		// Setup fake stream {{{
		var fakeStream = stream.Writable();
		fakeStream._write = function(chunk, enc, next) {
			output += chunk;
			next();
		};
		// }}}

		output = '';
		fakeStream
			.on('data', function(data) {
				output += data;
			})
			.on('finish', function() {
				// Feed result back into RL {{{
				rlOutput = [];
				rlErr = null;
				rl.parse(output)
					.on('error', function(err) {
						console.log('ERR', err);
						rlErr = err;
						finish();
					})
					.on('ref', function(ref) {
						rlOutput.push(ref);
					})
					.on('end', function() {
						finish();
					});
				// }}}
			});

		rl.output({
			stream: fakeStream,
			content: function(next, batch) { // Spoon feed all records on first call only
				if (batch == 0) return next(null, refs, true);
				next();
			},
		});


	});

	it('should return content', function() {
		expect(output).to.be.ok;
	});

	it('should translate back into a collection', function() {
		expect(rlErr).to.be.not.ok;
		expect(rlOutput).to.have.length(2);

		expect(_.find(rlOutput, {title: 'Hello World'})).to.deep.equal({
			title: 'Hello World',
			authors: ['Joe Random', 'John Random'],
			type: 'report',
			volume: 1,
		});

		expect(_.find(rlOutput, {title: 'Goodbye World'})).to.deep.equal({
			title: 'Goodbye World',
			authors: ['Josh Random', 'Janet Random'],
			type: 'report',
			volume: 2,
		});
	});
});
