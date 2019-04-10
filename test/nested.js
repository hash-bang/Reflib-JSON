var expect = require('chai').expect;
var fs = require('fs');
var rl = require('../index');
var stream = require('stream');

describe('Nested content', function() {

	it('should read nested JSON paths', done => {
		var refs = [];

		rl.parse(fs.readFileSync(`${__dirname}/data/nested.json`), {path: 'references'})
			.on('ref', ref => refs.push(ref))
			.on('error', done)
			.on('end', ()=> {
				expect(refs).to.have.length(3);
				done();
			})
	});

	it('should write nested JSON paths', done => {
		// Setup fake stream {{{
		var output = '';
		var fakeStream = stream.Writable();
		fakeStream._write = function(chunk, enc, next) {
			output += chunk;
			next();
		};
		// }}}

		rl.output({
			content: JSON.parse(fs.readFileSync(`${__dirname}/data/endnote2.json`)),
			path: 'myReferences',
			stream: fakeStream,
		});

		fakeStream
			.on('error', done)
			.on('finish', ()=> {
				expect(output).to.be.a('string');
				expect(output).to.have.length.above(10);

				var json = JSON.parse(output);
				expect(json).to.be.an('object');
				expect(json).to.have.property('myReferences');
				expect(json.myReferences).to.be.an('array');
				expect(json.myReferences).to.have.length(5);
				done();
			})
	});

});
